import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ComparisonReference,
  HOURS_REFERENCES,
  PROJECTS_REFERENCES,
  YARN_METERS_REFERENCES,
} from "@/features/dashboard/api/comparison";
import type { DashboardStore } from "@/features/dashboard/api/store";
import {
  createInMemoryDashboardStore,
  type InMemoryDashboardStore,
} from "@/features/dashboard/api/testing/in-memory-store";
import type { DashboardMetrics } from "@/features/dashboard/types";
import { signSessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

const holder = vi.hoisted(() => ({
  store: undefined as unknown as DashboardStore,
}));

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/features/dashboard/api/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/dashboard/api/store")>();
  return { ...actual, createDashboardStore: () => holder.store };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

const store: InMemoryDashboardStore = createInMemoryDashboardStore();
holder.store = store;

const { GET: metricsRoute } = await import(
  "@/app/api/dashboard/metrics/route"
);

const BASE_URL = "https://test.local/api/dashboard/metrics";

function getRequest(query = ""): Request {
  return new Request(`${BASE_URL}${query}`);
}

/**
 * Referencia MENOR de una lista, derivada de `shared/config` (nunca escrita a
 * mano). Alimentando cada métrica con el valor exacto de su referencia menor,
 * la comparativa esperada es esa misma referencia con `times = 1`, sin tener que
 * reimplementar el criterio de selección aquí.
 */
function smallest(
  references: readonly ComparisonReference[],
): ComparisonReference {
  const sorted = [...references].sort((a, b) => a.value - b.value);
  const reference = sorted[0];
  if (!reference) {
    throw new Error("La lista de referencias no puede estar vacía.");
  }
  return reference;
}

async function signIn(userId: string): Promise<void> {
  cookieJar.set("kc_session", await signSessionToken({ userId }));
}

describe("api/dashboard/metrics route handler", () => {
  beforeEach(async () => {
    store.reset();
    cookieJar.clear();
    vi.stubEnv("JWT_SECRET", SECRET);
    await signIn("user-1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers 401 without a session", async () => {
    cookieJar.clear();

    const response = await metricsRoute(getRequest("?year=2026"));

    expect(response.status).toBe(401);
  });

  it("returns the metrics contract for the requested year and type", async () => {
    const hoursReference = smallest(HOURS_REFERENCES);
    const projectsReference = smallest(PROJECTS_REFERENCES);
    const yarnReference = smallest(YARN_METERS_REFERENCES);

    for (let index = 0; index < projectsReference.value; index += 1) {
      store.projects.push({
        id: `p${index}`,
        userId: "user-1",
        type: "knitting",
        startDate: new Date(2026, 5, 1),
        endDate: null,
      });
    }
    store.sessions.push({
      userId: "user-1",
      projectId: "p0",
      start: new Date(2026, 5, 2),
      // Segundos: la métrica `hours` es Σ duration (PRD §8.1).
      duration: hoursReference.value,
    });
    store.yarns.push({
      userId: "user-1",
      usedQuantity: 1,
      length: yarnReference.value,
    });

    const response = await metricsRoute(getRequest("?year=2026&type=knitting"));
    const body = (await response.json()) as DashboardMetrics;

    expect(response.status).toBe(200);
    expect(body.hours).toBe(hoursReference.value);
    expect(body.projects).toBe(projectsReference.value);
    expect(body.yarnMeters).toBe(yarnReference.value);
    // Aceptación #1: `comparison` trae una entrada por métrica.
    expect(body.comparison).toEqual({
      hours: {
        label: hoursReference.label,
        referenceValue: hoursReference.value,
        times: 1,
      },
      projects: {
        label: projectsReference.label,
        referenceValue: projectsReference.value,
        times: 1,
      },
      yarnMeters: {
        label: yarnReference.label,
        referenceValue: yarnReference.value,
        times: 1,
      },
    });
  });

  it("treats empty query params as no filter (defaults to current year)", async () => {
    const thisYear = new Date().getFullYear();
    store.projects.push({
      id: "p1",
      userId: "user-1",
      type: "crochet",
      startDate: new Date(thisYear, 2, 3),
      endDate: null,
    });

    const response = await metricsRoute(getRequest("?year=&type="));
    const body = (await response.json()) as DashboardMetrics;

    expect(response.status).toBe(200);
    expect(body.projects).toBe(1);
  });

  it("answers 400 on an invalid year or type", async () => {
    const badYear = await metricsRoute(getRequest("?year=abc"));
    const badType = await metricsRoute(getRequest("?type=sewing"));

    expect(badYear.status).toBe(400);
    expect(badType.status).toBe(400);
  });
});
