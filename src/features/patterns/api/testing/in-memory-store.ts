import type { PatternStore } from "@/features/patterns/api/store";
import type {
  NewPatternRecord,
  PatternFilters,
  PatternPatch,
  PatternRecord,
} from "@/features/patterns/types";
import {
  createInMemoryProjectStore,
  type InMemoryProjectStore,
} from "@/features/projects/api/testing/in-memory-store";

export type InMemoryPatternStore = PatternStore & {
  /**
   * Doble de projects compartido: sus `rows` son las que quedan con
   * `patternId = null` cuando se borra un patrón (FK `set null`, S2).
   */
  projects: InMemoryProjectStore;
  rows: PatternRecord[];
  /** Últimos filtros recibidos por `list` (para verificar el parseo del query). */
  lastFilters: PatternFilters | undefined;
  reset(): void;
};

function toRecord(input: NewPatternRecord): PatternRecord {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    name: input.name,
    image: input.image ?? null,
    type: input.type,
    instructions: input.instructions ?? [],
    metadata: input.metadata ?? [],
    inLibrary: input.inLibrary ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Doble en memoria de `PatternStore`. Comparte el doble de projects para
 * simular con fidelidad la FK `projects.pattern_id → patterns`
 * (`ON DELETE set null`): al borrar un patrón, los proyectos que lo
 * referenciaban quedan con `patternId = null` (mutación in-place de
 * `projects.rows`, no reasignación). Así la costura del borrado se verifica de
 * punta a punta sin DB real.
 */
export function createInMemoryPatternStore(
  projects: InMemoryProjectStore = createInMemoryProjectStore(),
): InMemoryPatternStore {
  const rows: PatternRecord[] = [];

  const store: InMemoryPatternStore = {
    projects,
    rows,
    lastFilters: undefined,
    reset() {
      projects.reset();
      rows.length = 0;
      store.lastFilters = undefined;
    },

    async list(userId, filters) {
      store.lastFilters = filters;
      return rows
        .filter((row) => row.userId === userId)
        .filter((row) => {
          if (filters.type !== undefined && row.type !== filters.type) {
            return false;
          }
          if (
            filters.inLibrary !== undefined &&
            row.inLibrary !== filters.inLibrary
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async findById(userId, id) {
      return rows.find((row) => row.userId === userId && row.id === id);
    },

    async create(input) {
      const created = toRecord(input);
      rows.push(created);
      return created;
    },

    async update(userId: string, id: string, patch: PatternPatch) {
      const index = rows.findIndex(
        (row) => row.userId === userId && row.id === id,
      );
      const existing = rows[index];
      if (!existing) {
        return undefined;
      }
      const defined = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      );
      const updated = { ...existing, ...defined } as PatternRecord;
      rows[index] = updated;
      return updated;
    },

    // Simula la FK `projects.pattern_id` con `ON DELETE set null` (S2): el
    // barrido lo hace Postgres, así que el doble lo hace aquí y no el servicio.
    // Muta `projects.rows` in-place (no lo reasigna) para no desincronizar el
    // doble compartido.
    async remove(userId, id) {
      const index = rows.findIndex(
        (row) => row.userId === userId && row.id === id,
      );
      if (index === -1) {
        return false;
      }
      rows.splice(index, 1);
      for (const project of projects.rows) {
        if (project.patternId === id) {
          project.patternId = null;
        }
      }
      return true;
    },
  };

  return store;
}
