import type { ProjectStore } from "@/features/projects/api/store";
import type {
  LinkedYarn,
  NewProjectRecord,
  ProjectFilters,
  ProjectPatch,
  ProjectRecord,
  ProjectYarnRecord,
} from "@/features/projects/types";
import type { CraftSessionRecord } from "@/features/time-tracking/types";
import { ACTIVE_PROJECT_STATUSES } from "@/shared/config";

/**
 * Lo que el doble ve de una lana: el dueño (scoping cruzado) más los campos
 * que el JOIN real trae de `yarns`, `brands` y `yarn_types`. Son obligatorios a
 * propósito: si el doble los inventase, un test podría pasar sobre datos que la
 * consulta real nunca devuelve.
 */
export type InMemoryYarnRow = LinkedYarn & { userId: string };

export type InMemoryProjectStore = ProjectStore & {
  rows: ProjectRecord[];
  /** Enlace N:N; lo alimenta la sub-tarea de yarns. */
  links: ProjectYarnRecord[];
  /** Lanas visibles para el scoping cruzado y para el JOIN del detalle. */
  yarns: InMemoryYarnRow[];
  /** Sesiones de tejido; las comparte el doble de time-tracking (FK del DELETE). */
  sessions: CraftSessionRecord[];
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
 * Borra in place las filas que cumplen el predicado. Muta el array original
 * (no lo reemplaza) porque el doble de time-tracking comparte la referencia de
 * `sessions`.
 */
function cascadeDelete<T>(items: T[], matches: (item: T) => boolean): void {
  const remaining = items.filter((item) => !matches(item));
  items.splice(0, items.length, ...remaining);
}

/**
 * Doble en memoria de `ProjectStore` para tests: replica el scoping por
 * `userId` y los filtros de `list`. No es código de producción; vive junto al
 * feature para que todos sus tests (y los de las rutas) compartan un solo doble.
 */
/** Mismo criterio que el `ORDER BY` del store real (marca·tipo·colorName·id). */
function compareLinkedYarns(a: LinkedYarn, b: LinkedYarn): number {
  const keys = ["brandName", "typeName", "colorName", "id"] as const;
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return a[key] < b[key] ? -1 : 1;
    }
  }
  return 0;
}

export function createInMemoryProjectStore(): InMemoryProjectStore {
  const rows: ProjectRecord[] = [];
  const links: ProjectYarnRecord[] = [];
  const yarns: InMemoryYarnRow[] = [];
  const sessions: CraftSessionRecord[] = [];

  const store: InMemoryProjectStore = {
    rows,
    links,
    yarns,
    sessions,
    lastFilters: undefined,
    reset() {
      rows.length = 0;
      links.length = 0;
      yarns.length = 0;
      sessions.length = 0;
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
          // Réplica del `eq(projects.pattern_id, …)` del store real: un
          // proyecto sin patrón (`patternId === null`) nunca casa, igual que
          // `NULL = $n` en Postgres.
          if (
            filters.patternId !== undefined &&
            row.patternId !== filters.patternId
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

    // Simula `ON DELETE cascade` de `project_yarns.project_id` y
    // `craft_sessions.project_id` (regla S2): el barrido de filas poseídas lo
    // hace Postgres, así que el doble lo hace aquí y no el servicio.
    async remove(userId, id) {
      const index = rows.findIndex(
        (row) => row.userId === userId && row.id === id,
      );
      if (index === -1) {
        return false;
      }
      rows.splice(index, 1);
      cascadeDelete(links, (link) => link.projectId === id);
      cascadeDelete(sessions, (session) => session.projectId === id);
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

    // Réplica del JOIN del store real: sólo lanas del usuario (el enlace no
    // tiene dueño) y proyección de exactamente los cinco campos del contrato.
    async listLinkedYarns(userId, projectId) {
      return links
        .filter((link) => link.projectId === projectId)
        .flatMap((link) => {
          const yarn = yarns.find(
            (row) => row.id === link.yarnId && row.userId === userId,
          );
          return yarn
            ? [
                {
                  id: yarn.id,
                  colorName: yarn.colorName,
                  colorFamily: yarn.colorFamily,
                  brandName: yarn.brandName,
                  typeName: yarn.typeName,
                },
              ]
            : [];
        })
        .sort(compareLinkedYarns);
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

  };

  return store;
}
