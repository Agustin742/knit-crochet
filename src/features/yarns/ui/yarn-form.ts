/* Por RUTA INTERNA y no por el barrel `@/features/yarns`, aunque
   `conventions.md` mande consumir otros features por su `index.ts`: ese barrel
   arrastra `./api` → Drizzle al bundle del navegador, y este módulo lo
   consume un componente de cliente (`YarnFormDialog.tsx`, S5). Es la misma
   excepción, por el mismo motivo, que `project-form.ts`. `validation.ts` sólo
   importa zod y `shared/config`. */
import type { ColorFamily } from "@/shared/config";
import type { SerializedYarnListItem } from "./types";

/**
 * Modelo puro del alta/edición de lanas (design D2, D11; RFC-04 §7-quater
 * E3(a)). Vive aparte de `YarnFormDialog.tsx` (S5) por el mismo motivo que
 * `project-form.ts`: es lógica sin estado — valores, parseo, validación y el
 * parche de edición —, se prueba sin montar nada, y el shell la consume tal
 * cual.
 */

/* ---------------------------------------------------------------------------
   Campos y pestañas
   --------------------------------------------------------------------------- */

/** Orden de pantalla: Identidad primero, después Ficha técnica. */
export const YARN_FORM_FIELDS = [
  "brandId",
  "typeId",
  "colorName",
  "colorCode",
  "colorFamily",
  "image",
  "length",
  "fiber",
  "needleMin",
  "needleMax",
  "thickness",
  "lot",
  "quantity",
] as const;

export type YarnFormField = (typeof YARN_FORM_FIELDS)[number];
export type YarnFormTab = "identity" | "technical";

export const TAB_OF_FIELD: Record<YarnFormField, YarnFormTab> = {
  brandId: "identity",
  typeId: "identity",
  colorName: "identity",
  colorCode: "identity",
  colorFamily: "identity",
  image: "identity",
  length: "technical",
  fiber: "technical",
  needleMin: "technical",
  needleMax: "technical",
  thickness: "technical",
  lot: "technical",
  quantity: "technical",
};

export type YarnFormErrors = Partial<Record<YarnFormField, string>>;

/**
 * Lo que el formulario sabe de una lana, con los campos numéricos **de
 * texto** (design D11): se parsean una sola vez, al enviar, no en cada tecla.
 */
export interface YarnFormValues {
  brandId: string;
  typeId: string;
  colorName: string;
  colorCode: string;
  colorFamily: ColorFamily | null;
  image: string | null;
  length: string;
  fiber: string;
  needleMin: string;
  needleMax: string;
  thickness: string;
  /** `YYYY-MM-DD`, el valor nativo de `Input type="date"` (design D5). */
  lot: string;
  quantity: string;
}

/** Un alta arranca en cero ovillos (PRD-01 §4.5): el resto, vacío. */
export function emptyYarnFormValues(): YarnFormValues {
  return {
    brandId: "",
    typeId: "",
    colorName: "",
    colorCode: "",
    colorFamily: null,
    image: null,
    length: "",
    fiber: "",
    needleMin: "",
    needleMax: "",
    thickness: "",
    lot: "",
    quantity: "0",
  };
}

/** Una edición arranca con lo que la lana tiene hoy. */
export function yarnFormValuesOf(
  yarn: SerializedYarnListItem,
): YarnFormValues {
  return {
    brandId: yarn.brandId,
    typeId: yarn.typeId,
    colorName: yarn.colorName,
    colorCode: yarn.colorCode,
    colorFamily: yarn.colorFamily,
    image: yarn.image,
    length: String(yarn.length),
    fiber: yarn.fiber,
    needleMin: String(yarn.recommendedNeedle.min),
    needleMax: String(yarn.recommendedNeedle.max),
    thickness: String(yarn.thickness),
    lot: lotInputValue(yarn.lot),
    quantity: String(yarn.quantity),
  };
}

/**
 * La parte de calendario de una fecha ISO, **en UTC y nunca en hora local**
 * (design D5: `lot` es `timestamp` sin zona, y el desfase de un día aparece
 * apenas la zona de quien mira no es UTC). `new Date` y `toISOString`
 * construyen y leen siempre en UTC, así que esta función es TZ-agnóstica por
 * construcción — la única regla es no llamar nunca a un método local
 * (`getDate`, `getMonth`, `getFullYear`...). Confirmado con
 * `process.env.TZ` en `America/Argentina/Buenos_Aires` (desfase negativo) y
 * `Asia/Tokyo` (positivo, R3-004): mismo resultado en los dos.
 */
export function lotInputValue(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

/**
 * Aplica un cambio y, si cambió la marca, **resetea el tipo** (design D3): un
 * tipo sólo tiene sentido bajo su marca.
 */
export function applyChange(
  values: YarnFormValues,
  patch: Partial<YarnFormValues>,
): YarnFormValues {
  const next = { ...values, ...patch };
  if (patch.brandId !== undefined && patch.brandId !== values.brandId) {
    next.typeId = "";
  }
  return next;
}

/* ---------------------------------------------------------------------------
   Parseo de texto (design D11)
   --------------------------------------------------------------------------- */

/** Acepta coma o punto decimal ("4,5" o "4.5"); `null` si no se puede leer. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }
  const normalized = trimmed.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Entero no negativo (el stock se cuenta en ovillos enteros). */
export function parseCount(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}
