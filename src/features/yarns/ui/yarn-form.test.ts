import { afterEach, describe, expect, it } from "vitest";

import {
  TAB_OF_FIELD,
  YARN_FORM_FIELDS,
  applyChange,
  emptyYarnFormValues,
  lotInputValue,
  parseCount,
  parseDecimal,
  yarnFormValuesOf,
} from "./yarn-form";
import type { SerializedYarnListItem } from "./types";

/** UUID cubiertos por la excepción del patrón `z.uuid()` (`validation.ts`) — no
 *  hace falta construir un v4 real para que `createYarnSchema` los acepte. */
const BRAND_ID = "00000000-0000-0000-0000-000000000000";
const TYPE_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

function yarn(patch: Partial<SerializedYarnListItem> = {}): SerializedYarnListItem {
  return {
    id: "y1",
    userId: "u1",
    image: null,
    brandId: BRAND_ID,
    typeId: TYPE_ID,
    brandName: "Malabrigo",
    typeName: "Worsted",
    colorName: "Azul noche",
    colorCode: "AN-01",
    colorFamily: "blue",
    quantity: 3,
    usedQuantity: 0,
    length: 200,
    fiber: "Lana merino",
    recommendedNeedle: { min: 4, max: 5 },
    thickness: 4.5,
    lot: "2026-03-05T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("YARN_FORM_FIELDS / TAB_OF_FIELD (design Interfaces/Contracts)", () => {
  it("TAB_OF_FIELD cubre cada campo de YARN_FORM_FIELDS, en las dos pestañas correctas", () => {
    const identity = YARN_FORM_FIELDS.filter((field) => TAB_OF_FIELD[field] === "identity");
    const technical = YARN_FORM_FIELDS.filter((field) => TAB_OF_FIELD[field] === "technical");
    expect(identity).toEqual([
      "brandId",
      "typeId",
      "colorName",
      "colorCode",
      "colorFamily",
      "image",
    ]);
    expect(technical).toEqual([
      "length",
      "fiber",
      "needleMin",
      "needleMax",
      "thickness",
      "lot",
      "quantity",
    ]);
    expect(identity.length + technical.length).toBe(YARN_FORM_FIELDS.length);
  });
});

describe("emptyYarnFormValues — un alta arranca en cero ovillos, el resto vacío", () => {
  it("quantity es '0' y el resto está vacío o en null", () => {
    const values = emptyYarnFormValues();
    expect(values.quantity).toBe("0");
    expect(values.colorFamily).toBeNull();
    expect(values.image).toBeNull();
    expect(values.brandId).toBe("");
    expect(values.typeId).toBe("");
    expect(values.colorName).toBe("");
    expect(values.colorCode).toBe("");
    expect(values.length).toBe("");
    expect(values.fiber).toBe("");
    expect(values.needleMin).toBe("");
    expect(values.needleMax).toBe("");
    expect(values.thickness).toBe("");
    expect(values.lot).toBe("");
  });
});

describe("yarnFormValuesOf — una edición arranca con lo que la lana tiene hoy", () => {
  it("mapea SerializedYarnListItem a YarnFormValues, incluyendo lotInputValue", () => {
    const values = yarnFormValuesOf(yarn());
    expect(values).toEqual({
      brandId: BRAND_ID,
      typeId: TYPE_ID,
      colorName: "Azul noche",
      colorCode: "AN-01",
      colorFamily: "blue",
      image: null,
      length: "200",
      fiber: "Lana merino",
      needleMin: "4",
      needleMax: "5",
      thickness: "4.5",
      lot: "2026-03-05",
      quantity: "3",
    });
  });
});

describe("lotInputValue — la parte de calendario en UTC (design D5)", () => {
  it("devuelve la fecha UTC para una ISO válida", () => {
    expect(lotInputValue("2026-03-05T00:00:00.000Z")).toBe("2026-03-05");
  });

  it("devuelve '' para algo que no se puede parsear", () => {
    expect(lotInputValue("no-es-una-fecha")).toBe("");
  });

  describe("bajo un desfase negativo (America/Argentina/Buenos_Aires, R3-004)", () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    });

    it("el mismo día UTC, sin desfase", () => {
      process.env.TZ = "America/Argentina/Buenos_Aires";
      expect(lotInputValue("2026-03-05T00:00:00.000Z")).toBe("2026-03-05");
      expect(lotInputValue("no-es-una-fecha")).toBe("");
    });
  });
});

describe("parseDecimal — coma o punto (design D11)", () => {
  it("acepta coma y punto decimal como el mismo número", () => {
    expect(parseDecimal("4,5")).toBe(4.5);
    expect(parseDecimal("4.5")).toBe(4.5);
  });

  it("acepta enteros y respeta espacios alrededor", () => {
    expect(parseDecimal(" 12 ")).toBe(12);
  });

  it("devuelve null para texto ilegible", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("   ")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("4,5,6")).toBeNull();
  });
});

describe("parseCount — entero no negativo (el stock se cuenta en ovillos enteros)", () => {
  it("acepta un entero no negativo", () => {
    expect(parseCount("0")).toBe(0);
    expect(parseCount("12")).toBe(12);
  });

  it("rechaza negativos, no-enteros y vacío", () => {
    expect(parseCount("-1")).toBeNull();
    expect(parseCount("4.5")).toBeNull();
    expect(parseCount("")).toBeNull();
    expect(parseCount("abc")).toBeNull();
  });
});

describe("applyChange — cambiar la marca resetea el tipo (design D3)", () => {
  it("resetea typeId cuando cambia brandId", () => {
    const values = { ...emptyYarnFormValues(), typeId: TYPE_ID };
    const next = applyChange(values, { brandId: BRAND_ID });
    expect(next.brandId).toBe(BRAND_ID);
    expect(next.typeId).toBe("");
  });

  it("un cambio que no toca brandId no resetea typeId", () => {
    const values = { ...emptyYarnFormValues(), brandId: BRAND_ID, typeId: TYPE_ID };
    const next = applyChange(values, { colorName: "Rojo" });
    expect(next.typeId).toBe(TYPE_ID);
    expect(next.colorName).toBe("Rojo");
  });

  it("fijar brandId al mismo valor que ya tenía no resetea typeId", () => {
    const values = { ...emptyYarnFormValues(), brandId: BRAND_ID, typeId: TYPE_ID };
    const next = applyChange(values, { brandId: BRAND_ID });
    expect(next.typeId).toBe(TYPE_ID);
  });
});
