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
