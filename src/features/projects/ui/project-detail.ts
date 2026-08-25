import { type ProjectStatus } from "@/shared/config";

import { needleOptionLabel } from "./ProjectsToolbar";

/**
 * Copia y traducciones del **cajón de detalle** (RFC-03 §2, tanda 1 de la
 * enmienda E3(a)).
 *
 * Vive aparte del componente por lo mismo que `project-filters.ts`: son datos y
 * funciones puras, se prueban sin montar nada, y los tests importan los textos
 * en vez de reescribirlos.
 */

/** Nombre visible de cada estado (el código va en inglés, la UI en español). */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  in_progress: "En curso",
  paused: "En pausa",
  finished: "Terminado",
  abandoned: "Abandonado",
};

/** Nombre accesible del carril de pestañas del cajón. */
export const DETAIL_TABS_LABEL = "Secciones del proyecto";

/**
 * Las pestañas del cajón. **Hoy hay UNA**, y es una decisión, no un recorte a
 * medias: Progreso, Lanas y Sesiones son la **tanda 2** (E3(a)), y pintar sus
 * pestañas antes de que su contenido exista sería prometer en pantalla algo que
 * la aplicación todavía no puede cumplir — exactamente lo que **E3(d)** prohíbe
 * con los botones sin destino. Cuando la tanda 2 llegue, se añaden a esta lista
 * y el resto del cajón no se toca.
 */
export const DETAIL_TABS = ["general"] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

export const DETAIL_TAB_LABELS: Record<DetailTab, string> = {
  general: "General",
};

/**
 * Los seis datos del tab General, **en el orden en que se pintan**: los cuatro
 * cortos van de a pares en dos columnas, y los dos que pueden crecer —las agujas
 * y las notas— ocupan la fila entera.
 */
export const GENERAL_FIELD_LABELS = {
  type: "Tipo",
  status: "Estado",
  startDate: "Empezado",
  endDate: "Terminado",
  needles: "Agujas",
  notes: "Notas",
} as const;

/**
 * Lo que se pinta cuando un dato **no está**. Son tres textos distintos a
 * propósito: "no anotaste agujas" y "todavía no lo terminaste" no son la misma
 * ausencia, y un guion para las tres no diría ninguna de las dos cosas.
 */
export const NO_NEEDLES = "Sin anotar";
export const NO_END_DATE = "Todavía no";
export const NO_NOTES = "Sin notas";
/** Sólo se ve con un payload roto: una fecha que no se puede leer. */
export const UNKNOWN_DATE = "Sin fecha";

/**
 * Las agujas del proyecto, en una línea: "4 mm · 4,5 mm".
 *
 * Reusa `needleOptionLabel` —la etiqueta que ya escribe el desplegable de
 * filtros— en vez de repetir el formato: la coma decimal sale de `Intl` y no de
 * una concatenación a mano, y si un día cambia la unidad cambia en un solo
 * sitio.
 *
 * Devuelve `null` cuando no hay ninguna, para que **el componente** decida el
 * texto de la ausencia; una cadena vacía se colaría en el DOM sin que nadie lo
 * note.
 */
export function needlesLabel(needles: readonly number[]): string | null {
  return needles.length === 0
    ? null
    : needles.map((size) => needleOptionLabel(size)).join(" · ");
}
