// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { LinkedYarn } from "@/features/projects/types";
import { DIALOG_CLOSE_LABEL } from "@/shared/ui";

import {
  DETAIL_ERROR_TITLE,
  DETAIL_LOADING_MESSAGE,
  DETAIL_LOADING_REGION_LABEL,
  ProjectDetailDrawer,
} from "./ProjectDetailDrawer";
import { CRAFT_TYPE_LABELS } from "./project-filters";
import {
  ADD_ROUND_LABEL,
  DETAIL_TABS,
  DETAIL_TABS_LABEL,
  DETAIL_TAB_LABELS,
  EMPTY_INVENTORY,
  GENERAL_FIELD_LABELS,
  NO_END_DATE,
  NO_LINKED_YARNS,
  NO_NEEDLES,
  NO_NOTES,
  PROJECT_STATUS_LABELS,
  START_SESSION_LABEL,
  STOP_SESSION_LABEL,
  linkedYarnLabel,
} from "./project-detail";
import {
  NETWORK_ERROR_MESSAGE,
  projectDetailEndpoint,
  projectSessionsEndpoint,
} from "./projects-client";
import type {
  ProjectCardData,
  SerializedProject,
  SerializedProjectDetail,
} from "./types";

/**
 * **Los años se DERIVAN del reloj, nunca se escriben a mano** (deuda 164): un
 * fixture con el año en duro empieza a mentir el 1 de enero y sigue verde
 * mientras tanto. Lo que se afirma es el día y el mes, que sí son del fixture.
 */
const LAST_YEAR = String(new Date().getUTCFullYear() - 1);
const START_ISO = `${LAST_YEAR}-03-05T00:00:00.000Z`;
const START_TEXT = `5 de marzo de ${LAST_YEAR}`;
const END_ISO = `${LAST_YEAR}-07-21T00:00:00.000Z`;
const END_TEXT = `21 de julio de ${LAST_YEAR}`;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function project(patch: Partial<SerializedProject> = {}): SerializedProject {
  return {
    id: "bufanda",
    userId: "u",
    name: "Bufanda de invierno",
    image: null,
    type: "knitting",
    status: "in_progress",
    rounds: 12,
    targetRounds: 40,
    progress: 30,
    needles: [4, 4.5],
    startDate: START_ISO,
    endDate: null,
    time: 0,
    patternId: null,
    completedSteps: [],
    notes: "Punto elástico 2x2.",
    createdAt: START_ISO,
    updatedAt: START_ISO,
    ...patch,
  };
}

/** Lo que la lista ya tiene y le pasa al cajón: id, nombre, foto, progreso, tipo. */
function card(from: SerializedProject): ProjectCardData {
  return {
    id: from.id,
    name: from.name,
    image: from.image,
    progress: from.progress,
    time: from.time,
    type: from.type,
  };
}

const fetchSpy = vi.fn();

type Scenario = {
  detail?: SerializedProjectDetail;
  status?: number;
  error?: string;
  /** La petición no llega a salir (red caída). */
  offline?: boolean;
};

function serve(next: Scenario = {}) {
  fetchSpy.mockImplementation((url: string) => {
    if (next.offline === true) {
      return Promise.reject(new Error("sin red"));
    }
    /* El historial de sesiones tiene su propia forma y su propia ruta: servir el
       detalle para todo daría un `sessions` indefinido, o sea un estado que el
       backend no puede producir (REGLA 7). */
    if (String(url) === projectSessionsEndpoint("bufanda")) {
      return Promise.resolve(jsonResponse(200, { sessions: [] }));
    }
    const status = next.status ?? 200;
    return Promise.resolve(
      status === 200
        ? jsonResponse(200, next.detail ?? { project: project(), yarns: [] })
        : jsonResponse(status, { error: next.error ?? "roto" }),
    );
  });
}

/**
 * La misma respuesta, pero **retenida** hasta que el test la suelte. Es la única
 * forma honesta de mirar el estado de carga: un doble que resuelve al instante
 * no deja ver el fotograma que un usuario con red lenta sí ve.
 */
function serveLater(): () => void {
  let release = () => {};
  fetchSpy.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        release = () => {
          resolve(jsonResponse(200, { project: project(), yarns: [] }));
        };
      }),
  );
  return () => {
    release();
  };
}

/**
 * Montado **como lo monta la página**: la tarjeta de la lista es quien abre el
 * cajón, así que el disparador es un control de verdad y el foco tiene a dónde
 * volver. Un doble que abriera el cajón "ya abierto" mediría un estado que la
 * aplicación no puede alcanzar (REGLA 7).
 */
function DrawerHarness({ data }: { data?: SerializedProject }) {
  const row = data ?? project();
  const [open, setOpen] = useState(false);

  return (
    <main>
      <button type="button" onClick={() => setOpen(true)}>
        {`Ver detalle de ${row.name}`}
      </button>
      <ProjectDetailDrawer
        project={open ? card(row) : null}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}

/**
 * Monta la pantalla con **un solo** proyecto: el mismo que la lista le pasa al
 * cajón y el mismo que responde el endpoint. Son dos caminos distintos hacia el
 * mismo dato —la tarjeta pone el título, la petición pone el contenido— y
 * separarlos en el doble mediría un estado que producción no puede alcanzar
 * (REGLA 7).
 */
function renderDrawer(data = project(), scenario: Scenario = {}) {
  serve({ detail: { project: data, yarns: [] }, ...scenario });
  return render(<DrawerHarness data={data} />);
}

function trigger(name = "Ver detalle de Bufanda de invierno"): HTMLElement {
  return screen.getByRole("button", { name });
}

function drawer(): HTMLElement {
  return screen.getByRole("dialog");
}

/** Espera a que la región viva del cajón se calle: la carga terminó. */
async function settle() {
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL })
        .textContent,
    ).toBe(""),
  );
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  await settle();
  return drawer();
}

/** El valor del par etiqueta-valor, leído por su etiqueta. */
function fieldValue(label: string): string {
  const term = within(drawer()).getByText(label);
  return term.parentElement?.querySelector("dd")?.textContent ?? "";
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  serve();
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
  /* El cajón ES el `Dialog`, así que bloquea el scroll del documento mientras
     está abierto. Si un test lo dejara puesto, el siguiente arrancaría con el
     fondo bloqueado y mediría otra cosa (deuda 101). Se limpia ANTES de
     comprobar para que un rojo no arrastre en cascada. */
  const leftover = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "";
  expect(leftover, "el cajón se fue sin soltar el bloqueo").toBe("");
});

describe("ProjectDetailDrawer — montaje", () => {
  it("cerrado no monta nada ni pide nada (smoke)", () => {
    render(<DrawerHarness />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("se abre con el nombre del proyecto como título y pide su detalle", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);

    const panel = await open(user);

    expect(panel).toHaveAccessibleName("Bufanda de invierno");
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      projectDetailEndpoint("bufanda"),
    );
  });

  it("anuncia la carga en su propia región viva mientras viaja la petición", async () => {
    const user = userEvent.setup();
    const release = serveLater();
    render(<DrawerHarness />);

    await user.click(trigger());
    // La región del cajón lleva su propio nombre: la de la lista se llama
    // distinto, y dos regiones homónimas vuelven ambiguo el selector (deuda 114).
    expect(
      screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL }),
    ).toHaveTextContent(DETAIL_LOADING_MESSAGE);

    release();
    await settle();
  });
});

describe("ProjectDetailDrawer — tab General (RFC-03 §2)", () => {
  it("monta el carril de pestañas con la que ya tiene contenido", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);

    const list = screen.getByRole("tablist", { name: DETAIL_TABS_LABEL });
    expect(
      within(list).getByRole("tab", { name: DETAIL_TAB_LABELS.general }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("enseña tipo, estado, agujas, fechas y notas", async () => {
    const user = userEvent.setup();
    renderDrawer(project({ endDate: END_ISO }));
    await open(user);

    expect(fieldValue(GENERAL_FIELD_LABELS.type)).toBe(
      CRAFT_TYPE_LABELS.knitting,
    );
    expect(fieldValue(GENERAL_FIELD_LABELS.status)).toBe(
      PROJECT_STATUS_LABELS.in_progress,
    );
    expect(fieldValue(GENERAL_FIELD_LABELS.needles)).toBe("4 mm · 4,5 mm");
    expect(fieldValue(GENERAL_FIELD_LABELS.startDate)).toBe(START_TEXT);
    expect(fieldValue(GENERAL_FIELD_LABELS.endDate)).toBe(END_TEXT);
    expect(fieldValue(GENERAL_FIELD_LABELS.notes)).toBe("Punto elástico 2x2.");
  });

  /**
   * Los tres huecos que un proyecto recién creado tiene de verdad: `needles` es
   * `[]`, `endDate` es `null` y `notes` es la cadena vacía. No es un doble
   * inventado — son los defectos de la tabla.
   */
  it("un proyecto sin agujas, sin fin y sin notas dice qué falta, no un vacío", async () => {
    const user = userEvent.setup();
    renderDrawer(project({ needles: [], endDate: null, notes: "" }));
    await open(user);

    expect(fieldValue(GENERAL_FIELD_LABELS.needles)).toBe(NO_NEEDLES);
    expect(fieldValue(GENERAL_FIELD_LABELS.endDate)).toBe(NO_END_DATE);
    expect(fieldValue(GENERAL_FIELD_LABELS.notes)).toBe(NO_NOTES);
  });

  /** E3(d): lo que todavía no existe no se promete en pantalla. */
  it("no pinta ningún botón sin destino", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const panel = await open(user);

    const controls = within(panel)
      .getAllByRole("button")
      .map((button) => button.textContent);

    // El único botón del cajón es el de cerrar (la pestaña es `role="tab"`):
    // ni "Editar" (#22) ni "crear patrón" (#26-28), ni desactivados, ni
    // "próximamente". La lista se compara EXACTA para que caiga también el día
    // que alguien añada un control sin destino.
    expect(controls).toEqual([DIALOG_CLOSE_LABEL]);
    expect(
      within(panel).queryByRole("link"),
      "un enlace a una ruta que todavía no existe",
    ).toBeNull();
  });
});

describe("ProjectDetailDrawer — error", () => {
  it("un fallo de red se cuenta con su reintento, dentro del cajón", async () => {
    const user = userEvent.setup();
    renderDrawer(project(), { offline: true });
    await open(user);

    expect(
      within(drawer()).getByRole("heading", { name: DETAIL_ERROR_TITLE }),
    ).toBeInTheDocument();
    expect(within(drawer()).getByText(NETWORK_ERROR_MESSAGE)).toBeInTheDocument();
  });

  it("reintentar vuelve a pedir y pinta el detalle", async () => {
    const user = userEvent.setup();
    renderDrawer(project(), { offline: true });
    await open(user);

    serve();
    await user.click(within(drawer()).getByRole("button", { name: /intent/i }));
    await settle();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fieldValue(GENERAL_FIELD_LABELS.status)).toBe(
      PROJECT_STATUS_LABELS.in_progress,
    );
  });
});

describe("ProjectDetailDrawer — teclado y foco (RFC-03 §5)", () => {
  it("al abrir, el foco entra en el cajón y no se escapa tabulando", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const panel = await open(user);

    expect(panel).toHaveFocus();

    for (let step = 0; step < 5; step++) {
      await user.tab();
      expect(
        panel.contains(document.activeElement),
        `el foco se escapó del cajón en el paso ${step + 1}`,
      ).toBe(true);
    }
  });

  it("Escape cierra y devuelve el foco a quien lo abrió", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("el control de cierre también cierra", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const panel = await open(user);

    await user.click(
      within(panel).getByRole("button", { name: DIALOG_CLOSE_LABEL }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ProjectDetailDrawer — accesibilidad", () => {
  it("no tiene violaciones de axe con el detalle cargado", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<DrawerHarness />);
    await open(user);

    // `baseElement` y no `container`: el cajón vive en un portal al `body`.
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});

/* ============================================================================
   Las cuatro pestañas juntas (tanda 2 de la enmienda E3(a)). Acá no se
   re-testea cada tab —cada uno tiene su archivo— sino lo que sólo se puede ver
   con el cajón montado: que el carril las publica, que el contenido cambia, y
   que el cajón sigue siendo el dueño del proyecto cargado.
   ============================================================================ */
describe("ProjectDetailDrawer — las cuatro secciones", () => {
  async function goTo(
    user: ReturnType<typeof userEvent.setup>,
    tab: keyof typeof DETAIL_TAB_LABELS,
  ) {
    await user.click(screen.getByRole("tab", { name: DETAIL_TAB_LABELS[tab] }));
  }

  it("publica las cuatro del RFC, en su orden", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);

    const rail = screen.getByRole("tablist", { name: DETAIL_TABS_LABEL });
    expect(
      within(rail)
        .getAllByRole("tab")
        .map((tab) => tab.textContent),
    ).toEqual(DETAIL_TABS.map((name) => DETAIL_TAB_LABELS[name]));
  });

  it("cambiar de pestaña cambia lo que se ve, y sólo hay un panel", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);

    expect(screen.getByText(GENERAL_FIELD_LABELS.notes)).toBeInTheDocument();

    await goTo(user, "progress");

    expect(screen.queryByText(GENERAL_FIELD_LABELS.notes)).toBeNull();
    expect(
      screen.getByRole("button", { name: ADD_ROUND_LABEL }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });

  /**
   * **Las lanas enlazadas NO se piden otra vez**: viajan en `GET /api/projects/:id`
   * desde que la feature #17 saldó la deuda 5. El aserto que lo mide es el
   * número de peticiones, no la presencia del texto.
   */
  it("el tab Lanas pinta lo que ya trajo el detalle, sin pedir nada más", async () => {
    const user = userEvent.setup();
    const yarn: LinkedYarn = {
      id: "y1",
      colorName: "Crudo",
      colorFamily: "neutral",
      brandName: "Manos",
      typeName: "Merino",
    };
    serve({ detail: { project: project(), yarns: [yarn] } });
    render(<DrawerHarness />);
    await open(user);

    await goTo(user, "yarns");

    expect(screen.getByText(linkedYarnLabel(yarn))).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  /** Sin inventario que ofrecer, el tab lo dice en vez de callarse. */
  it("sin inventario de lanas el tab lo dice", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);

    await goTo(user, "yarns");

    expect(screen.getByText(NO_LINKED_YARNS)).toBeInTheDocument();
    expect(screen.getByText(EMPTY_INVENTORY)).toBeInTheDocument();
  });

  /**
   * El cajón es el dueño del proyecto cargado: los endpoints de Progreso
   * responden el proyecto entero ya recalculado y **el resto del cajón lo ve**.
   * Se comprueba volviendo a General, que es otra pestaña y otro componente.
   */
  it("lo que cambia en Progreso se queda cambiado al volver a General", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);
    await goTo(user, "progress");

    serve({
      detail: {
        project: project({ status: "finished", rounds: 13, progress: 33 }),
        yarns: [],
      },
    });
    await user.click(screen.getByRole("button", { name: ADD_ROUND_LABEL }));
    await screen.findByText("13 / 40");

    await goTo(user, "general");

    expect(fieldValue(GENERAL_FIELD_LABELS.status)).toBe(
      PROJECT_STATUS_LABELS.finished,
    );
  });

  it("el tab Sesiones monta el cronómetro", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);

    await goTo(user, "sessions");

    expect(
      await screen.findByRole("button", { name: START_SESSION_LABEL }),
    ).toBeInTheDocument();
  });

  it("no tiene violaciones de axe en ninguna de las cuatro", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<DrawerHarness />);
    await open(user);

    for (const name of DETAIL_TABS) {
      await goTo(user, name);
      // `baseElement` y no `container`: el cajón vive en un portal al `body`.
      expect(await axe(baseElement), name).toHaveNoViolations();
    }
  });
});

describe("ProjectDetailDrawer — el cronómetro no sobrevive al cajón", () => {
  /** Ver el porqué de intervenir SÓLO estos tres en `SessionsTab.test.tsx`. */
  const FAKED_TIMERS = ["Date", "setInterval", "clearInterval"] as const;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKED_TIMERS] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **El caso que hay que cuidar de verdad.** Con una sesión corriendo, cerrar
   * el cajón desmonta el tab, y si el intervalo sobreviviera seguiría pidiendo
   * renders de un componente que ya no existe — el clásico "no se puede
   * actualizar un componente desmontado", con el tiempo corriendo de fondo.
   * Se mide **contando temporizadores**, no leyendo el código.
   */
  it("cerrar el cajón con el cronómetro corriendo suelta el intervalo", async () => {
    const user = userEvent.setup();
    const running = {
      id: "s1",
      userId: "u",
      projectId: "bufanda",
      start: new Date().toISOString(),
      end: null,
      duration: 0,
    };
    fetchSpy.mockImplementation((url: string) =>
      Promise.resolve(
        String(url) === projectSessionsEndpoint("bufanda")
          ? jsonResponse(200, { sessions: [running] })
          : jsonResponse(200, { project: project(), yarns: [] }),
      ),
    );

    render(<DrawerHarness />);
    await open(user);
    await user.click(
      screen.getByRole("tab", { name: DETAIL_TAB_LABELS.sessions }),
    );
    await screen.findByRole("button", { name: STOP_SESSION_LABEL });

    expect(vi.getTimerCount()).toBe(1);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  /** Y cambiar de pestaña también lo suelta: el carril monta sólo la elegida. */
  it("cambiar de pestaña también suelta el intervalo", async () => {
    const user = userEvent.setup();
    const running = {
      id: "s1",
      userId: "u",
      projectId: "bufanda",
      start: new Date().toISOString(),
      end: null,
      duration: 0,
    };
    fetchSpy.mockImplementation((url: string) =>
      Promise.resolve(
        String(url) === projectSessionsEndpoint("bufanda")
          ? jsonResponse(200, { sessions: [running] })
          : jsonResponse(200, { project: project(), yarns: [] }),
      ),
    );

    render(<DrawerHarness />);
    await open(user);
    await user.click(
      screen.getByRole("tab", { name: DETAIL_TAB_LABELS.sessions }),
    );
    await screen.findByRole("button", { name: STOP_SESSION_LABEL });

    await user.click(
      screen.getByRole("tab", { name: DETAIL_TAB_LABELS.general }),
    );

    expect(vi.getTimerCount()).toBe(0);
  });
});
