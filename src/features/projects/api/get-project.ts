import { ProjectNotFoundError } from "@/features/projects/api/errors";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";
import type { ProjectRecord } from "@/features/projects/types";

/**
 * Devuelve el proyecto del usuario o lanza `ProjectNotFoundError`. Un proyecto
 * de otro usuario es indistinguible de uno inexistente.
 */
export async function getProject(
  userId: string,
  id: string,
  store: ProjectStore = createProjectStore(),
): Promise<ProjectRecord> {
  const project = await store.findById(userId, id);
  if (!project) {
    throw new ProjectNotFoundError();
  }
  return project;
}
