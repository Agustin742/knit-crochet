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
