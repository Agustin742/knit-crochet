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

/**
 * El cronómetro abierto de un proyecto, tal y como viaja en la lista (RFC-03,
 * enmienda **E7 (b3)**).
 *
 * **Dos campos y no la sesión entera**, a propósito: de una sesión abierta,
 * `end` es siempre `null` y `duration` siempre `0` —el servidor los calcula al
 * cerrarla—, así que mandarlos sería mandar dos huecos. Lo que la tarjeta
 * necesita es **desde cuándo** corre (para arrancar el reloj en el segundo real
 * y no en cero) y **cuál** es (para poder hablar de ella).
 */
export type ActiveProjectSession = { id: string; start: Date };

/** La misma sesión con el proyecto al que pertenece, tal y como sale del store. */
export type ActiveSessionRow = ActiveProjectSession & { projectId: string };

/**
 * Un proyecto **de la lista**: la fila entera más su cronómetro.
 *
 * La invariante del backend es *"como mucho una sesión abierta **por
 * proyecto**"* (`start-session.ts`), **no una por usuario**: puede haber varios
 * cronómetros corriendo a la vez en proyectos distintos, y por eso el dato
 * cuelga de cada proyecto en vez de ser uno solo de la respuesta.
 */
export type ProjectListItem = ProjectRecord & {
  activeSession: ActiveProjectSession | null;
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
