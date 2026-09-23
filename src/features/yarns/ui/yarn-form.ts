/* Por RUTA INTERNA y no por el barrel `@/features/yarns`, aunque
   `conventions.md` mande consumir otros features por su `index.ts`: ese barrel
   arrastra `./api` → Drizzle al bundle del navegador, y este módulo lo
   consume un componente de cliente (`YarnFormDialog.tsx`, S5). Es la misma
   excepción, por el mismo motivo, que `project-form.ts`. `validation.ts` sólo
   importa zod y `shared/config`. */
import {
  createYarnSchema,
  updateYarnSchema,
  type CreateYarnPayload,
  type UpdateYarnPayload,
} from "@/features/yarns/validation";
import type { ColorFamily } from "@/shared/config";

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

/** `parseDecimal`, pero `undefined` en vez de `null` — lo que espera zod
 *  para "este campo no vino" en un candidato o un parche. */
function decimalOrUndefined(text: string): number | undefined {
  return parseDecimal(text) ?? undefined;
}

/** Igual que `decimalOrUndefined`, para `parseCount`. */
function countOrUndefined(text: string): number | undefined {
  return parseCount(text) ?? undefined;
}

/* ---------------------------------------------------------------------------
   Errores: issues de zod + copy propia
   --------------------------------------------------------------------------- */

function isYarnFormField(value: string): value is YarnFormField {
  return (YARN_FORM_FIELDS as readonly string[]).includes(value);
}

/**
 * Mapea los `issues` de zod a campos del formulario. `recommendedNeedle` es
 * un objeto en el esquema pero dos campos en pantalla (design D6): el refine
 * de nivel de objeto (`path: ["recommendedNeedle"]`, "El máximo debe ser >=
 * al mínimo.") cae en `needleMax`, igual que el error propio de `max`.
 */
export function issuesToErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): YarnFormErrors {
  const errors: YarnFormErrors = {};
  for (const issue of issues) {
    const [first, second] = issue.path;
    if (first === "recommendedNeedle") {
      const field: YarnFormField = second === "min" ? "needleMin" : "needleMax";
      errors[field] ??= issue.message;
      continue;
    }
    if (typeof first === "string" && isYarnFormField(first)) {
      errors[first] ??= issue.message;
    }
  }
  return errors;
}

/**
 * zod 4 usa su propio mensaje en inglés cuando un `z.number()` sin mensaje
 * propio recibe algo que no es un número (`invalid_type` — comprobado contra
 * el esquema real, ver `design.md` D11): pasa con `length`/`needleMin`/
 * `needleMax`/`thickness`/`quantity` cuando el texto está vacío o no se puede
 * leer. Acá también se reemplaza el "no es válida"/"no es válido" genérico de
 * marca/tipo/familia de color/lote — ya en español, pero describe el
 * problema, no la acción pendiente — por una copia que nombra qué falta
 * hacer, cuando el campo está directamente vacío.
 *
 * En alta (`createYarnSchema`), `quantity` es el único numérico
 * **opcional** del esquema: un texto ilegible se traduce a `undefined`, que
 * zod acepta en silencio (no hay `issue` que mapear). En edición
 * (`updateYarnSchema`, `.partial()`), en cambio, **todos** los campos
 * numéricos quedan opcionales — `length`/`thickness`/`quantity` porque
 * `.partial()` los vuelve opcionales directamente, y `needleMin`/`needleMax`
 * porque un borde ilegible produce `{ min: undefined, max: N }` (o al
 * revés) dentro de `recommendedNeedle`, que zod sí rechaza, pero con su
 * mensaje en inglés. Por eso `copyOverrides` se evalúa **siempre**, tanto
 * si zod aceptó el parche en silencio (`length`/`thickness`/`quantity`) como
 * si lo rechazó con un mensaje que hay que reemplazar (`needleMin`/
 * `needleMax`) — nunca sólo cuando zod ya falló.
 */
function copyOverrides(
  values: YarnFormValues,
  fields: readonly YarnFormField[],
): YarnFormErrors {
  const relevant = new Set(fields);
  const errors: YarnFormErrors = {};

  if (relevant.has("brandId") && values.brandId === "") {
    errors.brandId = BRAND_REQUIRED_ERROR;
  }
  if (relevant.has("typeId") && values.typeId === "") {
    errors.typeId = TYPE_REQUIRED_ERROR;
  }
  if (relevant.has("colorFamily") && values.colorFamily === null) {
    errors.colorFamily = COLOR_FAMILY_REQUIRED_ERROR;
  }
  if (relevant.has("length") && parseDecimal(values.length) === null) {
    errors.length = LENGTH_REQUIRED_ERROR;
  }
  if (relevant.has("needleMin") && parseDecimal(values.needleMin) === null) {
    errors.needleMin = NEEDLE_MIN_REQUIRED_ERROR;
  }
  if (relevant.has("needleMax") && parseDecimal(values.needleMax) === null) {
    errors.needleMax = NEEDLE_MAX_REQUIRED_ERROR;
  }
  if (relevant.has("thickness") && parseDecimal(values.thickness) === null) {
    errors.thickness = THICKNESS_REQUIRED_ERROR;
  }
  if (relevant.has("lot") && values.lot === "") {
    errors.lot = LOT_REQUIRED_ERROR;
  }
  if (relevant.has("quantity") && parseCount(values.quantity) === null) {
    errors.quantity = QUANTITY_REQUIRED_ERROR;
  }

  return errors;
}

/** El primero, en orden de pantalla — el mismo criterio que `ProjectFormDialog`. */
export function firstInvalidField(
  errors: YarnFormErrors,
): YarnFormField | undefined {
  return YARN_FORM_FIELDS.find((field) => errors[field] !== undefined);
}

/* ---------------------------------------------------------------------------
   Validación
   --------------------------------------------------------------------------- */

function createCandidate(values: YarnFormValues): Record<string, unknown> {
  return {
    brandId: values.brandId,
    typeId: values.typeId,
    colorName: values.colorName,
    colorCode: values.colorCode,
    colorFamily: values.colorFamily ?? undefined,
    image: values.image,
    quantity: countOrUndefined(values.quantity),
    length: decimalOrUndefined(values.length),
    fiber: values.fiber,
    recommendedNeedle: {
      min: decimalOrUndefined(values.needleMin),
      max: decimalOrUndefined(values.needleMax),
    },
    thickness: decimalOrUndefined(values.thickness),
    lot: values.lot,
  };
}

export function validateCreate(
  values: YarnFormValues,
):
  | { ok: true; payload: CreateYarnPayload }
  | { ok: false; errors: YarnFormErrors } {
  const parsed = createYarnSchema.safeParse(createCandidate(values));
  if (!parsed.success) {
    return {
      ok: false,
      errors: {
        ...issuesToErrors(parsed.error.issues),
        ...copyOverrides(values, YARN_FORM_FIELDS),
      },
    };
  }

  const overrides = copyOverrides(values, YARN_FORM_FIELDS);
  if (Object.keys(overrides).length > 0) {
    return { ok: false, errors: overrides };
  }
  return { ok: true, payload: parsed.data };
}

/**
 * Los campos de pantalla que tocó un parche crudo: `recommendedNeedle` es un
 * campo del esquema pero dos de la pantalla (design D6).
 */
function formFieldsOf(patch: Record<string, unknown>): YarnFormField[] {
  const fields: YarnFormField[] = [];
  for (const key of Object.keys(patch)) {
    if (key === "recommendedNeedle") {
      fields.push("needleMin", "needleMax");
    } else if (isYarnFormField(key)) {
      fields.push(key);
    }
  }
  return fields;
}

/**
 * Lo que cambió, y nada más (design D2, mismo criterio que `projectPatch` en
 * `project-form.ts`). Compara **valores parseados**, no texto: `"4,50"`
 * contra `4.5` no es un cambio. `recommendedNeedle` viaja **entero** si
 * cambió cualquiera de los dos bordes — el esquema no acepta un borde suelto.
 */
function yarnPatch(
  before: YarnFormValues,
  after: YarnFormValues,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (after.brandId !== before.brandId) {
    patch.brandId = after.brandId;
  }
  if (after.typeId !== before.typeId) {
    patch.typeId = after.typeId;
  }
  if (after.colorName !== before.colorName) {
    patch.colorName = after.colorName;
  }
  if (after.colorCode !== before.colorCode) {
    patch.colorCode = after.colorCode;
  }
  if (after.colorFamily !== before.colorFamily) {
    patch.colorFamily = after.colorFamily ?? undefined;
  }
  if (after.image !== before.image) {
    patch.image = after.image;
  }

  const beforeLength = parseDecimal(before.length);
  const afterLength = parseDecimal(after.length);
  if (afterLength !== beforeLength) {
    patch.length = decimalOrUndefined(after.length);
  }

  if (after.fiber !== before.fiber) {
    patch.fiber = after.fiber;
  }

  const beforeMin = parseDecimal(before.needleMin);
  const afterMin = parseDecimal(after.needleMin);
  const beforeMax = parseDecimal(before.needleMax);
  const afterMax = parseDecimal(after.needleMax);
  if (afterMin !== beforeMin || afterMax !== beforeMax) {
    patch.recommendedNeedle = {
      min: decimalOrUndefined(after.needleMin),
      max: decimalOrUndefined(after.needleMax),
    };
  }

  const beforeThickness = parseDecimal(before.thickness);
  const afterThickness = parseDecimal(after.thickness);
  if (afterThickness !== beforeThickness) {
    patch.thickness = decimalOrUndefined(after.thickness);
  }

  if (after.lot !== before.lot) {
    patch.lot = after.lot;
  }

  const beforeQuantity = parseCount(before.quantity);
  const afterQuantity = parseCount(after.quantity);
  if (afterQuantity !== beforeQuantity) {
    patch.quantity = countOrUndefined(after.quantity);
  }

  return patch;
}

export function validateEdit(
  before: YarnFormValues,
  after: YarnFormValues,
):
  | { ok: true; patch: UpdateYarnPayload | null }
  | { ok: false; errors: YarnFormErrors } {
  const rawPatch = yarnPatch(before, after);
  if (Object.keys(rawPatch).length === 0) {
    return { ok: true, patch: null };
  }

  const fields = formFieldsOf(rawPatch);
  const parsed = updateYarnSchema.safeParse(rawPatch);
  if (!parsed.success) {
    return {
      ok: false,
      errors: {
        ...issuesToErrors(parsed.error.issues),
        ...copyOverrides(after, fields),
      },
    };
  }

  const overrides = copyOverrides(after, fields);
  if (Object.keys(overrides).length > 0) {
    return { ok: false, errors: overrides };
  }
  return { ok: true, patch: parsed.data };
}
