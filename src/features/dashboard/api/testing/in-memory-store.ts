import type {
  DashboardStore,
  YearRange,
} from "@/features/dashboard/api/store";
import type { CraftType } from "@/shared/config";

/** Fila mínima de `craft_sessions` que el agregado de horas necesita. */
export type SessionRow = {
  userId: string;
  projectId: string;
  start: Date;
  duration: number;
};

/** Fila mínima de `projects` para contar y para el join por `type`. */
export type ProjectRow = {
  id: string;
  userId: string;
  type: CraftType;
  startDate: Date;
  endDate: Date | null;
};

/** Fila mínima de `yarns` para los metros lifetime. */
export type YarnRow = {
  userId: string;
  usedQuantity: number;
  length: number;
};

export type InMemoryDashboardStore = DashboardStore & {
  sessions: SessionRow[];
  projects: ProjectRow[];
  yarns: YarnRow[];
  reset(): void;
};

/** `date ∈ [range.start, range.end)`. */
function inRange(date: Date, range: YearRange): boolean {
  return date >= range.start && date < range.end;
}

/**
 * Doble en memoria fiel de `DashboardStore`. Reproduce la semántica REAL de las
 * queries SQL (lección del smoke de #8: un doble que miente deja tests verdes en
 * falso): scoping por `userId`, ventana de año sobre `start`/`startDate`/
 * `endDate`, filtro `type` (uniendo la sesión con su proyecto), y que
 * `yarnMeters` ignore por completo `year`/`type`.
 */
export function createInMemoryDashboardStore(): InMemoryDashboardStore {
  const sessions: SessionRow[] = [];
  const projects: ProjectRow[] = [];
  const yarns: YarnRow[] = [];

  const store: InMemoryDashboardStore = {
    sessions,
    projects,
    yarns,
    reset() {
      sessions.length = 0;
      projects.length = 0;
      yarns.length = 0;
    },

    async sumHours(userId, range, type) {
      return sessions
        .filter((session) => session.userId === userId)
        .filter((session) => inRange(session.start, range))
        .filter((session) => {
          if (type === undefined) {
            return true;
          }
          const project = projects.find((row) => row.id === session.projectId);
          return project?.type === type;
        })
        .reduce((total, session) => total + session.duration, 0);
    },

    async countProjects(userId, range, type) {
      return projects
        .filter((project) => project.userId === userId)
        .filter((project) => type === undefined || project.type === type)
        .filter(
          (project) =>
            inRange(project.startDate, range) ||
            (project.endDate !== null && inRange(project.endDate, range)),
        ).length;
    },

    async sumYarnMeters(userId) {
      // Lifetime: ignora deliberadamente cualquier ventana de año / type.
      return yarns
        .filter((yarn) => yarn.userId === userId)
        .reduce((total, yarn) => total + yarn.usedQuantity * yarn.length, 0);
    },
  };

  return store;
}
