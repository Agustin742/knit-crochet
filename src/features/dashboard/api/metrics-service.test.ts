import { beforeEach, describe, expect, it } from "vitest";

import {
  type ComparisonReference,
  HOURS_REFERENCES,
  PROJECTS_REFERENCES,
  YARN_METERS_REFERENCES,
} from "@/features/dashboard/api/comparison";
import { getDashboardMetrics } from "@/features/dashboard/api/metrics";
import {
  createInMemoryDashboardStore,
  type InMemoryDashboardStore,
} from "@/features/dashboard/api/testing/in-memory-store";
import { HOURS_COMPARISONS, SECONDS_PER_HOUR } from "@/shared/config";

const store: InMemoryDashboardStore = createInMemoryDashboardStore();

/** Extremos de una lista de referencias, derivados (nunca escritos a mano). */
function edges(references: readonly ComparisonReference[]): {
  smallest: ComparisonReference;
  largest: ComparisonReference;
} {
  const sorted = [...references].sort((a, b) => a.value - b.value);
  const smallest = sorted[0];
  const largest = sorted.at(-1);
  if (!smallest || !largest || smallest.value === largest.value) {
    throw new Error("La semilla necesita al menos 2 referencias distintas.");
  }
  return { smallest, largest };
}

/** Un timestamp cómodo dentro del año pedido. */
function at(year: number, month = 5, day = 15): Date {
  return new Date(year, month, day);
}

beforeEach(() => {
  store.reset();
});

describe("getDashboardMetrics · hours (Σ duration, segundos)", () => {
  it("sums only sessions whose start falls in the year, scoped by user", async () => {
    store.projects.push({
      id: "p1",
      userId: "user-1",
      type: "knitting",
      startDate: at(2026),
      endDate: null,
    });
    store.sessions.push(
      { userId: "user-1", projectId: "p1", start: at(2026), duration: 3600 },
      { userId: "user-1", projectId: "p1", start: at(2026, 0, 1), duration: 1800 },
      { userId: "user-1", projectId: "p1", start: at(2025), duration: 9999 },
      { userId: "user-2", projectId: "p1", start: at(2026), duration: 5000 },
    );

    const metrics = await getDashboardMetrics("user-1", { year: 2026 }, store);

    // Agregado crudo en segundos (NO se divide a horas: eso es de la UI).
    expect(metrics.hours).toBe(5400);
  });

  it("restricts hours to the given craft type via the project join", async () => {
    store.projects.push(
      { id: "knit", userId: "user-1", type: "knitting", startDate: at(2026), endDate: null },
      { id: "croc", userId: "user-1", type: "crochet", startDate: at(2026), endDate: null },
    );
    store.sessions.push(
      { userId: "user-1", projectId: "knit", start: at(2026), duration: 1000 },
      { userId: "user-1", projectId: "croc", start: at(2026), duration: 2000 },
    );

    const all = await getDashboardMetrics("user-1", { year: 2026 }, store);
    const knitting = await getDashboardMetrics(
      "user-1",
      { year: 2026, type: "knitting" },
      store,
    );

    expect(all.hours).toBe(3000);
    expect(knitting.hours).toBe(1000);
  });

  it("defaults to the current server year when year is omitted", async () => {
    const thisYear = new Date().getFullYear();
    store.projects.push({
      id: "p1",
      userId: "user-1",
      type: "knitting",
      startDate: at(thisYear),
      endDate: null,
    });
    store.sessions.push(
      { userId: "user-1", projectId: "p1", start: at(thisYear), duration: 42 },
      { userId: "user-1", projectId: "p1", start: at(thisYear - 1), duration: 100 },
    );

    const metrics = await getDashboardMetrics("user-1", {}, store);

    expect(metrics.hours).toBe(42);
  });
});

describe("getDashboardMetrics · projects (startDate OR endDate in year)", () => {
  it("counts projects started or finished in the year", async () => {
    store.projects.push(
      // iniciado en el año
      { id: "a", userId: "user-1", type: "knitting", startDate: at(2026), endDate: null },
      // terminado en el año (iniciado antes)
      { id: "b", userId: "user-1", type: "knitting", startDate: at(2024), endDate: at(2026) },
      // fuera del año por ambos extremos
      { id: "c", userId: "user-1", type: "knitting", startDate: at(2024), endDate: at(2025) },
      // de otro usuario
      { id: "d", userId: "user-2", type: "knitting", startDate: at(2026), endDate: null },
    );

    const metrics = await getDashboardMetrics("user-1", { year: 2026 }, store);

    expect(metrics.projects).toBe(2);
  });

  it("filters the project count by craft type", async () => {
    store.projects.push(
      { id: "a", userId: "user-1", type: "knitting", startDate: at(2026), endDate: null },
      { id: "b", userId: "user-1", type: "crochet", startDate: at(2026), endDate: null },
    );

    const crochet = await getDashboardMetrics(
      "user-1",
      { year: 2026, type: "crochet" },
      store,
    );

    expect(crochet.projects).toBe(1);
  });
});

describe("getDashboardMetrics · yarnMeters (lifetime, PRD §11.2)", () => {
  it("sums usedQuantity × length for the user's yarns", async () => {
    store.yarns.push(
      { userId: "user-1", usedQuantity: 3, length: 100 },
      { userId: "user-1", usedQuantity: 2, length: 50 },
      { userId: "user-2", usedQuantity: 10, length: 100 },
    );

    const metrics = await getDashboardMetrics("user-1", { year: 2026 }, store);

    expect(metrics.yarnMeters).toBe(400);
  });

  it("is invariant to year and type (lifetime aggregate)", async () => {
    store.yarns.push({ userId: "user-1", usedQuantity: 4, length: 25 });

    const y2026 = await getDashboardMetrics("user-1", { year: 2026 }, store);
    const y2000 = await getDashboardMetrics("user-1", { year: 2000 }, store);
    const knitting = await getDashboardMetrics(
      "user-1",
      { year: 2026, type: "knitting" },
      store,
    );

    expect(y2026.yarnMeters).toBe(100);
    expect(y2000.yarnMeters).toBe(100);
    expect(knitting.yarnMeters).toBe(100);
  });
});

describe("getDashboardMetrics · comparison map (PRD §8.1)", () => {
  it("returns one comparison per metric, each in its own unit", async () => {
    const hours = edges(HOURS_REFERENCES);
    const projects = edges(PROJECTS_REFERENCES);
    const yarn = edges(YARN_METERS_REFERENCES);

    store.projects.push({
      id: "p1",
      userId: "user-1",
      type: "knitting",
      startDate: at(2026),
      endDate: null,
    });
    // Duraciones en SEGUNDOS: la referencia de horas ya viene convertida.
    store.sessions.push({
      userId: "user-1",
      projectId: "p1",
      start: at(2026),
      duration: hours.largest.value,
    });
    store.yarns.push({
      userId: "user-1",
      usedQuantity: 1,
      length: yarn.largest.value,
    });

    const metrics = await getDashboardMetrics("user-1", { year: 2026 }, store);

    expect(Object.keys(metrics.comparison).sort()).toEqual([
      "hours",
      "projects",
      "yarnMeters",
    ]);
    expect(metrics.comparison.hours).toEqual({
      label: hours.largest.label,
      referenceValue: hours.largest.value,
      times: 1,
    });
    // 1 proyecto: no llega ni a la referencia más chica → times < 1.
    expect(metrics.comparison.projects).toEqual({
      label: projects.smallest.label,
      referenceValue: projects.smallest.value,
      times: 1 / projects.smallest.value,
    });
    expect(metrics.comparison.yarnMeters).toEqual({
      label: yarn.largest.label,
      referenceValue: yarn.largest.value,
      times: 1,
    });
  });

  it("compares hours in SECONDS, not in the hours of the config list", async () => {
    // ⚠️ Este caso NO deriva de `HOURS_REFERENCES` a propósito: si lo hiciera,
    // sería invariante a la unidad (la lista se movería con el bug y el test
    // seguiría en verde). Se deriva de la lista EN HORAS + el puente de
    // unidades, que es justo lo que el contrato de §8.1 exige.
    const inSeconds = HOURS_COMPARISONS.map((reference) => ({
      label: reference.label,
      value: reference.hours * SECONDS_PER_HOUR,
    })).sort((a, b) => a.value - b.value);
    const largest = inSeconds.at(-1);
    if (!largest) {
      throw new Error("La semilla de horas no puede estar vacía.");
    }

    store.projects.push({
      id: "p1",
      userId: "user-1",
      type: "knitting",
      startDate: at(2026),
      endDate: null,
    });
    // Σ duration en SEGUNDOS, exactamente la referencia mayor.
    store.sessions.push({
      userId: "user-1",
      projectId: "p1",
      start: at(2026),
      duration: largest.value,
    });

    const metrics = await getDashboardMetrics("user-1", { year: 2026 }, store);

    expect(metrics.hours).toBe(largest.value);
    // Con la lista sin convertir (o con la métrica convertida a horas), el
    // label seguiría siendo el mismo pero estos dos saldrían por un factor de
    // `SECONDS_PER_HOUR`.
    expect(metrics.comparison.hours.referenceValue).toBe(largest.value);
    expect(metrics.comparison.hours.times).toBeCloseTo(1);
    expect(metrics.comparison.hours.label).toBe(largest.label);
  });

  it("moves the hours/projects comparisons with year and type, but never the yarn one", async () => {
    const hours = edges(HOURS_REFERENCES);
    const projects = edges(PROJECTS_REFERENCES);

    // Tejido de 2026: knitting suma exactamente la referencia MENOR de horas y
    // el resto lo pone crochet, de modo que el total sea exactamente la MAYOR.
    const knittingCount = projects.smallest.value;
    const crochetCount = projects.largest.value - projects.smallest.value;
    for (let index = 0; index < knittingCount; index += 1) {
      store.projects.push({
        id: `knit-${index}`,
        userId: "user-1",
        type: "knitting",
        startDate: at(2026),
        endDate: null,
      });
    }
    for (let index = 0; index < crochetCount; index += 1) {
      store.projects.push({
        id: `croc-${index}`,
        userId: "user-1",
        type: "crochet",
        startDate: at(2026),
        endDate: null,
      });
    }
    store.sessions.push(
      {
        userId: "user-1",
        projectId: "knit-0",
        start: at(2026),
        duration: hours.smallest.value,
      },
      {
        userId: "user-1",
        projectId: "croc-0",
        start: at(2026),
        duration: hours.largest.value - hours.smallest.value,
      },
    );
    store.yarns.push({ userId: "user-1", usedQuantity: 2, length: 350 });

    const all = await getDashboardMetrics("user-1", { year: 2026 }, store);
    const knitting = await getDashboardMetrics(
      "user-1",
      { year: 2026, type: "knitting" },
      store,
    );
    const empty = await getDashboardMetrics("user-1", { year: 2025 }, store);

    // Horas y proyectos: la comparativa se mueve con el filtro.
    expect(all.comparison.hours.label).toBe(hours.largest.label);
    expect(knitting.comparison.hours.label).toBe(hours.smallest.label);
    expect(all.comparison.projects.label).toBe(projects.largest.label);
    expect(knitting.comparison.projects.label).toBe(projects.smallest.label);

    // Año sin datos: ambas caen a la referencia más chica con times = 0.
    expect(empty.comparison.hours).toEqual({
      label: hours.smallest.label,
      referenceValue: hours.smallest.value,
      times: 0,
    });
    expect(empty.comparison.projects).toEqual({
      label: projects.smallest.label,
      referenceValue: projects.smallest.value,
      times: 0,
    });

    // Metros: lifetime (PRD §11.2). Ni el año ni el tipo la tocan.
    expect(knitting.comparison.yarnMeters).toEqual(all.comparison.yarnMeters);
    expect(empty.comparison.yarnMeters).toEqual(all.comparison.yarnMeters);
    expect(all.comparison.yarnMeters.times).toBeGreaterThan(0);
  });
});
