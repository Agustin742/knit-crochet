import { pgEnum } from "drizzle-orm/pg-core";
import { COLOR_FAMILIES, CRAFT_TYPES, PROJECT_STATUSES } from "@/shared/config";

// `pgEnum` construidos desde la fuente única de valores (shared/config). Se
// definen una sola vez aquí porque un mismo enum (p. ej. craft_type) lo usan
// varias features (Project y Pattern) y un pgEnum duplicado colisionaría.
export const craftTypeEnum = pgEnum("craft_type", CRAFT_TYPES);
export const projectStatusEnum = pgEnum("project_status", PROJECT_STATUSES);
export const colorFamilyEnum = pgEnum("color_family", COLOR_FAMILIES);
