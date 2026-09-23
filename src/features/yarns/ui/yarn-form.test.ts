import { afterEach, describe, expect, it } from "vitest";

import {
  BRAND_REQUIRED_ERROR,
  COLOR_FAMILY_REQUIRED_ERROR,
  LENGTH_REQUIRED_ERROR,
  LOT_REQUIRED_ERROR,
  NEEDLE_MAX_REQUIRED_ERROR,
  NEEDLE_MIN_REQUIRED_ERROR,
  QUANTITY_REQUIRED_ERROR,
  THICKNESS_REQUIRED_ERROR,
  TYPE_REQUIRED_ERROR,
} from "./yarn-copy";
import {
  TAB_OF_FIELD,
  YARN_FORM_FIELDS,
  applyChange,
  emptyYarnFormValues,
  firstInvalidField,
  issuesToErrors,
  lotInputValue,
  parseCount,
  parseDecimal,
  validateCreate,
  validateEdit,
  yarnFormValuesOf,
  type YarnFormValues,
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

const validValues: YarnFormValues = {
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
  thickness: "4,5",
  lot: "2026-03-05",
  quantity: "3",
};

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

describe("issuesToErrors — recommendedNeedle es un objeto en el esquema, dos campos en pantalla (design D6)", () => {
  it("el refine de nivel de objeto cae en needleMax", () => {
    const errors = issuesToErrors([
      { path: ["recommendedNeedle"], message: "El máximo debe ser >= al mínimo." },
    ]);
    expect(errors).toEqual({ needleMax: "El máximo debe ser >= al mínimo." });
  });

  it("los errores propios de min/max se mapean a needleMin/needleMax", () => {
    const errors = issuesToErrors([
      { path: ["recommendedNeedle", "min"], message: "min inválido" },
      { path: ["recommendedNeedle", "max"], message: "max inválido" },
    ]);
    expect(errors).toEqual({ needleMin: "min inválido", needleMax: "max inválido" });
  });

  it("mapea un campo plano tal cual", () => {
    const errors = issuesToErrors([{ path: ["colorCode"], message: "mensaje" }]);
    expect(errors).toEqual({ colorCode: "mensaje" });
  });

  it("el primer mensaje de un campo gana, no lo pisa uno posterior", () => {
    const errors = issuesToErrors([
      { path: ["colorCode"], message: "primero" },
      { path: ["colorCode"], message: "segundo" },
    ]);
    expect(errors.colorCode).toBe("primero");
  });
});

describe("firstInvalidField — el primero en orden de pantalla (Identidad, después Ficha técnica)", () => {
  it("devuelve el primer campo con error en YARN_FORM_FIELDS, no el de inserción", () => {
    expect(firstInvalidField({ quantity: "x", colorCode: "y" })).toBe("colorCode");
  });

  it("undefined cuando no hay errores", () => {
    expect(firstInvalidField({})).toBeUndefined();
  });
});

describe("validateCreate — payload válido o errores en español", () => {
  it("valores válidos: ok true con el payload tipado que espera el endpoint", () => {
    const result = validateCreate(validValues);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("se esperaba éxito");
    }
    expect(result.payload.brandId).toBe(BRAND_ID);
    expect(result.payload.typeId).toBe(TYPE_ID);
    expect(result.payload.colorFamily).toBe("blue");
    expect(result.payload.length).toBe(200);
    expect(result.payload.recommendedNeedle).toEqual({ min: 4, max: 5 });
    expect(result.payload.thickness).toBe(4.5);
    expect(result.payload.quantity).toBe(3);
    expect(result.payload.lot).toBeInstanceOf(Date);
    expect(result.payload.lot.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("marca, tipo, familia de color y lote vacíos: copy propia, no el 'no es válida' genérico de zod", () => {
    const result = validateCreate({
      ...validValues,
      brandId: "",
      typeId: "",
      colorFamily: null,
      lot: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("se esperaba un fallo");
    }
    expect(result.errors.brandId).toBe(BRAND_REQUIRED_ERROR);
    expect(result.errors.typeId).toBe(TYPE_REQUIRED_ERROR);
    expect(result.errors.colorFamily).toBe(COLOR_FAMILY_REQUIRED_ERROR);
    expect(result.errors.lot).toBe(LOT_REQUIRED_ERROR);
  });

  it("numéricos vacíos o ilegibles: copy en español, nunca el inglés de zod 4", () => {
    const result = validateCreate({
      ...validValues,
      length: "",
      needleMin: "abc",
      needleMax: "",
      thickness: "   ",
      quantity: "abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("se esperaba un fallo");
    }
    expect(result.errors.length).toBe(LENGTH_REQUIRED_ERROR);
    expect(result.errors.needleMin).toBe(NEEDLE_MIN_REQUIRED_ERROR);
    expect(result.errors.needleMax).toBe(NEEDLE_MAX_REQUIRED_ERROR);
    expect(result.errors.thickness).toBe(THICKNESS_REQUIRED_ERROR);
    expect(result.errors.quantity).toBe(QUANTITY_REQUIRED_ERROR);
    for (const message of Object.values(result.errors)) {
      expect(message).not.toMatch(/invalid input/i);
    }
  });

  it("un máximo de aguja menor al mínimo se rechaza en needleMax, con el mensaje del refine de zod", () => {
    const result = validateCreate({ ...validValues, needleMin: "5", needleMax: "4" });
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("se esperaba un fallo");
    }
    expect(result.errors.needleMax).toBe("El máximo debe ser >= al mínimo.");
    expect(result.errors.needleMin).toBeUndefined();
  });
});

describe("validateEdit — sólo lo que cambió, y un formulario sin cambios no sale a la red", () => {
  const before = yarnFormValuesOf(yarn());

  it("sin cambios: patch null", () => {
    const result = validateEdit(before, { ...before });
    expect(result).toEqual({ ok: true, patch: null });
  });

  it("'4,50' contra 4.5 es el mismo valor parseado: patch null (no compara texto)", () => {
    const after = { ...before, thickness: "4,50" };
    const result = validateEdit(before, after);
    expect(result).toEqual({ ok: true, patch: null });
  });

  it("un lote sin tocar no entra en el patch aunque cambien otros campos", () => {
    const after = { ...before, colorName: "Azul profundo" };
    const result = validateEdit(before, after);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("se esperaba éxito");
    }
    expect(result.patch).toEqual({ colorName: "Azul profundo" });
  });

  it("editar exactamente un campo manda sólo ese campo", () => {
    const after = { ...before, colorCode: "AN-02" };
    const result = validateEdit(before, after);
    expect(result).toEqual({ ok: true, patch: { colorCode: "AN-02" } });
  });

  it("recommendedNeedle viaja entero si cambió cualquiera de los dos bordes", () => {
    const after = { ...before, needleMax: "6" };
    const result = validateEdit(before, after);
    expect(result).toEqual({ ok: true, patch: { recommendedNeedle: { min: 4, max: 6 } } });
  });

  it("un patch inválido devuelve errores, con el mensaje real de zod", () => {
    const after = { ...before, colorName: "" };
    const result = validateEdit(before, after);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("se esperaba un fallo");
    }
    expect(result.errors.colorName).toBe("El color es obligatorio.");
  });

  it("stock ilegible en edición: error de copy propia, no un patch vacío enviado en silencio", () => {
    const after = { ...before, quantity: "abc" };
    const result = validateEdit(before, after);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("se esperaba un fallo");
    }
    expect(result.errors.quantity).toBe(QUANTITY_REQUIRED_ERROR);
  });
});

describe("el lot del alta serializa a medianoche UTC (design D5)", () => {
  it("'2026-03-05' → '2026-03-05T00:00:00.000Z'", () => {
    const result = validateCreate({ ...validValues, lot: "2026-03-05" });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("se esperaba éxito");
    }
    expect(result.payload.lot.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  describe("bajo un desfase positivo (Asia/Tokyo, R3-004): mismo resultado, sin desfase de un día", () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    });

    it("lotInputValue devuelve el mismo día UTC", () => {
      process.env.TZ = "Asia/Tokyo";
      expect(lotInputValue("2026-03-05T00:00:00.000Z")).toBe("2026-03-05");
    });

    it("el lot del alta serializa igual que en UTC/Buenos Aires", () => {
      process.env.TZ = "Asia/Tokyo";
      const result = validateCreate({ ...validValues, lot: "2026-03-05" });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("se esperaba éxito");
      }
      expect(result.payload.lot.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    });
  });
});
