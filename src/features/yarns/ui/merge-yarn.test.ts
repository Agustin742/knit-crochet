import { describe, expect, it } from "vitest";

import { mergeYarnPatch } from "./merge-yarn";
import type { SerializedYarnListItem, SerializedYarnRecord } from "./types";

const CURRENT: SerializedYarnListItem = {
  id: "0f1c4d3a-1111-4111-8111-111111111111",
  userId: "u",
  image: null,
  brandId: "brand-1",
  typeId: "type-1",
  brandName: "Malabrigo",
  typeName: "Merino Worsted",
  colorName: "Natural",
  colorCode: "N1",
  colorFamily: "neutral",
  quantity: 3,
  usedQuantity: 0,
  length: 100,
  fiber: "Lana",
  recommendedNeedle: { min: 4, max: 5 },
  thickness: 4.5,
  lot: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function patchOf(
  patch: Partial<SerializedYarnRecord> = {},
): SerializedYarnRecord {
  const { brandName, typeName, ...rest } = CURRENT;
  return { ...rest, updatedAt: "2026-01-02T00:00:00.000Z", ...patch };
}

describe("mergeYarnPatch", () => {
  it("un patch de sólo usedQuantity conserva marca, tipo y color", () => {
    const patched = patchOf({ usedQuantity: 2 });

    const result = mergeYarnPatch(CURRENT, patched);

    expect(result.brandName).toBe(CURRENT.brandName);
    expect(result.typeName).toBe(CURRENT.typeName);
    expect(result.colorName).toBe(CURRENT.colorName);
    expect(result.usedQuantity).toBe(2);
  });

  it("las fechas del patch llegan como cadenas, no como Date", () => {
    const patched = patchOf({ updatedAt: "2026-03-05T10:00:00.000Z" });

    const result = mergeYarnPatch(CURRENT, patched);

    expect(result.updatedAt).toBe("2026-03-05T10:00:00.000Z");
    expect(typeof result.updatedAt).toBe("string");
  });

  it("un id ajeno no rompe: el llamador filtra antes de mezclar", () => {
    const patched = patchOf({ id: "otro-id", usedQuantity: 9 });

    const result = mergeYarnPatch(CURRENT, patched);

    // La mezcla no decide identidad: sólo copia campos. Quien llama
    // (`YarnsView`) es quien filtra por id antes de invocar esta función.
    expect(result.usedQuantity).toBe(9);
    expect(result.brandName).toBe(CURRENT.brandName);
  });
});
