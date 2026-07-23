import { ProjectNotFoundError } from "@/features/projects/api/errors";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";

/**
 * Las filas poseídas por el proyecto (`project_yarns` y `craft_sessions`) las
 * borra Postgres: ambas FKs son `ON DELETE cascade` (regla S2 de
 * `architecture.md`). El servicio solo comprueba la propiedad antes de borrar.
 * Ni la lana ni su stock se tocan: el enlace es referencia (PRD §4.5, §4.6).
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

  const deleted = await store.remove(userId, id);
  if (!deleted) {
    throw new ProjectNotFoundError();
  }
}
