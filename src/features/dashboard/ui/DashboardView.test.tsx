// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { DashboardMetrics } from "@/features/dashboard/types";
import type { SerializedProject } from "@/features/projects/ui";
import { SECONDS_PER_HOUR } from "@/shared/config";

import { DashboardView, ERROR_TITLE, LOADING_MESSAGE } from "./DashboardView";
import {
  METRICS_ENDPOINT,
  NETWORK_ERROR_MESSAGE,
  PROJECTS_ENDPOINT,
} from "./dashboard-client";
import { MAX_ACTIVE_PROJECTS, SORT_HINT } from "./filters";
import { LIFETIME_METRIC_NOTE } from "./metrics-display";

/**
 * El ovillo se dobla en el borde (happy-dom no tiene WebGL y el componente real
 * tiene sus propios tests) conservando `data-interactive`, que es lo que
 * distingue el hero del fondo del caparazón (enmienda E1.2). El resto del design
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

function comparison(label: string, times: number) {
  return { label, referenceValue: 1, times };
}

function metricsBody(patch: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    hours: SECONDS_PER_HOUR * 12.5,
    projects: 4,
    yarnMeters: 135,
    comparison: {
      hours: comparison("Un vuelo a Madrid", 1.5),
      projects: comparison("Un par", 2),
      yarnMeters: comparison("El Obelisco", 2.1333),
    },
    ...patch,
  };
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

const ALFOMBRA = project({
  id: "alfombra",
  name: "Alfombra",
  progress: 80,
  updatedAt: "2026-01-10T00:00:00.000Z",
});
const ZOQUETES = project({
  id: "zoquetes",
  name: "Zoquetes",
  progress: 10,
  updatedAt: "2026-05-10T00:00:00.000Z",
});

type Scenario = {
  metrics?: DashboardMetrics;
  projects?: SerializedProject[];
};

/** Responde según el endpoint pedido, como haría el BFF real. */
function serve({ metrics = metricsBody(), projects = [ALFOMBRA, ZOQUETES] }: Scenario = {}) {
  fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
    if (url.startsWith(METRICS_ENDPOINT)) {
      return Promise.resolve(jsonResponse(200, metrics));
    }
    if (url.startsWith(PROJECTS_ENDPOINT)) {
      return Promise.resolve(
        init?.method === "POST"
          ? jsonResponse(201, { project: project({ id: "nuevo" }) })
          : jsonResponse(200, { projects }),
      );
    }
    throw new Error(`URL inesperada en el test: ${url}`);
  });
}

/** URLs pedidas por GET, en orden. */
function requestedUrls(): string[] {
  return fetchSpy.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method !== "POST")
    .map(([url]) => String(url));
}

function lastMetricsUrl(): string {
  const metrics = requestedUrls().filter((url) =>
    url.startsWith(METRICS_ENDPOINT),
  );
  return metrics[metrics.length - 1] ?? "";
}

function lastProjectsUrl(): string {
  const projects = requestedUrls().filter((url) =>
    url.startsWith(PROJECTS_ENDPOINT),
  );
  return projects[projects.length - 1] ?? "";
}

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Monta la página y espera a que la carga termine. Se espera a la región viva
 * —no a un texto concreto— porque el árbol final depende del escenario: con
 * datos salen los dos paneles y sin nada sale el estado vacío.
 */
async function renderReady(scenario: Scenario = {}) {
  serve(scenario);
  const view = render(<DashboardView />);
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe(""));
  return view;
}

function activeRegion(): HTMLElement {
  return screen.getByRole("region", { name: "Proyectos en curso" });
}

function rootOverflow(): string {
  return document.documentElement.style.overflow;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
  /* El bloqueo de scroll del `Dialog` vive en el módulo con un contador
     compartido: si un test lo dejara puesto, contaminaría a los siguientes con
     todo en verde (deuda 101). Se limpia ANTES de comprobar para que un rojo
     aquí no arrastre en cascada. */
  const leftover = rootOverflow();
  document.documentElement.style.overflow = "";
  expect(leftover, "un diálogo se fue sin soltar el bloqueo").toBe("");
});

describe("DashboardView (smoke y hero)", () => {
  it("monta el hero, el panel de métricas y la lista de activos", async () => {
    await renderReady();

    expect(
      screen.getByRole("heading", { level: 1, name: "Knit&Crochet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Proyectos en curso" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alfombra" })).toBeInTheDocument();
  });

  /**
   * ENMIENDA E1.2, mitad de la página: el hero es el ÚNICO ovillo y es el
   * interactivo. Se cuenta con `queryAllByTestId` porque el singular NO falla
   * con dos instancias, que es exactamente el defecto prohibido.
   */
  it("monta exactamente un ovillo, y es el hero interactivo", async () => {
    await renderReady();

    const yarns = screen.queryAllByTestId("ascii-yarn");
    expect(yarns).toHaveLength(1);
    expect(yarns[0]).toHaveAttribute("data-interactive", "true");
  });
});

describe("selector de métrica (RFC-02 §1)", () => {
  it("arranca con horas y sólo horas", async () => {
    await renderReady();

    const group = screen.getByRole("group", { name: "Métricas visibles" });
    expect(within(group).getByRole("button", { name: "Horas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const name of ["Proyectos", "Metros"]) {
      expect(within(group).getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
    expect(screen.getByText("horas tejidas")).toBeInTheDocument();
    expect(screen.queryByText("metros de lana")).toBeNull();
  });

  /** SUPERPONIBLE: no es un `Tabs`, así que las tres pueden convivir. */
  it("superpone métricas en vez de sustituirlas", async () => {
    const user = userEvent.setup();
    await renderReady();
    const group = screen.getByRole("group", { name: "Métricas visibles" });

    await user.click(within(group).getByRole("button", { name: "Proyectos" }));
    await user.click(within(group).getByRole("button", { name: "Metros" }));

    expect(screen.getByText("horas tejidas")).toBeInTheDocument();
    expect(screen.getByText("proyectos")).toBeInTheDocument();
    expect(screen.getByText("metros de lana")).toBeInTheDocument();
  });

  it("conmuta: volver a pulsar apaga la métrica", async () => {
    const user = userEvent.setup();
    await renderReady();
    const group = screen.getByRole("group", { name: "Métricas visibles" });

    await user.click(within(group).getByRole("button", { name: "Horas" }));

    expect(screen.queryByText("horas tejidas")).toBeNull();
    expect(
      screen.getByText("Elegí al menos una métrica para ver el resumen."),
    ).toBeInTheDocument();
  });

  /** `hours` viaja en SEGUNDOS: pintarlo crudo diría "45000". */
  it("convierte las horas desde segundos", async () => {
    await renderReady();

    expect(screen.getByText("12,5", { exact: false })).toBeInTheDocument();
    expect(
      screen.queryByText(String(SECONDS_PER_HOUR * 12.5), { exact: false }),
    ).toBeNull();
  });
});

describe("comparativas (enmiendas E1.4 y E1.5)", () => {
  it("pinta la comparativa de cada métrica visible", async () => {
    const user = userEvent.setup();
    await renderReady();
    const group = screen.getByRole("group", { name: "Métricas visibles" });

    expect(screen.getByText("≈ 1,5 veces Un vuelo a Madrid")).toBeInTheDocument();

    await user.click(within(group).getByRole("button", { name: "Proyectos" }));
    await user.click(within(group).getByRole("button", { name: "Metros" }));

    expect(screen.getByText("≈ 2 veces Un par")).toBeInTheDocument();
    expect(screen.getByText("≈ 2,1 veces El Obelisco")).toBeInTheDocument();
  });

  it("no pinta comparativa cuando la métrica vale cero", async () => {
    await renderReady({
      metrics: metricsBody({
        hours: 0,
        comparison: {
          hours: comparison("Un vuelo a Madrid", 0),
          projects: comparison("Un par", 2),
          yarnMeters: comparison("El Obelisco", 2),
        },
      }),
    });

    expect(screen.queryByText(/Un vuelo a Madrid/)).toBeNull();
  });

  /** E1.5: metros es lifetime y no se mueve con los filtros. Sin marca parece un bug. */
  it("marca la tarjeta de metros como total histórico, y sólo ésa", async () => {
    const user = userEvent.setup();
    await renderReady();
    const group = screen.getByRole("group", { name: "Métricas visibles" });

    expect(screen.queryAllByText(LIFETIME_METRIC_NOTE)).toHaveLength(0);

    await user.click(within(group).getByRole("button", { name: "Metros" }));
    await user.click(within(group).getByRole("button", { name: "Proyectos" }));

    expect(screen.queryAllByText(LIFETIME_METRIC_NOTE)).toHaveLength(1);
  });
});

describe("filtros de año y tipo (RFC-02 §1)", () => {
  it("abre en el año actual y lo manda en la query", async () => {
    await renderReady();

    expect(screen.getByLabelText("Año")).toHaveValue(String(CURRENT_YEAR));
    expect(lastMetricsUrl()).toContain(`year=${CURRENT_YEAR}`);
  });

  it("pide de nuevo al escribir otro año", async () => {
    const user = userEvent.setup();
    await renderReady();

    const input = screen.getByLabelText("Año");
    await user.clear(input);
    await user.type(input, "2024");

    await waitFor(() => expect(lastMetricsUrl()).toContain("year=2024"));
  });

  /** Rango libre no es "cualquier cosa": fuera del rango el endpoint da 400. */
  it("avisa y NO pide nada con un año fuera del rango del endpoint", async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = requestedUrls().length;

    const input = screen.getByLabelText("Año");
    await user.clear(input);
    await user.type(input, "1200");

    expect(
      screen.getByText("Escribí un año entre 1970 y 9999."),
    ).toBeInTheDocument();
    expect(requestedUrls()).toHaveLength(before);
  });

  it("el paso a paso mueve el año en las dos direcciones", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Año anterior" }));
    expect(screen.getByLabelText("Año")).toHaveValue(String(CURRENT_YEAR - 1));

    await user.click(screen.getByRole("button", { name: "Año siguiente" }));
    expect(screen.getByLabelText("Año")).toHaveValue(String(CURRENT_YEAR));
  });

  /**
   * Los dos botones de tipo son COMBINABLES y el endpoint acepta uno solo: los
   * dos marcados y ninguno marcado preguntan lo mismo.
   */
  it("filtra por tipo cuando hay exactamente uno marcado", async () => {
    const user = userEvent.setup();
    await renderReady();
    const group = screen.getByRole("group", { name: "Tipo de tejido" });

    expect(lastMetricsUrl()).not.toContain("type=");

    await user.click(within(group).getByRole("button", { name: "Crochet" }));
    await waitFor(() => expect(lastMetricsUrl()).toContain("type=crochet"));
    expect(lastProjectsUrl()).toContain("type=crochet");

    await user.click(within(group).getByRole("button", { name: "Dos agujas" }));
    await waitFor(() => expect(lastMetricsUrl()).not.toContain("type="));
  });

  it("pide siempre los proyectos activos con la cadena literal que el filtro admite", async () => {
    await renderReady();

    expect(lastProjectsUrl()).toContain("active=true");
  });
});

describe("lista de activos (enmienda E2.2)", () => {
  it("ordena por actividad reciente y lo dice sin mentir", async () => {
    await renderReady();

    const names = within(activeRegion())
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(names).toEqual(["Zoquetes", "Alfombra"]);

    expect(screen.getByLabelText("Ordenar por")).toHaveValue("recent");
    expect(screen.getByText(SORT_HINT)).toBeInTheDocument();
  });

  it("no rotula el orden como 'último tejido'", async () => {
    await renderReady();

    expect(screen.queryByText(/último tejido/i)).toBeNull();
  });

  it("cambia el orden desde la UI", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.selectOptions(screen.getByLabelText("Ordenar por"), "name");

    const names = within(activeRegion())
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(names).toEqual(["Alfombra", "Zoquetes"]);
  });

  it("recorta a los primeros y dice cuántos hay en total", async () => {
    const many = Array.from({ length: MAX_ACTIVE_PROJECTS + 3 }, (_, index) =>
      project({
        id: `p-${index}`,
        name: `Proyecto ${index}`,
        updatedAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
    await renderReady({ projects: many });

    expect(screen.getAllByRole("progressbar")).toHaveLength(MAX_ACTIVE_PROJECTS);
    expect(
      screen.getByText(`Mostrando ${MAX_ACTIVE_PROJECTS} de ${many.length}.`),
    ).toBeInTheDocument();
  });

  it("ofrece ver todos los proyectos", async () => {
    await renderReady();

    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/proyectos",
    );
  });

  it("dice que no hay proyectos en curso sin llamarlo error", async () => {
    await renderReady({ projects: [] });

    expect(
      screen.getByRole("heading", { name: "No tenés proyectos en curso" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("estados de carga, vacío y error (RFC-02 §4)", () => {
  it("anuncia la carga una sola vez y enseña bloques de carga", () => {
    fetchSpy.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<DashboardView />);

    expect(screen.getByRole("status")).toHaveTextContent(LOADING_MESSAGE);
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
    // El ovillo del hero sigue siendo el único, también cargando.
    expect(screen.queryAllByTestId("ascii-yarn")).toHaveLength(1);
  });

  it("deja de anunciar la carga cuando llegan los datos", async () => {
    await renderReady();

    expect(screen.getByRole("status").textContent).toBe("");
    expect(
      screen.getByRole("heading", { name: "Tu año en números" }),
    ).toBeInTheDocument();
  });

  it("dice que el año está vacío, no que algo falló", async () => {
    await renderReady({
      metrics: metricsBody({ hours: 0, projects: 0, yarnMeters: 500 }),
      projects: [],
    });

    expect(
      screen.getByRole("heading", {
        name: `Todavía no tejiste nada en ${CURRENT_YEAR}`,
      }),
    ).toBeInTheDocument();
    // Los botones de crear siguen a mano, que es lo que el estado vacío ofrece.
    expect(
      screen.getByRole("button", { name: "Nuevo dos agujas" }),
    ).toBeInTheDocument();
  });

  it("muestra el error con su reintento, y reintentar vuelve a pedir", async () => {
    const user = userEvent.setup();
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<DashboardView />);

    await screen.findByRole("heading", { name: ERROR_TITLE });
    expect(screen.getByRole("alert")).toHaveTextContent(NETWORK_ERROR_MESSAGE);

    serve();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", { name: "Tu año en números" }),
    ).toBeInTheDocument();
  });
});

describe("creación rápida (RFC-02 §1 y §6)", () => {
  it("abre el modal con el tipo ya elegido y devuelve el foco al cerrar", async () => {
    const user = userEvent.setup();
    await renderReady();
    const trigger = screen.getByRole("button", { name: "Nuevo crochet" });

    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", {
        name: "Nuevo proyecto de crochet",
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Nombre del proyecto")).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("manda el tipo del botón que lo abrió", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Nuevo dos agujas" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Nombre del proyecto"),
      "Bufanda",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Crear proyecto" }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const post = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    ) as [string, RequestInit];
    expect(post[0]).toBe(PROJECTS_ENDPOINT);
    expect(JSON.parse(String(post[1].body))).toEqual({
      name: "Bufanda",
      type: "knitting",
    });
  });

  it("recarga la lista tras un alta confirmada", async () => {
    const user = userEvent.setup();
    await renderReady({ projects: [ALFOMBRA] });
    const before = requestedUrls().length;

    await user.click(screen.getByRole("button", { name: "Nuevo crochet" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Nombre del proyecto"),
      "Amigurumi",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Crear proyecto" }),
    );

    await waitFor(() =>
      expect(requestedUrls().length).toBeGreaterThan(before),
    );
  });

  it("no manda nada con el nombre vacío y deja el foco en el campo", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Nuevo crochet" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Crear proyecto" }),
    );

    expect(
      fetchSpy.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(false);
    expect(within(dialog).getByLabelText("Nombre del proyecto")).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("pinta el error del servidor sin cerrar el modal", async () => {
    const user = userEvent.setup();
    await renderReady();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? Promise.resolve(jsonResponse(400, { error: "El nombre es obligatorio." }))
        : Promise.resolve(
            jsonResponse(
              200,
              url.startsWith(METRICS_ENDPOINT)
                ? metricsBody()
                : { projects: [ALFOMBRA] },
            ),
          ),
    );

    await user.click(screen.getByRole("button", { name: "Nuevo crochet" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Nombre del proyecto"),
      "Amigurumi",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Crear proyecto" }),
    );

    expect(
      await within(dialog).findByText("El nombre es obligatorio."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("accesibilidad", () => {
  it("no tiene violaciones de axe con datos, vacía y con error", async () => {
    const withData = await renderReady();
    expect(await axe(withData.container)).toHaveNoViolations();
    withData.unmount();
    fetchSpy.mockReset();

    const empty = await renderReady({
      metrics: metricsBody({ hours: 0, projects: 0, yarnMeters: 0 }),
      projects: [],
    });
    expect(await axe(empty.container)).toHaveNoViolations();
    empty.unmount();
    fetchSpy.mockReset();

    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    const failed = render(<DashboardView />);
    await screen.findByRole("heading", { name: ERROR_TITLE });
    expect(await axe(failed.container)).toHaveNoViolations();
  });
});
