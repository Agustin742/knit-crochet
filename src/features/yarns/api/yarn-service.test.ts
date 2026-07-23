import { describe, expect, it } from "vitest";

import { createBrand } from "@/features/yarns/api/create-brand";
import { createYarn } from "@/features/yarns/api/create-yarn";
import { createYarnType } from "@/features/yarns/api/create-yarn-type";
import { deleteBrand } from "@/features/yarns/api/delete-brand";
import { deleteYarn } from "@/features/yarns/api/delete-yarn";
import { deleteYarnType } from "@/features/yarns/api/delete-yarn-type";
import {
  BrandNotFoundError,
  BrandReferencedError,
  DuplicateColorCodeError,
  YarnNotFoundError,
  YarnReferencedError,
  YarnTypeNotFoundError,
  YarnTypeReferencedError,
} from "@/features/yarns/api/errors";
import { getYarn } from "@/features/yarns/api/get-yarn";
import { listBrands } from "@/features/yarns/api/list-brands";
import { listYarnTypes } from "@/features/yarns/api/list-yarn-types";
import { listYarns } from "@/features/yarns/api/list-yarns";
import { updateYarn } from "@/features/yarns/api/update-yarn";
import {
  createInMemoryYarnStore,
  type InMemoryYarnStore,
} from "@/features/yarns/api/testing/in-memory-store";
import type { CreateYarnInput } from "@/features/yarns/types";

async function seedBrandAndType(
  store: InMemoryYarnStore,
  userId = "user-1",
): Promise<{ brandId: string; typeId: string }> {
  const brand = await createBrand(userId, { name: "Malabrigo" }, store);
  const type = await createYarnType(userId, brand.id, { name: "Rios" }, store);
  return { brandId: brand.id, typeId: type.id };
}

function yarnInput(
  brandId: string,
  typeId: string,
  overrides: Partial<CreateYarnInput> = {},
): CreateYarnInput {
  return {
    brandId,
    typeId,
    colorName: "Azul Profundo",
    colorCode: "AP-01",
    colorFamily: "blue",
    length: 100,
    fiber: "merino",
    recommendedNeedle: { min: 4, max: 5 },
    thickness: 4,
    lot: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("features/yarns brand and type catalogs", () => {
  it("creates brands scoped to the user and lists them alphabetically", async () => {
    const store = createInMemoryYarnStore();

    await createBrand("user-1", { name: "Rowan" }, store);
    await createBrand("user-1", { name: "Drops" }, store);
    await createBrand("user-2", { name: "Ajena" }, store);

    const mine = await listBrands("user-1", store);
    expect(mine.map((brand) => brand.name)).toEqual(["Drops", "Rowan"]);
    expect(mine.every((brand) => brand.userId === "user-1")).toBe(true);
  });

  it("creates a type under an owned brand and hides another user's brand", async () => {
    const store = createInMemoryYarnStore();
    const brand = await createBrand("user-1", { name: "Rowan" }, store);

    const type = await createYarnType("user-1", brand.id, { name: "Fina" }, store);
    expect(type.brandId).toBe(brand.id);

    await expect(
      createYarnType("user-2", brand.id, { name: "Robada" }, store),
    ).rejects.toBeInstanceOf(BrandNotFoundError);
    await expect(
      listYarnTypes("user-2", brand.id, store),
    ).rejects.toBeInstanceOf(BrandNotFoundError);

    const types = await listYarnTypes("user-1", brand.id, store);
    expect(types).toHaveLength(1);
  });
});

describe("features/yarns createYarn", () => {
  it("creates a yarn scoped to the user with defaulted stock", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);

    const yarn = await createYarn("user-1", yarnInput(brandId, typeId), store);

    expect(yarn.userId).toBe("user-1");
    expect(yarn.quantity).toBe(0);
    expect(yarn.usedQuantity).toBe(0);
    expect(yarn.colorFamily).toBe("blue");
    expect(store.yarns).toHaveLength(1);
  });

  it("rejects an unknown brand with BrandNotFoundError (404)", async () => {
    const store = createInMemoryYarnStore();
    const { typeId } = await seedBrandAndType(store);

    await expect(
      createYarn(
        "user-1",
        yarnInput("11111111-1111-4111-8111-111111111111", typeId),
        store,
      ),
    ).rejects.toBeInstanceOf(BrandNotFoundError);
  });

  it("rejects a type that belongs to another brand", async () => {
    const store = createInMemoryYarnStore();
    const first = await seedBrandAndType(store);
    const otherBrand = await createBrand("user-1", { name: "Otra" }, store);

    await expect(
      createYarn(
        "user-1",
        yarnInput(otherBrand.id, first.typeId),
        store,
      ),
    ).rejects.toBeInstanceOf(YarnTypeNotFoundError);
  });

  // Costura 2: unicidad (brandId, colorCode) → error de dominio, nunca 500.
  it("rejects a duplicate colorCode for the same brand with DuplicateColorCodeError", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    await createYarn("user-1", yarnInput(brandId, typeId), store);

    await expect(
      createYarn(
        "user-1",
        yarnInput(brandId, typeId, { colorName: "Otro nombre" }),
        store,
      ),
    ).rejects.toBeInstanceOf(DuplicateColorCodeError);
    expect(store.yarns).toHaveLength(1);
  });
});

describe("features/yarns read and filters", () => {
  it("hides another user's yarn behind YarnNotFoundError", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    const yarn = await createYarn("user-1", yarnInput(brandId, typeId), store);

    await expect(getYarn("user-1", yarn.id, store)).resolves.toMatchObject({
      id: yarn.id,
    });
    await expect(getYarn("user-2", yarn.id, store)).rejects.toBeInstanceOf(
      YarnNotFoundError,
    );
  });

  it("filters by brand, type and colorFamily", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    const otherType = await createYarnType(
      "user-1",
      brandId,
      { name: "Gruesa" },
      store,
    );
    await createYarn(
      "user-1",
      yarnInput(brandId, typeId, { colorCode: "A", colorFamily: "blue" }),
      store,
    );
    await createYarn(
      "user-1",
      yarnInput(brandId, otherType.id, { colorCode: "B", colorFamily: "red" }),
      store,
    );

    expect(await listYarns("user-1", { colorFamily: "red" }, store)).toHaveLength(
      1,
    );
    expect(await listYarns("user-1", { typeId }, store)).toHaveLength(1);
    expect(await listYarns("user-1", { brandId }, store)).toHaveLength(2);
  });
});

describe("features/yarns updateYarn", () => {
  it("updates a yarn and revalidates the type against the brand", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    const yarn = await createYarn("user-1", yarnInput(brandId, typeId), store);

    const updated = await updateYarn(
      "user-1",
      yarn.id,
      { colorName: "Verde" },
      store,
    );
    expect(updated.colorName).toBe("Verde");

    await expect(
      updateYarn(
        "user-1",
        yarn.id,
        { typeId: "22222222-2222-4222-8222-222222222222" },
        store,
      ),
    ).rejects.toBeInstanceOf(YarnTypeNotFoundError);
  });

  it("rejects an update that collides with an existing colorCode", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    await createYarn(
      "user-1",
      yarnInput(brandId, typeId, { colorCode: "A" }),
      store,
    );
    const second = await createYarn(
      "user-1",
      yarnInput(brandId, typeId, { colorCode: "B" }),
      store,
    );

    await expect(
      updateYarn("user-1", second.id, { colorCode: "A" }, store),
    ).rejects.toBeInstanceOf(DuplicateColorCodeError);
  });
});

describe("features/yarns deleteYarn", () => {
  it("deletes an unreferenced yarn directly", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    const yarn = await createYarn("user-1", yarnInput(brandId, typeId), store);

    await expect(deleteYarn("user-1", yarn.id, false, store)).resolves.toBeUndefined();
    expect(store.yarns).toHaveLength(0);
  });

  it("hides another user's yarn behind YarnNotFoundError", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    const yarn = await createYarn("user-1", yarnInput(brandId, typeId), store);

    await expect(
      deleteYarn("user-2", yarn.id, true, store),
    ).rejects.toBeInstanceOf(YarnNotFoundError);
    expect(store.yarns).toHaveLength(1);
  });

  // Costura 1: referenciada por proyectos.
  it("blocks the delete of a referenced yarn without force", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    const yarn = await createYarn("user-1", yarnInput(brandId, typeId), store);
    store.projectYarns.push({ projectId: crypto.randomUUID(), yarnId: yarn.id });
    store.projectYarns.push({ projectId: crypto.randomUUID(), yarnId: yarn.id });

    await expect(deleteYarn("user-1", yarn.id, false, store)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof YarnReferencedError && error.referencedBy === 2,
    );
    expect(store.yarns).toHaveLength(1);
    expect(store.projectYarns).toHaveLength(2);
  });

  it("clears the project references before deleting when force is true", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    const yarn = await createYarn("user-1", yarnInput(brandId, typeId), store);
    const otherYarnId = crypto.randomUUID();
    store.projectYarns.push({ projectId: crypto.randomUUID(), yarnId: yarn.id });
    store.projectYarns.push({ projectId: crypto.randomUUID(), yarnId: otherYarnId });

    await expect(
      deleteYarn("user-1", yarn.id, true, store),
    ).resolves.toBeUndefined();

    expect(store.yarns).toHaveLength(0);
    expect(store.projectYarns).toEqual([
      expect.objectContaining({ yarnId: otherYarnId }),
    ]);
  });
});

describe("features/yarns deleteBrand", () => {
  it("deletes a brand without children directly", async () => {
    const store = createInMemoryYarnStore();
    const brand = await createBrand("user-1", { name: "Rowan" }, store);

    await expect(deleteBrand("user-1", brand.id, store)).resolves.toBeUndefined();
    expect(store.brands).toHaveLength(0);
  });

  it("hides another user's brand behind BrandNotFoundError", async () => {
    const store = createInMemoryYarnStore();
    const brand = await createBrand("user-1", { name: "Rowan" }, store);

    await expect(deleteBrand("user-2", brand.id, store)).rejects.toBeInstanceOf(
      BrandNotFoundError,
    );
    expect(store.brands).toHaveLength(1);
  });

  // Bloqueo 409 (sin force, sin cascada): la marca con un tipo NO se borra.
  it("blocks the delete of a brand that has a type", async () => {
    const store = createInMemoryYarnStore();
    const { brandId } = await seedBrandAndType(store);

    await expect(deleteBrand("user-1", brandId, store)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BrandReferencedError &&
        error.types === 1 &&
        error.yarns === 0,
    );
    expect(store.brands).toHaveLength(1);
    expect(store.types).toHaveLength(1);
  });

  it("blocks the delete of a brand that has yarns and counts them", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    await createYarn("user-1", yarnInput(brandId, typeId), store);

    await expect(deleteBrand("user-1", brandId, store)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof BrandReferencedError &&
        error.types === 1 &&
        error.yarns === 1,
    );
    expect(store.brands).toHaveLength(1);
    expect(store.yarns).toHaveLength(1);
  });
});

describe("features/yarns deleteYarnType", () => {
  it("deletes a type without yarns directly", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);

    await expect(
      deleteYarnType("user-1", brandId, typeId, store),
    ).resolves.toBeUndefined();
    expect(store.types).toHaveLength(0);
  });

  it("answers 404 for a type that does not belong to the brand", async () => {
    const store = createInMemoryYarnStore();
    const { typeId } = await seedBrandAndType(store);
    const otherBrand = await createBrand("user-1", { name: "Otra" }, store);

    await expect(
      deleteYarnType("user-1", otherBrand.id, typeId, store),
    ).rejects.toBeInstanceOf(YarnTypeNotFoundError);
    expect(store.types).toHaveLength(1);
  });

  it("hides a type under another user's brand behind YarnTypeNotFoundError", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);

    await expect(
      deleteYarnType("user-2", brandId, typeId, store),
    ).rejects.toBeInstanceOf(YarnTypeNotFoundError);
    expect(store.types).toHaveLength(1);
  });

  // Bloqueo 409: el tipo con una lana NO se borra.
  it("blocks the delete of a type that has a yarn and counts them", async () => {
    const store = createInMemoryYarnStore();
    const { brandId, typeId } = await seedBrandAndType(store);
    await createYarn("user-1", yarnInput(brandId, typeId), store);

    await expect(
      deleteYarnType("user-1", brandId, typeId, store),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof YarnTypeReferencedError && error.yarns === 1,
    );
    expect(store.types).toHaveLength(1);
    expect(store.yarns).toHaveLength(1);
  });
});
