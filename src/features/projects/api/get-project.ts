import { ProjectNotFoundError } from "@/features/projects/api/errors";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";
import type { ProjectDetail } from "@/features/projects/types";

/**
 * Devuelve el proyecto del usuario con sus lanas enlazadas, o lanza
 * `ProjectNotFoundError`. Un proyecto de otro usuario es indistinguible de uno
 * inexistente. `project` es la fila tal cual (PRD §9.1): las lanas cuelgan de
 * una clave hermana, no de dentro, y sin enlaces son una lista vacía.
 */
export async function getProject(
  userId: string,
  id: string,
  store: ProjectStore = createProjectStore(),
): Promise<ProjectDetail> {
  const project = await store.findById(userId, id);
  if (!project) {
    throw new ProjectNotFoundError();
  }
  return { project, yarns: await store.listLinkedYarns(userId, id) };
}
