import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";
import type {
  ProjectFilters,
  ProjectRecord,
} from "@/features/projects/types";

export async function listProjects(
  userId: string,
  filters: ProjectFilters = {},
  store: ProjectStore = createProjectStore(),
): Promise<ProjectRecord[]> {
  return store.list(userId, filters);
}
