import {
  COLOR_FAMILY_LABELS,
  CRAFT_TYPES,
  type CraftType,
} from "@/shared/config";

import type { SerializedProject, YarnOption } from "./types";

/** Etiquetas visibles de los dos crafts (el código va en inglés, la UI no). */
export const CRAFT_TYPE_LABELS: Record<CraftType, string> = {
  knitting: "Dos agujas",
  crochet: "Crochet",
};

/** Los dos crafts, en el orden del enum, para pintar el par de botones. */
export const CRAFT_TYPE_ORDER: readonly CraftType[] = CRAFT_TYPES;

/**
 * El segmentado activo/inactivo (RFC-03 §1, enmienda **E1(i)**).
 *
 * Son **dos** opciones y **siempre hay exactamente una** elegida: el `Toggle` es
 * un control superponible y `ToggleGroup` es un `role="group"` que **no impone
 * exclusividad** —lo dice su propio JSDoc—, así que la exclusividad la impone
 * este consumidor. Se descartó crear un primitivo de segmentado: tocaría
 * `public-api.test.ts`, que está anclado al literal, y es una slice de design
 * system, no de #20.
 *
 * "Inactivo" **no** es "todo menos en curso": el backend niega el par activo, o
 * sea `finished` + `abandoned`.
 */
export const STATUS_FILTERS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

/**
 * **Default = activos** (RFC-03 §1), y es una decisión de **cliente**: sin el
 * parámetro `active` el endpoint devuelve **todo**.
 */
export const DEFAULT_STATUS_FILTER: StatusFilter = "active";

export function isActiveFilter(status: StatusFilter): boolean {
  return status === "active";
}

/**
 * El endpoint acepta UN craft type. Los dos botones son **combinables**, así que
 * "los dos marcados" y "ninguno marcado" son la misma pregunta —todo— y se
 * traducen a "sin filtro". Mismo criterio que el Dashboard.
 */
export function toTypeFilter(
  selected: readonly CraftType[],
): CraftType | undefined {
  return selected.length === 1 ? selected[0] : undefined;
}

/**
 * Texto comparable: sin espacios de sobra, en minúsculas y **sin tildes**.
 *
 * Las tildes se quitan descomponiendo (`NFD`) y borrando los diacríticos
 * combinantes, no con una tabla de reemplazos: buscar "gorro" tiene que
 * encontrar "Gorró" y buscar "bufanda" tiene que encontrar "Bufandá" sin que
 * nadie mantenga una lista de pares.
 */
export function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * "Buscar" se resuelve **en cliente, por nombre** (RFC-03, enmienda **E1(a)**).
 *
 * `projectFiltersSchema` tiene siete claves y **ninguna es de texto**; no hay
 * `ilike`, ni `tsvector`, ni índice de texto. Y como el esquema es un `z.object`
 * sin `.strict()`, mandar `?search=` respondería **200 con la lista sin
 * filtrar**: un buscador cableado contra un parámetro inexistente **no falla,
 * miente**. Filtrar en memoria además no empeora nada, porque el endpoint **no
 * pagina**: la lista ya se trae entera de todas formas.
 *
 * No muta la lista recibida: el array que llega es el estado de quien llama.
 */
export function filterByName(
  projects: readonly SerializedProject[],
  search: string,
): SerializedProject[] {
  const needle = normalizeText(search);
  if (needle === "") {
    return [...projects];
  }
  return projects.filter((project) =>
    normalizeText(project.name).includes(needle),
  );
}

export type YarnChoice = { id: string; label: string };

/**
 * Etiqueta de cada lana en el desplegable: **sólo el color** (enmienda E1(d)).
 *
 * `GET /api/yarns` no devuelve marca ni tipo por nombre —son UUID—, así que
 * `colorName` es lo único legible que hay. La familia se añade **sólo cuando el
 * nombre de color se repite**, que es lo que la enmienda permite para
 * desambiguar; ponerla siempre haría ruido en el caso normal.
 *
 * Las lanas que ni siquiera con la familia se distinguen siguen sin
 * distinguirse: es el precio aceptado y escrito de la decisión.
 */
export function toYarnChoices(yarns: readonly YarnOption[]): YarnChoice[] {
  const seen = new Map<string, number>();
  for (const yarn of yarns) {
    const key = normalizeText(yarn.colorName);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  return yarns.map((yarn) => {
    const ambiguous = (seen.get(normalizeText(yarn.colorName)) ?? 0) > 1;
    return {
      id: yarn.id,
      label: ambiguous
        ? `${yarn.colorName} (${COLOR_FAMILY_LABELS[yarn.colorFamily]})`
        : yarn.colorName,
    };
  });
}
