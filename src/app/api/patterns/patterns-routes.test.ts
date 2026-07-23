import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PatternStore } from "@/features/patterns/api/store";
import {
  createInMemoryPatternStore,
  type InMemoryPatternStore,
} from "@/features/patterns/api/testing/in-memory-store";
import type { PatternRecord } from "@/features/patterns/types";
import { signSessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

const holder = vi.hoisted(() => ({
  store: undefined as unknown as PatternStore,
}));

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/features/patterns/api/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/patterns/api/store")>();
  return { ...actual, createPatternStore: () => holder.store };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

const store: InMemoryPatternStore = createInMemoryPatternStore();
holder.store = store;

const { GET: listPatternsRoute, POST: createPatternRoute } = await import(
  "@/app/api/patterns/route"
);
const {
  GET: getPatternRoute,
  PATCH: patchPatternRoute,
  DELETE: deletePatternRoute,
} = await import("@/app/api/patterns/[id]/route");

const BASE_URL = "https://test.local/api/patterns";

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

function deleteRequest(): Request {
  return new Request(BASE_URL, { method: "DELETE" });
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function signIn(userId: string): Promise<void> {
  cookieJar.set("kc_session", await signSessionToken({ userId }));
}

function patternBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Gorro básico",
    type: "knitting",
    ...overrides,
  };
}

async function createPattern(
  overrides: Record<string, unknown> = {},
): Promise<PatternRecord> {
  const response = await createPatternRoute(jsonRequest(patternBody(overrides)));
  return ((await response.json()) as { pattern: PatternRecord }).pattern;
}

describe("api/patterns route handlers", () => {
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

      const responses = await Promise.all([
        listPatternsRoute(getRequest()),
        createPatternRoute(jsonRequest(patternBody())),
        getPatternRoute(getRequest(), context(crypto.randomUUID())),
        patchPatternRoute(
          jsonRequest({ name: "X" }, "PATCH"),
          context(crypto.randomUUID()),
        ),
        deletePatternRoute(deleteRequest(), context(crypto.randomUUID())),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
      }
      expect(store.rows).toHaveLength(0);
    });

    it("answers 404 for a pattern owned by another user", async () => {
      const foreign: PatternRecord = {
        id: crypto.randomUUID(),
        userId: "user-2",
        name: "Ajeno",
        image: null,
        type: "crochet",
        instructions: [],
        metadata: [],
        inLibrary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.rows.push(foreign);

      const read = await getPatternRoute(getRequest(), context(foreign.id));
      const patched = await patchPatternRoute(
        jsonRequest({ name: "X" }, "PATCH"),
        context(foreign.id),
      );
      const deleted = await deletePatternRoute(
        deleteRequest(),
        context(foreign.id),
      );

      expect(read.status).toBe(404);
      expect(patched.status).toBe(404);
      expect(deleted.status).toBe(404);
      expect(store.rows).toHaveLength(1);
    });
  });

  describe("POST /api/patterns", () => {
    it("creates an embedded pattern with 201 and defaults", async () => {
      const response = await createPatternRoute(
        jsonRequest(
          patternBody({
            instructions: [{ key: "Paso 1", value: "Montar 40 puntos" }],
          }),
        ),
      );
      const body = (await response.json()) as { pattern: PatternRecord };

      expect(response.status).toBe(201);
      expect(body.pattern.userId).toBe("user-1");
      expect(body.pattern.inLibrary).toBe(false);
      expect(body.pattern.metadata).toEqual([]);
      expect(store.rows).toHaveLength(1);
    });

    it("creates a library pattern when inLibrary=true", async () => {
      const pattern = await createPattern({ inLibrary: true });

      expect(pattern.inLibrary).toBe(true);
    });

    it("rejects an invalid payload with 400", async () => {
      const badType = await createPatternRoute(
        jsonRequest(patternBody({ type: "sewing" })),
      );
      const badInstruction = await createPatternRoute(
        jsonRequest(patternBody({ instructions: [{ key: "", value: "x" }] })),
      );
      const missingName = await createPatternRoute(
        jsonRequest(patternBody({ name: "" })),
      );

      expect(badType.status).toBe(400);
      expect(badInstruction.status).toBe(400);
      expect(missingName.status).toBe(400);
      expect(store.rows).toHaveLength(0);
    });
  });

  describe("GET /api/patterns filters", () => {
    it("treats empty query params as no filter", async () => {
      await createPattern();

      const response = await listPatternsRoute(
        getRequest("?type=&inLibrary="),
      );
      const body = (await response.json()) as { patterns: PatternRecord[] };

      expect(response.status).toBe(200);
      expect(store.lastFilters).toEqual({});
      expect(body.patterns).toHaveLength(1);
    });

    it("filters by type and inLibrary", async () => {
      await createPattern({ type: "knitting", inLibrary: true });
      await createPattern({ type: "crochet", inLibrary: false });

      const byType = await listPatternsRoute(getRequest("?type=crochet"));
      const byTypeBody = (await byType.json()) as { patterns: PatternRecord[] };
      expect(byTypeBody.patterns).toHaveLength(1);
      expect(byTypeBody.patterns[0]?.type).toBe("crochet");

      const byLibrary = await listPatternsRoute(getRequest("?inLibrary=true"));
      const byLibraryBody = (await byLibrary.json()) as {
        patterns: PatternRecord[];
      };
      expect(byLibraryBody.patterns).toHaveLength(1);
      expect(byLibraryBody.patterns[0]?.inLibrary).toBe(true);
    });

    it("answers 400 on an invalid filter", async () => {
      const badType = await listPatternsRoute(getRequest("?type=sewing"));
      const badFlag = await listPatternsRoute(getRequest("?inLibrary=maybe"));

      expect(badType.status).toBe(400);
      expect(badFlag.status).toBe(400);
    });
  });

  describe("PATCH /api/patterns/:id", () => {
    it("updates an owned pattern", async () => {
      const pattern = await createPattern();

      const response = await patchPatternRoute(
        jsonRequest(
          { name: "Gorro avanzado", metadata: [{ key: "size", value: "L" }] },
          "PATCH",
        ),
        context(pattern.id),
      );
      const body = (await response.json()) as { pattern: PatternRecord };

      expect(response.status).toBe(200);
      expect(body.pattern.name).toBe("Gorro avanzado");
      expect(body.pattern.metadata).toEqual([{ key: "size", value: "L" }]);
    });

    it("answers 400 on an empty patch", async () => {
      const pattern = await createPattern();

      const response = await patchPatternRoute(
        jsonRequest({}, "PATCH"),
        context(pattern.id),
      );

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/patterns/:id", () => {
    it("deletes a pattern with 204", async () => {
      const pattern = await createPattern();

      const response = await deletePatternRoute(
        deleteRequest(),
        context(pattern.id),
      );

      expect(response.status).toBe(204);
      expect(store.rows).toHaveLength(0);
    });

    // Costura: al borrar un patrón enlazado, el proyecto sobrevive con
    // patternId = null (FK `set null`, S2 — lo simula el doble compartido).
    it("leaves referencing projects with patternId = null after delete", async () => {
      const pattern = await createPattern({ inLibrary: true });
      const project = await store.projects.create({
        userId: "user-1",
        name: "Bufanda",
        type: "knitting",
        patternId: pattern.id,
      });

      const response = await deletePatternRoute(
        deleteRequest(),
        context(pattern.id),
      );

      expect(response.status).toBe(204);
      const surviving = store.projects.rows.find((row) => row.id === project.id);
      expect(surviving).toBeDefined();
      expect(surviving?.patternId).toBeNull();
    });
  });
});
