// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NEEDLE_SIZES, SECONDS_PER_HOUR } from "@/shared/config";

import { openDetailLabel, quickStartLabel } from "./ProjectCard";
import { DETAIL_LOADING_REGION_LABEL } from "./ProjectDetailDrawer";
import {
  DETAIL_TAB_LABELS,
  EMPTY_INVENTORY,
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
  QUICK_START_NOTES,
  QUICK_START_REGION_LABEL,
  quickStartResumedMessage,
  quickStartStartedMessage,
} from "./ProjectsView";
import { CRAFT_TYPE_LABELS, STATUS_FILTERS } from "./project-filters";
import {
  NETWORK_ERROR_MESSAGE,
  PROJECTS_ENDPOINT,
  YARNS_ENDPOINT,
  sessionStartEndpoint,
} from "./projects-client";
import type { SerializedProject, YarnOption } from "./types";

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

function project(patch: Partial<SerializedProject>): SerializedProject {
  return {
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

type Scenario = {
  projects?: SerializedProject[];
  yarns?: YarnOption[];
  /** Status del `POST …/sessions/start`: 201 crea, 200 reutiliza. */
  sessionStatus?: number;
  listStatus?: number;
  listError?: string;
};

let scenario: Scenario = {};

/** Responde según el endpoint pedido, como haría el BFF real. */
function serve(next: Scenario = {}) {
  scenario = next;
  fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
    const target = String(url);

    if (target.includes("/sessions/start")) {
      return Promise.resolve(
        jsonResponse(next.sessionStatus ?? 201, { session: { id: "s" } }),
      );
    }
    if (target.startsWith(YARNS_ENDPOINT)) {
      return Promise.resolve(jsonResponse(200, { yarns: next.yarns ?? [CRUDO] }));
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
      return Promise.resolve(
        found === undefined
          ? jsonResponse(404, { error: "El proyecto no existe." })
          : jsonResponse(200, { project: found, yarns: [] }),
      );
    }
    if (target.startsWith(PROJECTS_ENDPOINT)) {
      const status = next.listStatus ?? 200;
      return Promise.resolve(
        status === 200
          ? jsonResponse(200, { projects: next.projects ?? [BUFANDA, GORRO] })
          : jsonResponse(status, { error: next.listError ?? "roto" }),
      );
    }
    throw new Error(`URL inesperada en el test: ${target}`);
  });
  void init;
}

/** Placebo para que el `init` del mock no quede sin usar en el tipo. */
const init = undefined;

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
 */
function listUrls(): string[] {
  return fetchSpy.mock.calls
    .map(([url]) => String(url))
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

  it("ofrece los dos botones de crear cuando el cesto está vacío", async () => {
    await renderReady({ projects: [] });

    expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument();
    for (const label of Object.values(CREATE_PROJECT_LABELS)) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
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
   * Un aviso lejos del botón es feedback débil en una grilla de N tarjetas
   * iguales, así que **la tarjeta que arrancó queda marcada**. Y las dos
   * respuestas del servidor dejan marcas distintas, porque el servidor sí las
   * distingue: 201 = la arrancaste vos, 200 = ya venía corriendo.
   */
  it("marca la tarjeta que arrancó, y sólo esa", async () => {
    await renderReady();

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    );

    await waitFor(() =>
      expect(screen.getByText(QUICK_START_NOTES.started)).toBeInTheDocument(),
    );
    expect(screen.queryByText(QUICK_START_NOTES.resumed)).toBeNull();
    expect(screen.getAllByText(QUICK_START_NOTES.started)).toHaveLength(1);
  });

  it("dice con otras palabras que el cronómetro ya venía en marcha", async () => {
    await renderReady({ sessionStatus: 200 });

    await userEvent.click(
      screen.getByRole("button", { name: quickStartLabel(GORRO.name) }),
    );

    await waitFor(() =>
      expect(screen.getByText(QUICK_START_NOTES.resumed)).toBeInTheDocument(),
    );
    expect(screen.queryByText(QUICK_START_NOTES.started)).toBeNull();
  });

  /** Un fallo no puede dejar una marca que diga que algo arrancó. */
  it("no marca nada cuando el arranque falla", async () => {
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
    for (const note of Object.values(QUICK_START_NOTES)) {
      expect(screen.queryByText(note)).toBeNull();
    }
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
