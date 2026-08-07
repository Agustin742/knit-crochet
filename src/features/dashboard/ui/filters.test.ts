import { describe, expect, it } from "vitest";

import {
  METRICS_YEAR_MAX,
  METRICS_YEAR_MIN,
} from "@/features/dashboard/validation";
import type { SerializedProject } from "@/features/projects/ui";

import {
  clampYear,
  parseYear,
  sortProjects,
  toTypeFilter,
} from "./filters";

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

/**
 * ANCLA del rango (regla 2a): éste es el único sitio donde los dos topes se
 * escriben a mano, porque aquí el literal **es** el contrato del endpoint
 * (`metricsFiltersSchema`, `min(1970).max(9999)`). El resto de los tests derivan
 * de las constantes, así que si el contrato se moviera, cae éste y sólo éste —
 * en vez de quedarse todo en verde midiendo un rango que ya no existe.
 */
describe("rango de años del contrato", () => {
  it("es el que el endpoint declara", () => {
    expect([METRICS_YEAR_MIN, METRICS_YEAR_MAX]).toEqual([1970, 9999]);
  });
});

describe("parseYear", () => {
  it("accepts a plain year", () => {
    expect(parseYear("2026")).toBe(2026);
    expect(parseYear(" 2026 ")).toBe(2026);
  });

  /**
   * Los topes se DERIVAN del schema del endpoint: si la UI se inventara los
   * suyos, aceptaría un año que el servidor contesta con un 400.
   */
  it("honours the range the endpoint accepts, on both edges", () => {
    expect(parseYear(String(METRICS_YEAR_MIN))).toBe(METRICS_YEAR_MIN);
    expect(parseYear(String(METRICS_YEAR_MAX))).toBe(METRICS_YEAR_MAX);
    expect(parseYear(String(METRICS_YEAR_MIN - 1))).toBeNull();
    expect(parseYear(String(METRICS_YEAR_MAX + 1))).toBeNull();
  });

  it("rejects anything that is not a plain integer", () => {
    for (const value of ["", "  ", "20", "20a6", "-2026", "2026.5", "2e3"]) {
      expect(parseYear(value), value).toBeNull();
    }
  });
});

describe("clampYear", () => {
  it("keeps the stepper inside the range the endpoint accepts", () => {
    expect(clampYear(METRICS_YEAR_MIN - 1)).toBe(METRICS_YEAR_MIN);
    expect(clampYear(METRICS_YEAR_MAX + 1)).toBe(METRICS_YEAR_MAX);
    expect(clampYear(2026)).toBe(2026);
  });
});

describe("toTypeFilter", () => {
  /**
   * Los dos botones son combinables y el endpoint acepta uno solo: marcar los
   * dos pregunta lo mismo que no marcar ninguno.
   */
  it("filters only when exactly one type is selected", () => {
    expect(toTypeFilter([])).toBeUndefined();
    expect(toTypeFilter(["knitting", "crochet"])).toBeUndefined();
    expect(toTypeFilter(["crochet"])).toBe("crochet");
  });
});

describe("sortProjects", () => {
  const older = project({
    id: "older",
    name: "Alfombra",
    progress: 90,
    updatedAt: "2026-01-01T10:00:00.000Z",
  });
  const newer = project({
    id: "newer",
    name: "Zoquetes",
    progress: 10,
    updatedAt: "2026-03-01T10:00:00.000Z",
  });

  it("puts the most recently touched project first", () => {
    expect(sortProjects([older, newer], "recent").map((p) => p.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("sorts by name and by progress when asked", () => {
    expect(sortProjects([newer, older], "name").map((p) => p.id)).toEqual([
      "older",
      "newer",
    ]);
    expect(sortProjects([newer, older], "progress").map((p) => p.id)).toEqual([
      "older",
      "newer",
    ]);
  });

  /**
   * `updatedAt` viaja como CADENA aunque el tipo del dominio diga `Date`. Este
   * par cae si alguien "arregla" el orden llamando a `.getTime()` sobre el
   * campo: compilaría y reventaría en el navegador.
   */
  it("reads the timestamp out of the ISO string it really receives", () => {
    const [first] = sortProjects([older, newer], "recent");
    expect(typeof newer.updatedAt).toBe("string");
    expect(first?.updatedAt).toBe(newer.updatedAt);
  });

  it("sends an unreadable date to the bottom instead of poisoning the order", () => {
    const broken = project({ id: "broken", updatedAt: "no es una fecha" });

    expect(sortProjects([broken, older], "recent").map((p) => p.id)).toEqual([
      "older",
      "broken",
    ]);
  });

  it("does not mutate the list it receives", () => {
    const list = [older, newer];
    sortProjects(list, "recent");
    expect(list.map((p) => p.id)).toEqual(["older", "newer"]);
  });
});
