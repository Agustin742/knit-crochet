import { beforeEach, describe, expect, it } from "vitest";

import { pickComparison } from "@/features/dashboard/api/comparison";
import { getDashboardMetrics } from "@/features/dashboard/api/metrics";
import {
  createInMemoryDashboardStore,
  type InMemoryDashboardStore,
} from "@/features/dashboard/api/testing/in-memory-store";

const store: InMemoryDashboardStore = createInMemoryDashboardStore();

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

describe("pickComparison (PRD §8 selection)", () => {
  it("picks the largest reference that fits (times >= 1)", () => {
    // 700 m: la mayor referencia con meters <= 700 es la Torre Eiffel (330).
    const comparison = pickComparison(700);

    expect(comparison.label).toBe("La Torre Eiffel");
    expect(comparison.referenceMeters).toBe(330);
    expect(comparison.times).toBeCloseTo(700 / 330);
  });

  it("falls back to the smallest reference when nothing fits", () => {
    const comparison = pickComparison(5);

    expect(comparison.label).toBe("Un colectivo");
    expect(comparison.referenceMeters).toBe(12);
    expect(comparison.times).toBeCloseTo(5 / 12);
  });

  it("returns times = 0 against the smallest reference for zero meters", () => {
    const comparison = pickComparison(0);

    expect(comparison.label).toBe("Un colectivo");
    expect(comparison.referenceMeters).toBe(12);
    expect(comparison.times).toBe(0);
  });

  it("is surfaced through getDashboardMetrics", async () => {
    store.yarns.push({ userId: "user-1", usedQuantity: 1, length: 700 });

    const metrics = await getDashboardMetrics("user-1", { year: 2026 }, store);

    expect(metrics.yarnMeters).toBe(700);
    expect(metrics.comparison.label).toBe("La Torre Eiffel");
  });
});
