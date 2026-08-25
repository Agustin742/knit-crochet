// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { calculateProgress } from "@/features/projects/api/progress";
import { formatInteger } from "@/shared/lib/format";

import { ProgressTab } from "./ProgressTab";
import {
  ADD_ROUND_LABEL,
  SAVE_TARGET_LABEL,
  STEPS_EMPTY,
  STEPS_ERROR,
  STEPS_SECTION_TITLE,
  SUBTRACT_ROUND_LABEL,
  TARGET_ROUNDS_ERROR,
  TARGET_ROUNDS_LABEL,
  stepLabel,
} from "./project-detail";
import {
  NETWORK_ERROR_MESSAGE,
  patternEndpoint,
  projectDetailEndpoint,
  projectRoundsEndpoint,
  projectStepsEndpoint,
} from "./projects-client";
import type {
  PatternStep,
  SerializedPattern,
  SerializedProject,
} from "./types";

const PROJECT_ID = "bufanda";
const PATTERN_ID = "patron-1";

/** El año se DERIVA del reloj: un fixture con el año en duro miente cada enero. */
const ISO = new Date(new Date().getFullYear() - 1, 2, 5).toISOString();

const STEPS: PatternStep[] = [
  { key: "Montaje", value: "40 puntos" },
  { key: "Cuerpo", value: "Elástico 2x2" },
];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function project(patch: Partial<SerializedProject> = {}): SerializedProject {
  return {
    id: PROJECT_ID,
    userId: "u",
    name: "Bufanda de invierno",
    image: null,
    type: "knitting",
    status: "in_progress",
    rounds: 12,
    targetRounds: 40,
    progress: 30,
    needles: [4],
    startDate: ISO,
    endDate: null,
    time: 0,
    patternId: null,
    completedSteps: [],
    notes: "",
    createdAt: ISO,
    updatedAt: ISO,
    ...patch,
  };
}

function pattern(instructions: PatternStep[] = STEPS): SerializedPattern {
  return {
    id: PATTERN_ID,
    userId: "u",
    name: "Bufanda simple",
    image: null,
    type: "knitting",
    instructions,
    metadata: [],
    inLibrary: true,
    createdAt: ISO,
    updatedAt: ISO,
  };
}

const fetchSpy = vi.fn();

/**
 * Doble del backend **con sus reglas de verdad** (REGLA 7), no un mock que
 * devuelve lo que al test le conviene:
 *
 * - las vueltas **nunca bajan de cero** (lo acota el servicio, no el cliente);
 * - `progress` lo recalcula **la misma función que usa el backend**, importada,
 *   no una copia escrita acá: si el doble reimplementara la fórmula, el test
 *   podría dar por bueno un porcentaje que producción nunca devolvería;
 * - los pasos se guardan **normalizados** (sin duplicados y ascendentes);
 * - los tres endpoints responden **el proyecto entero**, envuelto.
 */
function serveBackend(initial: SerializedProject, steps = pattern()) {
  let current = initial;

  fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body: unknown =
      typeof init?.body === "string" ? JSON.parse(init.body) : {};

    if (url === projectRoundsEndpoint(PROJECT_ID) && method === "POST") {
      const { delta } = body as { delta: number };
      const rounds = Math.max(0, current.rounds + delta);
      current = {
        ...current,
        rounds,
        progress: calculateProgress(rounds, current.targetRounds),
      };
      return Promise.resolve(jsonResponse(200, { project: current }));
    }

    if (url === projectDetailEndpoint(PROJECT_ID) && method === "PATCH") {
      const { targetRounds } = body as { targetRounds: number };
      current = {
        ...current,
        targetRounds,
        progress: calculateProgress(current.rounds, targetRounds),
      };
      return Promise.resolve(jsonResponse(200, { project: current }));
    }

    if (url === projectStepsEndpoint(PROJECT_ID) && method === "PATCH") {
      const { completedSteps } = body as { completedSteps: number[] };
      current = {
        ...current,
        completedSteps: [...new Set(completedSteps)].sort((a, b) => a - b),
      };
      return Promise.resolve(jsonResponse(200, { project: current }));
    }

    if (url === patternEndpoint(PATTERN_ID) && method === "GET") {
      return Promise.resolve(jsonResponse(200, { pattern: steps }));
    }

    return Promise.resolve(jsonResponse(404, { error: "ruta no servida" }));
  });
}

/**
 * Montado **como lo monta el cajón**: los endpoints responden el proyecto ya
 * recalculado y el cajón lo guarda, así que el tab siempre recibe el estado del
 * servidor. Un doble que dejara el proyecto congelado mediría un componente que
 * en producción no existe (REGLA 7).
 */
function ProgressHarness({ initial }: { initial: SerializedProject }) {
  const [current, setCurrent] = useState(initial);

  return (
    <main>
      <ProgressTab project={current} onProjectChange={setCurrent} />
    </main>
  );
}

function renderTab(initial = project(), steps = pattern()) {
  serveBackend(initial, steps);
  return render(<ProgressHarness initial={initial} />);
}

/** El porcentaje grande, tal y como se pinta. */
function percent(value: number): string {
  return `${formatInteger(value)}%`;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("ProgressTab — vueltas (RFC-03 §2)", () => {
  it("sumar una vuelta mueve el contador y recalcula el porcentaje", async () => {
    const user = userEvent.setup();
    renderTab(project({ rounds: 12, targetRounds: 40, progress: 30 }));

    expect(screen.getByText(percent(30))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: ADD_ROUND_LABEL }));

    expect(await screen.findByText(percent(33))).toBeInTheDocument();
    expect(screen.getByText("13 / 40")).toBeInTheDocument();
  });

  it("restar una vuelta también lo recalcula", async () => {
    const user = userEvent.setup();
    renderTab(project({ rounds: 12, targetRounds: 40, progress: 30 }));

    await user.click(screen.getByRole("button", { name: SUBTRACT_ROUND_LABEL }));

    expect(await screen.findByText(percent(28))).toBeInTheDocument();
    expect(screen.getByText("11 / 40")).toBeInTheDocument();
  });

  /**
   * A cero no hay nada que restar: el servicio acota en cero, así que el botón
   * no haría nada visible. Apagarlo lo dice **antes** de pulsar.
   */
  it("a cero vueltas el menos está apagado y no manda nada", async () => {
    const user = userEvent.setup();
    renderTab(project({ rounds: 0, targetRounds: 40, progress: 0 }));

    const minus = screen.getByRole("button", { name: SUBTRACT_ROUND_LABEL });
    expect(minus).toBeDisabled();

    await user.click(minus);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("un fallo de red se cuenta y el contador no miente", async () => {
    const user = userEvent.setup();
    renderTab(project({ rounds: 12, targetRounds: 40, progress: 30 }));
    fetchSpy.mockRejectedValue(new Error("sin red"));

    await user.click(screen.getByRole("button", { name: ADD_ROUND_LABEL }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      NETWORK_ERROR_MESSAGE,
    );
    expect(screen.getByText("12 / 40")).toBeInTheDocument();
    expect(screen.getByText(percent(30))).toBeInTheDocument();
  });
});

describe("ProgressTab — la meta editable", () => {
  it("guardar una meta nueva recalcula el porcentaje", async () => {
    const user = userEvent.setup();
    renderTab(project({ rounds: 12, targetRounds: 40, progress: 30 }));

    const field = screen.getByLabelText(TARGET_ROUNDS_LABEL);
    await user.clear(field);
    await user.type(field, "24");
    await user.click(screen.getByRole("button", { name: SAVE_TARGET_LABEL }));

    expect(await screen.findByText(percent(50))).toBeInTheDocument();
    expect(screen.getByText("12 / 24")).toBeInTheDocument();
  });

  /**
   * Se valida **lo mismo que el backend** antes de salir: un 400 de validación
   * se leería como "algo salió mal" cuando lo que pasa es que la meta se cuenta
   * en vueltas enteras.
   */
  it("una meta que no es un entero no sale a la red y lo dice", async () => {
    const user = userEvent.setup();
    renderTab();

    const field = screen.getByLabelText(TARGET_ROUNDS_LABEL);
    await user.clear(field);
    await user.type(field, "dos y medio");
    await user.click(screen.getByRole("button", { name: SAVE_TARGET_LABEL }));

    expect(await screen.findByText(TARGET_ROUNDS_ERROR)).toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("ProgressTab — pasos del patrón (E3(d))", () => {
  /**
   * **Sin patrón la checklist no se pinta, y NO aparece "crear patrón".** El
   * alta de patrones es #26-28: E3(d) prohíbe pintar el botón antes de que su
   * destino exista. La lista de controles se compara **exacta** para que caiga
   * también el día que alguien añada uno.
   */
  it("sin patrón no hay checklist ni ningún control sin destino", async () => {
    const { container } = renderTab(project({ patternId: null }));

    expect(screen.queryByText(STEPS_SECTION_TITLE)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    expect(
      within(container)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label") ?? button.textContent),
    ).toEqual([SUBTRACT_ROUND_LABEL, ADD_ROUND_LABEL, SAVE_TARGET_LABEL]);
    expect(within(container).queryByRole("link")).toBeNull();
  });

  it("con patrón pide los pasos y los pinta como checklist", async () => {
    renderTab(project({ patternId: PATTERN_ID }));

    for (const [index, step] of STEPS.entries()) {
      expect(
        await screen.findByRole("checkbox", { name: stepLabel(step, index) }),
      ).not.toBeChecked();
    }
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(patternEndpoint(PATTERN_ID));
  });

  it("marcar un paso lo guarda y lo deja marcado", async () => {
    const user = userEvent.setup();
    renderTab(project({ patternId: PATTERN_ID, completedSteps: [] }));

    const first = await screen.findByRole("checkbox", {
      name: stepLabel(STEPS[0] as PatternStep, 0),
    });
    await user.click(first);

    expect(await screen.findByRole("checkbox", { checked: true })).toBe(first);
  });

  it("desmarcarlo lo quita", async () => {
    const user = userEvent.setup();
    renderTab(project({ patternId: PATTERN_ID, completedSteps: [0] }));

    const first = await screen.findByRole("checkbox", {
      name: stepLabel(STEPS[0] as PatternStep, 0),
    });
    expect(first).toBeChecked();

    await user.click(first);

    expect(screen.queryByRole("checkbox", { checked: true })).toBeNull();
  });

  it("un patrón sin pasos escritos lo dice", async () => {
    renderTab(project({ patternId: PATTERN_ID }), pattern([]));

    expect(await screen.findByText(STEPS_EMPTY)).toBeInTheDocument();
  });

  /**
   * No poder leer los pasos **no es motivo para tapar las vueltas**: la
   * checklist se calla y el resto del tab sigue funcionando.
   */
  it("si el patrón no se puede traer, el resto del tab sigue en pie", async () => {
    const withPattern = project({ patternId: PATTERN_ID });
    serveBackend(withPattern);
    /* La petición del patrón es la PRIMERA que sale del tab: se le rompe sólo a
       ella, y las de vueltas y meta siguen sirviéndose normalmente. */
    fetchSpy.mockImplementationOnce(() => Promise.reject(new Error("sin red")));
    render(<ProgressHarness initial={withPattern} />);

    expect(await screen.findByText(STEPS_ERROR)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: ADD_ROUND_LABEL }),
    ).toBeInTheDocument();
  });
});

describe("ProgressTab — accesibilidad", () => {
  it("no tiene violaciones de axe con la checklist cargada", async () => {
    const { container } = renderTab(project({ patternId: PATTERN_ID }));
    await screen.findByRole("checkbox", {
      name: stepLabel(STEPS[0] as PatternStep, 0),
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
