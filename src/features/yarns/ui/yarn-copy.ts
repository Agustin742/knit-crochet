/**
 * Copy en español de `/lanas` (RFC-04 §4), citado literal. Se exporta como
 * constante para que los tests lo importen en vez de reescribirlo.
 */
export const EMPTY_TITLE = "Sin lanas en el stash todavía";
export const ERROR_TITLE = "Se enredó la madeja";
export const RETRY_LABEL = "Reintentar";

/**
 * El stock, identificado con su unidad (deuda 194). `quantity` es **stock en
 * ovillos** (PRD-01 §4.5), y sin la palabra el número no dice nada: ni en
 * pantalla ni en el nombre accesible del control que lo contiene.
 *
 * Va como texto visible y no como etiqueta oculta a propósito: el problema
 * era de todos, no sólo de quien usa lector de pantalla.
 */
export function stockLabel(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "ovillo" : "ovillos"}`;
}

/**
 * Etiquetas de los campos del cajón de detalle (RFC-04 §2, backlog 24, slice
 * S1). Marca y tipo no llevan fila propia: ya son el título del cajón, mismo
 * criterio que `ProjectDetailDrawer` con el nombre del proyecto.
 */
export const DETAIL_FIELD_LABELS = {
  colorName: "Color",
  colorCode: "Código de color",
  colorFamily: "Familia de color",
  length: "Largo",
  fiber: "Fibra",
  recommendedNeedle: "Aguja recomendada",
  thickness: "Grosor",
  lot: "Lote",
  quantity: "Stock",
} as const;

export const EDIT_YARN_LABEL = "Editar";
export const USED_QUANTITY_LABEL = "Ovillos usados";
export const NO_PHOTO_LABEL = "Sin foto";

/** "100 m" (PRD-01 §4.5: el largo se mide en metros). */
export function lengthLabel(length: number): string {
  return `${length} m`;
}

/** "4–5 mm": el rango que ya guarda `recommendedNeedle`. */
export function needleLabel(needle: { min: number; max: number }): string {
  return `${needle.min}–${needle.max} mm`;
}

/** "4,5 mm": el grosor de la lana. */
export function thicknessLabel(thickness: number): string {
  return `${thickness} mm`;
}
