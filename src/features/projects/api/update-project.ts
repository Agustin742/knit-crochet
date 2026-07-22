import { ProjectNotFoundError } from "@/features/projects/api/errors";
import { calculateProgress } from "@/features/projects/api/progress";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";
import type {
  ProjectPatch,
  ProjectRecord,
  UpdateProjectInput,
} from "@/features/projects/types";

export async function updateProject(
  userId: string,
  id: string,
  input: UpdateProjectInput,
  store: ProjectStore = createProjectStore(),
): Promise<ProjectRecord> {
  const existing = await store.findById(userId, id);
  if (!existing) {
    throw new ProjectNotFoundError();
  }

  const patch: ProjectPatch = { ...input, updatedAt: new Date() };
  if (input.rounds !== undefined || input.targetRounds !== undefined) {
    patch.progress = calculateProgress(
      input.rounds ?? existing.rounds,
      input.targetRounds ?? existing.targetRounds,
    );
  }

  const updated = await store.update(userId, id, patch);
  if (!updated) {
    throw new ProjectNotFoundError();
  }
  return updated;
}
