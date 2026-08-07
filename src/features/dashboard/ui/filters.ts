import {
  METRICS_YEAR_MAX,
  METRICS_YEAR_MIN,
} from "@/features/dashboard/validation";
import type { SerializedProject } from "@/features/projects/ui";
import { CRAFT_TYPES, type CraftType } from "@/shared/config";

/** Etiquetas visibles de los dos crafts (el código va en inglés, la UI no). */
export const CRAFT_TYPE_LABELS: Record<CraftType, string> = {
  knitting: "Dos agujas",
  crochet: "Crochet",
};

/** Los dos botones de creación rápida (RFC-02 §1), en el orden del enum. */
export const CREATE_PROJECT_LABELS: Record<CraftType, string> = {
  knitting: "Nuevo dos agujas",
  crochet: "Nuevo crochet",
};

export const YEAR_RANGE_MESSAGE = `Escribí un año entre ${METRICS_YEAR_MIN} y ${METRICS_YEAR_MAX}.`;

/**
 * Año del filtro (RFC-02 §1: **rango libre**, sin lista cerrada de años).
 *
 * "Libre" no es "cualquier cosa": el endpoint acepta un entero entre
 * `METRICS_YEAR_MIN` y `METRICS_YEAR_MAX` y contesta 400 fuera de ahí, así que
 * los topes se importan del schema en vez de reescribirse. Devuelve `null`
 * cuando el texto todavía no es un año válido —mientras se teclea "20", por
 * ejemplo—, y quien llama se queda con el último válido en vez de pedir datos
 * que el servidor va a rechazar.
 */
export function parseYear(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const year = Number(trimmed);
  return year >= METRICS_YEAR_MIN && year <= METRICS_YEAR_MAX ? year : null;
}

export function clampYear(year: number): number {
  return Math.min(METRICS_YEAR_MAX, Math.max(METRICS_YEAR_MIN, year));
}

/**
 * El endpoint acepta UN craft type. Los dos botones son **combinables**
 * (RFC-02 §1), así que "los dos marcados" y "ninguno marcado" son la misma
 * pregunta —todo— y se traducen a "sin filtro".
 */
export function toTypeFilter(selected: readonly CraftType[]): CraftType | undefined {
  return selected.length === 1 ? selected[0] : undefined;
}

/**
 * Tope de la lista de activos (RFC-02 §1: N ≈ 15 con "ver todos"). Es de
 * **cliente**: el contrato de `GET /api/projects` no tiene `limit` ni `offset`.
 */
export const MAX_ACTIVE_PROJECTS = 15;

export const SORT_ORDERS = [
  /**
   * ENMIENDA E2.2. La etiqueta **no** dice "último tejido", y no es un descuido:
   * `updatedAt` es "último toque". Lo bumpean parar el cronómetro, `PATCH`
   * (renombrar, la nota, la foto, el estado), sumar vueltas y marcar pasos; y
   * **no** lo bumpea arrancar una sesión. Es un superconjunto de "tejido", así
   * que renombrar un proyecto lo manda arriba sin haber tejido un minuto. En
   * este repo una etiqueta que miente es peor que no tenerla.
   */
  { value: "recent", label: "Actividad reciente" },
  { value: "name", label: "Nombre" },
  { value: "progress", label: "Progreso" },
] as const;

export type SortOrder = (typeof SORT_ORDERS)[number]["value"];

export const DEFAULT_SORT_ORDER: SortOrder = "recent";

export const SORT_HINT =
  "La actividad cuenta cualquier cambio en el proyecto, no sólo el tiempo tejido.";

/**
 * ⚠️ `updatedAt` llega como **cadena ISO**, no como `Date`, aunque
 * `ProjectRecord` declare `Date`: `NextResponse.json` serializa con
 * `JSON.stringify`. Por eso aquí se parsea y **no** se llama a `.getTime()`
 * sobre el campo, que compilaría y explotaría en el navegador. Ver
 * `features/projects/ui/types.ts`.
 *
 * Una fecha ilegible cuenta como 0 (el fondo de la lista) en vez de propagar un
 * `NaN`, que en un comparador produce un orden distinto en cada motor.
 */
function timestampOf(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Orden de la lista de activos. Es de cliente porque el backend devuelve
 * `startDate` descendente y no acepta ordenación (RFC-02 §3).
 *
 * No muta la lista recibida: el array que llega es el estado de quien llama.
 */
export function sortProjects(
  projects: readonly SerializedProject[],
  order: SortOrder,
): SerializedProject[] {
  const sorted = [...projects];
  switch (order) {
    case "recent":
      return sorted.sort(
        (a, b) => timestampOf(b.updatedAt) - timestampOf(a.updatedAt),
      );
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "progress":
      return sorted.sort((a, b) => b.progress - a.progress);
  }
}

/** Los dos crafts, en el orden del enum, para pintar los pares de controles. */
export const CRAFT_TYPE_ORDER: readonly CraftType[] = CRAFT_TYPES;
