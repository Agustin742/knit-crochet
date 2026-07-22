import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectStore } from "@/features/projects/api/store";
import {
  createInMemoryProjectStore,
  type InMemoryProjectStore,
} from "@/features/projects/api/testing/in-memory-store";
import type { ProjectRecord } from "@/features/projects/types";
import { signSessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

// Mismo enfoque que en A: solo se dobla el borde de datos.
const holder = vi.hoisted(() => ({
  store: undefined as unknown as ProjectStore,
}));

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/features/projects/api/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/projects/api/store")>();
  return { ...actual, createProjectStore: () => holder.store };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

const store: InMemoryProjectStore = createInMemoryProjectStore();
holder.store = store;

const { POST: addRoundsRoute } = await import(
  "@/app/api/projects/[id]/rounds/route"
);
const { PATCH: setStepsRoute } = await import(
  "@/app/api/projects/[id]/steps/route"
);
const { POST: linkYarnRoute } = await import(
  "@/app/api/projects/[id]/yarns/route"
);
const { DELETE: unlinkYarnRoute } = await import(
  "@/app/api/projects/[id]/yarns/[yarnId]/route"
);

const BASE_URL = "https://test.local/api/projects";
const YARN_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_YARN_ID = "33333333-3333-4333-8333-333333333333";

function plainRequest(): Request {
  return new Request(BASE_URL);
}

function jsonRequest(body: unknown, method = "POST"): Request {
  return new Request(BASE_URL, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function yarnContext(
  id: string,
  yarnId: string,
): { params: Promise<{ id: string; yarnId: string }> } {
  return { params: Promise.resolve({ id, yarnId }) };
}

async function signIn(userId: string): Promise<void> {
  cookieJar.set("kc_session", await signSessionToken({ userId }));
}

function seed(
  userId: string,
  overrides: Partial<ProjectRecord> = {},
): ProjectRecord {
  const now = new Date("2026-01-15T10:00:00Z");
  const record: ProjectRecord = {
    id: crypto.randomUUID(),
    userId,
    name: "Bufanda",
    image: null,
    type: "knitting",
    status: "in_progress",
    rounds: 0,
    targetRounds: 0,
    progress: 0,
    needles: [],
    startDate: now,
    endDate: null,
    time: 0,
    patternId: null,
    completedSteps: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  store.rows.push(record);
  return record;
}

async function readProject(response: Response): Promise<ProjectRecord> {
  const body = (await response.json()) as { project: ProjectRecord };
  return body.project;
}

describe("api/projects action route handlers", () => {
  beforeEach(async () => {
    store.reset();
    cookieJar.clear();
    vi.stubEnv("JWT_SECRET", SECRET);
    await signIn("user-1");
    store.yarns.push({ id: YARN_ID, userId: "user-1" });
    store.yarns.push({ id: OTHER_YARN_ID, userId: "user-2" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("authentication and ownership", () => {
    it("answers 401 on every action endpoint without a session", async () => {
      cookieJar.clear();
      const project = seed("user-1", { rounds: 5 });

      const responses = await Promise.all([
        addRoundsRoute(jsonRequest({ delta: 1 }), context(project.id)),
        setStepsRoute(
          jsonRequest({ completedSteps: [1] }, "PATCH"),
          context(project.id),
        ),
        linkYarnRoute(jsonRequest({ yarnId: YARN_ID }), context(project.id)),
        unlinkYarnRoute(plainRequest(), yarnContext(project.id, YARN_ID)),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
      }
      expect(store.rows[0]?.rounds).toBe(5);
      expect(store.links).toHaveLength(0);
    });

    it("answers 404 on every action endpoint for a project of another user", async () => {
      const foreign = seed("user-2", { rounds: 5 });

      const responses = await Promise.all([
        addRoundsRoute(jsonRequest({ delta: 1 }), context(foreign.id)),
        setStepsRoute(
          jsonRequest({ completedSteps: [1] }, "PATCH"),
          context(foreign.id),
        ),
        linkYarnRoute(jsonRequest({ yarnId: YARN_ID }), context(foreign.id)),
        unlinkYarnRoute(plainRequest(), yarnContext(foreign.id, YARN_ID)),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(404);
      }
      expect(store.rows[0]?.rounds).toBe(5);
      expect(store.links).toHaveLength(0);
    });

    it("answers 404 for an unknown or malformed project id", async () => {
      const unknown = await addRoundsRoute(
        jsonRequest({ delta: 1 }),
        context(crypto.randomUUID()),
      );
      const malformed = await addRoundsRoute(
        jsonRequest({ delta: 1 }),
        context("nope"),
      );

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });
  });

  describe("POST /api/projects/:id/rounds", () => {
    it("applies a positive delta recalculating progress", async () => {
      const project = seed("user-1", { rounds: 10, targetRounds: 100 });

      const response = await addRoundsRoute(
        jsonRequest({ delta: 15 }),
        context(project.id),
      );
      const updated = await readProject(response);

      expect(response.status).toBe(200);
      expect(updated.rounds).toBe(25);
      expect(updated.progress).toBe(25);
    });

    it("applies a negative delta recalculating progress", async () => {
      const project = seed("user-1", { rounds: 40, targetRounds: 100 });

      const response = await addRoundsRoute(
        jsonRequest({ delta: -20 }),
        context(project.id),
      );
      const updated = await readProject(response);

      expect(updated.rounds).toBe(20);
      expect(updated.progress).toBe(20);
    });

    it("never goes below 0 rounds", async () => {
      const project = seed("user-1", { rounds: 2, targetRounds: 100 });

      const response = await addRoundsRoute(
        jsonRequest({ delta: -10 }),
        context(project.id),
      );
      const updated = await readProject(response);

      expect(updated.rounds).toBe(0);
      expect(updated.progress).toBe(0);
    });

    it("keeps progress at 0 when targetRounds is 0", async () => {
      const project = seed("user-1", { rounds: 0, targetRounds: 0 });

      const response = await addRoundsRoute(
        jsonRequest({ delta: 7 }),
        context(project.id),
      );
      const updated = await readProject(response);

      expect(updated.rounds).toBe(7);
      expect(updated.progress).toBe(0);
    });

    it("answers 400 on an invalid delta", async () => {
      const project = seed("user-1");

      const missing = await addRoundsRoute(jsonRequest({}), context(project.id));
      const decimal = await addRoundsRoute(
        jsonRequest({ delta: 1.5 }),
        context(project.id),
      );
      const notANumber = await addRoundsRoute(
        jsonRequest({ delta: "uno" }),
        context(project.id),
      );

      expect(missing.status).toBe(400);
      expect(decimal.status).toBe(400);
      expect(notANumber.status).toBe(400);
      expect(store.rows[0]?.rounds).toBe(0);
    });
  });

  describe("PATCH /api/projects/:id/steps", () => {
    it("marks the completed steps normalized", async () => {
      const project = seed("user-1");

      const response = await setStepsRoute(
        jsonRequest({ completedSteps: [2, 0, 2] }, "PATCH"),
        context(project.id),
      );
      const updated = await readProject(response);

      expect(response.status).toBe(200);
      expect(updated.completedSteps).toEqual([0, 2]);
    });

    it("answers 400 on an invalid completedSteps payload", async () => {
      const project = seed("user-1", { completedSteps: [1] });

      const missing = await setStepsRoute(
        jsonRequest({}, "PATCH"),
        context(project.id),
      );
      const negative = await setStepsRoute(
        jsonRequest({ completedSteps: [-1] }, "PATCH"),
        context(project.id),
      );
      const decimal = await setStepsRoute(
        jsonRequest({ completedSteps: [1.5] }, "PATCH"),
        context(project.id),
      );
      const notAnArray = await setStepsRoute(
        jsonRequest({ completedSteps: 3 }, "PATCH"),
        context(project.id),
      );

      for (const response of [missing, negative, decimal, notAnArray]) {
        expect(response.status).toBe(400);
      }
      expect(store.rows[0]?.completedSteps).toEqual([1]);
    });
  });

  describe("POST / DELETE /api/projects/:id/yarns", () => {
    it("links a yarn with 201 without discounting stock", async () => {
      const project = seed("user-1");

      const response = await linkYarnRoute(
        jsonRequest({ yarnId: YARN_ID }),
        context(project.id),
      );
      const body = (await response.json()) as { yarnIds: string[] };

      expect(response.status).toBe(201);
      expect(body.yarnIds).toEqual([YARN_ID]);
      expect(store.links).toEqual([{ projectId: project.id, yarnId: YARN_ID }]);
    });

    it("answers 200 without duplicating when the same yarn is linked twice", async () => {
      const project = seed("user-1");

      await linkYarnRoute(jsonRequest({ yarnId: YARN_ID }), context(project.id));
      const second = await linkYarnRoute(
        jsonRequest({ yarnId: YARN_ID }),
        context(project.id),
      );
      const body = (await second.json()) as { yarnIds: string[] };

      expect(second.status).toBe(200);
      expect(body.yarnIds).toEqual([YARN_ID]);
      expect(store.links).toHaveLength(1);
    });

    it("unlinks a yarn with 204 and is idempotent", async () => {
      const project = seed("user-1");
      await linkYarnRoute(jsonRequest({ yarnId: YARN_ID }), context(project.id));

      const first = await unlinkYarnRoute(
        plainRequest(),
        yarnContext(project.id, YARN_ID),
      );
      const second = await unlinkYarnRoute(
        plainRequest(),
        yarnContext(project.id, YARN_ID),
      );

      expect(first.status).toBe(204);
      expect(second.status).toBe(204);
      expect(store.links).toHaveLength(0);
    });

    it("answers 404 for a yarn owned by another user", async () => {
      const project = seed("user-1");

      const linked = await linkYarnRoute(
        jsonRequest({ yarnId: OTHER_YARN_ID }),
        context(project.id),
      );
      const unlinked = await unlinkYarnRoute(
        plainRequest(),
        yarnContext(project.id, OTHER_YARN_ID),
      );

      expect(linked.status).toBe(404);
      expect(unlinked.status).toBe(404);
      expect(await linked.json()).toEqual({ error: "La lana no existe." });
      expect(store.links).toHaveLength(0);
    });

    it("answers 404 for an unknown yarn and 400 for a malformed body", async () => {
      const project = seed("user-1");

      const unknown = await linkYarnRoute(
        jsonRequest({ yarnId: crypto.randomUUID() }),
        context(project.id),
      );
      const malformedBody = await linkYarnRoute(
        jsonRequest({ yarnId: "123" }),
        context(project.id),
      );
      const malformedParam = await unlinkYarnRoute(
        plainRequest(),
        yarnContext(project.id, "123"),
      );

      expect(unknown.status).toBe(404);
      expect(malformedBody.status).toBe(400);
      expect(malformedParam.status).toBe(404);
    });
  });
});
