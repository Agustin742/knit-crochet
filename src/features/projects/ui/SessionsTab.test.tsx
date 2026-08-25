// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { formatClock, formatDateTime, formatDuration } from "@/shared/lib/format";

import { SessionsTab } from "./SessionsTab";
import {
  DETAIL_ERROR_TITLE,
  NO_SESSIONS,
  SESSION_IDLE_MESSAGE,
  SESSION_TIMER_REGION_LABEL,
  SESSIONS_TOTAL_LABEL,
  START_SESSION_LABEL,
  STOP_SESSION_LABEL,
} from "./project-detail";
import {
  NETWORK_ERROR_MESSAGE,
  projectSessionsEndpoint,
  sessionStartEndpoint,
  sessionStopEndpoint,
} from "./projects-client";
import type { SerializedCraftSession } from "./types";

const PROJECT_ID = "bufanda";

/**
 * **El año se DERIVA del reloj, nunca se escribe** (deuda 164), y el instante se
 * construye en hora **local** para que el texto esperado no dependa de la zona
 * horaria en la que corra la suite.
 */
const NOW = new Date(new Date().getFullYear() - 1, 2, 5, 19, 30);
const MINUTE_MS = 60_000;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function session(
  patch: Partial<SerializedCraftSession> = {},
): SerializedCraftSession {
  return {
    id: "s1",
    userId: "u",
    projectId: PROJECT_ID,
    start: NOW.toISOString(),
    end: new Date(NOW.getTime() + MINUTE_MS).toISOString(),
    duration: 60,
    ...patch,
  };
}

/**
 * Un doble del backend de sesiones **con sus reglas de verdad**, no un mock que
 * devuelve lo que al test le conviene (REGLA 7). Las tres que importan y que
 * están medidas en `session-routes.test.ts`:
 *
 * 1. **arrancar es idempotente**: 201 si crea, **200 si ya había una abierta**,
 *    reutilizándola — nunca duplica ni reinicia el sello;
 * 2. **parar sin nada corriendo responde 409**, que es la asimetría contraria a
 *    la que uno supondría;
 * 3. la lista viene **de la más reciente a la más antigua** y la sesión abierta
 *    es la que tiene `end` en nulo.
 *
 * Sin estas reglas, un test podría montar dos sesiones abiertas a la vez o un
 * arranque que duplica —estados que producción **no puede producir**— y dar por
 * bueno un componente que sólo funciona contra su propio doble.
 */
function serveBackend(store: SerializedCraftSession[] = []) {
  let sessions = [...store];

  fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";

    if (url === projectSessionsEndpoint(PROJECT_ID) && method === "GET") {
      return Promise.resolve(jsonResponse(200, { sessions: [...sessions] }));
    }

    if (url === sessionStartEndpoint(PROJECT_ID) && method === "POST") {
      const open = sessions.find((one) => one.end === null);
      if (open !== undefined) {
        return Promise.resolve(jsonResponse(200, { session: open }));
      }
      const created = session({
        id: `s${String(sessions.length + 1)}`,
        start: new Date().toISOString(),
        end: null,
        duration: 0,
      });
      sessions = [created, ...sessions];
      return Promise.resolve(jsonResponse(201, { session: created }));
    }

    if (url === sessionStopEndpoint(PROJECT_ID) && method === "PATCH") {
      const open = sessions.find((one) => one.end === null);
      if (open === undefined) {
        return Promise.resolve(
          jsonResponse(409, {
            error: "No hay ninguna sesión de tejido en marcha.",
          }),
        );
      }
      const endedAt = new Date();
      const closed = {
        ...open,
        end: endedAt.toISOString(),
        duration: Math.floor(
          (endedAt.getTime() - new Date(open.start).getTime()) / 1000,
        ),
      };
      sessions = sessions.map((one) => (one.id === open.id ? closed : one));
      const time = sessions.reduce((total, one) => total + one.duration, 0);
      return Promise.resolve(jsonResponse(200, { session: closed, time }));
    }

    return Promise.resolve(jsonResponse(404, { error: "ruta no servida" }));
  });
}

const fetchSpy = vi.fn();
const onTimeChange = vi.fn();

function renderTab() {
  return render(
    <main>
      <SessionsTab projectId={PROJECT_ID} onTimeChange={onTimeChange} />
    </main>,
  );
}

function timerRegion(): HTMLElement {
  return screen.getByRole("status", { name: SESSION_TIMER_REGION_LABEL });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  serveBackend();
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  onTimeChange.mockReset();
  vi.unstubAllGlobals();
});

/* ============================================================================
   El cronómetro, con el TIEMPO CONTROLADO. Nada de reloj real: un test que
   espera segundos de verdad para ver moverse un cronómetro es lento y, cuando
   la máquina va cargada, miente.
   ============================================================================ */
describe("SessionsTab — el cronómetro (reloj intervenido)", () => {
  /**
   * **Sólo se intervienen el reloj y el intervalo**, no todos los
   * temporizadores, y la diferencia costó dos tests colgados: con
   * `vi.useFakeTimers()` a secas también se falsea `setTimeout`, del que
   * dependen `user-event` para separar sus eventos y `waitFor` para reintentar.
   * Nadie los adelanta mientras un clic está a medias, así que el test agota su
   * tope de diez segundos sin hacer nada.
   *
   * Interviniendo sólo estos tres, la interacción y las esperas siguen usando el
   * reloj de verdad, y lo único bajo control es **lo que el cronómetro mide**.
   * De regalo, `vi.getTimerCount()` pasa a contar exclusivamente el intervalo
   * del componente: por eso "hay UN intervalo" se puede afirmar de verdad.
   */
  const FAKED_TIMERS = ["Date", "setInterval", "clearInterval"] as const;

  /** Avanza el reloj y deja que React pinte lo que ese avance provocó. */
  async function tick(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKED_TIMERS] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("una sesión ya en marcha se cuenta desde su arranque y avanza sola", async () => {
    serveBackend([
      session({
        start: new Date(NOW.getTime() - 65_000).toISOString(),
        end: null,
        duration: 0,
      }),
    ]);
    renderTab();

    expect(await screen.findByText(formatClock(65))).toBeInTheDocument();

    await tick(5_000);

    expect(screen.getByText(formatClock(70))).toBeInTheDocument();
  });

  it("arrancar pone el cronómetro a cero y lo echa a andar", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(
      await screen.findByRole("button", { name: START_SESSION_LABEL }),
    );

    expect(await screen.findByText(formatClock(0))).toBeInTheDocument();

    await tick(3_000);

    expect(screen.getByText(formatClock(3))).toBeInTheDocument();
    // El control cambia de papel: ya no se ofrece arrancar lo que corre.
    expect(
      screen.queryByRole("button", { name: START_SESSION_LABEL }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: STOP_SESSION_LABEL }),
    ).toBeInTheDocument();
  });

  it("parar cierra la sesión, la manda al historial y devuelve el tiempo total", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(
      await screen.findByRole("button", { name: START_SESSION_LABEL }),
    );
    await screen.findByRole("button", { name: STOP_SESSION_LABEL });
    await tick(90_000);

    await user.click(screen.getByRole("button", { name: STOP_SESSION_LABEL }));

    // 90 s exactos: los mismos que avanzó el reloj entre arrancar y parar. La
    // duración la calcula el servidor, así que esto mide el viaje entero.
    await waitFor(() => {
      expect(onTimeChange).toHaveBeenCalledWith(90);
    });
    expect(
      await screen.findByRole("button", { name: START_SESSION_LABEL }),
    ).toBeInTheDocument();
    expect(timerRegion()).toHaveTextContent(SESSION_IDLE_MESSAGE);
    expect(screen.getAllByText(formatDuration(90))).not.toHaveLength(0);
  });

  /**
   * La pieza delicada del tab. Se mide **contando los temporizadores vivos**, no
   * deduciéndolo del código: con el cronómetro corriendo hay exactamente uno, y
   * al desmontar —que es lo que pasa al cambiar de pestaña y al cerrar el
   * cajón— no queda ninguno.
   */
  it("mantiene UN solo intervalo y lo suelta al desmontar", async () => {
    serveBackend([session({ end: null, duration: 0 })]);
    const view = renderTab();
    await screen.findByRole("button", { name: STOP_SESSION_LABEL });

    expect(vi.getTimerCount()).toBe(1);

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  /**
   * Y no se acumula uno por recarga: arrancar vuelve a pedir el historial, así
   * que el efecto del reloj se reevalúa con una sesión **recién traída de la
   * red** — otro objeto, mismo arranque. Si dependiera del objeto en vez del
   * sello, acá habría dos intervalos y el cronómetro correría al doble.
   */
  it("recargar el historial no suma un segundo intervalo", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(
      await screen.findByRole("button", { name: START_SESSION_LABEL }),
    );
    await screen.findByRole("button", { name: STOP_SESSION_LABEL });

    expect(vi.getTimerCount()).toBe(1);

    await tick(2_000);

    expect(screen.getByText(formatClock(2))).toBeInTheDocument();
  });

  /** Sin nada corriendo no hay nada que tickar: el intervalo ni se programa. */
  it("con el cronómetro parado no deja ningún intervalo corriendo", async () => {
    renderTab();
    await screen.findByRole("button", { name: START_SESSION_LABEL });

    expect(vi.getTimerCount()).toBe(0);
  });

  /**
   * La región viva es de grano de MINUTO a propósito: un aviso por segundo
   * convierte un lector de pantalla en un metrónomo. Lo que se ve sí lleva
   * segundos.
   */
  it("anuncia el tiempo por minutos, no por segundos", async () => {
    serveBackend([session({ end: null, duration: 0 })]);
    renderTab();
    await screen.findByRole("button", { name: STOP_SESSION_LABEL });

    const announced = timerRegion().textContent;
    await tick(5_000);

    expect(timerRegion().textContent).toBe(announced);
    expect(screen.getByText(formatClock(5))).toBeInTheDocument();

    await tick(MINUTE_MS);

    expect(timerRegion()).toHaveTextContent(formatDuration(65));
  });
});

/* ============================================================================
   El resto del tab, con el reloj real: acá no se mide tiempo, se mide qué se ve.
   ============================================================================ */
describe("SessionsTab — historial y estados", () => {
  it("lista las sesiones cerradas con su fecha y su duración, y las suma", async () => {
    serveBackend([
      session({ id: "s2", duration: 1800 }),
      session({ id: "s1", duration: 600 }),
    ]);
    renderTab();

    await waitFor(() => {
      expect(screen.getAllByText(formatDuration(1800))).not.toHaveLength(0);
    });

    const total = screen.getByText(SESSIONS_TOTAL_LABEL).parentElement;
    expect(total).toHaveTextContent(formatDuration(2400));
    expect(
      screen.getAllByText(formatDateTime(NOW.toISOString()) ?? ""),
    ).toHaveLength(2);
  });

  it("sin sesiones lo dice, en vez de dejar la lista vacía", async () => {
    renderTab();

    expect(await screen.findByText(NO_SESSIONS)).toBeInTheDocument();
  });

  /** La sesión que corre NO está en el historial: se ve arriba, en el cronómetro. */
  it("la sesión en marcha no se cuela en el historial", async () => {
    serveBackend([session({ id: "s2", end: null, duration: 0 })]);
    renderTab();

    expect(await screen.findByText(NO_SESSIONS)).toBeInTheDocument();
  });

  it("un fallo al traer el historial se cuenta con su reintento", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));
    renderTab();

    expect(
      await screen.findByRole("heading", { name: DETAIL_ERROR_TITLE }),
    ).toBeInTheDocument();
    expect(screen.getByText(NETWORK_ERROR_MESSAGE)).toBeInTheDocument();

    const user = userEvent.setup();
    serveBackend();
    await user.click(screen.getByRole("button", { name: /intent/i }));

    expect(await screen.findByText(NO_SESSIONS)).toBeInTheDocument();
  });

  /**
   * Parar dos veces responde **409** en el servidor de verdad. El componente no
   * pinta el control cuando no hay nada corriendo, así que ese camino se
   * comprueba desde el otro lado: lo que se ofrece es arrancar.
   */
  it("con el cronómetro parado sólo se ofrece arrancar", async () => {
    renderTab();
    await screen.findByText(NO_SESSIONS);

    expect(
      screen.getByRole("button", { name: START_SESSION_LABEL }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: STOP_SESSION_LABEL }),
    ).toBeNull();
  });

  it("un fallo al arrancar se cuenta sin borrar lo que ya se veía", async () => {
    const user = userEvent.setup();
    serveBackend([session({ id: "s2", duration: 600 })]);
    renderTab();
    await screen.findAllByText(formatDuration(600));

    fetchSpy.mockRejectedValue(new Error("sin red"));
    await user.click(screen.getByRole("button", { name: START_SESSION_LABEL }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      NETWORK_ERROR_MESSAGE,
    );
    expect(screen.getAllByText(formatDuration(600))).not.toHaveLength(0);
  });

  it("no tiene violaciones de axe con el historial cargado", async () => {
    serveBackend([session({ id: "s2", end: null, duration: 0 }), session()]);
    const { container } = renderTab();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: STOP_SESSION_LABEL }),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  /** E3(d): en este tab no hay ningún control cuyo destino no exista todavía. */
  it("no pinta ningún control sin destino", async () => {
    serveBackend([session()]);
    const { container } = renderTab();
    await screen.findAllByText(formatDuration(60));

    expect(
      within(container)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([START_SESSION_LABEL]);
    expect(within(container).queryByRole("link")).toBeNull();
  });
});
