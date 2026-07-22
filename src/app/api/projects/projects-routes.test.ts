import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectStore } from "@/features/projects/api/store";
import {
  createInMemoryProjectStore,
  type InMemoryProjectStore,
} from "@/features/projects/api/testing/in-memory-store";
import type { ProjectRecord } from "@/features/projects/types";
import { signSessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

// Solo se dobla el borde de datos: rutas, helper de sesión, validación zod y
// servicios son los reales.
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

const { GET: listProjectsRoute, POST: createProjectRoute } = await import(
  "@/app/api/projects/route"
);
const {
  GET: getProjectRoute,
  PATCH: patchProjectRoute,
  DELETE: deleteProjectRoute,
} = await import("@/app/api/projects/[id]/route");

const BASE_URL = "https://test.local/api/projects";

function getRequest(query = ""): Request {
  return new Request(`${BASE_URL}${query}`);
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

const OTHER_UUID = "11111111-1111-4111-8111-111111111111";

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

describe("api/projects route handlers", () => {
  beforeEach(async () => {
    store.reset();
    cookieJar.clear();
    vi.stubEnv("JWT_SECRET", SECRET);
    await signIn("user-1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("authentication and ownership", () => {
    it("answers 401 on every endpoint without a session", async () => {
      cookieJar.clear();
      const project = seed("user-1");

      const responses = await Promise.all([
        listProjectsRoute(getRequest()),
        createProjectRoute(jsonRequest({ name: "X", type: "knitting" })),
        getProjectRoute(getRequest(), context(project.id)),
        patchProjectRoute(jsonRequest({ name: "X" }, "PATCH"), context(project.id)),
        deleteProjectRoute(getRequest(), context(project.id)),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
      }
      expect(store.rows).toHaveLength(1);
    });

    it("answers 404 for a project owned by another user", async () => {
      const foreign = seed("user-2");

      const read = await getProjectRoute(getRequest(), context(foreign.id));
      const patched = await patchProjectRoute(
        jsonRequest({ name: "Robada" }, "PATCH"),
        context(foreign.id),
      );
      const deleted = await deleteProjectRoute(
        getRequest(),
        context(foreign.id),
      );

      expect(read.status).toBe(404);
      expect(patched.status).toBe(404);
      expect(deleted.status).toBe(404);
      expect(await read.json()).toEqual({ error: "El proyecto no existe." });
      expect(store.rows[0]?.name).toBe("Bufanda");
    });

    it("never lists projects of other users", async () => {
      seed("user-1", { name: "Mía" });
      seed("user-2", { name: "Ajena" });

      const response = await listProjectsRoute(getRequest());
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(response.status).toBe(200);
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0]?.name).toBe("Mía");
    });
  });

  describe("POST /api/projects", () => {
    it("creates a project with the calculated progress", async () => {
      const response = await createProjectRoute(
        jsonRequest({
          name: "  Bufanda  ",
          type: "crochet",
          rounds: 30,
          targetRounds: 120,
          needles: [4, 4.5],
        }),
      );
      const body = (await response.json()) as { project: ProjectRecord };

      expect(response.status).toBe(201);
      expect(body.project.name).toBe("Bufanda");
      expect(body.project.userId).toBe("user-1");
      expect(body.project.progress).toBe(25);
      expect(store.rows).toHaveLength(1);
    });

    it("rejects an invalid payload with 400", async () => {
      const missingName = await createProjectRoute(
        jsonRequest({ type: "knitting" }),
      );
      const badType = await createProjectRoute(
        jsonRequest({ name: "Bufanda", type: "macrame" }),
      );
      const badRounds = await createProjectRoute(
        jsonRequest({ name: "Bufanda", type: "knitting", rounds: -3 }),
      );

      expect(missingName.status).toBe(400);
      expect(badType.status).toBe(400);
      expect(badRounds.status).toBe(400);
      expect(store.rows).toHaveLength(0);
    });

    it("ignores a progress sent by the client", async () => {
      const response = await createProjectRoute(
        jsonRequest({
          name: "Bufanda",
          type: "knitting",
          rounds: 1,
          targetRounds: 10,
          progress: 99,
        }),
      );
      const body = (await response.json()) as { project: ProjectRecord };

      expect(body.project.progress).toBe(10);
    });
  });

  describe("GET /api/projects filters", () => {
    it("filters by active status", async () => {
      seed("user-1", { name: "En curso", status: "in_progress" });
      seed("user-1", { name: "Pausada", status: "paused" });
      seed("user-1", { name: "Terminada", status: "finished" });
      seed("user-1", { name: "Abandonada", status: "abandoned" });

      const active = await listProjectsRoute(getRequest("?active=true"));
      const inactive = await listProjectsRoute(getRequest("?active=false"));
      const activeBody = (await active.json()) as { projects: ProjectRecord[] };
      const inactiveBody = (await inactive.json()) as {
        projects: ProjectRecord[];
      };

      expect(activeBody.projects.map((p) => p.name).sort()).toEqual([
        "En curso",
        "Pausada",
      ]);
      expect(inactiveBody.projects.map((p) => p.name).sort()).toEqual([
        "Abandonada",
        "Terminada",
      ]);
    });

    it("filters by type", async () => {
      seed("user-1", { name: "Dos agujas", type: "knitting" });
      seed("user-1", { name: "Ganchillo", type: "crochet" });

      const response = await listProjectsRoute(getRequest("?type=crochet"));
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(store.lastFilters).toMatchObject({ type: "crochet" });
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0]?.name).toBe("Ganchillo");
    });

    it("filters by needle inside the needles array", async () => {
      seed("user-1", { name: "Con 4mm", needles: [3, 4] });
      seed("user-1", { name: "Con 5mm", needles: [5] });

      const response = await listProjectsRoute(getRequest("?needle=4"));
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(store.lastFilters).toMatchObject({ needle: 4 });
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0]?.name).toBe("Con 4mm");
    });

    it("filters by yarnId through the N:N link", async () => {
      const linked = seed("user-1", { name: "Con lana" });
      seed("user-1", { name: "Sin lana" });
      store.links.push({ projectId: linked.id, yarnId: OTHER_UUID });

      const response = await listProjectsRoute(
        getRequest(`?yarnId=${OTHER_UUID}`),
      );
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(store.lastFilters).toMatchObject({ yarnId: OTHER_UUID });
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0]?.name).toBe("Con lana");
    });

    it("filters by a startDate range", async () => {
      seed("user-1", {
        name: "Enero",
        startDate: new Date("2026-01-10T00:00:00Z"),
      });
      seed("user-1", {
        name: "Junio",
        startDate: new Date("2026-06-10T00:00:00Z"),
      });

      const response = await listProjectsRoute(
        getRequest("?from=2026-05-01&to=2026-12-31"),
      );
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(store.lastFilters?.from).toEqual(new Date("2026-05-01"));
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0]?.name).toBe("Junio");
    });

    it("combines filters", async () => {
      seed("user-1", { name: "Sí", type: "crochet", status: "paused" });
      seed("user-1", { name: "No", type: "crochet", status: "finished" });

      const response = await listProjectsRoute(
        getRequest("?type=crochet&active=true"),
      );
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(body.projects).toHaveLength(1);
      expect(body.projects[0]?.name).toBe("Sí");
    });

    it("treats empty query params as no filter", async () => {
      seed("user-1", { name: "Única" });

      const response = await listProjectsRoute(
        getRequest("?active=&type=&needle=&yarnId=&from=&to="),
      );
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(response.status).toBe(200);
      expect(store.lastFilters).toEqual({});
      expect(body.projects).toHaveLength(1);
    });

    it("answers 400 on an invalid filter instead of ignoring it", async () => {
      const badActive = await listProjectsRoute(getRequest("?active=maybe"));
      const badType = await listProjectsRoute(getRequest("?type=macrame"));
      const badNeedle = await listProjectsRoute(getRequest("?needle=gorda"));
      const badYarn = await listProjectsRoute(getRequest("?yarnId=123"));
      const badDate = await listProjectsRoute(getRequest("?from=ayer"));

      for (const response of [
        badActive,
        badType,
        badNeedle,
        badYarn,
        badDate,
      ]) {
        expect(response.status).toBe(400);
      }
    });
  });

  describe("GET / PATCH / DELETE /api/projects/:id", () => {
    it("returns an owned project", async () => {
      const project = seed("user-1", { name: "Bufanda" });

      const response = await getProjectRoute(getRequest(), context(project.id));
      const body = (await response.json()) as { project: ProjectRecord };

      expect(response.status).toBe(200);
      expect(body.project.id).toBe(project.id);
    });

    it("answers 404 for an unknown or malformed id", async () => {
      const unknown = await getProjectRoute(
        getRequest(),
        context(crypto.randomUUID()),
      );
      const malformed = await getProjectRoute(getRequest(), context("nope"));

      expect(unknown.status).toBe(404);
      expect(malformed.status).toBe(404);
    });

    it("updates a project recalculating progress", async () => {
      const project = seed("user-1", { rounds: 0, targetRounds: 200 });

      const response = await patchProjectRoute(
        jsonRequest({ rounds: 50, status: "paused" }, "PATCH"),
        context(project.id),
      );
      const body = (await response.json()) as { project: ProjectRecord };

      expect(response.status).toBe(200);
      expect(body.project.rounds).toBe(50);
      expect(body.project.progress).toBe(25);
      expect(body.project.status).toBe("paused");
    });

    it("answers 400 on an invalid or empty patch", async () => {
      const project = seed("user-1");

      const invalid = await patchProjectRoute(
        jsonRequest({ status: "casi" }, "PATCH"),
        context(project.id),
      );
      const empty = await patchProjectRoute(
        jsonRequest({}, "PATCH"),
        context(project.id),
      );

      expect(invalid.status).toBe(400);
      expect(empty.status).toBe(400);
    });

    it("deletes an owned project with 204", async () => {
      const project = seed("user-1");

      const response = await deleteProjectRoute(
        getRequest(),
        context(project.id),
      );

      expect(response.status).toBe(204);
      expect(store.rows).toHaveLength(0);
    });

    it("deletes a project with linked yarns clearing the N:N links first", async () => {
      const project = seed("user-1");
      const other = seed("user-1");
      store.links.push({ projectId: project.id, yarnId: OTHER_UUID });
      store.links.push({ projectId: other.id, yarnId: OTHER_UUID });

      const response = await deleteProjectRoute(
        getRequest(),
        context(project.id),
      );

      expect(response.status).toBe(204);
      expect(store.rows.map((row) => row.id)).toEqual([other.id]);
      expect(store.links).toEqual([
        { projectId: other.id, yarnId: OTHER_UUID },
      ]);
    });

    it("answers 404 without deleting anything for another user's project with links", async () => {
      const foreign = seed("user-2");
      store.links.push({ projectId: foreign.id, yarnId: OTHER_UUID });

      const response = await deleteProjectRoute(
        getRequest(),
        context(foreign.id),
      );

      expect(response.status).toBe(404);
      expect(store.rows).toHaveLength(1);
      expect(store.links).toHaveLength(1);
    });
  });
});
