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
