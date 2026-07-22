import { ProjectNotFoundError } from "@/features/projects/api/errors";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";
import type { ProjectRecord } from "@/features/projects/types";

/**
 * Reemplaza el conjunto de pasos completados del proyecto (PRD §4.2: el avance
 * vive en el `Project`, no en el `Pattern`). La lista se normaliza como un
 * conjunto ordenado: sin duplicados y ascendente.
 */
export async function setCompletedSteps(
  userId: string,
  id: string,
  completedSteps: number[],
  store: ProjectStore = createProjectStore(),
): Promise<ProjectRecord> {
  const existing = await store.findById(userId, id);
  if (!existing) {
    throw new ProjectNotFoundError();
  }

  const normalized = [...new Set(completedSteps)].sort((a, b) => a - b);
  const updated = await store.update(userId, id, {
    completedSteps: normalized,
    updatedAt: new Date(),
  });
  if (!updated) {
    throw new ProjectNotFoundError();
  }
  return updated;
}
