import type { LinkedYarn } from "@/features/projects/types";
import { MILLISECONDS_PER_SECOND, type ProjectStatus } from "@/shared/config";

import { needleOptionLabel } from "./ProjectsToolbar";
import { normalizeText, type YarnChoice } from "./project-filters";
import type { PatternStep, SerializedCraftSession } from "./types";

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
 * Mismo título de error que la lista (RFC-03 §4). Se escribe otra vez en vez de
 * importarlo de `ProjectsView` —que es quien monta el cajón— porque importarlo
 * haría un ciclo entre los dos módulos por una cadena de texto.
 *
 * Vive acá, y no en el componente del cajón, porque **lo usan dos**: el cajón
 * cuando falla el detalle y el tab Sesiones cuando falla el historial. Un texto
 * que comparten dos componentes hermanos no puede vivir dentro de uno de ellos
 * sin que el otro lo importe por una ruta que no es su API.
 */
export const DETAIL_ERROR_TITLE = "Se soltó un punto";

/**
 * Las pestañas del cajón, **en el orden en que se pintan** (RFC-03 §2).
 *
 * La tanda 1 pintó sólo "General", y dejó escrito el motivo: una pestaña cuyo
 * contenido todavía no existe promete en pantalla algo que la aplicación no
 * puede cumplir, que es lo mismo que **E3(d)** prohíbe con los botones sin
 * destino. La tanda 2 trae las otras tres **con su contenido**, así que entran a
 * la vez que lo que prometen.
 */
export const DETAIL_TABS = [
  "general",
  "progress",
  "yarns",
  "sessions",
] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

export const DETAIL_TAB_LABELS: Record<DetailTab, string> = {
  general: "General",
  progress: "Progreso",
  yarns: "Lanas",
  sessions: "Sesiones",
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

/* ============================================================================
   Tab PROGRESO (RFC-03 §2: rounds con +/−, `targetRounds` editable y la
   checklist de pasos cuando hay patrón).
   ============================================================================ */

export const PROGRESS_SECTION_TITLE = "Vueltas";
export const PROGRESS_BAR_LABEL = "Progreso del proyecto";
export const ROUNDS_DONE_LABEL = "Vueltas tejidas";
export const ADD_ROUND_LABEL = "Sumar una vuelta";
export const SUBTRACT_ROUND_LABEL = "Restar una vuelta";

export const TARGET_ROUNDS_LABEL = "Meta de vueltas";
export const SAVE_TARGET_LABEL = "Guardar meta";
/**
 * Con la meta en cero **no hay porcentaje que calcular** y el backend devuelve 0
 * (`calculateProgress` con la meta en cero o menos). Se dice, en vez de dejar
 * una barra plana sin explicación.
 */
export const NO_TARGET_HINT =
  "Poné cuántas vueltas lleva el proyecto entero y el porcentaje se calcula solo.";
/** Lo mismo que valida el backend: entero, no negativo. */
export const TARGET_ROUNDS_ERROR = "La meta es un número entero de vueltas.";

export const STEPS_SECTION_TITLE = "Pasos del patrón";
export const STEPS_LOADING_MESSAGE = "Cargando los pasos del patrón.";
export const STEPS_EMPTY = "Este patrón todavía no tiene pasos escritos.";
/**
 * El patrón no se pudo traer. **La checklist se calla, el resto del tab sigue
 * funcionando**: no poder leer los pasos no es motivo para tapar las vueltas.
 */
export const STEPS_ERROR = "No pudimos traer los pasos del patrón.";

/**
 * Etiqueta de un paso de la checklist. Las instrucciones son una lista de pares
 * clave-valor **y su orden importa**, así que el número que se ve es la posición
 * (empezando en uno, como cuenta quien teje), no un id.
 *
 * Cuando el par no trae clave se usa sólo el valor: un paso sin título es
 * corriente en un patrón escrito de corrido, y pintar el separador con la mitad
 * vacía sería peor que no pintar la clave.
 */
export function stepLabel(step: PatternStep, index: number): string {
  const position = `${String(index + 1)}.`;
  const title = step.key.trim();
  const body = step.value.trim();
  const text = title === "" ? body : body === "" ? title : `${title}: ${body}`;
  return text === "" ? position : `${position} ${text}`;
}

/**
 * Marca o desmarca un paso y devuelve el conjunto entero, **ordenado y sin
 * duplicados**, que es lo que el endpoint espera (reemplaza la lista completa,
 * no marca uno suelto).
 *
 * Normaliza también en el cliente aunque el servidor vaya a normalizar otra vez:
 * lo que se pinta entre la petición y la respuesta sale de esta lista, y si acá
 * quedara desordenada la checklist parpadearía.
 */
export function toggleStep(
  completed: readonly number[],
  index: number,
): number[] {
  const next = new Set(completed);
  if (next.has(index)) {
    next.delete(index);
  } else {
    next.add(index);
  }
  return [...next].sort((a, b) => a - b);
}

/* ============================================================================
   Tab LANAS (RFC-03 §2: swatch + marca·tipo·colorName, y buscador para
   enlazar/desenlazar).
   ============================================================================ */

export const LINKED_YARNS_TITLE = "Lanas de este proyecto";
export const NO_LINKED_YARNS =
  "Todavía no enlazaste ninguna lana a este proyecto.";
export const YARN_SEARCH_LABEL = "Buscar en tu inventario";
export const LINK_YARNS_TITLE = "Enlazar una lana";
export const EMPTY_INVENTORY = "Tu inventario de lanas está vacío.";
/**
 * El inventario **no se pudo traer**, que no es lo mismo que estar vacío. Se
 * distinguen porque decirle "no tenés lanas" a quien tiene cincuenta es la misma
 * mentira que la enmienda **E2(e)** corrigió en el estado vacío de la lista.
 */
export const INVENTORY_UNAVAILABLE =
  "No pudimos traer tu inventario de lanas. Recargá la página para intentarlo otra vez.";
export const ALL_YARNS_LINKED =
  "Ya enlazaste todas las lanas de tu inventario a este proyecto.";
export const NO_YARN_MATCHES = "Ninguna lana de tu inventario coincide.";

/**
 * Lo que se LEE en el botón de desenlazar. Es corto a propósito —vive al final
 * de una fila, junto al nombre de la lana— y por eso el botón lleva además un
 * nombre accesible completo: fuera de la fila, "Quitar" no dice qué se quita.
 */
export const UNLINK_SHORT_LABEL = "Quitar";

/** Cuántas coincidencias quedaron fuera del tope de resultados. */
export function moreMatchesHint(hidden: number): string {
  return hidden === 1
    ? "Hay 1 lana más. Afiná la búsqueda."
    : `Hay ${String(hidden)} lanas más. Afiná la búsqueda.`;
}

/** En una lista de N lanas, "Quitar" a secas no dice cuál. */
export function unlinkYarnLabel(yarnLabel: string): string {
  return `Quitar ${yarnLabel} de este proyecto`;
}
export function linkYarnLabel(yarnLabel: string): string {
  return `Enlazar ${yarnLabel} a este proyecto`;
}

/**
 * La etiqueta de una lana **ya enlazada**: marca, tipo y color (RFC-03 §2).
 *
 * Acá sí hay marca y tipo por su nombre, y es la excepción que conviene tener
 * presente: la lista de lanas devuelve la fila cruda con los UUID (por eso el
 * selector del toolbar etiqueta sólo por color, **E1(d)**), pero el detalle del
 * proyecto los aplana con un JOIN. Las partes vacías se descartan en vez de
 * dejar separadores colgando.
 */
export function linkedYarnLabel(yarn: LinkedYarn): string {
  return [yarn.brandName, yarn.typeName, yarn.colorName]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(" · ");
}

/**
 * Lo que el buscador puede ofrecer: el inventario **menos lo ya enlazado**,
 * filtrado por texto con el mismo comparador que la lista (sin tildes, sin
 * mayúsculas y sin espacios de sobra).
 *
 * Quitar lo ya enlazado no es un adorno: ofrecer una lana que ya está enlazada
 * daría un botón cuyo efecto no se ve —enlazar es idempotente y responde 200 sin
 * cambiar nada—, o sea un control que parece roto.
 */
export function linkableYarns(
  choices: readonly YarnChoice[],
  linked: readonly LinkedYarn[],
  search: string,
): YarnChoice[] {
  const alreadyLinked = new Set(linked.map((yarn) => yarn.id));
  const needle = normalizeText(search);
  return choices.filter(
    (choice) =>
      !alreadyLinked.has(choice.id) &&
      (needle === "" || normalizeText(choice.label).includes(needle)),
  );
}

/* ============================================================================
   Tab SESIONES (RFC-03 §2 y §5: Start/Stop, tiempo en vivo y histórico).
   ============================================================================ */

export const START_SESSION_LABEL = "Empezar a tejer";
export const STOP_SESSION_LABEL = "Parar el cronómetro";
/** Nombre de la región viva del cronómetro. Distinto del de carga (deuda 114). */
export const SESSION_TIMER_REGION_LABEL = "Tiempo de la sesión en marcha";
export const SESSION_IDLE_MESSAGE = "El cronómetro está parado.";
export const SESSIONS_HISTORY_TITLE = "Historial";
export const SESSIONS_LOADING_MESSAGE = "Cargando las sesiones del proyecto.";
export const NO_SESSIONS = "Todavía no cronometraste ni un rato de este tejido.";
export const SESSIONS_TOTAL_LABEL = "Tiempo total";
export const UNKNOWN_SESSION_DATE = "Sin fecha";

/**
 * Cuánto lleva corriendo la sesión, **en segundos**, contra un instante dado.
 *
 * El "ahora" entra **por parámetro** en vez de leerse aquí del reloj, y no es
 * por comodidad del test: es lo que permite que el intervalo que va tickando sea
 * el único dueño del tiempo. Una función que mira la hora por su cuenta devuelve
 * algo distinto en cada render, y un render no es un tick.
 *
 * Nunca devuelve negativo: el sello del arranque lo pone el **servidor** y la
 * resta se hace con el reloj **del navegador**, que puede ir por detrás.
 */
export function sessionElapsedSeconds(startIso: string, nowMs: number): number {
  const startedAt = new Date(startIso).getTime();
  if (Number.isNaN(startedAt) || !Number.isFinite(nowMs)) {
    return 0;
  }
  return Math.max(0, Math.floor((nowMs - startedAt) / MILLISECONDS_PER_SECOND));
}

/**
 * La sesión abierta, si la hay: la que **no tiene fin**. El backend garantiza
 * como mucho una por proyecto —arrancar reutiliza la abierta en vez de crear
 * otra—, así que quedarse con la primera es exacto y no una aproximación.
 */
export function runningSession(
  sessions: readonly SerializedCraftSession[],
): SerializedCraftSession | null {
  return sessions.find((session) => session.end === null) ?? null;
}

/** El histórico son las cerradas: la que corre se ve arriba, en el cronómetro. */
export function finishedSessions(
  sessions: readonly SerializedCraftSession[],
): SerializedCraftSession[] {
  return sessions.filter((session) => session.end !== null);
}

/**
 * Suma de lo cronometrado. **Sale de las sesiones que hay en pantalla**, no del
 * tiempo cacheado del proyecto, para que las dos cifras no puedan contradecirse
 * en la misma vista: lo que se ve sumado es exactamente lo que está listado.
 */
export function totalSessionSeconds(
  sessions: readonly SerializedCraftSession[],
): number {
  return sessions.reduce((total, session) => total + session.duration, 0);
}
