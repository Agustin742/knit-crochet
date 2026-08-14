// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NEEDLE_SIZES, SECONDS_PER_HOUR } from "@/shared/config";

import { quickStartLabel } from "./ProjectCard";
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
  CREATE_PROJECT_LABELS,
  EMPTY_TITLE,
  ERROR_TITLE,
  LOADING_MESSAGE,
  LOADING_REGION_LABEL,
  NO_MATCHES_TITLE,
  PAGE_TITLE,
  ProjectsView,
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

/** URLs de lista pedidas, en orden. */
function listUrls(): string[] {
  return fetchSpy.mock.calls
    .map(([url]) => String(url))
    .filter(
      (url) =>
        url.startsWith(PROJECTS_ENDPOINT) && !url.includes("/sessions/start"),
    );
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
  /* "Más filtros" es un `<details>` nativo y NO un `Dialog` (E1(g)), así que
     nada de esta pantalla debería bloquear el scroll del documento. El aserto
     está para confirmarlo, no por trámite: si alguien cambiara el desplegable
     por un modal, un bloqueo olvidado contaminaría a los siguientes archivos con
     todo en verde (deuda 101). Se limpia ANTES de comprobar. */
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

  it("monta un quick-start por tarjeta y ninguno fuera de ellas", async () => {
    await renderReady();

    for (const entry of [BUFANDA, GORRO]) {
      expect(
        screen.getByRole("button", { name: quickStartLabel(entry.name) }),
      ).toBeInTheDocument();
    }
  });

  /** La tarjeta NO es tocable en #20: el drawer es #21 y no existe (E1(f)). */
  it("no enlaza las tarjetas a ninguna parte", async () => {
    await renderReady();

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
