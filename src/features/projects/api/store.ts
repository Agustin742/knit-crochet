import { and, desc, eq, exists, gte, inArray, lte, not, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import { projects, projectYarns } from "@/features/projects/schema";
import { yarns } from "@/features/yarns";
import type {
  NewProjectRecord,
  ProjectFilters,
  ProjectPatch,
  ProjectRecord,
} from "@/features/projects/types";
import { ACTIVE_PROJECT_STATUSES } from "@/shared/config";
import { db } from "@/shared/db";

/**
 * Único punto de acceso a las tablas de proyectos. Los servicios dependen de
 * esta interfaz (no de Drizzle) para poder testearse con un doble en memoria.
 * Todas las operaciones reciben el `userId` de la sesión y lo aplican en el
 * WHERE: nunca se consulta un proyecto sin scoping.
 */
export type ProjectStore = {
  list(userId: string, filters: ProjectFilters): Promise<ProjectRecord[]>;
  findById(userId: string, id: string): Promise<ProjectRecord | undefined>;
  create(input: NewProjectRecord): Promise<ProjectRecord>;
  update(
    userId: string,
    id: string,
    patch: ProjectPatch,
  ): Promise<ProjectRecord | undefined>;
  remove(userId: string, id: string): Promise<boolean>;
  /** Comprueba que la lana existe Y es del usuario (scoping cruzado). */
  findYarn(userId: string, yarnId: string): Promise<YarnRef | undefined>;
  listYarnIds(projectId: string): Promise<string[]>;
  /** `false` si el enlace ya existía (PK compuesta): enlazar es idempotente. */
  linkYarn(projectId: string, yarnId: string): Promise<boolean>;
  /** `false` si no había enlace que borrar. */
  unlinkYarn(projectId: string, yarnId: string): Promise<boolean>;
  /** Borra TODOS los enlaces del proyecto; imprescindible antes de `remove` (FK). */
  removeYarnLinks(projectId: string): Promise<number>;
};

/** Lo mínimo que projects necesita saber de una lana: que existe y es del usuario. */
export type YarnRef = { id: string };

export function createProjectStore(
  database: NeonHttpDatabase = db,
): ProjectStore {
  return {
    async list(userId, filters) {
      const conditions = [eq(projects.userId, userId)];

      if (filters.active !== undefined) {
        const isActive = inArray(projects.status, [
          ...ACTIVE_PROJECT_STATUSES,
        ]);
        conditions.push(filters.active ? isActive : not(isActive));
      }
      if (filters.type !== undefined) {
        conditions.push(eq(projects.type, filters.type));
      }
      if (filters.needle !== undefined) {
        conditions.push(
          sql`${projects.needles} @> ${JSON.stringify([filters.needle])}::jsonb`,
        );
      }
      if (filters.yarnId !== undefined) {
        conditions.push(
          exists(
            database
              .select({ linked: sql`1` })
              .from(projectYarns)
              .where(
                and(
                  eq(projectYarns.projectId, projects.id),
                  eq(projectYarns.yarnId, filters.yarnId),
                ),
              ),
          ),
        );
      }
      if (filters.from !== undefined) {
        conditions.push(gte(projects.startDate, filters.from));
      }
      if (filters.to !== undefined) {
        conditions.push(lte(projects.startDate, filters.to));
      }

      return database
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.startDate));
    },

    async findById(userId, id) {
      const rows = await database
        .select()
        .from(projects)
        .where(and(eq(projects.userId, userId), eq(projects.id, id)))
        .limit(1);
      return rows[0];
    },

    async create(input) {
      const rows = await database.insert(projects).values(input).returning();
      const created = rows[0];
      if (!created) {
        throw new Error("No se pudo crear el proyecto.");
      }
      return created;
    },

    async update(userId, id, patch) {
      const rows = await database
        .update(projects)
        .set(patch)
        .where(and(eq(projects.userId, userId), eq(projects.id, id)))
        .returning();
      return rows[0];
    },

    async remove(userId, id) {
      const rows = await database
        .delete(projects)
        .where(and(eq(projects.userId, userId), eq(projects.id, id)))
        .returning({ id: projects.id });
      return rows.length > 0;
    },

    async findYarn(userId, yarnId) {
      const rows = await database
        .select({ id: yarns.id })
        .from(yarns)
        .where(and(eq(yarns.userId, userId), eq(yarns.id, yarnId)))
        .limit(1);
      return rows[0];
    },

    // `project_yarns` no tiene `userId`: el scoping lo garantizan `findById` y
    // `findYarn`, que el servicio ejecuta antes de tocar el enlace.
    async listYarnIds(projectId) {
      const rows = await database
        .select({ yarnId: projectYarns.yarnId })
        .from(projectYarns)
        .where(eq(projectYarns.projectId, projectId));
      return rows.map((row) => row.yarnId);
    },

    async linkYarn(projectId, yarnId) {
      const rows = await database
        .insert(projectYarns)
        .values({ projectId, yarnId })
        .onConflictDoNothing()
        .returning({ yarnId: projectYarns.yarnId });
      return rows.length > 0;
    },

    async unlinkYarn(projectId, yarnId) {
      const rows = await database
        .delete(projectYarns)
        .where(
          and(
            eq(projectYarns.projectId, projectId),
            eq(projectYarns.yarnId, yarnId),
          ),
        )
        .returning({ yarnId: projectYarns.yarnId });
      return rows.length > 0;
    },

    async removeYarnLinks(projectId) {
      const rows = await database
        .delete(projectYarns)
        .where(eq(projectYarns.projectId, projectId))
        .returning({ yarnId: projectYarns.yarnId });
      return rows.length;
    },
  };
}
