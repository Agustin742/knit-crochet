import { ProjectNotFoundError } from "@/features/projects/api/errors";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";

/**
 * La FK `project_yarns.project_id` es `ON DELETE no action`: hay que vaciar los
 * enlaces N:N antes de borrar la fila o Postgres rechaza el DELETE. El enlace es
 * solo referencia (PRD §4.6), así que se borra sin tocar la lana ni su stock.
 */
export async function deleteProject(
  userId: string,
  id: string,
  store: ProjectStore = createProjectStore(),
): Promise<void> {
  const existing = await store.findById(userId, id);
  if (!existing) {
    throw new ProjectNotFoundError();
  }

  await store.removeYarnLinks(id);

  const deleted = await store.remove(userId, id);
  if (!deleted) {
    throw new ProjectNotFoundError();
  }
}
