import type { projects, projectYarns } from "@/features/projects/schema";
import type { ColorFamily, CraftType, ProjectStatus } from "@/shared/config";

export type ProjectRecord = typeof projects.$inferSelect;
export type NewProjectRecord = typeof projects.$inferInsert;
export type ProjectYarnRecord = typeof projectYarns.$inferSelect;

/**
 * Lana enlazada a un proyecto, aplanada para el tab Lanas (RFC-03 §2): el
 * swatch se pinta con `colorFamily` y la etiqueta es "marca·tipo·colorName".
 * Exactamente cinco campos (PRD §9.1): `brandName`/`typeName` no están en la
 * fila de `yarns` (son FKs), así que salen de un JOIN.
 */
export type LinkedYarn = {
  id: string;
  colorName: string;
  colorFamily: ColorFamily;
  brandName: string;
  typeName: string;
};

/** Payload de `GET /api/projects/:id`: `project` intacto + clave hermana. */
export type ProjectDetail = {
  project: ProjectRecord;
  yarns: LinkedYarn[];
};

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
  /**
   * "En qué proyectos se usa este patrón" (PRD §9.2). A diferencia de `yarnId`,
   * es la columna `projects.pattern_id`, una FK 1→N: no hay tabla de enlace.
   * `pattern_id` es NULLABLE, así que un proyecto sin patrón nunca casa.
   */
  patternId?: string;
  /** Rango sobre `startDate`. */
  from?: Date;
  to?: Date;
};
