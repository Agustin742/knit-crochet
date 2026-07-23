import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { YarnStore } from "@/features/yarns/api/store";
import {
  createInMemoryYarnStore,
  type InMemoryYarnStore,
} from "@/features/yarns/api/testing/in-memory-store";
import type {
  BrandRecord,
  YarnRecord,
  YarnTypeRecord,
} from "@/features/yarns/types";
import { signSessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

const holder = vi.hoisted(() => ({
  store: undefined as unknown as YarnStore,
}));

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/features/yarns/api/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/yarns/api/store")>();
  return { ...actual, createYarnStore: () => holder.store };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

const store: InMemoryYarnStore = createInMemoryYarnStore();
holder.store = store;

const { GET: listYarnsRoute, POST: createYarnRoute } = await import(
  "@/app/api/yarns/route"
);
const {
  GET: getYarnRoute,
  PATCH: patchYarnRoute,
  DELETE: deleteYarnRoute,
} = await import("@/app/api/yarns/[id]/route");

const BASE_URL = "https://test.local/api/yarns";

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

function deleteRequest(query = ""): Request {
  return new Request(`${BASE_URL}${query}`, { method: "DELETE" });
}

function context(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function signIn(userId: string): Promise<void> {
  cookieJar.set("kc_session", await signSessionToken({ userId }));
}

function seedBrand(userId: string, name = "Malabrigo"): BrandRecord {
  const brand: BrandRecord = { id: crypto.randomUUID(), userId, name };
  store.brands.push(brand);
  return brand;
}

function seedType(brandId: string, name = "Rios"): YarnTypeRecord {
  const type: YarnTypeRecord = { id: crypto.randomUUID(), brandId, name };
  store.types.push(type);
  return type;
}

function yarnBody(
  brandId: string,
  typeId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    brandId,
    typeId,
    colorName: "Azul",
    colorCode: "AP-01",
    colorFamily: "blue",
    length: 100,
    fiber: "merino",
    recommendedNeedle: { min: 4, max: 5 },
    thickness: 4,
    lot: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("api/yarns route handlers", () => {
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
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);

      const responses = await Promise.all([
        listYarnsRoute(getRequest()),
        createYarnRoute(jsonRequest(yarnBody(brand.id, type.id))),
        getYarnRoute(getRequest(), context(crypto.randomUUID())),
        patchYarnRoute(
          jsonRequest({ colorName: "X" }, "PATCH"),
          context(crypto.randomUUID()),
        ),
        deleteYarnRoute(deleteRequest(), context(crypto.randomUUID())),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
      }
      expect(store.yarns).toHaveLength(0);
    });

    it("answers 404 for a yarn owned by another user", async () => {
      const brand = seedBrand("user-2");
      const type = seedType(brand.id);
      const foreign: YarnRecord = {
        id: crypto.randomUUID(),
        userId: "user-2",
        image: null,
        brandId: brand.id,
        typeId: type.id,
        colorName: "Azul",
        colorCode: "AP-01",
        colorFamily: "blue",
        quantity: 0,
        usedQuantity: 0,
        length: 100,
        fiber: "merino",
        recommendedNeedle: { min: 4, max: 5 },
        thickness: 4,
        lot: new Date("2026-01-01T00:00:00Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.yarns.push(foreign);

      const read = await getYarnRoute(getRequest(), context(foreign.id));
      const deleted = await deleteYarnRoute(deleteRequest(), context(foreign.id));

      expect(read.status).toBe(404);
      expect(deleted.status).toBe(404);
      expect(store.yarns).toHaveLength(1);
    });
  });

  describe("POST /api/yarns", () => {
    it("creates a yarn with 201 and defaulted stock", async () => {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);

      const response = await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id)),
      );
      const body = (await response.json()) as { yarn: YarnRecord };

      expect(response.status).toBe(201);
      expect(body.yarn.userId).toBe("user-1");
      expect(body.yarn.quantity).toBe(0);
      expect(store.yarns).toHaveLength(1);
    });

    it("answers 404 when the brand or type does not belong to the user", async () => {
      const foreignBrand = seedBrand("user-2");
      const foreignType = seedType(foreignBrand.id);

      const response = await createYarnRoute(
        jsonRequest(yarnBody(foreignBrand.id, foreignType.id)),
      );

      expect(response.status).toBe(404);
      expect(store.yarns).toHaveLength(0);
    });

    it("rejects an invalid payload with 400", async () => {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);

      const badFamily = await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id, { colorFamily: "fucsia" })),
      );
      const badLength = await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id, { length: -5 })),
      );

      expect(badFamily.status).toBe(400);
      expect(badLength.status).toBe(400);
      expect(store.yarns).toHaveLength(0);
    });

    // Costura 2: duplicado (brandId, colorCode) → 409, nunca 500.
    it("answers 409 on a duplicate colorCode for the same brand", async () => {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);
      await createYarnRoute(jsonRequest(yarnBody(brand.id, type.id)));

      const response = await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id, { colorName: "Otro" })),
      );

      expect(response.status).toBe(409);
      expect(store.yarns).toHaveLength(1);
    });
  });

  describe("GET /api/yarns filters", () => {
    it("treats empty query params as no filter", async () => {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);
      await createYarnRoute(jsonRequest(yarnBody(brand.id, type.id)));

      const response = await listYarnsRoute(
        getRequest("?brandId=&typeId=&colorFamily="),
      );
      const body = (await response.json()) as { yarns: YarnRecord[] };

      expect(response.status).toBe(200);
      expect(store.lastFilters).toEqual({});
      expect(body.yarns).toHaveLength(1);
    });

    it("filters by brand, type and colorFamily", async () => {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);
      const otherType = seedType(brand.id, "Gruesa");
      await createYarnRoute(
        jsonRequest(
          yarnBody(brand.id, type.id, { colorCode: "A", colorFamily: "blue" }),
        ),
      );
      await createYarnRoute(
        jsonRequest(
          yarnBody(brand.id, otherType.id, {
            colorCode: "B",
            colorFamily: "red",
          }),
        ),
      );

      const byFamily = await listYarnsRoute(getRequest("?colorFamily=red"));
      const byFamilyBody = (await byFamily.json()) as { yarns: YarnRecord[] };
      expect(byFamilyBody.yarns).toHaveLength(1);
      expect(byFamilyBody.yarns[0]?.colorCode).toBe("B");

      const byType = await listYarnsRoute(getRequest(`?typeId=${type.id}`));
      const byTypeBody = (await byType.json()) as { yarns: YarnRecord[] };
      expect(byTypeBody.yarns).toHaveLength(1);
      expect(byTypeBody.yarns[0]?.colorCode).toBe("A");
    });

    it("answers 400 on an invalid filter", async () => {
      const badBrand = await listYarnsRoute(getRequest("?brandId=123"));
      const badFamily = await listYarnsRoute(getRequest("?colorFamily=fucsia"));

      expect(badBrand.status).toBe(400);
      expect(badFamily.status).toBe(400);
    });
  });

  describe("PATCH /api/yarns/:id", () => {
    it("updates an owned yarn", async () => {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);
      const created = await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id)),
      );
      const yarnId = ((await created.json()) as { yarn: YarnRecord }).yarn.id;

      const response = await patchYarnRoute(
        jsonRequest({ colorName: "Verde", quantity: 3 }, "PATCH"),
        context(yarnId),
      );
      const body = (await response.json()) as { yarn: YarnRecord };

      expect(response.status).toBe(200);
      expect(body.yarn.colorName).toBe("Verde");
      expect(body.yarn.quantity).toBe(3);
    });

    it("answers 409 when the update collides with an existing colorCode", async () => {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);
      await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id, { colorCode: "A" })),
      );
      const second = await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id, { colorCode: "B" })),
      );
      const secondId = ((await second.json()) as { yarn: YarnRecord }).yarn.id;

      const response = await patchYarnRoute(
        jsonRequest({ colorCode: "A" }, "PATCH"),
        context(secondId),
      );

      expect(response.status).toBe(409);
    });

    it("answers 400 on an empty patch", async () => {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);
      const created = await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id)),
      );
      const yarnId = ((await created.json()) as { yarn: YarnRecord }).yarn.id;

      const response = await patchYarnRoute(
        jsonRequest({}, "PATCH"),
        context(yarnId),
      );

      expect(response.status).toBe(400);
    });
  });

  // Costura 1: borrado seguro de una lana referenciada por proyectos.
  describe("DELETE /api/yarns/:id with references", () => {
    async function createYarn(): Promise<string> {
      const brand = seedBrand("user-1");
      const type = seedType(brand.id);
      const created = await createYarnRoute(
        jsonRequest(yarnBody(brand.id, type.id)),
      );
      return ((await created.json()) as { yarn: YarnRecord }).yarn.id;
    }

    it("deletes an unreferenced yarn with 204", async () => {
      const yarnId = await createYarn();

      const response = await deleteYarnRoute(deleteRequest(), context(yarnId));

      expect(response.status).toBe(204);
      expect(store.yarns).toHaveLength(0);
    });

    it("answers 409 with referencedBy when the yarn is in use and no force", async () => {
      const yarnId = await createYarn();
      store.projectYarns.push({ projectId: crypto.randomUUID(), yarnId });

      const response = await deleteYarnRoute(deleteRequest(), context(yarnId));
      const body = (await response.json()) as {
        error: string;
        referencedBy: number;
      };

      expect(response.status).toBe(409);
      expect(body.referencedBy).toBe(1);
      expect(store.yarns).toHaveLength(1);
      expect(store.projectYarns).toHaveLength(1);
    });

    it("clears the links and deletes with 204 when force=true", async () => {
      const yarnId = await createYarn();
      const otherYarnId = crypto.randomUUID();
      store.projectYarns.push({ projectId: crypto.randomUUID(), yarnId });
      store.projectYarns.push({
        projectId: crypto.randomUUID(),
        yarnId: otherYarnId,
      });

      const response = await deleteYarnRoute(
        deleteRequest("?force=true"),
        context(yarnId),
      );

      expect(response.status).toBe(204);
      expect(store.yarns).toHaveLength(0);
      expect(store.projectYarns).toEqual([
        expect.objectContaining({ yarnId: otherYarnId }),
      ]);
    });

    it("answers 400 on an invalid force flag", async () => {
      const yarnId = await createYarn();

      const response = await deleteYarnRoute(
        deleteRequest("?force=maybe"),
        context(yarnId),
      );

      expect(response.status).toBe(400);
      expect(store.yarns).toHaveLength(1);
    });
  });
});
