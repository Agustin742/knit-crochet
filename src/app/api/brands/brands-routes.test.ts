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

const { GET: listBrandsRoute, POST: createBrandRoute } = await import(
  "@/app/api/brands/route"
);
const { DELETE: deleteBrandRoute } = await import("@/app/api/brands/[id]/route");
const { GET: listTypesRoute, POST: createTypeRoute } = await import(
  "@/app/api/brands/[id]/types/route"
);
const { DELETE: deleteTypeRoute } = await import(
  "@/app/api/brands/[id]/types/[typeId]/route"
);

const BASE_URL = "https://test.local/api/brands";

function getRequest(): Request {
  return new Request(BASE_URL);
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

function typeContext(
  id: string,
  typeId: string,
): { params: Promise<{ id: string; typeId: string }> } {
  return { params: Promise.resolve({ id, typeId }) };
}

/** Inserta una lana mínima directamente en el doble (solo hace falta el conteo). */
function seedYarn(
  userId: string,
  brandId: string,
  typeId: string,
  colorCode = "AP-01",
): YarnRecord {
  const now = new Date();
  const yarn: YarnRecord = {
    id: crypto.randomUUID(),
    userId,
    image: null,
    brandId,
    typeId,
    colorName: "Azul",
    colorCode,
    colorFamily: "blue",
    quantity: 0,
    usedQuantity: 0,
    length: 100,
    fiber: "merino",
    recommendedNeedle: { min: 4, max: 5 },
    thickness: 4,
    lot: now,
    createdAt: now,
    updatedAt: now,
  };
  store.yarns.push(yarn);
  return yarn;
}

async function signIn(userId: string): Promise<void> {
  cookieJar.set("kc_session", await signSessionToken({ userId }));
}

describe("api/brands route handlers", () => {
  beforeEach(async () => {
    store.reset();
    cookieJar.clear();
    vi.stubEnv("JWT_SECRET", SECRET);
    await signIn("user-1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers 401 on every endpoint without a session", async () => {
    cookieJar.clear();

    const responses = await Promise.all([
      listBrandsRoute(getRequest()),
      createBrandRoute(jsonRequest({ name: "Rowan" })),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
    expect(store.brands).toHaveLength(0);
  });

  it("creates and lists brands only for the current user", async () => {
    const created = await createBrandRoute(jsonRequest({ name: "  Rowan  " }));
    const body = (await created.json()) as { brand: BrandRecord };

    expect(created.status).toBe(201);
    expect(body.brand.name).toBe("Rowan");
    expect(body.brand.userId).toBe("user-1");

    store.brands.push({
      id: crypto.randomUUID(),
      userId: "user-2",
      name: "Ajena",
    });

    const list = await listBrandsRoute(getRequest());
    const listBody = (await list.json()) as { brands: BrandRecord[] };
    expect(listBody.brands).toHaveLength(1);
    expect(listBody.brands[0]?.name).toBe("Rowan");
  });

  it("rejects an empty brand name with 400", async () => {
    const response = await createBrandRoute(jsonRequest({ name: "  " }));
    expect(response.status).toBe(400);
    expect(store.brands).toHaveLength(0);
  });

  it("creates and lists types under an owned brand", async () => {
    const brand = await createBrandRoute(jsonRequest({ name: "Rowan" }));
    const brandId = ((await brand.json()) as { brand: BrandRecord }).brand.id;

    const created = await createTypeRoute(
      jsonRequest({ name: "Fina" }),
      context(brandId),
    );
    const body = (await created.json()) as { type: YarnTypeRecord };
    expect(created.status).toBe(201);
    expect(body.type.brandId).toBe(brandId);

    const list = await listTypesRoute(getRequest(), context(brandId));
    const listBody = (await list.json()) as { types: YarnTypeRecord[] };
    expect(list.status).toBe(200);
    expect(listBody.types).toHaveLength(1);
  });

  it("answers 404 creating a type under an unknown or foreign brand", async () => {
    const foreign: BrandRecord = {
      id: crypto.randomUUID(),
      userId: "user-2",
      name: "Ajena",
    };
    store.brands.push(foreign);

    const foreignResponse = await createTypeRoute(
      jsonRequest({ name: "Fina" }),
      context(foreign.id),
    );
    const unknownResponse = await createTypeRoute(
      jsonRequest({ name: "Fina" }),
      context(crypto.randomUUID()),
    );
    const malformed = await listTypesRoute(getRequest(), context("nope"));

    expect(foreignResponse.status).toBe(404);
    expect(unknownResponse.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(await foreignResponse.json()).toEqual({ error: "La marca no existe." });
    expect(store.types).toHaveLength(0);
  });

  // Ampliación #8: DELETE bloqueante de marca (409 sin force, sin cascada).
  describe("DELETE /api/brands/:id", () => {
    async function ownedBrand(): Promise<string> {
      const created = await createBrandRoute(jsonRequest({ name: "Rowan" }));
      return ((await created.json()) as { brand: BrandRecord }).brand.id;
    }

    it("deletes a brand without children with 204", async () => {
      const brandId = await ownedBrand();

      const response = await deleteBrandRoute(deleteRequest(), context(brandId));

      expect(response.status).toBe(204);
      expect(store.brands).toHaveLength(0);
    });

    it("answers 409 with counters when the brand has a type and a yarn", async () => {
      const brandId = await ownedBrand();
      const type = await createTypeRoute(
        jsonRequest({ name: "Fina" }),
        context(brandId),
      );
      const typeId = ((await type.json()) as { type: YarnTypeRecord }).type.id;
      seedYarn("user-1", brandId, typeId);

      const response = await deleteBrandRoute(deleteRequest(), context(brandId));
      const body = (await response.json()) as {
        error: string;
        types: number;
        yarns: number;
      };

      expect(response.status).toBe(409);
      expect(body.types).toBe(1);
      expect(body.yarns).toBe(1);
      expect(store.brands).toHaveLength(1);
      expect(store.types).toHaveLength(1);
      expect(store.yarns).toHaveLength(1);
    });

    it("answers 404 for a foreign or unknown brand without deleting", async () => {
      const foreign: BrandRecord = {
        id: crypto.randomUUID(),
        userId: "user-2",
        name: "Ajena",
      };
      store.brands.push(foreign);

      const foreignResponse = await deleteBrandRoute(
        deleteRequest(),
        context(foreign.id),
      );
      const unknownResponse = await deleteBrandRoute(
        deleteRequest(),
        context(crypto.randomUUID()),
      );
      const malformed = await deleteBrandRoute(deleteRequest(), context("nope"));

      expect(foreignResponse.status).toBe(404);
      expect(unknownResponse.status).toBe(404);
      expect(malformed.status).toBe(404);
      expect(store.brands).toHaveLength(1);
    });
  });

  // Ampliación #8: DELETE bloqueante de tipo (409 sin force, sin cascada).
  describe("DELETE /api/brands/:id/types/:typeId", () => {
    async function ownedType(): Promise<{ brandId: string; typeId: string }> {
      const brand = await createBrandRoute(jsonRequest({ name: "Rowan" }));
      const brandId = ((await brand.json()) as { brand: BrandRecord }).brand.id;
      const type = await createTypeRoute(
        jsonRequest({ name: "Fina" }),
        context(brandId),
      );
      const typeId = ((await type.json()) as { type: YarnTypeRecord }).type.id;
      return { brandId, typeId };
    }

    it("deletes a type without yarns with 204", async () => {
      const { brandId, typeId } = await ownedType();

      const response = await deleteTypeRoute(
        deleteRequest(),
        typeContext(brandId, typeId),
      );

      expect(response.status).toBe(204);
      expect(store.types).toHaveLength(0);
    });

    it("answers 409 with the yarn count when the type has a yarn", async () => {
      const { brandId, typeId } = await ownedType();
      seedYarn("user-1", brandId, typeId);

      const response = await deleteTypeRoute(
        deleteRequest(),
        typeContext(brandId, typeId),
      );
      const body = (await response.json()) as { error: string; yarns: number };

      expect(response.status).toBe(409);
      expect(body.yarns).toBe(1);
      expect(store.types).toHaveLength(1);
      expect(store.yarns).toHaveLength(1);
    });

    it("answers 404 when the type does not belong to the brand in the URL", async () => {
      const { typeId } = await ownedType();
      const otherBrand = await createBrandRoute(jsonRequest({ name: "Otra" }));
      const otherBrandId = ((await otherBrand.json()) as { brand: BrandRecord })
        .brand.id;

      const response = await deleteTypeRoute(
        deleteRequest(),
        typeContext(otherBrandId, typeId),
      );

      expect(response.status).toBe(404);
      expect(store.types).toHaveLength(1);
    });

    it("answers 404 for a type under a foreign brand", async () => {
      const foreign: BrandRecord = {
        id: crypto.randomUUID(),
        userId: "user-2",
        name: "Ajena",
      };
      store.brands.push(foreign);
      const foreignType: YarnTypeRecord = {
        id: crypto.randomUUID(),
        brandId: foreign.id,
        name: "Robada",
      };
      store.types.push(foreignType);

      const response = await deleteTypeRoute(
        deleteRequest(),
        typeContext(foreign.id, foreignType.id),
      );

      expect(response.status).toBe(404);
      expect(store.types).toHaveLength(1);
    });
  });
});
