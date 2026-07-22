import type { ProjectStore } from "@/features/projects/api/store";
import type {
  NewProjectRecord,
  ProjectFilters,
  ProjectPatch,
  ProjectRecord,
  ProjectYarnRecord,
} from "@/features/projects/types";
import { ACTIVE_PROJECT_STATUSES } from "@/shared/config";

export type InMemoryProjectStore = ProjectStore & {
  rows: ProjectRecord[];
  /** Enlace N:N; lo alimenta la sub-tarea de yarns. */
  links: ProjectYarnRecord[];
  /** Lanas visibles para el scoping cruzado (solo id + dueño). */
  yarns: { id: string; userId: string }[];
  /** Últimos filtros recibidos por `list` (para verificar el parseo del query). */
  lastFilters: ProjectFilters | undefined;
  reset(): void;
};

function toRecord(input: NewProjectRecord): ProjectRecord {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    name: input.name,
    image: input.image ?? null,
    type: input.type,
    status: input.status ?? "in_progress",
    rounds: input.rounds ?? 0,
    targetRounds: input.targetRounds ?? 0,
    progress: input.progress ?? 0,
    needles: input.needles ?? [],
    startDate: input.startDate ?? now,
    endDate: input.endDate ?? null,
    time: input.time ?? 0,
    patternId: input.patternId ?? null,
    completedSteps: input.completedSteps ?? [],
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Doble en memoria de `ProjectStore` para tests: replica el scoping por
 * `userId` y los filtros de `list`. No es código de producción; vive junto al
 * feature para que todos sus tests (y los de las rutas) compartan un solo doble.
 */
export function createInMemoryProjectStore(): InMemoryProjectStore {
  const rows: ProjectRecord[] = [];
  const links: ProjectYarnRecord[] = [];
  const yarns: { id: string; userId: string }[] = [];

  const store: InMemoryProjectStore = {
    rows,
    links,
    yarns,
    lastFilters: undefined,
    reset() {
      rows.length = 0;
      links.length = 0;
      yarns.length = 0;
      store.lastFilters = undefined;
    },

    async list(userId, filters) {
      store.lastFilters = filters;
      return rows
        .filter((row) => row.userId === userId)
        .filter((row) => {
          if (filters.active !== undefined) {
            const isActive = (
              ACTIVE_PROJECT_STATUSES as readonly string[]
            ).includes(row.status);
            if (isActive !== filters.active) {
              return false;
            }
          }
          if (filters.type !== undefined && row.type !== filters.type) {
            return false;
          }
          if (
            filters.needle !== undefined &&
            !row.needles.includes(filters.needle)
          ) {
            return false;
          }
          if (
            filters.yarnId !== undefined &&
            !links.some(
              (link) =>
                link.projectId === row.id && link.yarnId === filters.yarnId,
            )
          ) {
            return false;
          }
          if (filters.from !== undefined && row.startDate < filters.from) {
            return false;
          }
          if (filters.to !== undefined && row.startDate > filters.to) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    },

    async findById(userId, id) {
      return rows.find((row) => row.userId === userId && row.id === id);
    },

    async create(input) {
      const created = toRecord(input);
      rows.push(created);
      return created;
    },

    async update(userId: string, id: string, patch: ProjectPatch) {
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
      const updated = { ...existing, ...defined } as ProjectRecord;
      rows[index] = updated;
      return updated;
    },

    async remove(userId, id) {
      const index = rows.findIndex(
        (row) => row.userId === userId && row.id === id,
      );
      if (index === -1) {
        return false;
      }
      rows.splice(index, 1);
      return true;
    },

    async findYarn(userId, yarnId) {
      const yarn = yarns.find(
        (row) => row.userId === userId && row.id === yarnId,
      );
      return yarn ? { id: yarn.id } : undefined;
    },

    async listYarnIds(projectId) {
      return links
        .filter((link) => link.projectId === projectId)
        .map((link) => link.yarnId);
    },

    async linkYarn(projectId, yarnId) {
      const exists = links.some(
        (link) => link.projectId === projectId && link.yarnId === yarnId,
      );
      if (exists) {
        return false;
      }
      links.push({ projectId, yarnId });
      return true;
    },

    async unlinkYarn(projectId, yarnId) {
      const index = links.findIndex(
        (link) => link.projectId === projectId && link.yarnId === yarnId,
      );
      if (index === -1) {
        return false;
      }
      links.splice(index, 1);
      return true;
    },

    async removeYarnLinks(projectId) {
      const remaining = links.filter((link) => link.projectId !== projectId);
      const removed = links.length - remaining.length;
      links.splice(0, links.length, ...remaining);
      return removed;
    },
  };

  return store;
}
