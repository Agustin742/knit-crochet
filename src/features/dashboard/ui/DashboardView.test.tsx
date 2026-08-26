// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { DashboardMetrics } from "@/features/dashboard/types";
import {
  CREATE_SUBMIT_LABEL,
  FORM_FIELD_LABELS,
  NEEDLES_ADD_BUTTON_LABEL,
  PATTERNS_ENDPOINT,
  createFormTitle,
  type SerializedProject,
} from "@/features/projects/ui";
import { SECONDS_PER_HOUR } from "@/shared/config";
import { cardVariants, cn } from "@/shared/ui";

import { metricGridColumns } from "./MetricsPanel";
import {
  DashboardView,
  EMPTY_STATE_DESCRIPTION,
  EMPTY_STATE_WITH_ACTIVE_DESCRIPTION,
  ERROR_TITLE,
  LOADING_MESSAGE,
} from "./DashboardView";
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
    /* El formulario de alta pide la biblioteca de patrones al abrirse: desde
       E7 (a) el Dashboard monta **el mismo** `ProjectFormDialog` que
       `/proyectos`, así que su costura HTTP es también la misma. */
    if (url.startsWith(PATTERNS_ENDPOINT)) {
      return Promise.resolve(jsonResponse(200, { patterns: [] }));
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
 * El proyecto del escenario de E4 (d): **empezado el año ANTERIOR** al que se
 * mira y todavía en las agujas.
 *
 * El año se DERIVA de `CURRENT_YEAR` y no se escribe a mano, para que el test
 * siga diciendo la verdad el 1 de enero que viene.
 *
 * **Por qué tiene que ser de otro año, y no un detalle de adorno:**
 * `countProjects` (`features/dashboard/api/store.ts`) cuenta los proyectos
 * *iniciados **O** terminados en el año*. Un proyecto empezado **dentro** del
 * año mirado obligaría a `metrics.projects >= 1`, así que un doble que
 * devolviera `projects: 0` junto a él describiría un estado que **producción no
 * puede producir**: el vacío no habría salido nunca. Sería la deuda 153
 * reaparecida dentro de su propio arreglo — un test verde sobre un escenario
 * imposible—. Empezado el año pasado y sin sesiones este año, en cambio,
 * `hours: 0` y `projects: 0` es exactamente lo que el backend devuelve.
 */
const BUFANDA_DEL_ANO_PASADO = project({
  id: "bufanda",
  name: "Bufanda",
  progress: 40,
  startDate: `${CURRENT_YEAR - 1}-11-02T00:00:00.000Z`,
  updatedAt: `${CURRENT_YEAR - 1}-12-20T00:00:00.000Z`,
});

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

  /**
   * ENMIENDA E4 (a): "Proyectos en curso" es el PRESENTE, no una rebanada del
   * año, así que su petición NO lleva `year`. Se aserta sobre la URL realmente
   * pedida y no sobre la firma: el compilador ya cubre la firma, y era
   * precisamente una firma que aceptaba `year` sin mandarlo lo que hacía que el
   * parámetro mintiera (deuda 153). Se comprueba también DESPUÉS de mover el
   * año, que es cuando un filtro colado se notaría.
   */
  it("no filtra los proyectos en curso por año", async () => {
    const user = userEvent.setup();
    await renderReady();

    expect(lastProjectsUrl()).not.toContain("year");

    await user.click(screen.getByRole("button", { name: "Año anterior" }));

    await waitFor(() =>
      expect(lastMetricsUrl()).toContain(`year=${CURRENT_YEAR - 1}`),
    );
    expect(lastProjectsUrl()).not.toContain("year");
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

  /**
   * ENMIENDA E4 (b) + REGLA 7 — el escenario que producción sí sabe producir y
   * el doble no producía nunca. El test del vacío que ya existía pasaba
   * `projects: []`, y por eso estuvo verde mientras el estado era INALCANZABLE
   * en pantalla (deuda 153): quien tiene un proyecto abierto lo tiene abierto en
   * TODOS los años, porque la lista de activos no es del año.
   *
   * El caso real es un año en blanco **con un proyecto del año pasado todavía
   * vivo**, y por eso el fixture es `BUFANDA_DEL_ANO_PASADO` — ver ahí por qué
   * un proyecto empezado DENTRO del año mirado haría de este test otra mentira
   * verde.
   */
  it("da el año por vacío aunque quede un proyecto vivo de otro año", async () => {
    await renderReady({
      metrics: metricsBody({ hours: 0, projects: 0, yarnMeters: 500 }),
      projects: [BUFANDA_DEL_ANO_PASADO],
    });

    expect(
      screen.getByRole("heading", {
        name: `Todavía no tejiste nada en ${CURRENT_YEAR}`,
      }),
    ).toBeInTheDocument();
    /* El vacío es una afirmación SOBRE LAS MÉTRICAS del año, así que es el panel
       de métricas —y sólo ése— lo que sustituye. */
    expect(
      screen.queryByRole("heading", { name: "Tu año en números" }),
    ).toBeNull();
  });

  /**
   * ENMIENDA E4 (d). El vacío del año no puede tapar un proyecto que está en las
   * agujas: sería llegar por la otra puerta al desenlace que E4 (a) descartó al
   * negarse a filtrar el panel por año. No basta con mirar el título del vacío
   * —hay que ver el proyecto en su panel—.
   *
   * El proyecto es el del año pasado, que es el único que puede convivir con un
   * año en blanco de verdad (ver `BUFANDA_DEL_ANO_PASADO`).
   */
  it("el vacío del año NO esconde el proyecto que sigue en curso", async () => {
    await renderReady({
      metrics: metricsBody({ hours: 0, projects: 0, yarnMeters: 500 }),
      projects: [BUFANDA_DEL_ANO_PASADO],
    });

    expect(
      screen.getByRole("heading", {
        name: `Todavía no tejiste nada en ${CURRENT_YEAR}`,
      }),
    ).toBeInTheDocument();
    expect(
      within(activeRegion()).getByRole("heading", { name: "Bufanda" }),
    ).toBeInTheDocument();
  });

  /**
   * ENMIENDA E4 (e), primera dirección. La copia de siempre le dice "empezá el
   * primero" a quien no tejió nunca; dicha ENCIMA del panel con su proyecto
   * dentro, contradice lo que se ve en la misma pantalla. Se comprueba lo que
   * dice **y** lo que ya no dice, en el escenario en que las dos cosas conviven.
   */
  it("con un proyecto a la vista, el vacío habla del año y no del primero", async () => {
    await renderReady({
      metrics: metricsBody({ hours: 0, projects: 0, yarnMeters: 500 }),
      projects: [BUFANDA_DEL_ANO_PASADO],
    });

    expect(
      screen.getByText(EMPTY_STATE_WITH_ACTIVE_DESCRIPTION),
    ).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_STATE_DESCRIPTION)).toBeNull();
    expect(screen.queryByText(/el primero/i)).toBeNull();
    // El título NO se desdobla: es el de §4 en los dos caminos.
    expect(
      screen.getByRole("heading", {
        name: `Todavía no tejiste nada en ${CURRENT_YEAR}`,
      }),
    ).toBeInTheDocument();
  });

  /**
   * ENMIENDA E4 (e), segunda dirección — sin ella no se sabría si la copia salió
   * por el motivo correcto. Quien empieza de cero sigue viendo la copia de la
   * **deuda 147**, que se escribió para él y no se toca.
   */
  it("sin nada en curso, el vacío sigue siendo el de quien empieza de cero", async () => {
    await renderReady({
      metrics: metricsBody({ hours: 0, projects: 0, yarnMeters: 500 }),
      projects: [],
    });

    expect(screen.getByText(EMPTY_STATE_DESCRIPTION)).toBeInTheDocument();
    expect(
      screen.queryByText(EMPTY_STATE_WITH_ACTIVE_DESCRIPTION),
    ).toBeNull();
  });

  /** ENMIENDA E4 (d), otra mitad: sin activos no hay panel, y el vacío queda solo. */
  it("sin proyectos en curso el vacío del año se queda sin vecinos", async () => {
    await renderReady({
      metrics: metricsBody({ hours: 0, projects: 0, yarnMeters: 500 }),
      projects: [],
    });

    expect(
      screen.getByRole("heading", {
        name: `Todavía no tejiste nada en ${CURRENT_YEAR}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Proyectos en curso" }),
    ).toBeNull();
  });

  /**
   * CONTROL EN LA OTRA DIRECCIÓN. Sacar `projects.length` de la condición abre
   * el riesgo simétrico: que el vacío salte de más. Un año con proyectos
   * contados NO está vacío, ni siquiera cuando no queda ninguno en curso —lo
   * terminaste todo—, y ahí el panel de métricas se queda donde estaba.
   */
  it("no da por vacío un año con métricas, aunque no haya nada en curso", async () => {
    await renderReady({
      metrics: metricsBody({ hours: 0, projects: 2, yarnMeters: 0 }),
      projects: [],
    });

    expect(
      screen.queryByRole("heading", {
        name: `Todavía no tejiste nada en ${CURRENT_YEAR}`,
      }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Tu año en números" }),
    ).toBeInTheDocument();
  });

  /**
   * Ancla de la copia visible del vacío (deuda 147, mismo criterio que **E2(f)**
   * en `/proyectos`). Hasta ahora **ninguna prueba la sostenía**, así que el
   * texto que ve el usuario podía volver a explicarle la mecánica de la app sin
   * que nada se pusiera rojo. Se comprueba lo que dice **y** lo que ya no dice.
   */
  it("no le explica el andamiaje de la app a quien todavía no tejió nada", async () => {
    await renderReady({
      metrics: metricsBody({ hours: 0, projects: 0, yarnMeters: 500 }),
      projects: [],
    });

    expect(screen.getByText(EMPTY_STATE_DESCRIPTION)).toBeInTheDocument();
    expect(screen.queryByText(/en dos pasos/i)).toBeNull();
    expect(screen.queryByText(/los botones de arriba/i)).toBeNull();
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

/**
 * LA CREACIÓN RÁPIDA (RFC-02 §1 y §6), **con el formulario de `/proyectos`**
 * desde la enmienda **E7 (a)**.
 *
 * **Lo que cambia y lo que no.** Los dos botones y su preselección de tipo son
 * los mismos; lo único que cambia es **qué modal abren**. El `NewProjectDialog`
 * de un solo campo se borra: tenía el mismo título que el de seis campos
 * —*"Nuevo proyecto de dos agujas"*, medido con los dos abiertos— y prometía lo
 * mismo enseñando la sexta parte (ficha **185**).
 *
 * Estos tests **se migran, no se tiran**: cada uno seguía diciendo algo cierto
 * —el tipo preseleccionado, el foco inicial, el foco de vuelta, la recarga tras
 * el alta, el foco al campo inválido (deuda 38) y el error del servidor sin
 * cerrar—, y todas esas garantías las hereda el formulario nuevo. Lo único que
 * se reescribe es lo que de verdad cambió: **el cuerpo del `POST`**, que ahora
 * lleva el formulario entero.
 */
describe("creación rápida (RFC-02 §1 y §6, con el form de E7 a)", () => {
  it("abre el modal con el tipo ya elegido y devuelve el foco al cerrar", async () => {
    const user = userEvent.setup();
    await renderReady();
    const trigger = screen.getByRole("button", { name: "Nuevo crochet" });

    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: createFormTitle("crochet") }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(FORM_FIELD_LABELS.name),
    ).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();
  });

  /**
   * **EL GATE DE LA FICHA 185:** el alta del Dashboard es **la misma** que la de
   * `/proyectos`, o sea la de seis campos. Con el formulario viejo esto era
   * imposible: sólo tenía el nombre, y quien creaba desde el inicio concluía que
   * la app no tenía foto ni meta.
   */
  it("ofrece el formulario ENTERO, no sólo el nombre", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Nuevo crochet" }));
    const dialog = await screen.findByRole("dialog");

    for (const label of [
      FORM_FIELD_LABELS.name,
      FORM_FIELD_LABELS.type,
      FORM_FIELD_LABELS.targetRounds,
      FORM_FIELD_LABELS.notes,
      FORM_FIELD_LABELS.image,
    ]) {
      expect(within(dialog).getByLabelText(label), label).toBeInTheDocument();
    }
    // Las agujas no son un campo suelto sino un control propio de la feature.
    expect(
      within(dialog).getByRole("button", { name: NEEDLES_ADD_BUTTON_LABEL }),
    ).toBeInTheDocument();
  });

  it("manda el tipo del botón que lo abrió, con el formulario entero", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Nuevo dos agujas" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText(FORM_FIELD_LABELS.name),
      "Bufanda",
    );
    await user.click(
      within(dialog).getByRole("button", { name: CREATE_SUBMIT_LABEL }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const post = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    ) as [string, RequestInit];
    expect(post[0]).toBe(PROJECTS_ENDPOINT);
    /* El cuerpo es el del formulario completo con sus valores vacíos, no el
       `{name, type}` del modal viejo. El tipo sigue siendo **el del botón**. */
    expect(JSON.parse(String(post[1].body))).toEqual({
      name: "Bufanda",
      type: "knitting",
      targetRounds: 0,
      needles: [],
      notes: "",
      image: null,
      patternId: null,
    });
  });

  it("recarga la lista tras un alta confirmada", async () => {
    const user = userEvent.setup();
    await renderReady({ projects: [ALFOMBRA] });
    const before = requestedUrls().length;

    await user.click(screen.getByRole("button", { name: "Nuevo crochet" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText(FORM_FIELD_LABELS.name),
      "Amigurumi",
    );
    await user.click(
      within(dialog).getByRole("button", { name: CREATE_SUBMIT_LABEL }),
    );

    await waitFor(() =>
      expect(requestedUrls().length).toBeGreaterThan(before),
    );
  });

  /** Deuda 38: sin mover el foco, un lector de pantalla no se entera de nada. */
  it("no manda nada con el nombre vacío y deja el foco en el campo", async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole("button", { name: "Nuevo crochet" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: CREATE_SUBMIT_LABEL }),
    );

    expect(
      fetchSpy.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(false);
    await waitFor(() =>
      expect(within(dialog).getByLabelText(FORM_FIELD_LABELS.name)).toHaveFocus(),
    );

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
                : url.startsWith(PATTERNS_ENDPOINT)
                  ? { patterns: [] }
                  : { projects: [ALFOMBRA] },
            ),
          ),
    );

    await user.click(screen.getByRole("button", { name: "Nuevo crochet" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText(FORM_FIELD_LABELS.name),
      "Amigurumi",
    );
    await user.click(
      within(dialog).getByRole("button", { name: CREATE_SUBMIT_LABEL }),
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

/**
 * ENMIENDA E13 (b) y (c) — vista desde el DOM montado.
 *
 * El gate de CSS compilado (`dashboard-ui.classes.test.ts`) mira el FUENTE y el
 * CSS; acá se mira lo que se llega a **montar**, que es la otra mitad. Los dos
 * hacen falta: el gate no sabe si el atributo llega al elemento correcto, y este
 * bloque no sabe si la utilidad existe de verdad en el CSS.
 *
 * Ninguna clase se escribe literal —Tailwind escanea los tests—: se piden a las
 * mismas fuentes que usa la producción (`cardVariants` del design system y la
 * correspondencia de columnas del panel).
 */
describe("el ancho y la categoría de las piezas (enmienda E13)", () => {
  /** ¿Este elemento cuelga de una superficie de tarjeta? */
  function insideCard(element: Element): boolean {
    const marks = cn(cardVariants()).split(" ").filter(Boolean);
    for (
      let node: Element | null = element.parentElement;
      node !== null;
      node = node.parentElement
    ) {
      const classes = node.classList;
      if (marks.every((mark) => classes.contains(mark))) {
        return true;
      }
    }
    return false;
  }

  /**
   * E13(c): `Card` es para CONTENIDO. El marco alrededor del paso a paso del año
   * lo hacía leerse como un panel aparte en medio de una fila cuyos vecinos van
   * sueltos sobre el fondo. No era un defecto de posición: era de categoría.
   */
  it("el paso a paso del año no vive dentro de una tarjeta", async () => {
    await renderReady();

    expect(insideCard(screen.getByLabelText("Año"))).toBe(false);
  });

  /**
   * E13(c), la otra mitad: el bloque "Ordenar por" se leía como un panel a la
   * deriva flotando sobre el título con el que forma fila, con "Ver todos"
   * colgando fuera de su marco.
   */
  it("el selector de orden no vive dentro de una tarjeta", async () => {
    await renderReady();

    expect(
      insideCard(within(activeRegion()).getByLabelText("Ordenar por")),
    ).toBe(false);
  });

  /** Y la tarjeta sigue donde SÍ corresponde: envolviendo contenido. */
  it("la tarjeta de métrica sigue siendo una tarjeta", async () => {
    await renderReady();

    expect(insideCard(screen.getByText("horas tejidas"))).toBe(true);
  });

  /**
   * E13(b): el default de la app es UNA métrica, así que con la rejilla fija de
   * tres el estado por defecto pintaba una tarjeta y dos tercios de fondo vacío
   * — lo primero que ve cualquiera al entrar. Se comprueba en el estado por
   * defecto y al encender una segunda métrica.
   */
  it("la rejilla de métricas declara tantas columnas como métricas elegidas", async () => {
    const user = userEvent.setup();
    await renderReady();

    const panel = screen.getByRole("region", { name: "Tu año en números" });
    const grid = () => within(panel).getByRole("list");

    for (const className of metricGridColumns(1).split(" ")) {
      expect(grid()).toHaveClass(className);
    }

    await user.click(
      within(screen.getByRole("group", { name: "Métricas visibles" })).getByRole(
        "button",
        { name: "Proyectos" },
      ),
    );

    for (const className of metricGridColumns(2).split(" ")) {
      expect(grid()).toHaveClass(className);
    }
  });
});
