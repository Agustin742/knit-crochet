import { ProjectNotFoundError } from "@/features/projects/api/errors";
import { calculateProgress } from "@/features/projects/api/progress";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";
import type { ProjectRecord } from "@/features/projects/types";

/**
 * Aplica un delta (positivo o negativo) al contador de vueltas. `rounds` nunca
 * baja de 0 y `progress` se recalcula con la única fuente del cálculo.
 */
export async function addRounds(
  userId: string,
  id: string,
  delta: number,
  store: ProjectStore = createProjectStore(),
): Promise<ProjectRecord> {
  const existing = await store.findById(userId, id);
  if (!existing) {
    throw new ProjectNotFoundError();
  }

  const rounds = Math.max(0, existing.rounds + delta);
  const updated = await store.update(userId, id, {
    rounds,
    progress: calculateProgress(rounds, existing.targetRounds),
    updatedAt: new Date(),
  });
  if (!updated) {
    throw new ProjectNotFoundError();
  }
  return updated;
}
