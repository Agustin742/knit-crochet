import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { projectFiltersSchema } from "@/features/projects";
import type { ProjectStore } from "@/features/projects/api/store";
import {
  createInMemoryProjectStore,
  type InMemoryProjectStore,
  type InMemoryYarnRow,
} from "@/features/projects/api/testing/in-memory-store";
import type { LinkedYarn, ProjectRecord } from "@/features/projects/types";
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
const PATTERN_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PATTERN_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

/** Siembra una lana del usuario y la enlaza al proyecto. */
function seedLinkedYarn(
  projectId: string,
  overrides: Partial<InMemoryYarnRow> = {},
): InMemoryYarnRow {
  const yarn: InMemoryYarnRow = {
    id: crypto.randomUUID(),
    userId: "user-1",
    colorName: "Azul Profundo",
    colorFamily: "blue",
    brandName: "Malabrigo",
    typeName: "Rios",
    ...overrides,
  };
  store.yarns.push(yarn);
  store.links.push({ projectId, yarnId: yarn.id });
  return yarn;
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

    // ANCLA del contrato (regla 2a, PRD §9): `readFilters` vuelca la query
    // string tal cual en este esquema, así que sus claves SON los nombres de
    // los parámetros. El literal se escribe a mano UNA vez, aquí, porque aquí
    // el literal es el contrato; el resto de tests derivan. `toEqual` falla en
    // las dos direcciones: si falta un filtro y si sobra uno.
    it("accepts exactly the filter names of the documented query string", () => {
      expect(Object.keys(projectFiltersSchema.shape).sort()).toEqual([
        "active",
        "from",
        "needle",
        "patternId",
        "to",
        "type",
        "yarnId",
      ]);
    });

    it("rejects a malformed patternId with the message of the contract", () => {
      const parsed = projectFiltersSchema.safeParse({ patternId: "no-uuid" });

      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues[0]?.message).toBe("El patrón no es válido.");
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
        getRequest("?active=&type=&needle=&yarnId=&patternId=&from=&to="),
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
      const badPattern = await listProjectsRoute(getRequest("?patternId=123"));
      const badDate = await listProjectsRoute(getRequest("?from=ayer"));

      for (const response of [
        badActive,
        badType,
        badNeedle,
        badYarn,
        badPattern,
        badDate,
      ]) {
        expect(response.status).toBe(400);
      }
    });
  });

  /**
   * "En qué proyectos se usa este patrón" (PRD §9.2, feature #18). Se expone
   * como filtro de la lista —no como `usedBy` en el patrón— así que se prueba
   * exactamente igual que `?yarnId=`.
   */
  describe("GET /api/projects?patternId= ('usado en')", () => {
    it("lists the N projects that use the pattern, without those of another pattern or without pattern", async () => {
      const newest = seed("user-1", {
        name: "Usa A (marzo)",
        patternId: PATTERN_A,
        startDate: new Date("2026-03-01T00:00:00Z"),
      });
      const oldest = seed("user-1", {
        name: "Usa A (febrero)",
        patternId: PATTERN_A,
        startDate: new Date("2026-02-01T00:00:00Z"),
      });
      seed("user-1", { name: "Usa B", patternId: PATTERN_B });
      // Trampa del NULL: `pattern_id` es nullable y no puede colarse.
      seed("user-1", { name: "Sin patrón", patternId: null });

      const response = await listProjectsRoute(
        getRequest(`?patternId=${PATTERN_A}`),
      );
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(response.status).toBe(200);
      expect(store.lastFilters).toMatchObject({ patternId: PATTERN_A });
      // Se conserva el orden de la lista: `startDate` descendente.
      expect(body.projects.map((project) => project.id)).toEqual([
        newest.id,
        oldest.id,
      ]);
    });

    // Coherente con `?yarnId=`: el filtro no consulta la tabla `patterns`, así
    // que "sin uso" y "no existe" son indistinguibles a propósito. Ninguno es
    // un error.
    it("answers an empty list, never an error, for a pattern with no projects", async () => {
      const owned = seed("user-1", { patternId: PATTERN_A });
      seed("user-1", { patternId: null });

      const unused = await listProjectsRoute(
        getRequest(`?patternId=${PATTERN_B}`),
      );
      const unknown = await listProjectsRoute(
        getRequest(`?patternId=${crypto.randomUUID()}`),
      );
      const unusedBody = (await unused.json()) as { projects: ProjectRecord[] };
      const unknownBody = (await unknown.json()) as {
        projects: ProjectRecord[];
      };

      expect(unused.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(unusedBody.projects).toEqual([]);
      expect(unknownBody.projects).toEqual([]);
      // La fila sigue ahí: la lista vacía es del filtro, no de un store vacío.
      expect(store.rows.map((row) => row.id)).toContain(owned.id);
    });

    it("never lists another user's project that uses the same pattern", async () => {
      const own = seed("user-1", { name: "Mía", patternId: PATTERN_A });
      seed("user-2", { name: "Ajena", patternId: PATTERN_A });

      const response = await listProjectsRoute(
        getRequest(`?patternId=${PATTERN_A}`),
      );
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(body.projects.map((project) => project.id)).toEqual([own.id]);
    });

    it("cannot discover anything through a pattern used only by another user", async () => {
      seed("user-2", { name: "Ajena", patternId: PATTERN_B });
      seed("user-1", { name: "Mía", patternId: PATTERN_A });

      const response = await listProjectsRoute(
        getRequest(`?patternId=${PATTERN_B}`),
      );
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(response.status).toBe(200);
      expect(body.projects).toEqual([]);
    });

    it("composes with the other filters, narrowing instead of replacing them", async () => {
      const target = seed("user-1", {
        name: "A · crochet · activa",
        patternId: PATTERN_A,
        type: "crochet",
        status: "paused",
      });
      seed("user-1", {
        name: "A · knitting · activa",
        patternId: PATTERN_A,
        type: "knitting",
        status: "paused",
      });
      seed("user-1", {
        name: "B · crochet · activa",
        patternId: PATTERN_B,
        type: "crochet",
        status: "paused",
      });
      seed("user-1", {
        name: "A · crochet · terminada",
        patternId: PATTERN_A,
        type: "crochet",
        status: "finished",
      });

      const response = await listProjectsRoute(
        getRequest(`?patternId=${PATTERN_A}&type=crochet&active=true`),
      );
      const body = (await response.json()) as { projects: ProjectRecord[] };

      expect(store.lastFilters).toMatchObject({
        patternId: PATTERN_A,
        type: "crochet",
        active: true,
      });
      expect(body.projects.map((project) => project.id)).toEqual([target.id]);
    });

    it("answers 400 with the schema message for a malformed patternId", async () => {
      const malformed = "no-es-un-uuid";
      const parsed = projectFiltersSchema.safeParse({ patternId: malformed });

      const response = await listProjectsRoute(
        getRequest(`?patternId=${malformed}`),
      );
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toBe(parsed.error?.issues[0]?.message);
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

    // ANCLA del contrato (regla 2a, PRD §9.1): el literal de estas dos listas
    // ES el contrato. Un test que sólo comprobara que los cinco campos están
    // seguiría en verde si sobrara `colorCode` o `image`.
    it("serializes the payload with exactly {project, yarns} and five keys per yarn", async () => {
      const project = seed("user-1");
      seedLinkedYarn(project.id);

      const response = await getProjectRoute(getRequest(), context(project.id));
      const body = (await response.json()) as Record<string, unknown>;
      const yarns = body.yarns as Record<string, unknown>[];

      expect(Object.keys(body).sort()).toEqual(["project", "yarns"]);
      expect(yarns).toHaveLength(1);
      expect(Object.keys(yarns[0] ?? {}).sort()).toEqual([
        "brandName",
        "colorFamily",
        "colorName",
        "id",
        "typeName",
      ]);
    });

    it("returns the linked yarns without changing the project payload", async () => {
      const project = seed("user-1", { name: "Bufanda" });
      const yarn = seedLinkedYarn(project.id);

      const response = await getProjectRoute(getRequest(), context(project.id));
      const body = (await response.json()) as {
        project: ProjectRecord;
        yarns: LinkedYarn[];
      };

      expect(response.status).toBe(200);
      // El `project` es exactamente la fila serializada, como antes de #17.
      expect(body.project).toEqual(JSON.parse(JSON.stringify(project)));
      expect(body.yarns).toEqual([
        {
          id: yarn.id,
          colorName: yarn.colorName,
          colorFamily: yarn.colorFamily,
          brandName: yarn.brandName,
          typeName: yarn.typeName,
        },
      ]);
    });

    it("returns an empty yarn list when the project has no linked yarns", async () => {
      const project = seed("user-1");

      const response = await getProjectRoute(getRequest(), context(project.id));
      const body = (await response.json()) as { yarns: LinkedYarn[] };

      expect(body.yarns).toEqual([]);
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
