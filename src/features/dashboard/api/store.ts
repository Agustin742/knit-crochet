import { and, eq, gte, lt, or, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

// Regla S1 (architecture.md §"Capa de schema"): el dashboard agrega sobre las
// TABLAS de otros features importadas por su `schema.ts` directo, nunca por el
// barrel `index.ts` (que arrastra `./api` → ciclo). No llama a los stores/
// servicios de esos features: solo lee sus tablas.
import { projects } from "@/features/projects/schema";
import { craftSessions } from "@/features/time-tracking/schema";
import { yarns } from "@/features/yarns/schema";
import type { CraftType } from "@/shared/config";
import { db } from "@/shared/db";

/** Ventana de año semiabierta `[start, end)` sobre timestamps. */
export type YearRange = { start: Date; end: Date };

/**
 * Acceso de **solo lectura** a las agregaciones del dashboard. Todo se scopea
 * por `userId` de la sesión. Los servicios dependen de esta interfaz (no de
 * Drizzle) para testearse con un doble en memoria fiel.
 *
 * Trampa del driver `neon-http`: `sum(...)`/`count(*)` vuelven como `numeric`
 * (string). Todo agregado se envuelve en `Number(...)`, igual que `sumDuration`
 * en `time-tracking/api/store.ts`.
 */
export type DashboardStore = {
  /**
   * Σ `craft_sessions.duration` (segundos) de las sesiones cuyo `start` cae en
   * el año. Con `type`, une con `projects` y filtra por `projects.type`.
   */
  sumHours(
    userId: string,
    range: YearRange,
    type?: CraftType,
  ): Promise<number>;
  /**
   * Nº de proyectos iniciados **o** terminados en el año (`startDate` en rango
   * OR `endDate` en rango). Con `type`, además `projects.type = type`.
   */
  countProjects(
    userId: string,
    range: YearRange,
    type?: CraftType,
  ): Promise<number>;
  /**
   * Σ (`usedQuantity` × `length`) en metros. Agregado **lifetime** (PRD §11.2):
   * NO se filtra por año ni por type; solo scoping por `userId`.
   */
  sumYarnMeters(userId: string): Promise<number>;
};

export function createDashboardStore(
  database: NeonHttpDatabase = db,
): DashboardStore {
  return {
    async sumHours(userId, range, type) {
      const conditions = [
        eq(craftSessions.userId, userId),
        gte(craftSessions.start, range.start),
        lt(craftSessions.start, range.end),
      ];

      if (type !== undefined) {
        const rows = await database
          .select({
            total: sql<number>`coalesce(sum(${craftSessions.duration}), 0)`,
          })
          .from(craftSessions)
          .innerJoin(projects, eq(craftSessions.projectId, projects.id))
          .where(and(...conditions, eq(projects.type, type)));
        return Number(rows[0]?.total ?? 0);
      }

      const rows = await database
        .select({
          total: sql<number>`coalesce(sum(${craftSessions.duration}), 0)`,
        })
        .from(craftSessions)
        .where(and(...conditions));
      return Number(rows[0]?.total ?? 0);
    },

    async countProjects(userId, range, type) {
      // Iniciado O terminado en el año. `endDate` es nullable: cuando es NULL,
      // sus comparadores dan NULL y la fila no entra por esa rama (SQL).
      const inYear = or(
        and(
          gte(projects.startDate, range.start),
          lt(projects.startDate, range.end),
        ),
        and(
          gte(projects.endDate, range.start),
          lt(projects.endDate, range.end),
        ),
      );
      const conditions = [eq(projects.userId, userId), inYear];
      if (type !== undefined) {
        conditions.push(eq(projects.type, type));
      }

      const rows = await database
        .select({ total: sql<number>`count(*)` })
        .from(projects)
        .where(and(...conditions));
      return Number(rows[0]?.total ?? 0);
    },

    async sumYarnMeters(userId) {
      const rows = await database
        .select({
          total: sql<number>`coalesce(sum(${yarns.usedQuantity} * ${yarns.length}), 0)`,
        })
        .from(yarns)
        .where(eq(yarns.userId, userId));
      return Number(rows[0]?.total ?? 0);
    },
  };
}
