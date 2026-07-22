import type { projects, projectYarns } from "@/features/projects/schema";
import type { CraftType, ProjectStatus } from "@/shared/config";

export type ProjectRecord = typeof projects.$inferSelect;
export type NewProjectRecord = typeof projects.$inferInsert;
export type ProjectYarnRecord = typeof projectYarns.$inferSelect;

/** Campos que el cliente puede enviar. `progress` NUNCA entra: se calcula. */
export type CreateProjectInput = {
  name: string;
  type: CraftType;
  image?: string | null;
  status?: ProjectStatus;
  rounds?: number;
  targetRounds?: number;
  needles?: number[];
  startDate?: Date;
  endDate?: Date | null;
  patternId?: string | null;
  completedSteps?: number[];
  notes?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

/** Parche interno hacia la capa de datos: incluye campos calculados. */
export type ProjectPatch = UpdateProjectInput & {
  progress?: number;
  updatedAt?: Date;
};

export type ProjectFilters = {
  /** `true` = status ∈ { in_progress, paused } (PRD §4). */
  active?: boolean;
  type?: CraftType;
  /** Medida en mm buscada dentro del array `needles`. */
  needle?: number;
  /** Filtra por el enlace N:N `project_yarns`. */
  yarnId?: string;
  /** Rango sobre `startDate`. */
  from?: Date;
  to?: Date;
};
