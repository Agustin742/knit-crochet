import { ProjectNotFoundError } from "@/features/projects";
import {
  createCraftSessionStore,
  type CraftSessionStore,
} from "@/features/time-tracking/api/store";
import type { CraftSessionRecord } from "@/features/time-tracking/types";

/**
 * Historial de sesiones del proyecto, de la más reciente a la más antigua. Un
 * proyecto ajeno es indistinguible de uno inexistente (404, nunca 403).
 */
export async function listSessions(
  userId: string,
  projectId: string,
  store: CraftSessionStore = createCraftSessionStore(),
): Promise<CraftSessionRecord[]> {
  const project = await store.findProject(userId, projectId);
  if (!project) {
    throw new ProjectNotFoundError();
  }

  return store.listByProject(userId, projectId);
}
