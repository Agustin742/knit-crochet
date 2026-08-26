import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";
import type {
  ActiveProjectSession,
  ActiveSessionRow,
  ProjectFilters,
  ProjectListItem,
} from "@/features/projects/types";

/**
 * Índice de cronómetros por proyecto.
 *
 * **Gana la primera**, y el store las trae de la más reciente a la más antigua:
 * si un proyecto tuviera dos sesiones abiertas —cosa que la invariante de
 * `start-session.ts` impide— la que se enseñaría es la que arrancó última, que
 * es exactamente la que `findActive` de time-tracking devolvería. Dos réplicas
 * del mismo criterio no pueden discrepar si el criterio está escrito una vez.
 */
function indexByProject(
  sessions: readonly ActiveSessionRow[],
): Map<string, ActiveProjectSession> {
  const index = new Map<string, ActiveProjectSession>();
  for (const session of sessions) {
    if (!index.has(session.projectId)) {
      index.set(session.projectId, { id: session.id, start: session.start });
    }
  }
  return index;
}

/**
 * La lista de proyectos del usuario **con su cronómetro** (RFC-03, enmienda
 * **E7 (b3)**).
 *
 * Cada proyecto lleva su sesión abierta, o `null`. **Deroga en parte la
 * enmienda E2.2 de RFC-02**, que había descartado abrir el backend para esto: sin
 * el dato, la lista no puede saber si el cronómetro corre y tras recargar la
 * página el botón de la tarjeta ofrece «Empezar» con la sesión abierta.
 *
 * **Dos consultas y no una por proyecto.** El JOIN se hace acá, en memoria,
 * porque un `LEFT JOIN` sobre `craft_sessions` multiplicaría las filas de
 * proyecto por sus sesiones y obligaría a deduplicar; y una llamada por proyecto
 * sería un N+1 en la pantalla que más filas pinta. Con la lista vacía **no se
 * pide nada**: no hay a quién colgarle un cronómetro.
 */
export async function listProjects(
  userId: string,
  filters: ProjectFilters = {},
  store: ProjectStore = createProjectStore(),
): Promise<ProjectListItem[]> {
  const projects = await store.list(userId, filters);
  if (projects.length === 0) {
    return [];
  }

  const running = indexByProject(await store.listActiveSessions(userId));
  return projects.map((project) => ({
    ...project,
    activeSession: running.get(project.id) ?? null,
  }));
}
