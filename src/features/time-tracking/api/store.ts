import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

// Se importa la tabla por su ruta interna (no por `@/features/projects`) para
// no arrastrar los servicios de projects y mantener plano el grafo de imports
// entre features: `craft_sessions` ya referencia a `projects` en su schema.
import { projects } from "@/features/projects/schema";
import { craftSessions } from "@/features/time-tracking/schema";
import type {
  CraftSessionRecord,
  NewCraftSessionRecord,
  ProjectTimeRef,
} from "@/features/time-tracking/types";
import { db } from "@/shared/db";

/**
 * Único punto de acceso a `craft_sessions` (y al campo cacheado `Project.time`).
 * Los servicios dependen de esta interfaz, no de Drizzle, para poder testearse
 * con un doble en memoria. Toda operación recibe el `userId` de la sesión y lo
 * aplica en el WHERE: nunca se toca una sesión sin scoping.
 */
export type CraftSessionStore = {
  /** Comprueba que el proyecto existe Y es del usuario (scoping cruzado). */
  findProject(
    userId: string,
    projectId: string,
  ): Promise<ProjectTimeRef | undefined>;
  /** La sesión abierta (`end = null`) del proyecto, si el cronómetro corre. */
  findActive(
    userId: string,
    projectId: string,
  ): Promise<CraftSessionRecord | undefined>;
  listByProject(
    userId: string,
    projectId: string,
  ): Promise<CraftSessionRecord[]>;
  create(input: NewCraftSessionRecord): Promise<CraftSessionRecord>;
  /** Cierra una sesión abierta; `undefined` si otra petición la cerró antes. */
  close(
    userId: string,
    id: string,
    patch: { end: Date; duration: number },
  ): Promise<CraftSessionRecord | undefined>;
  /** Σ `duration` de las sesiones del proyecto: fuente del cache `Project.time`. */
  sumDuration(userId: string, projectId: string): Promise<number>;
  setProjectTime(
    userId: string,
    projectId: string,
    time: number,
  ): Promise<void>;
};

export function createCraftSessionStore(
  database: NeonHttpDatabase = db,
): CraftSessionStore {
  return {
    async findProject(userId, projectId) {
      const rows = await database
        .select({ id: projects.id, time: projects.time })
        .from(projects)
        .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
        .limit(1);
      return rows[0];
    },

    async findActive(userId, projectId) {
      const rows = await database
        .select()
        .from(craftSessions)
        .where(
          and(
            eq(craftSessions.userId, userId),
            eq(craftSessions.projectId, projectId),
            isNull(craftSessions.end),
          ),
        )
        .orderBy(desc(craftSessions.start))
        .limit(1);
      return rows[0];
    },

    async listByProject(userId, projectId) {
      return database
        .select()
        .from(craftSessions)
        .where(
          and(
            eq(craftSessions.userId, userId),
            eq(craftSessions.projectId, projectId),
          ),
        )
        .orderBy(desc(craftSessions.start));
    },

    async create(input) {
      const rows = await database
        .insert(craftSessions)
        .values(input)
        .returning();
      const created = rows[0];
      if (!created) {
        throw new Error("No se pudo crear la sesión de tejido.");
      }
      return created;
    },

    async close(userId, id, patch) {
      const rows = await database
        .update(craftSessions)
        .set(patch)
        .where(
          and(
            eq(craftSessions.userId, userId),
            eq(craftSessions.id, id),
            isNull(craftSessions.end),
          ),
        )
        .returning();
      return rows[0];
    },

    async sumDuration(userId, projectId) {
      const rows = await database
        .select({
          total: sql<number>`coalesce(sum(${craftSessions.duration}), 0)`,
        })
        .from(craftSessions)
        .where(
          and(
            eq(craftSessions.userId, userId),
            eq(craftSessions.projectId, projectId),
          ),
        );
      return Number(rows[0]?.total ?? 0);
    },

    async setProjectTime(userId, projectId, time) {
      await database
        .update(projects)
        .set({ time, updatedAt: new Date() })
        .where(and(eq(projects.userId, userId), eq(projects.id, projectId)));
    },
  };
}
