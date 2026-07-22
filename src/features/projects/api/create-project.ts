import { calculateProgress } from "@/features/projects/api/progress";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";
import type {
  CreateProjectInput,
  ProjectRecord,
} from "@/features/projects/types";

export async function createProject(
  userId: string,
  input: CreateProjectInput,
  store: ProjectStore = createProjectStore(),
): Promise<ProjectRecord> {
  const rounds = input.rounds ?? 0;
  const targetRounds = input.targetRounds ?? 0;

  return store.create({
    ...input,
    userId,
    rounds,
    targetRounds,
    progress: calculateProgress(rounds, targetRounds),
  });
}
