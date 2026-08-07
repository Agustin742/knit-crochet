export const APP_NAME = "Knit&Crochet";

// Enums globales (PRD §4). La lista de valores vive UNA sola vez aquí; los
// `pgEnum` de Drizzle (shared/db/enums.ts) y la validación zod los consumen.

export const CRAFT_TYPES = ["knitting", "crochet"] as const;
export type CraftType = (typeof CRAFT_TYPES)[number];

export const PROJECT_STATUSES = [
  "in_progress",
  "paused",
  "finished",
  "abandoned",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// Un proyecto se considera "activo" si su status está en este subconjunto (PRD §4).
export const ACTIVE_PROJECT_STATUSES = ["in_progress", "paused"] as const;

// Comparativas graciosas sobre los metros de lana tejidos (PRD §8). Lista fija y
// editable aquí. Ordenadas ascendente por `meters` para que el algoritmo de
// selección elija la mayor referencia que "cabe" en `yarnMeters`.
export const YARN_COMPARISONS = [
  { label: "Un colectivo", meters: 12 },
  { label: "El Obelisco", meters: 67.5 },
  { label: "Un campo de fútbol", meters: 105 },
  { label: "La Torre Eiffel", meters: 330 },
  { label: "El Everest", meters: 8849 },
] as const;
export type YarnComparison = (typeof YARN_COMPARISONS)[number];

/**
 * Segundos en una hora. La métrica `hours` del dashboard viaja en **segundos**
 * (Σ `craft_sessions.duration`), pero `HOURS_COMPARISONS` se escribe **en
 * horas** porque es lo que lee quien edite la lista: esta constante es el único
 * puente entre las dos unidades (PRD §8.1). Nunca escribas `3600` suelto.
 */
export const SECONDS_PER_HOUR = 3600;

/**
 * Segundos en un minuto. Hermana de `SECONDS_PER_HOUR` y por el mismo motivo:
 * el dominio almacena tiempo en segundos (`craft_sessions.duration`,
 * `Project.time`) y la UI lo enseña en horas y minutos. Los dos puentes viven
 * juntos para que nadie escriba `60` ni `3600` sueltos en un componente.
 */
export const SECONDS_PER_MINUTE = 60;

// Comparativas graciosas sobre las horas tejidas (PRD §8.1). Ordenadas
// ascendente por `hours`. ⚠️ El campo está EN HORAS; la métrica que se compara
// contra ellas está en SEGUNDOS: la conversión va por `SECONDS_PER_HOUR`.
export const HOURS_COMPARISONS = [
  { label: "Un partido de fútbol", hours: 1.5 },
  { label: "Un vuelo a Bariloche", hours: 2.3 },
  { label: "El Señor de los Anillos (extendida)", hours: 11.4 },
  { label: "Un vuelo a Madrid", hours: 12.5 },
  { label: "Una semana laboral", hours: 45 },
  { label: "Un mes de trabajo", hours: 180 },
] as const;
export type HoursComparison = (typeof HOURS_COMPARISONS)[number];

// Comparativas graciosas sobre la cantidad de proyectos (PRD §8.1). El campo
// está en unidades, la misma unidad que la métrica. Orden ascendente.
export const PROJECTS_COMPARISONS = [
  { label: "Un par", projects: 2 },
  { label: "Un equipo de fútbol", projects: 11 },
  { label: "Una docena", projects: 12 },
  { label: "Un aula", projects: 30 },
  { label: "Un colectivo lleno", projects: 60 },
] as const;
export type ProjectsComparison = (typeof PROJECTS_COMPARISONS)[number];

export const COLOR_FAMILIES = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "violet",
  "pink",
  "brown",
  "gray",
  "black",
  "white",
  "neutral",
  "multicolor",
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];
