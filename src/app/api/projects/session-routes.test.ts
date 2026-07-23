import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectStore } from "@/features/projects/api/store";
import type { ProjectRecord } from "@/features/projects/types";
import type { CraftSessionStore } from "@/features/time-tracking/api/store";
import type { CraftSessionRecord } from "@/features/time-tracking/types";
import { signSessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

// Igual que en los otros tests de rutas: solo se dobla el borde de datos.
const holder = vi.hoisted(() => ({
  projects: undefined as unknown as ProjectStore,
  sessions: undefined as unknown as CraftSessionStore,
}));

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/features/projects/api/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/projects/api/store")>();
  return { ...actual, createProjectStore: () => holder.projects };
});

vi.mock("@/features/time-tracking/api/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/time-tracking/api/store")>();
  return { ...actual, createCraftSessionStore: () => holder.sessions };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

const { createInMemoryCraftSessionStore } = await import(
  "@/features/time-tracking/api/testing/in-memory-store"
);

const store = createInMemoryCraftSessionStore();
holder.projects = store.projects;
holder.sessions = store;

const { POST: startRoute } = await import(
  "@/app/api/projects/[id]/sessions/start/route"
);
const { PATCH: stopRoute } = await import(
  "@/app/api/projects/[id]/sessions/stop/route"
);
const { GET: listRoute } = await import("@/app/api/projects/[id]/sessions/route");
const { DELETE: deleteProjectRoute } = await import(
  "@/app/api/projects/[id]/route"
);

const BASE_URL = "https://test.local/api/projects";
const T0 = new Date("2026-03-01T10:00:00Z");
const T0_PLUS_90S = new Date("2026-03-01T10:01:30Z");
const T1 = new Date("2026-03-02T10:00:00Z");
const T1_PLUS_10S = new Date("2026-03-02T10:00:10Z");

function plainRequest(method = "POST"): Request {
  return new Request(BASE_URL, { method });
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
  store.projects.rows.push(record);
  return record;
}

async function readSession(response: Response): Promise<CraftSessionRecord> {
  const body = (await response.json()) as { session: CraftSessionRecord };
  return body.session;
}

function projectTime(projectId: string): number | undefined {
  return store.projects.rows.find((row) => row.id === projectId)?.time;
}

describe("api/projects/:id/sessions route handlers", () => {
  beforeEach(async () => {
    store.reset();
    cookieJar.clear();
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    vi.stubEnv("JWT_SECRET", SECRET);
    await signIn("user-1");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("authentication and ownership", () => {
    it("answers 401 on every session endpoint without a session cookie", async () => {
      cookieJar.clear();
      const project = seed("user-1");

      const responses = await Promise.all([
        startRoute(plainRequest(), context(project.id)),
        stopRoute(plainRequest("PATCH"), context(project.id)),
        listRoute(plainRequest("GET"), context(project.id)),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
      }
      expect(store.sessions).toHaveLength(0);
    });

    it("answers 404 on every session endpoint for a project of another user", async () => {
      const foreign = seed("user-2");

      const responses = await Promise.all([
        startRoute(plainRequest(), context(foreign.id)),
        stopRoute(plainRequest("PATCH"), context(foreign.id)),
        listRoute(plainRequest("GET"), context(foreign.id)),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
          error: "El proyecto no existe.",
        });
      }
      expect(store.sessions).toHaveLength(0);
    });

    it("answers 404 for an unknown or malformed project id", async () => {
      const unknown = await startRoute(
        plainRequest(),
        context(crypto.randomUUID()),
      );
      const malformed = await startRoute(plainRequest(), context("nope"));

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });
  });

  describe("POST /api/projects/:id/sessions/start", () => {
    it("creates an open session with 201", async () => {
      const project = seed("user-1");

      const response = await startRoute(plainRequest(), context(project.id));
      const session = await readSession(response);

      expect(response.status).toBe(201);
      expect(session.end).toBeNull();
      expect(session.duration).toBe(0);
      expect(store.sessions).toHaveLength(1);
    });

    it("answers 200 reusing the running session on a double start", async () => {
      const project = seed("user-1");

      const first = await startRoute(plainRequest(), context(project.id));
      vi.setSystemTime(T1);
      const second = await startRoute(plainRequest(), context(project.id));

      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect((await readSession(second)).id).toBe(
        (await readSession(first)).id,
      );
      expect(store.sessions).toHaveLength(1);
    });

    it("answers 400 when the client tries to send derived values", async () => {
      const project = seed("user-1");

      const response = await startRoute(
        jsonRequest({ duration: 9999, end: T1.toISOString() }),
        context(project.id),
      );

      expect(response.status).toBe(400);
      expect(store.sessions).toHaveLength(0);
    });
  });

  describe("PATCH /api/projects/:id/sessions/stop", () => {
    it("closes the session computing duration and updating Project.time", async () => {
      const project = seed("user-1");
      await startRoute(plainRequest(), context(project.id));

      vi.setSystemTime(T0_PLUS_90S);
      const response = await stopRoute(
        plainRequest("PATCH"),
        context(project.id),
      );
      const body = (await response.json()) as {
        session: CraftSessionRecord;
        time: number;
      };

      expect(response.status).toBe(200);
      expect(body.session.duration).toBe(90);
      expect(new Date(body.session.end as unknown as string)).toEqual(
        T0_PLUS_90S,
      );
      expect(body.time).toBe(90);
      expect(projectTime(project.id)).toBe(90);
    });

    it("keeps Project.time as the cached sum across sessions", async () => {
      const project = seed("user-1");
      await startRoute(plainRequest(), context(project.id));
      vi.setSystemTime(T0_PLUS_90S);
      await stopRoute(plainRequest("PATCH"), context(project.id));

      vi.setSystemTime(T1);
      await startRoute(plainRequest(), context(project.id));
      vi.setSystemTime(T1_PLUS_10S);
      const response = await stopRoute(
        plainRequest("PATCH"),
        context(project.id),
      );
      const body = (await response.json()) as { time: number };

      expect(body.time).toBe(100);
      expect(projectTime(project.id)).toBe(100);
    });

    it("answers 409 on a double stop instead of 404 or 500", async () => {
      const project = seed("user-1");
      await startRoute(plainRequest(), context(project.id));
      vi.setSystemTime(T0_PLUS_90S);
      await stopRoute(plainRequest("PATCH"), context(project.id));

      const response = await stopRoute(
        plainRequest("PATCH"),
        context(project.id),
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "No hay ninguna sesión de tejido en marcha.",
      });
      expect(projectTime(project.id)).toBe(90);
    });

    it("answers 409 when stopping without any previous start", async () => {
      const project = seed("user-1");

      const response = await stopRoute(
        plainRequest("PATCH"),
        context(project.id),
      );

      expect(response.status).toBe(409);
      expect(projectTime(project.id)).toBe(0);
    });

    it("answers 400 when the client tries to send end or duration", async () => {
      const project = seed("user-1");
      await startRoute(plainRequest(), context(project.id));

      const response = await stopRoute(
        jsonRequest({ duration: 1 }, "PATCH"),
        context(project.id),
      );

      expect(response.status).toBe(400);
      expect(store.sessions[0]?.end).toBeNull();
      expect(projectTime(project.id)).toBe(0);
    });
  });

  describe("GET /api/projects/:id/sessions", () => {
    it("returns the project history newest first", async () => {
      const project = seed("user-1");
      await startRoute(plainRequest(), context(project.id));
      vi.setSystemTime(T0_PLUS_90S);
      await stopRoute(plainRequest("PATCH"), context(project.id));
      vi.setSystemTime(T1);
      await startRoute(plainRequest(), context(project.id));

      const response = await listRoute(plainRequest("GET"), context(project.id));
      const body = (await response.json()) as { sessions: CraftSessionRecord[] };

      expect(response.status).toBe(200);
      expect(body.sessions).toHaveLength(2);
      expect(body.sessions[0]?.end).toBeNull();
      expect(body.sessions[1]?.duration).toBe(90);
    });

    it("does not leak sessions of another project of the same user", async () => {
      const first = seed("user-1");
      const second = seed("user-1");
      await startRoute(plainRequest(), context(first.id));
      await startRoute(plainRequest(), context(second.id));

      const response = await listRoute(plainRequest("GET"), context(first.id));
      const body = (await response.json()) as { sessions: CraftSessionRecord[] };

      expect(body.sessions).toHaveLength(1);
      expect(body.sessions[0]?.projectId).toBe(first.id);
    });

    it("returns an empty history for a project that was never started", async () => {
      const project = seed("user-1");

      const response = await listRoute(plainRequest("GET"), context(project.id));
      const body = (await response.json()) as { sessions: CraftSessionRecord[] };

      expect(response.status).toBe(200);
      expect(body.sessions).toEqual([]);
    });
  });

  // Frontera #6↔#7: la FK `craft_sessions.project_id` es `ON DELETE cascade`.
  describe("DELETE /api/projects/:id with craft sessions", () => {
    it("answers 204 and leaves no orphan sessions", async () => {
      const project = seed("user-1");
      await startRoute(plainRequest(), context(project.id));
      vi.setSystemTime(T0_PLUS_90S);
      await stopRoute(plainRequest("PATCH"), context(project.id));
      vi.setSystemTime(T1);
      await startRoute(plainRequest(), context(project.id));

      const response = await deleteProjectRoute(
        plainRequest("DELETE"),
        context(project.id),
      );

      expect(response.status).toBe(204);
      expect(store.sessions).toHaveLength(0);
      expect(store.projects.rows).toHaveLength(0);
    });

    it("keeps the sessions of the other projects", async () => {
      const doomed = seed("user-1");
      const kept = seed("user-1");
      await startRoute(plainRequest(), context(doomed.id));
      await startRoute(plainRequest(), context(kept.id));

      const response = await deleteProjectRoute(
        plainRequest("DELETE"),
        context(doomed.id),
      );

      expect(response.status).toBe(204);
      expect(store.sessions).toHaveLength(1);
      expect(store.sessions[0]?.projectId).toBe(kept.id);
      expect(store.projects.rows.map((row) => row.id)).toEqual([kept.id]);
    });
  });
});
