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

/**
 * Copy del panel de catálogo (RFC-04 §7-ter E2(c)/E2(d), backlog 24, slice
 * S2a). "Catálogos" encabeza la SECCIÓN entera (un `<h2>`, hermano del botón
 * de alta) — el `Disclosure` ya no lleva esa etiqueta, porque sólo pliega la
 * LISTA de marcas y tipos y necesita la suya propia
 * (`CATALOG_LIST_SUMMARY_LABEL`) para no repetir el mismo texto en dos
 * controles distintos de la misma pantalla.
 */
export const CATALOG_SECTION_LABEL = "Catálogos";
export const CATALOG_LIST_SUMMARY_LABEL = "Marcas y tipos";
export const CATALOG_LOADING_LABEL = "Cargando el catálogo de marcas y tipos.";
export const CATALOG_LOAD_ERROR =
  "No se pudo cargar el catálogo de marcas y tipos.";
export const CATALOG_EMPTY_MESSAGE = "Todavía no creaste ninguna marca.";
export const CATALOG_TYPES_EMPTY_MESSAGE = "Esta marca todavía no tiene tipos.";
export const CATALOG_BRAND_NAME_LABEL = "Nombre de la marca";
export const CATALOG_CREATE_BRAND_LABEL = "Crear marca";
export const CATALOG_TYPE_NAME_LABEL = "Nombre del tipo";
export const CATALOG_CREATE_TYPE_LABEL = "Crear tipo";

/**
 * Copy de la enmienda E2(d) (RFC-04 §7-ter, 2026-09-20): el alta se sale del
 * `Disclosure` hacia un modal. El botón que lo abre necesita su propia
 * etiqueta —distinta del botón de ENVÍO dentro del modal (`CATALOG_CREATE_BRAND_LABEL`
 * arriba)— porque los dos conviven en pantallas distintas del mismo flujo.
 */
export const CATALOG_NEW_BRAND_TRIGGER_LABEL = "Nueva marca";
export const CATALOG_CREATE_BRAND_TITLE = "Crear marca";
export const CATALOG_ADD_TYPE_TRIGGER_LABEL = "Agregar tipo";

/** Título del modal de alta de tipo (E2(d)): nombra la marca destino, porque hay
 *  un modal por marca y quien lo ve tiene que saber a cuál está entrando. */
export function catalogCreateTypeModalTitle(brandName: string): string {
  return `Agregar tipo a ${brandName}`;
}

/**
 * Copy de borrar (design D4, RFC-04 §7-ter E2(e), backlog 24 slice S2b): una
 * `ConfirmDialog` por objetivo (marca o tipo) y, tras un `409`, un aviso de
 * una sola acción construido directamente sobre `Dialog`.
 */

/** Nombre accesible del botón de borrado — nunca "Borrar" a secas (design D4):
 *  sirve tanto para la marca como para el tipo, porque los dos nombran su
 *  propio objetivo de la misma forma. */
export function catalogDeleteLabel(name: string): string {
  return `Borrar ${name}`;
}

/** La pregunta de la `ConfirmDialog`, antes del pedido: nombra lo que se borra. */
export function catalogDeleteConfirmTitle(name: string): string {
  return `¿Borrar ${name}?`;
}

/** Título del aviso 409, construido sobre `Dialog` y no `ConfirmDialog` (design D4). */
export const CATALOG_BLOCKED_BRAND_TITLE = "No se puede borrar la marca";
export const CATALOG_BLOCKED_TYPE_TITLE = "No se puede borrar el tipo";

/** Único control del aviso 409: el cierre del encabezado de `Dialog`, sin botones extra. */
export const CATALOG_NOTICE_DISMISS_LABEL = "Entendido";

/** "1 tipo" / "2 tipos", pluralizando como `stockLabel`. */
function pluralClause(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "el tipo" / "los tipos": la frase de acción concuerda en número con el conteo. */
function actionClause(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * Cuerpo del aviso al borrar una marca con hijos (`409 { error, types,
 * yarns }`, `api/brands/params.ts:58-68`): los DOS contadores, omitiendo la
 * cláusula cuyo conteo es 0 (design D4). Los dos en 0 a la vez no puede pasar
 * — el servidor no manda 409 en ese caso.
 */
export function brandBlockedBody(types: number, yarns: number): string {
  const countClauses: string[] = [];
  const actionClauses: string[] = [];
  if (types > 0) {
    countClauses.push(pluralClause(types, "tipo", "tipos"));
    actionClauses.push(actionClause(types, "el tipo", "los tipos"));
  }
  if (yarns > 0) {
    countClauses.push(pluralClause(yarns, "lana", "lanas"));
    actionClauses.push(actionClause(yarns, "la lana", "las lanas"));
  }
  return `Esta marca todavía tiene ${countClauses.join(" y ")}. Borrá ${actionClauses.join(" y ")} antes de eliminar la marca.`;
}

/** Cuerpo del aviso al borrar un tipo con lanas (`409 { error, yarns }`): un solo contador. */
export function typeBlockedBody(yarns: number): string {
  return `Este tipo todavía tiene ${pluralClause(yarns, "lana", "lanas")}. Borrá ${actionClause(yarns, "la lana", "las lanas")} antes de eliminar el tipo.`;
}
