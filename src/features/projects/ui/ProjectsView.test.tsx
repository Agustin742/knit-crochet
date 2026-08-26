// @vitest-environment happy-dom
import type { ReactNode } from "react";

import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NEEDLE_SIZES, SECONDS_PER_HOUR } from "@/shared/config";
import { formatClock, formatDuration } from "@/shared/lib/format";
import { CONFIRM_DIALOG_CANCEL_LABEL, DIALOG_CLOSE_LABEL } from "@/shared/ui";

import {
  openDetailLabel,
  quickStartLabel,
  quickStopLabel,
} from "./ProjectCard";
import { DETAIL_LOADING_REGION_LABEL } from "./ProjectDetailDrawer";
import {
  DELETE_PROJECT_CONFIRM_LABEL,
  DELETE_PROJECT_LABEL,
  DETAIL_TAB_LABELS,
  START_SESSION_LABEL,
  STOP_SESSION_LABEL,
  EDIT_PROJECT_LABEL,
  EMPTY_INVENTORY,
  deleteProjectTitle,
  GENERAL_FIELD_LABELS,
  INVENTORY_UNAVAILABLE,
  linkYarnLabel,
} from "./project-detail";
import {
  ANY_OPTION_LABEL,
  MORE_FILTERS_LABEL,
  NEEDLE_LABEL,
  SEARCH_LABEL,
  STATUS_GROUP_LABEL,
  TYPE_GROUP_LABEL,
  YARN_LABEL,
  needleOptionLabel,
} from "./ProjectsToolbar";
import {
  CLEAR_FILTERS_LABEL,
  CREATE_PROJECT_LABELS,
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  ERROR_TITLE,
  LIST_SECTION_TITLE,
  LOADING_MESSAGE,
  LOADING_REGION_LABEL,
  NO_FILTER_MATCHES_TITLE,
  NO_MATCHES_TITLE,
  PAGE_TITLE,
  ProjectsView,
  QUICK_START_REGION_LABEL,
  quickStartResumedMessage,
  quickStartStartedMessage,
  quickStopMessage,
} from "./ProjectsView";
import { CRAFT_TYPE_LABELS, STATUS_FILTERS } from "./project-filters";
import {
  CREATE_SUBMIT_LABEL,
  EDIT_SUBMIT_LABEL,
  FORM_FIELD_LABELS,
  createFormTitle,
  editFormTitle,
} from "./project-form";
import {
  NETWORK_ERROR_MESSAGE,
  PATTERNS_ENDPOINT,
  PROJECTS_ENDPOINT,
  YARNS_ENDPOINT,
  projectDetailEndpoint,
  sessionStartEndpoint,
  sessionStopEndpoint,
} from "./projects-client";
import type {
  SerializedCraftSession,
  SerializedPattern,
  SerializedProject,
  SerializedProjectListItem,
  YarnOption,
} from "./types";

/**
 * El ovillo se dobla en el borde (happy-dom no tiene WebGL). El resto del design
 * system corre de verdad, así que `axe` mide el marcado real.
 */
vi.mock("@/shared/ui/three", () => ({
  AsciiYarn: ({ interactive = false }: { interactive?: boolean }) => (
    <span data-testid="ascii-yarn" data-interactive={String(interactive)} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const fetchSpy = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function project(
  patch: Partial<SerializedProjectListItem>,
): SerializedProjectListItem {
  return {
    activeSession: null,
    id: "p",
    userId: "u",
    name: "Proyecto",
    image: null,
    type: "knitting",
    status: "in_progress",
    rounds: 0,
    targetRounds: 0,
    progress: 0,
    needles: [],
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: null,
    time: 0,
    patternId: null,
    completedSteps: [],
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

const BUFANDA = project({
  id: "bufanda",
  name: "Bufanda de invierno",
  progress: 42,
  time: SECONDS_PER_HOUR * 3,
});
const GORRO = project({
  id: "gorro",
  name: "Gorró de lana",
  type: "crochet",
  progress: 10,
});

const CRUDO: YarnOption = {
  id: "0f1c4d3a-1111-4111-8111-111111111111",
  colorName: "Crudo",
  colorFamily: "neutral",
};

/**
 * El instante contra el que se miden los cronómetros de los tests que los miran.
 * Los que no tocan el reloj no lo necesitan: el arranque sólo se pinta si hay
 * sesión abierta.
 */
const NOW = new Date("2026-08-26T12:00:00.000Z");

/** Una sesión abierta que arrancó hace `seconds` segundos. */
function openSession(seconds: number) {
  return {
    id: "sesion-abierta",
    start: new Date(NOW.getTime() - seconds * 1000).toISOString(),
  };
}

/**
 * El proyecto **sin** su cronómetro: es lo que responden el detalle, el alta y
 * el parche. `activeSession` lo cuelga **sólo la lista** (E7 b3), y servirlo en
 * los otros payloads sería un estado que producción no puede alcanzar.
 */
function bareProject(entry: SerializedProjectListItem): SerializedProject {
  const { activeSession: _unused, ...rest } = entry;
  return rest;
}

type Scenario = {
  projects?: SerializedProjectListItem[];
  yarns?: YarnOption[];
  /** Status del `POST …/sessions/start`: 201 crea, 200 reutiliza. */
  sessionStatus?: number;
  /** Qué sesión devuelve el arranque. Recién creada por defecto. */
  startedSession?: { id: string; start: string };
  /** Status del `PATCH …/sessions/stop`: 200 para, **409 si ya estaba parado**. */
  stopStatus?: number;
  stopError?: string;
  /** El `time` recalculado que devuelve parar. */
  stoppedTime?: number;
  listStatus?: number;
  listError?: string;
  /** La biblioteca que ve el modal de #22. Vacía por defecto. */
  patterns?: SerializedPattern[];
  /** Status del `DELETE /api/projects/:id`. **204 sin cuerpo** por defecto. */
  deleteStatus?: number;
  deleteError?: string;
};

let scenario: Scenario = {};

/**
 * El id del proyecto dentro de una URL de sesiones
 * (`/api/projects/:id/sessions[...]`).
 */
function sessionProjectId(target: string): string {
  return target.slice(`${PROJECTS_ENDPOINT}/`.length).split("/")[0] ?? "";
}

/** Responde según el endpoint pedido, como haría el BFF real. */
function serve(next: Scenario = {}) {
  scenario = next;
  /* El historial de sesiones **con memoria**: arrancar deja una sesión abierta
     que el historial devuelve después, y parar la cierra. Sin esto, el tab
     Sesiones del cajón pediría su historial tras arrancar y vería una lista
     vacía —un estado que el backend no puede producir— y volvería a ofrecer
     "empezar" con el cronómetro en marcha (REGLA 7). */
  const history = new Map<string, SerializedCraftSession[]>();

  function sessionsOf(projectId: string): SerializedCraftSession[] {
    const existing = history.get(projectId);
    if (existing !== undefined) {
      return existing;
    }
    const created: SerializedCraftSession[] = [];
    history.set(projectId, created);
    return created;
  }

  fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
    const target = String(url);
    /* El método importa desde #22: la misma URL del detalle sirve el `GET` del
       cajón, el `PATCH` del modal y el `DELETE` del borrado, y responden cosas
       distintas — el borrado, un **204 sin cuerpo**. */
    const method = init?.method ?? "GET";

    if (target.includes("/sessions/start")) {
      const projectId = sessionProjectId(target);
      const opened = next.startedSession ?? openSession(0);
      const sessions = sessionsOf(projectId);
      if (!sessions.some((one) => one.end === null)) {
        sessions.unshift({
          ...opened,
          userId: "u",
          projectId,
          end: null,
          duration: 0,
        });
      }
      return Promise.resolve(
        jsonResponse(next.sessionStatus ?? 201, { session: opened }),
      );
    }
    /* Parar: **200** con la sesión cerrada y el `time` del proyecto ya
       recalculado, o **409** si no había nada corriendo — la asimetría del
       backend, que es la contraria a la que uno supone. */
    if (target.includes("/sessions/stop")) {
      const status = next.stopStatus ?? 200;
      if (status !== 200) {
        return Promise.resolve(
          jsonResponse(status, {
            error: next.stopError ?? "No hay ninguna sesión de tejido en marcha.",
          }),
        );
      }
      const sessions = sessionsOf(sessionProjectId(target));
      const openIndex = sessions.findIndex((one) => one.end === null);
      const open = sessions[openIndex];
      if (open !== undefined) {
        sessions[openIndex] = {
          ...open,
          end: NOW.toISOString(),
          duration: SECONDS_PER_HOUR,
        };
      }
      return Promise.resolve(
        jsonResponse(200, {
          session: { ...openSession(0), end: NOW.toISOString() },
          time: next.stoppedTime ?? SECONDS_PER_HOUR,
        }),
      );
    }
    if (target.endsWith("/sessions")) {
      return Promise.resolve(
        jsonResponse(200, { sessions: sessionsOf(sessionProjectId(target)) }),
      );
    }
    if (target.startsWith(YARNS_ENDPOINT)) {
      return Promise.resolve(jsonResponse(200, { yarns: next.yarns ?? [CRUDO] }));
    }
    if (target.startsWith(PATTERNS_ENDPOINT)) {
      return Promise.resolve(
        jsonResponse(200, { patterns: next.patterns ?? [] }),
      );
    }
    /* El detalle de UN proyecto (#21): se reconoce por llevar un id detrás del
       endpoint, y va ANTES que la lista porque su URL también empieza por ella.
       Responde el proyecto que la lista ya sirvió, que es lo que el backend
       haría: dos payloads distintos para el mismo id serían un estado que
       producción no puede alcanzar (REGLA 7). */
    const detailId = detailIdFrom(target);
    if (detailId !== null) {
      const found = (next.projects ?? [BUFANDA, GORRO]).find(
        (entry) => entry.id === detailId,
      );
      if (method === "DELETE") {
        const status = next.deleteStatus ?? 204;
        return Promise.resolve(
          status === 204
            ? new Response(null, { status: 204 })
            : jsonResponse(status, { error: next.deleteError ?? "roto" }),
        );
      }
      if (method === "PATCH") {
        const patch = JSON.parse(String(init?.body ?? "{}")) as Partial<
          SerializedProject
        >;
        return Promise.resolve(
          jsonResponse(200, {
            project: { ...bareProject(found ?? BUFANDA), ...patch },
          }),
        );
      }
      return Promise.resolve(
        found === undefined
          ? jsonResponse(404, { error: "El proyecto no existe." })
          : jsonResponse(200, { project: bareProject(found), yarns: [] }),
      );
    }
    if (target.startsWith(PROJECTS_ENDPOINT)) {
      if (method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as Partial<
          SerializedProject
        >;
        return Promise.resolve(
          jsonResponse(201, {
            project: { ...bareProject(BUFANDA), id: "nuevo", ...body },
          }),
        );
      }
      const status = next.listStatus ?? 200;
      return Promise.resolve(
        status === 200
          ? jsonResponse(200, { projects: next.projects ?? [BUFANDA, GORRO] })
          : jsonResponse(status, { error: next.listError ?? "roto" }),
      );
    }
    throw new Error(`URL inesperada en el test: ${target}`);
  });
}

/**
 * El id del detalle, o `null` si la URL no es la de un detalle. La lista lleva
 * la query detrás del endpoint y el detalle lleva **un segmento más**: es lo
 * único que las distingue, porque las dos empiezan igual.
 */
function detailIdFrom(target: string): string | null {
  const prefix = `${PROJECTS_ENDPOINT}/`;
  if (!target.startsWith(prefix) || target.includes("/sessions/")) {
    return null;
  }
  return target.slice(prefix.length);
}

/**
 * URLs de **lista** pedidas, en orden.
 *
 * La lista es el endpoint pelado, con o sin cadena de consulta: todo lo que
 * lleve un segmento detrás es **otra cosa** (el detalle de un proyecto, el
 * arranque de una sesión…). Se filtra por eso y no descartando rutas conocidas
 * una a una, que era lo de antes y ya se había quedado corto: desde que existe
 * el cajón, la URL del detalle **también** empieza por la de la lista y se
 * colaba en esta cuenta. Nada rompía hoy, pero el día que un test dijera "abrir
 * el cajón no vuelve a pedir la lista" habría salido **verde y falso**.
 *
 * **Y el método también se filtra, desde #22.** El alta es un `POST` a la URL
 * pelada de la lista, o sea exactamente la misma cadena, así que sin esto el
 * propio alta se contaba como "volvió a pedir la lista". No es hipotético: se
 * cazó por mutación —quitando la recarga posterior al alta, el test que la
 * exige **seguía verde**—, que es la segunda vez que este helper se queda corto
 * por mirar sólo la URL.
 */
function listUrls(): string[] {
  return fetchSpy.mock.calls
    .filter((call) => ((call[1] as RequestInit | undefined)?.method ?? "GET") === "GET")
    .map((call) => String(call[0]))
    .filter((url) => {
      if (!url.startsWith(PROJECTS_ENDPOINT)) {
        return false;
      }
      const rest = url.slice(PROJECTS_ENDPOINT.length);
      return rest === "" || rest.startsWith("?");
    });
}

function lastListUrl(): string {
  const urls = listUrls();
  return urls[urls.length - 1] ?? "";
}

/**
 * Espera a que la carga termine. Se apunta a la región viva **por su nombre**
 * (deuda 114): un `getByRole("status")` a secas sería ambiguo, porque esta
 * pantalla monta dos regiones vivas —la carga y el cronómetro—.
 */
async function settle() {
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: LOADING_REGION_LABEL }).textContent,
    ).toBe(""),
  );
}

async function renderReady(next: Scenario = {}) {
  serve(next);
  const view = render(<ProjectsView />);
  await settle();
  return view;
}

function statusToggle(index: 0 | 1): HTMLElement {
  const group = screen.getByRole("group", { name: STATUS_GROUP_LABEL });
  const option = STATUS_FILTERS[index];
  return within(group).getByRole("button", { name: option?.label ?? "" });
}

function quickStartRegion(): HTMLElement {
  return screen.getByRole("status", { name: QUICK_START_REGION_LABEL });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  scenario = {};
  vi.unstubAllGlobals();
  /* Lo que se mide es que **no queda** bloqueo de scroll al desmontar. "Más
     filtros" sigue siendo un `<details>` nativo y no bloquea nada (E1(g)); el
     cajón de detalle (#21) **sí** bloquea mientras está abierto, y por eso el
     aserto vale más que antes: si un test lo dejara abierto sin que el `Dialog`
     soltara el bloqueo, contaminaría a los siguientes archivos con todo en verde
     (deuda 101). Se limpia ANTES de comprobar. */
  const leftover = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "";
  expect(leftover, "algo se fue sin soltar el bloqueo de scroll").toBe("");
});

describe("ProjectsView (smoke y composición)", () => {
  it("monta el título, el toolbar y una tarjeta por proyecto", async () => {
    await renderReady();

    expect(
      screen.getByRole("heading", { level: 1, name: PAGE_TITLE }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: STATUS_GROUP_LABEL }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: TYPE_GROUP_LABEL }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: BUFANDA.name }),
    ).toBeInTheDocument();
  });

  /**
   * ENMIENDA E2(a): la lista es una **sección con título visible**, como las dos
   * del Dashboard. Antes era una pila plana colgando de un `h1` suelto.
   *
   * Las dos direcciones importan: el título tiene que **estar** y el `h1` tiene
   * que **seguir siendo uno solo** (el gate de composición de la página cuenta
   * exactamente uno, y una sección nueva es la forma fácil de romperlo).
   */
  it("pone la lista en una sección con título visible, sin tocar el único h1", async () => {
    const { container } = await renderReady();

    const title = screen.getByRole("heading", {
      level: 2,
      name: LIST_SECTION_TITLE,
    });
    expect(title).toBeInTheDocument();
    expect(title.className).not.toContain(["sr", "only"].join("-"));

    const section = container.querySelector(
      `section[aria-labelledby="${title.id}"]`,
    );
    expect(section).not.toBeNull();
    expect(
      within(section as HTMLElement).getAllByRole("heading", { level: 3 }),
    ).toHaveLength(2);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("no tiene violaciones de axe con la lista cargada", async () => {
    const { container } = await renderReady();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("no tiene violaciones de axe en el estado vacío", async () => {
    const { container } = await renderReady({ projects: [] });

    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * ANCLA DE CONTRATO del "default activos" (enmienda E1(i)): **el backend no
 * tiene default**. Sin el parámetro devuelve activos E inactivos, así que la
 * página tiene que mandar `?active=true` **explícitamente** en la primera carga.
 * Y `active` sólo acepta las cadenas `"true"`/`"false"`: `?active=1` es un 400.
 */
describe("filtros que viajan al servidor", () => {
  it("pide los activos explícitamente en la primera carga", async () => {
    await renderReady();

    expect(listUrls()[0]).toBe(`${PROJECTS_ENDPOINT}?active=true`);
  });

  it("conmuta a inactivos y mantiene la exclusividad del segmentado", async () => {
    await renderReady();

    expect(statusToggle(0)).toHaveAttribute("aria-pressed", "true");
    expect(statusToggle(1)).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(statusToggle(1));
    await settle();

    expect(lastListUrl()).toBe(`${PROJECTS_ENDPOINT}?active=false`);
    expect(statusToggle(0)).toHaveAttribute("aria-pressed", "false");
    expect(statusToggle(1)).toHaveAttribute("aria-pressed", "true");
  });

  /** Volver a tocar la mitad ya elegida no puede dejar el segmentado sin ninguna. */
  it("no permite quedarse sin ninguna mitad elegida", async () => {
    await renderReady();

    await userEvent.click(statusToggle(0));
    await settle();

    expect(statusToggle(0)).toHaveAttribute("aria-pressed", "true");
    expect(lastListUrl()).toBe(`${PROJECTS_ENDPOINT}?active=true`);
  });

  it("manda un solo craft type, y ninguno cuando están los dos", async () => {
    await renderReady();
    const typeGroup = screen.getByRole("group", { name: TYPE_GROUP_LABEL });

    await userEvent.click(
      within(typeGroup).getByRole("button", { name: CRAFT_TYPE_LABELS.crochet }),
    );
    await settle();
    expect(lastListUrl()).toBe(
      `${PROJECTS_ENDPOINT}?active=true&type=crochet`,
    );

    await userEvent.click(
      within(typeGroup).getByRole("button", { name: CRAFT_TYPE_LABELS.knitting }),
    );
    await settle();
    expect(lastListUrl()).toBe(`${PROJECTS_ENDPOINT}?active=true`);
  });

  it("manda la aguja elegida en 'más filtros'", async () => {
    await renderReady();

    const size = NEEDLE_SIZES[4];
    await userEvent.selectOptions(
      screen.getByLabelText(NEEDLE_LABEL),
      String(size),
    );
    await settle();

    expect(lastListUrl()).toBe(
      `${PROJECTS_ENDPOINT}?active=true&needle=${String(size)}`,
    );
  });

  it("manda la lana elegida en 'más filtros'", async () => {
    await renderReady();

    await waitFor(() =>
      expect(
        within(screen.getByLabelText(YARN_LABEL)).getByRole("option", {
          name: CRUDO.colorName,
        }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText(YARN_LABEL), CRUDO.id);
    await settle();

    expect(lastListUrl()).toBe(
      `${PROJECTS_ENDPOINT}?active=true&yarnId=${CRUDO.id}`,
    );
  });
});

/**
 * GATE DE LA ENMIENDA E1(a): **"buscar" no viaja al servidor.**
 *
 * `projectFiltersSchema` es un `z.object` sin `.strict()`, así que un parámetro
 * de texto no daría 400: daría **200 con la lista sin filtrar**. Un buscador
 * cableado contra un parámetro inexistente no falla, **miente** — y por eso el
 * gate no comprueba sólo que el filtrado funcione, sino que **no sale ninguna
 * petición** y que **ninguna URL pedida menciona el texto**.
 */
describe("buscar es de cliente (E1(a))", () => {
  it("filtra por nombre sin volver a pedir la lista", async () => {
    await renderReady();
    const before = listUrls().length;

    await userEvent.type(screen.getByLabelText(SEARCH_LABEL), "bufanda");

    expect(
      screen.getByRole("heading", { name: BUFANDA.name }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: GORRO.name })).toBeNull();
    expect(listUrls()).toHaveLength(before);
  });

  it("no mete el texto en ninguna URL pedida", async () => {
    await renderReady();

    await userEvent.type(screen.getByLabelText(SEARCH_LABEL), "bufanda");

    for (const url of fetchSpy.mock.calls.map(([value]) => String(value))) {
      expect(url, url).not.toContain("search");
      expect(url, url).not.toContain("bufanda");
    }
  });

  it("ignora las tildes en las dos direcciones", async () => {
    await renderReady();

    await userEvent.type(screen.getByLabelText(SEARCH_LABEL), "gorro");

    expect(
      screen.getByRole("heading", { name: GORRO.name }),
    ).toBeInTheDocument();
  });

  it("dice que no hay coincidencias en vez de fingir un cesto vacío", async () => {
    await renderReady();

    await userEvent.type(screen.getByLabelText(SEARCH_LABEL), "chaleco");

    expect(screen.getByText(NO_MATCHES_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TITLE)).toBeNull();
  });
});

/** "Más filtros" es un `<details>` NATIVO, no un modal (enmienda E1(g)). */
describe("'más filtros' (E1(g))", () => {
  it("es un desplegable nativo, y arranca cerrado", async () => {
    const { container } = await renderReady();

    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);
    expect(within(details as HTMLElement).getByText(MORE_FILTERS_LABEL)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ofrece la lista fija de agujas más la opción de no filtrar", async () => {
    await renderReady();

    const select = screen.getByLabelText(NEEDLE_LABEL);
    const options = within(select).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      ANY_OPTION_LABEL,
      ...NEEDLE_SIZES.map((size) => needleOptionLabel(size)),
    ]);
  });
});

describe("los tres estados (RFC-03 §4)", () => {
  it("pinta bloques de carga y anuncia la carga una sola vez", async () => {
    serve();
    const { container } = render(<ProjectsView />);

    expect(
      screen.getByRole("status", { name: LOADING_REGION_LABEL }).textContent,
    ).toBe(LOADING_MESSAGE);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryAllByRole("progressbar")).toHaveLength(0);

    await settle();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  /**
   * Con #22 **dejaron de ser enlaces al Dashboard**: cada uno abre el modal con
   * su clase de tejido preseleccionada, que es lo que `ProjectsView` dejó
   * anticipado por escrito cuando el formulario todavía no existía.
   */
  it("ofrece los dos botones de crear cuando el cesto está vacío", async () => {
    await renderReady({ projects: [] });

    expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument();
    for (const label of Object.values(CREATE_PROJECT_LABELS)) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  /**
   * LA TRAMPA DE E2(e), ANCLADA: **el estado por defecto no cuenta como
   * filtrar**. La primera carga manda `?active=true` porque el backend no tiene
   * default (E1(i)), así que la regla ingenua "hay parámetros → el vacío es de
   * filtros" haría que un cesto de verdad vacío dijera "ningún proyecto pasa
   * esos filtros" **y escondiera los dos botones de crear**.
   */
  it("el vacío de arranque es el cesto vacío, no un vacío de filtros", async () => {
    await renderReady({ projects: [] });

    expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(NO_FILTER_MATCHES_TITLE)).toBeNull();
    expect(
      screen.queryByRole("button", { name: CLEAR_FILTERS_LABEL }),
    ).toBeNull();
  });

  it("no le explica el andamiaje del proyecto a quien no tiene ninguno", async () => {
    await renderReady({ projects: [] });

    expect(screen.getByText(EMPTY_DESCRIPTION)).toBeInTheDocument();
    expect(screen.queryByText(/en dos pasos/i)).toBeNull();
    expect(screen.queryByText(/te llevan al inicio/i)).toBeNull();
  });

  /**
   * El defecto medido en navegador: con "Inactivos" pulsado y un proyecto en el
   * cesto, la página decía *"Tu cesto está vacío — empezá un proyecto"* y
   * empujaba a crear otro. Ahora dice qué pasó y ofrece la salida.
   */
  it("distingue 'tus filtros no devuelven nada' de 'no tenés proyectos'", async () => {
    await renderReady();

    serve({ projects: [] });
    await userEvent.click(statusToggle(1));
    await settle();

    expect(screen.getByText(NO_FILTER_MATCHES_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TITLE)).toBeNull();
    for (const label of Object.values(CREATE_PROJECT_LABELS)) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
  });

  /** Sin este control el usuario queda en un callejón sin salida. */
  it("ofrece quitar los filtros y con eso vuelve a la vista por defecto", async () => {
    await renderReady();

    serve({ projects: [] });
    await userEvent.click(statusToggle(1));
    await settle();
    expect(lastListUrl()).toBe(`${PROJECTS_ENDPOINT}?active=false`);

    serve({ projects: [BUFANDA, GORRO] });
    await userEvent.click(
      screen.getByRole("button", { name: CLEAR_FILTERS_LABEL }),
    );
    await settle();

    expect(lastListUrl()).toBe(`${PROJECTS_ENDPOINT}?active=true`);
    expect(statusToggle(0)).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", { name: BUFANDA.name }),
    ).toBeInTheDocument();
  });

  it("no tiene violaciones de axe en el vacío por filtros", async () => {
    const { container } = await renderReady();

    serve({ projects: [] });
    await userEvent.click(statusToggle(1));
    await settle();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("muestra 'Se soltó un punto' con el mensaje del servidor y reintenta", async () => {
    await renderReady({ listStatus: 500, listError: "La base se cayó." });

    expect(screen.getByText(ERROR_TITLE)).toBeInTheDocument();
    expect(screen.getByText("La base se cayó.")).toBeInTheDocument();

    const before = listUrls().length;
    serve({ projects: [BUFANDA] });
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await settle();

    expect(listUrls().length).toBeGreaterThan(before);
    expect(
      screen.getByRole("heading", { name: BUFANDA.name }),
    ).toBeInTheDocument();
  });

  it("trata la red caída como error de pantalla", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));
    render(<ProjectsView />);

    await waitFor(() =>
      expect(screen.getByText(NETWORK_ERROR_MESSAGE)).toBeInTheDocument(),
    );
    expect(screen.getByText(ERROR_TITLE)).toBeInTheDocument();
  });
});

/**
 * El quick-start **sólo arranca** (enmienda E1(e)). El start es idempotente:
 * **201** si crea, **200** si reutiliza una sesión abierta. Nunca 409 —ése vive
 * en el *stop*—, así que el botón puede ser optimista.
 */
describe("quick-start del cronómetro (E1(e))", () => {
  it("llama al start del proyecto, sin cuerpo, y anuncia que arrancó", async () => {
    await renderReady();

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(quickStartRegion().textContent).toBe(
        quickStartStartedMessage(BUFANDA.name),
      ),
    );

    const call = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes("/sessions/start"),
    );
    expect(call?.[0]).toBe(sessionStartEndpoint(BUFANDA.id));
    expect((call?.[1] as RequestInit | undefined)?.method).toBe("POST");
    expect((call?.[1] as RequestInit | undefined)?.body).toBeUndefined();
  });

  /** 200 = ya había una sesión abierta y el servidor la reutilizó. */
  it("distingue el 200 del 201 y lo dice con otras palabras", async () => {
    await renderReady({ sessionStatus: 200 });

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(GORRO.name) }),
    );

    await waitFor(() =>
      expect(quickStartRegion().textContent).toBe(
        quickStartResumedMessage(GORRO.name),
      ),
    );
  });

  it("anuncia el error del servidor sin tumbar la lista", async () => {
    await renderReady();
    fetchSpy.mockImplementation((url: string) =>
      String(url).includes("/sessions/start")
        ? Promise.resolve(jsonResponse(404, { error: "El proyecto no existe." }))
        : Promise.resolve(jsonResponse(200, { projects: [BUFANDA, GORRO] })),
    );

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(quickStartRegion().textContent).toBe("El proyecto no existe."),
    );
    expect(
      screen.getByRole("heading", { name: BUFANDA.name }),
    ).toBeInTheDocument();
  });

  /**
   * ENMIENDA E2(d): el aviso **se ve**. Medido en navegador real, la región viva
   * medía un píxel por un píxel con `clip-path`, o sea que el único feedback de
   * la acción era para lector de pantalla: quien miraba veía un parpadeo de dos
   * décimas y después nada.
   *
   * Se comprueba que el nodo **no** lleva la clase de "sólo lector de pantalla"
   * comparando la LISTA de clases, no la cadena: la variante que la aplica
   * cuando está vacío contiene ese nombre como sufijo y un `toContain` sobre el
   * texto daría un falso rojo.
   */
  it("el aviso del quick-start se ve, no sólo se anuncia", async () => {
    await renderReady();

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );
    await waitFor(() =>
      expect(quickStartRegion().textContent).toBe(
        quickStartStartedMessage(BUFANDA.name),
      ),
    );

    expect(quickStartRegion().className.split(/\s+/)).not.toContain(
      ["sr", "only"].join("-"),
    );
  });

  /**
   * El agujero que señaló el explore de tests: ningún test comprobaba que la
   * región viva estuviera **montada antes** de que llegue el mensaje, que es la
   * condición para que un lector de pantalla anuncie el cambio. Si alguien la
   * convierte en render condicional, la suite seguía verde y la región dejaba de
   * anunciar. Ya no.
   */
  it("la región del cronómetro está montada antes de tocar nada", async () => {
    await renderReady();

    expect(quickStartRegion()).toBeInTheDocument();
    expect(quickStartRegion().textContent).toBe("");
  });

  /**
   * **La tarjeta que arrancó cambia de estado, no de leyenda** (enmienda **E7
   * (b1)** y **(b4)**).
   *
   * Lo que había acá antes era la marca efímera —*"Lo arrancaste recién"*—, y se
   * retira con su motivo: existía **porque el estado no era persistente**, así
   * que hablaba de lo que acababa de pasar en vez de lo que está pasando. Ahora
   * el estado llega del servidor y se comunica donde tiene que estar: en el
   * propio control.
   *
   * El aviso por región viva **se queda** y se prueba más arriba: informa de que
   * la pulsación surtió efecto, que es otra cosa.
   */
  it("tras arrancar, el botón de esa tarjeta ofrece parar, y sólo el de esa", async () => {
    await renderReady();

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    ).toBeNull();
    // El vecino no se contagia: cada proyecto tiene su propio cronómetro.
    expect(
      screen.getByRole("button", { name: quickStartLabel(GORRO.name) }),
    ).toBeInTheDocument();
  });

  /** 200 = ya venía corriendo. El botón acaba igual: ofreciendo parar. */
  it("también deja el botón en parar cuando el cronómetro ya venía en marcha", async () => {
    await renderReady({ sessionStatus: 200 });

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(GORRO.name) }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: quickStopLabel(GORRO.name) }),
      ).toBeInTheDocument(),
    );
  });

  /** Un fallo no puede dejar el botón diciendo que hay algo corriendo. */
  it("no cambia el botón cuando el arranque falla", async () => {
    await renderReady();
    fetchSpy.mockImplementation((url: string) =>
      String(url).includes("/sessions/start")
        ? Promise.resolve(jsonResponse(404, { error: "El proyecto no existe." }))
        : Promise.resolve(jsonResponse(200, { projects: [BUFANDA, GORRO] })),
    );

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(quickStartRegion().textContent).toBe("El proyecto no existe."),
    );
    expect(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    ).toBeNull();
  });

  it("no tiene violaciones de axe con el aviso a la vista", async () => {
    const { container } = await renderReady();

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );
    await waitFor(() =>
      expect(quickStartRegion().textContent).not.toBe(""),
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("monta un quick-start por tarjeta y ninguno fuera de ellas", async () => {
    await renderReady();

    for (const entry of [BUFANDA, GORRO]) {
      expect(
        screen.getByRole("button", { name: quickStartLabel(entry.name) }),
      ).toBeInTheDocument();
    }
  });

  /**
   * La tarjeta **es tocable desde #21**, pero sigue sin ser un enlace: el tap
   * abre el cajón, no navega, y un `a` envolviendo al quick-start sería marcado
   * inválido (E1(f)).
   */
  it("no enlaza las tarjetas a ninguna parte", async () => {
    await renderReady();

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

/**
 * EL CRONÓMETRO SE VE Y SE PARA DESDE LA LISTA (RFC-03, enmienda **E7 (b)**),
 * de punta a punta.
 *
 * Lo que se mide acá y no en la tarjeta suelta: que **el estado viene del
 * servidor** —o sea que sobrevive a recargar—, que parar habla con el endpoint
 * correcto, y que el resultado deja la lista coherente.
 */
describe("ProjectsView — cronómetro en la tarjeta (E7 b)", () => {
  const FAKED_TIMERS = ["Date", "setInterval", "clearInterval"] as const;

  const CORRIENDO = project({
    ...BUFANDA,
    activeSession: openSession(65),
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKED_TIMERS] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function user() {
    return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  }

  /**
   * **El defecto raíz de la ficha 186:** tras un F5, con la sesión abierta en el
   * servidor, el botón decía «Empezar». Nada se toca en este test: la lista
   * llega y el control ya sabe en qué estado está.
   */
  it("con una sesión abierta en el servidor, la tarjeta nace ofreciendo parar", async () => {
    await renderReady({ projects: [CORRIENDO, GORRO] });

    expect(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    ).toBeNull();
  });

  /** Y con él, el tiempo transcurrido: contado desde el arranque real (E7 b2). */
  it("pinta el tiempo transcurrido desde el arranque que llegó del servidor", async () => {
    await renderReady({ projects: [CORRIENDO, GORRO] });

    expect(screen.getByText(formatClock(65))).toBeInTheDocument();
  });

  /**
   * **Varios cronómetros a la vez.** La invariante del backend es "como mucho
   * una sesión abierta **por proyecto**", así que dos proyectos pueden estar
   * corriendo al mismo tiempo y cada tarjeta tiene que mostrar **el suyo**.
   */
  it("sostiene dos cronómetros a la vez, cada uno con su tiempo", async () => {
    await renderReady({
      projects: [
        CORRIENDO,
        project({ ...GORRO, activeSession: openSession(3_600) }),
      ],
    });

    expect(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: quickStopLabel(GORRO.name) }),
    ).toBeInTheDocument();
    expect(screen.getByText(formatClock(65))).toBeInTheDocument();
    expect(screen.getByText(formatClock(3_600))).toBeInTheDocument();
  });

  /** El reloj de la tarjeta corre solo, sin volver a pedir nada al servidor. */
  it("el reloj de la tarjeta avanza solo", async () => {
    await renderReady({ projects: [CORRIENDO] });
    const antes = fetchSpy.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByText(formatClock(70))).toBeInTheDocument();
    expect(fetchSpy.mock.calls.length).toBe(antes);
  });

  it("arrancar deja el reloj en el arranque que devolvió el servidor, no en cero", async () => {
    /* 200 = ya había una sesión abierta: su arranque es el de ANTES. Empezar a
       contar desde cero acá sería pintar un tiempo que nunca existió. */
    await renderReady({
      sessionStatus: 200,
      startedSession: openSession(120),
    });

    await user().click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(screen.getByText(formatClock(120))).toBeInTheDocument(),
    );
  });

  it("parar habla con el endpoint de parar, sin cuerpo", async () => {
    await renderReady({ projects: [CORRIENDO] });

    await user().click(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
      ).toBeInTheDocument(),
    );

    const call = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes("/sessions/stop"),
    );
    expect(call?.[0]).toBe(sessionStopEndpoint(BUFANDA.id));
    expect((call?.[1] as RequestInit | undefined)?.method).toBe("PATCH");
    expect((call?.[1] as RequestInit | undefined)?.body).toBeUndefined();
  });

  it("parar borra el reloj de la tarjeta y lo anuncia", async () => {
    await renderReady({ projects: [CORRIENDO] });

    await user().click(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(quickStartRegion().textContent).toBe(
        quickStopMessage(BUFANDA.name),
      ),
    );
    expect(screen.queryByText(formatClock(65))).toBeNull();
  });

  /**
   * El `time` del proyecto lo **recalcula el servidor** y viaja en la respuesta
   * de parar. Sin usarlo, la tarjeta seguiría enseñando el total de antes de la
   * sesión que se acaba de cerrar: una cifra vieja al lado del botón que la
   * acaba de cambiar.
   */
  it("actualiza el tiempo tejido con el total que devuelve el servidor", async () => {
    await renderReady({
      projects: [project({ ...CORRIENDO, time: 0 })],
      stoppedTime: SECONDS_PER_HOUR * 2,
    });

    await user().click(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(formatDuration(SECONDS_PER_HOUR * 2), {
          exact: false,
        }),
      ).toBeInTheDocument(),
    );
  });

  /**
   * **La asimetría del backend:** arrancar dos veces es gratis, pero parar dos
   * veces responde **409**. Si el servidor dice que no pudo parar, la tarjeta no
   * puede quedarse diciendo que paró.
   */
  it("un 409 al parar se anuncia y deja el botón como estaba", async () => {
    await renderReady({ projects: [CORRIENDO], stopStatus: 409 });

    await user().click(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(quickStartRegion().textContent).toBe(
        "No hay ninguna sesión de tejido en marcha.",
      ),
    );
    expect(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    ).toBeInTheDocument();
  });

  /**
   * **LA TERCERA PUERTA DE LA FICHA 186: el modal de edición.**
   *
   * `PATCH /:id` responde el proyecto **sin** `activeSession` —ese dato lo
   * cuelga sólo la lista (E7 b3)— y renombrar un proyecto no para ninguna
   * sesión. Si al guardar la tarjeta se reemplazara con lo que devuelve el
   * parche **a secas**, el reloj se apagaría y el botón volvería a ofrecer
   * «Empezar a tejer» con la sesión **abierta en el servidor**: exactamente el
   * defecto que este lote vino a matar, entrando por otro sitio.
   *
   * Ni la tarjeta (b1) ni el cajón (el puente de vuelta) cubren este camino:
   * hace falta cruzar el cronómetro con la edición, que es lo que mide este
   * test. El nombre nuevo se comprueba de paso, para que el aserto no pueda
   * pasar mirando una tarjeta que no se actualizó.
   */
  it("guardar una edición no apaga el cronómetro de la tarjeta", async () => {
    const NOMBRE_EDITADO = "Bufanda corta";
    const person = user();
    await renderReady({ projects: [CORRIENDO, GORRO] });

    await person.click(
      screen.getByRole("button", { name: openDetailLabel(BUFANDA.name) }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL })
          .textContent,
      ).toBe(""),
    );
    await person.click(screen.getByRole("button", { name: EDIT_PROJECT_LABEL }));
    await screen.findByRole("heading", { name: editFormTitle(BUFANDA.name) });

    /* El modal se abre ENCIMA del cajón, así que hay dos diálogos montados y el
       de arriba es el último. Es el estado real de la pantalla. */
    const dialogs = screen.getAllByRole("dialog");
    const modal = dialogs[dialogs.length - 1];
    if (modal === undefined) {
      throw new Error("el modal de edición no se montó");
    }
    const nameField = within(modal).getByLabelText(FORM_FIELD_LABELS.name);
    await person.clear(nameField);
    await person.type(nameField, NOMBRE_EDITADO);
    await person.click(
      within(modal).getByRole("button", { name: EDIT_SUBMIT_LABEL }),
    );
    await waitFor(() => expect(detailCalls("PATCH")).toHaveLength(1));

    /* Se cierra el cajón para mirar **la tarjeta**, que es donde vive la promesa
       de E7 (b1). Se cierra por su botón y no con `Escape` porque el modal se
       acaba de desmontar y el foco todavía no está dentro del cajón: el atajo
       viaja por el `keydown` del panel, así que sin foco dentro no llegaría. */
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
    await person.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: DIALOG_CLOSE_LABEL,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(
      screen.getByRole("button", { name: quickStopLabel(NOMBRE_EDITADO) }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: quickStartLabel(NOMBRE_EDITADO) }),
    ).toBeNull();
    expect(screen.getByText(formatClock(65))).toBeInTheDocument();
  });

  it("no tiene violaciones de axe con un cronómetro corriendo en la lista", async () => {
    const { container } = await renderReady({ projects: [CORRIENDO, GORRO] });

    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * **LA MISMA MENTIRA POR LA OTRA PUERTA.** El cajón de detalle también arranca y
 * para el cronómetro, y desde E7 la tarjeta de detrás **afirma** en qué estado
 * está: sin este camino de vuelta, tocar el cronómetro dentro del cajón y
 * cerrarlo dejaría la tarjeta ofreciendo lo contrario de lo que pasa en el
 * servidor — que es exactamente la ficha 186.
 *
 * El cajón **no cambia en nada de lo que se ve**: sigue con su reloj y su botón.
 * Lo único que se añadió es el aviso hacia arriba, por el mismo camino que ya
 * recorría el tiempo total.
 */
describe("ProjectsView — el cronómetro del cajón llega a la tarjeta (E7 b)", () => {
  async function openSessionsTab(name: string) {
    await userEvent.click(
      screen.getByRole("button", { name: openDetailLabel(name) }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL })
          .textContent,
      ).toBe(""),
    );
    const drawer = screen.getByRole("dialog");
    await userEvent.click(
      within(drawer).getByRole("tab", { name: DETAIL_TAB_LABELS.sessions }),
    );
    return drawer;
  }

  it("arrancar dentro del cajón deja la tarjeta ofreciendo parar", async () => {
    await renderReady();
    const drawer = await openSessionsTab(BUFANDA.name);

    await userEvent.click(
      await within(drawer).findByRole("button", { name: START_SESSION_LABEL }),
    );
    await within(drawer).findByRole("button", { name: STOP_SESSION_LABEL });

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    ).toBeInTheDocument();
  });

  it("parar dentro del cajón deja la tarjeta ofreciendo empezar", async () => {
    await renderReady({
      projects: [project({ ...BUFANDA, activeSession: openSession(30) }), GORRO],
    });
    const drawer = await openSessionsTab(BUFANDA.name);

    /* El tab pide su propio historial y ahí no hay ninguna abierta, así que
       ofrece arrancar: se arranca y se para, que es el camino que un usuario
       recorre de verdad dentro del cajón. */
    await userEvent.click(
      await within(drawer).findByRole("button", { name: START_SESSION_LABEL }),
    );
    await userEvent.click(
      await within(drawer).findByRole("button", { name: STOP_SESSION_LABEL }),
    );
    await within(drawer).findByRole("button", { name: START_SESSION_LABEL });

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    ).toBeInTheDocument();
  });
});

/**
 * EL TAP AL DETALLE, DE PUNTA A PUNTA (#21, tanda 1).
 *
 * Lo que se mide acá no lo puede medir el cajón por su cuenta: que **la tarjeta
 * de la lista** lo abre, que el foco vuelve **a esa tarjeta** al cerrar, y que
 * abrir otro proyecto trae **otro** detalle.
 */
describe("ProjectsView — cajón de detalle", () => {
  function detailTap(name: string): HTMLElement {
    return screen.getByRole("button", { name: openDetailLabel(name) });
  }

  async function detailDrawer(): Promise<HTMLElement> {
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL })
          .textContent,
      ).toBe(""),
    );
    return screen.getByRole("dialog");
  }

  it("no monta ningún cajón hasta que se toca una tarjeta", async () => {
    await renderReady();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("el tap en la tarjeta abre el cajón de ESE proyecto", async () => {
    await renderReady();

    await userEvent.click(detailTap(BUFANDA.name));
    const drawer = await detailDrawer();

    expect(drawer).toHaveAccessibleName(BUFANDA.name);
    expect(
      within(drawer).getByRole("tab", { name: DETAIL_TAB_LABELS.general }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("Escape cierra el cajón y devuelve el foco a la tarjeta que lo abrió", async () => {
    await renderReady();

    await userEvent.click(detailTap(GORRO.name));
    await detailDrawer();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Sin esto, quien navega por teclado vuelve al principio del documento y
    // tiene que recorrer la grilla entera para seguir donde estaba.
    expect(detailTap(GORRO.name)).toHaveFocus();
  });

  /**
   * El estado de "qué estoy mirando" es un **id**, y la carga se deriva de
   * comparar lo pedido con lo que llegó: sin eso, el segundo proyecto enseñaría
   * el detalle del primero durante un fotograma.
   */
  it("abrir otro proyecto trae su propio detalle", async () => {
    await renderReady();

    await userEvent.click(detailTap(BUFANDA.name));
    expect(await detailDrawer()).toHaveAccessibleName(BUFANDA.name);
    await userEvent.keyboard("{Escape}");

    await userEvent.click(detailTap(GORRO.name));
    const second = await detailDrawer();

    expect(second).toHaveAccessibleName(GORRO.name);
    // El dato del segundo proyecto, no el del primero: los dos son de clases
    // distintas, así que el campo "Tipo" los distingue sin ambigüedad.
    const term = within(second).getByText(GENERAL_FIELD_LABELS.type);
    expect(term.parentElement?.querySelector("dd")).toHaveTextContent(
      CRAFT_TYPE_LABELS[GORRO.type],
    );
  });

  it("el quick-start de la tarjeta sigue arrancando el cronómetro sin abrir el cajón", async () => {
    await renderReady();

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );
    await waitFor(() => expect(quickStartRegion().textContent).not.toBe(""));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("no tiene violaciones de axe con el cajón abierto", async () => {
    serve();
    /* Montado dentro de un `main`, que es lo que en producción pone el
       `AppShell`. Sin él, `axe` marcaría el `h1` por estar fuera de todo
       landmark — un defecto del montaje del test, no de la pantalla— y el
       aserto dejaría de hablar del cajón, que es lo que este test mide. */
    const { baseElement } = render(<ProjectsView />, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <main>{children}</main>
      ),
    });
    await settle();

    await userEvent.click(detailTap(BUFANDA.name));
    await detailDrawer();

    // `baseElement` y no `container`: el cajón vive en un portal al `body`.
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});

describe("ProjectsView — el inventario de lanas llega al cajón", () => {
  /** Con la pantalla ya cargada: abre el cajón y va al tab Lanas. */
  async function openYarnsTab(): Promise<HTMLElement> {
    await userEvent.click(
      screen.getByRole("button", { name: openDetailLabel(BUFANDA.name) }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL })
          .textContent,
      ).toBe(""),
    );
    await userEvent.click(
      screen.getByRole("tab", { name: DETAIL_TAB_LABELS.yarns }),
    );
    return screen.getByRole("dialog");
  }

  /**
   * El inventario **no se pide dos veces**: la página ya lo trae para el filtro
   * de "lana usada" del toolbar, así que el cajón lo recibe por prop. El aserto
   * que lo mide es el **número de peticiones** a ese endpoint, no que la lana
   * aparezca — que aparecería igual con dos peticiones.
   */
  it("el tab Lanas ofrece el inventario que la página ya había pedido", async () => {
    await renderReady();
    const drawer = await openYarnsTab();

    expect(
      within(drawer).getByRole("button", { name: linkYarnLabel(CRUDO.colorName) }),
    ).toBeInTheDocument();
    expect(
      fetchSpy.mock.calls.filter(([url]) =>
        String(url).startsWith(YARNS_ENDPOINT),
      ),
    ).toHaveLength(1);
  });

  /**
   * Y si el inventario **no se pudo traer**, el cajón lo dice en vez de afirmar
   * que no hay lanas. Es la distinción que la enmienda **E2(e)** impuso a los
   * vacíos de la lista, aplicada acá.
   */
  it("un inventario que falló no se pinta como inventario vacío", async () => {
    serve();
    /* Se le rompe SÓLO al inventario, envolviendo el doble del BFF: el resto de
       la pantalla —lista y detalle— sigue respondiendo como siempre, que es el
       escenario real (un endpoint caído, no la red entera). */
    const bff = fetchSpy.getMockImplementation();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) =>
      String(url).startsWith(YARNS_ENDPOINT)
        ? Promise.reject(new Error("sin red"))
        : (bff?.(url, init) as Promise<Response>),
    );
    render(<ProjectsView />);
    await settle();
    const drawer = await openYarnsTab();

    expect(within(drawer).getByText(INVENTORY_UNAVAILABLE)).toBeInTheDocument();
    expect(within(drawer).queryByText(EMPTY_INVENTORY)).toBeNull();
  });
});

/**
 * CREAR, EDITAR Y BORRAR DE PUNTA A PUNTA (#22, tanda 2).
 *
 * Lo que se mide acá no lo puede medir el modal por su cuenta: **desde dónde se
 * abre** —y que la entrada existe también con el cesto lleno—, que guardar deja
 * la pantalla al día, y que borrar quita la tarjeta **sin recargar la página**.
 */
describe("ProjectsView — crear, editar y borrar (#22)", () => {
  function createButton(type: "knitting" | "crochet"): HTMLElement {
    return screen.getByRole("button", { name: CREATE_PROJECT_LABELS[type] });
  }

  function formDialog(): HTMLElement {
    return screen.getByRole("dialog");
  }

  async function detailDrawer(): Promise<HTMLElement> {
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL })
          .textContent,
      ).toBe(""),
    );
    return screen.getByRole("dialog");
  }

  function openDetail(name: string): HTMLElement {
    return screen.getByRole("button", { name: openDetailLabel(name) });
  }

  /**
   * El título de **la tarjeta** de la rejilla, acotado a la sección de la lista.
   *
   * Hace falta acotarlo porque **con el cajón abierto hay dos encabezados con el
   * mismo nombre**: el `h3` de la tarjeta y el `h2` del cajón, que es su nombre
   * accesible. Un `screen.getByRole("heading", …)` a secas no falla por eso: se
   * vuelve **ambiguo**, que es un error distinto y que no dice nada de lo que el
   * test quiere medir. El cajón vive en un portal colgado de `body`, así que
   * acotar a la sección lo deja fuera sin trucos.
   */
  function listHeading(name: string): HTMLElement {
    return within(
      screen.getByRole("region", { name: LIST_SECTION_TITLE }),
    ).getByRole("heading", { name });
  }

  /** Cuántas entradas a "crear" hay en pantalla, sea cual sea su sitio. */
  function createEntries(): HTMLElement[] {
    return Object.values(CREATE_PROJECT_LABELS).flatMap((label) =>
      screen.queryAllByRole("button", { name: label }),
    );
  }

  /** Los borrados que salieron de verdad. */
  function deleteCalls(): unknown[] {
    return fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "DELETE",
    );
  }

  it("cada botón del cesto vacío abre el modal con SU clase de tejido", async () => {
    await renderReady({ projects: [] });

    await userEvent.click(createButton("crochet"));

    expect(formDialog()).toHaveAccessibleName(createFormTitle("crochet"));
  });

  /**
   * **La entrada a crear no puede vivir sólo en el estado vacío.** Antes de #22
   * era así, y eso dejaba a quien ya tiene proyectos sin ninguna forma de
   * empezar otro desde esta página: la única creación estaba en el inicio.
   */
  it("con el cesto lleno la entrada sigue estando, en la cabecera", async () => {
    await renderReady();

    expect(screen.queryByText(EMPTY_TITLE)).not.toBeInTheDocument();
    await userEvent.click(createButton("knitting"));

    expect(formDialog()).toHaveAccessibleName(createFormTitle("knitting"));
  });

  /**
   * **Y nunca hay dos parejas a la vez.** Con el cesto vacío la llamada a la
   * acción es la del panel vacío —es de lo que vive ese panel— y la cabecera se
   * calla; con proyectos, al revés. Cuatro botones iguales repartidos por la
   * misma pantalla es exactamente el defecto que dejó fichado la deuda 142.
   */
  it("hay exactamente una pareja de botones de crear en cada estado", async () => {
    const { unmount } = await renderReady({ projects: [] });
    expect(createEntries()).toHaveLength(2);
    unmount();

    await renderReady();
    expect(createEntries()).toHaveLength(2);
  });

  it("crear desde la lista manda el alta y vuelve a pedir la lista", async () => {
    await renderReady({ projects: [] });
    const before = listUrls().length;

    await userEvent.click(createButton("knitting"));
    await userEvent.type(
      within(formDialog()).getByLabelText(FORM_FIELD_LABELS.name),
      "Chaleco",
    );
    await userEvent.click(
      within(formDialog()).getByRole("button", { name: CREATE_SUBMIT_LABEL }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const posted = fetchSpy.mock.calls.filter(
      ([url, init]) =>
        String(url) === PROJECTS_ENDPOINT &&
        (init as RequestInit | undefined)?.method === "POST",
    );
    expect(posted).toHaveLength(1);
    expect(listUrls().length).toBeGreaterThan(before);
  });

  it("editar desde el cajón manda el parche y refresca el detalle", async () => {
    await renderReady();
    await userEvent.click(openDetail(BUFANDA.name));
    await detailDrawer();

    await userEvent.click(
      screen.getByRole("button", { name: EDIT_PROJECT_LABEL }),
    );
    expect(
      await screen.findByRole("heading", { name: editFormTitle(BUFANDA.name) }),
    ).toBeInTheDocument();

    /* El modal se abre ENCIMA del cajón, así que hay dos diálogos montados y el
       de arriba es el último. Es el estado real de la pantalla, no un montaje
       del test: por eso las consultas se acotan a ese nodo. */
    const dialogs = screen.getAllByRole("dialog");
    const modal = dialogs[dialogs.length - 1];
    if (modal === undefined) {
      throw new Error("el modal de edición no se montó");
    }
    const nameField = within(modal).getByLabelText(FORM_FIELD_LABELS.name);
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Bufanda corta");
    await userEvent.click(
      within(modal).getByRole("button", { name: EDIT_SUBMIT_LABEL }),
    );

    await waitFor(() => {
      expect(detailCalls("PATCH")).toHaveLength(1);
    });
    /* El cajón vuelve a pedir su detalle: sin eso se quedaría enseñando el
       nombre viejo del proyecto que se acaba de renombrar. */
    await waitFor(() => {
      expect(detailCalls("GET").length).toBeGreaterThan(1);
    });
  });

  it("borrar pide confirmación antes de tocar nada", async () => {
    await renderReady();
    await userEvent.click(openDetail(BUFANDA.name));
    await detailDrawer();

    await userEvent.click(
      screen.getByRole("button", { name: DELETE_PROJECT_LABEL }),
    );

    expect(
      screen.getByRole("heading", { name: deleteProjectTitle(BUFANDA.name) }),
    ).toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);
  });

  /**
   * **La lista queda coherente sin recargar la página**: la tarjeta se va del
   * estado local y la lista NO se vuelve a pedir. El `DELETE` responde **204 sin
   * cuerpo**, que es donde un cliente escrito con `response.json()` reventaría.
   */
  it("confirmar borra, quita la tarjeta y cierra el cajón sin recargar la lista", async () => {
    await renderReady();
    const before = listUrls().length;
    await userEvent.click(openDetail(BUFANDA.name));
    await detailDrawer();

    await userEvent.click(
      screen.getByRole("button", { name: DELETE_PROJECT_LABEL }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: DELETE_PROJECT_CONFIRM_LABEL }),
    );

    await waitFor(() => {
      expect(deleteCalls()).toHaveLength(1);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: BUFANDA.name }),
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: GORRO.name })).toBeInTheDocument();
    expect(listUrls().length).toBe(before);
  });

  it("cancelar la confirmación no borra nada", async () => {
    await renderReady();
    await userEvent.click(openDetail(BUFANDA.name));
    await detailDrawer();

    await userEvent.click(
      screen.getByRole("button", { name: DELETE_PROJECT_LABEL }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    );

    expect(deleteCalls()).toHaveLength(0);
    expect(listHeading(BUFANDA.name)).toBeInTheDocument();
  });

  it("un borrado que falla se dice y no quita la tarjeta", async () => {
    await renderReady({
      deleteStatus: 404,
      deleteError: "El proyecto no existe.",
    });
    await userEvent.click(openDetail(BUFANDA.name));
    await detailDrawer();

    await userEvent.click(
      screen.getByRole("button", { name: DELETE_PROJECT_LABEL }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: DELETE_PROJECT_CONFIRM_LABEL }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El proyecto no existe.",
    );
    expect(listHeading(BUFANDA.name)).toBeInTheDocument();
  });

  it("no tiene violaciones de axe con el modal de alta abierto", async () => {
    serve({ projects: [] });
    const { baseElement } = render(<ProjectsView />, {
      wrapper: ({ children }: { children: ReactNode }) => <main>{children}</main>,
    });
    await settle();

    await userEvent.click(createButton("knitting"));
    await screen.findByRole("dialog");

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});

/** Las llamadas al detalle de la bufanda, por método. */
function detailCalls(method: "GET" | "PATCH"): unknown[] {
  return fetchSpy.mock.calls.filter(
    ([url, init]) =>
      String(url) === projectDetailEndpoint("bufanda") &&
      (((init as RequestInit | undefined)?.method ?? "GET") === method),
  );
}
