import {
  createInMemoryProjectStore,
  type InMemoryProjectStore,
} from "@/features/projects/api/testing/in-memory-store";
import type { CraftSessionStore } from "@/features/time-tracking/api/store";
import type {
  CraftSessionRecord,
  NewCraftSessionRecord,
} from "@/features/time-tracking/types";

export type InMemoryCraftSessionStore = CraftSessionStore & {
  /** Doble de projects compartido: `sessions` es literalmente su mismo array. */
  projects: InMemoryProjectStore;
  sessions: CraftSessionRecord[];
  reset(): void;
};

function toRecord(input: NewCraftSessionRecord): CraftSessionRecord {
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    projectId: input.projectId,
    start: input.start ?? new Date(),
    end: input.end ?? null,
    duration: input.duration ?? 0,
  };
}

/**
 * Doble en memoria de `CraftSessionStore`. Comparte estado con el doble de
 * projects para que el cache `Project.time` y el borrado en cascada del
 * proyecto se puedan verificar de punta a punta sin DB real.
 */
export function createInMemoryCraftSessionStore(
  projects: InMemoryProjectStore = createInMemoryProjectStore(),
): InMemoryCraftSessionStore {
  const sessions = projects.sessions;

  const store: InMemoryCraftSessionStore = {
    projects,
    sessions,
    reset() {
      projects.reset();
    },

    async findProject(userId, projectId) {
      const project = await projects.findById(userId, projectId);
      return project ? { id: project.id, time: project.time } : undefined;
    },

    async findActive(userId, projectId) {
      return sessions
        .filter(
          (session) =>
            session.userId === userId &&
            session.projectId === projectId &&
            session.end === null,
        )
        .sort((a, b) => b.start.getTime() - a.start.getTime())[0];
    },

    async listByProject(userId, projectId) {
      return sessions
        .filter(
          (session) =>
            session.userId === userId && session.projectId === projectId,
        )
        .sort((a, b) => b.start.getTime() - a.start.getTime());
    },

    async create(input) {
      const created = toRecord(input);
      sessions.push(created);
      return created;
    },

    async close(userId, id, patch) {
      const index = sessions.findIndex(
        (session) =>
          session.userId === userId && session.id === id && session.end === null,
      );
      const existing = sessions[index];
      if (!existing) {
        return undefined;
      }
      const updated: CraftSessionRecord = { ...existing, ...patch };
      sessions[index] = updated;
      return updated;
    },

    async sumDuration(userId, projectId) {
      return sessions
        .filter(
          (session) =>
            session.userId === userId && session.projectId === projectId,
        )
        .reduce((total, session) => total + session.duration, 0);
    },

    // `Project.time` no forma parte de `ProjectPatch` (el cliente nunca puede
    // enviarlo), así que el doble escribe la fila directamente, igual que el
    // store real hace su propio UPDATE sobre `projects`.
    async setProjectTime(userId, projectId, time) {
      const index = projects.rows.findIndex(
        (row) => row.userId === userId && row.id === projectId,
      );
      const existing = projects.rows[index];
      if (existing) {
        projects.rows[index] = { ...existing, time, updatedAt: new Date() };
      }
    },
  };

  return store;
}
