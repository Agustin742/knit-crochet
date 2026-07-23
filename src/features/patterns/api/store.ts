import { and, desc, eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import { patterns } from "@/features/patterns/schema";
import type {
  NewPatternRecord,
  PatternFilters,
  PatternPatch,
  PatternRecord,
} from "@/features/patterns/types";
import { db } from "@/shared/db";

/**
 * Único punto de acceso a la tabla `patterns`. Los servicios dependen de esta
 * interfaz (no de Drizzle) para poder testearse con un doble en memoria. Toda
 * operación recibe el `userId` de la sesión y lo aplica en el WHERE: nunca se
 * consulta un patrón sin scoping.
 */
export type PatternStore = {
  list(userId: string, filters: PatternFilters): Promise<PatternRecord[]>;
  findById(userId: string, id: string): Promise<PatternRecord | undefined>;
  create(input: NewPatternRecord): Promise<PatternRecord>;
  update(
    userId: string,
    id: string,
    patch: PatternPatch,
  ): Promise<PatternRecord | undefined>;
  /**
   * Borra el patrón del usuario. Los proyectos que lo referenciaban quedan con
   * `patternId = null` gracias a la FK `projects.pattern_id → patterns`
   * (`ON DELETE set null`, regla S2): el barrido lo hace Postgres, no este store.
   */
  remove(userId: string, id: string): Promise<boolean>;
};

export function createPatternStore(
  database: NeonHttpDatabase = db,
): PatternStore {
  return {
    async list(userId, filters) {
      const conditions = [eq(patterns.userId, userId)];

      if (filters.type !== undefined) {
        conditions.push(eq(patterns.type, filters.type));
      }
      if (filters.inLibrary !== undefined) {
        conditions.push(eq(patterns.inLibrary, filters.inLibrary));
      }

      return database
        .select()
        .from(patterns)
        .where(and(...conditions))
        .orderBy(desc(patterns.createdAt));
    },

    async findById(userId, id) {
      const rows = await database
        .select()
        .from(patterns)
        .where(and(eq(patterns.userId, userId), eq(patterns.id, id)))
        .limit(1);
      return rows[0];
    },

    async create(input) {
      const rows = await database.insert(patterns).values(input).returning();
      const created = rows[0];
      if (!created) {
        throw new Error("No se pudo crear el patrón.");
      }
      return created;
    },

    async update(userId, id, patch) {
      const rows = await database
        .update(patterns)
        .set(patch)
        .where(and(eq(patterns.userId, userId), eq(patterns.id, id)))
        .returning();
      return rows[0];
    },

    async remove(userId, id) {
      const rows = await database
        .delete(patterns)
        .where(and(eq(patterns.userId, userId), eq(patterns.id, id)))
        .returning({ id: patterns.id });
      return rows.length > 0;
    },
  };
}
