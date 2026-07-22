import {
  ProjectNotFoundError,
  YarnNotFoundError,
} from "@/features/projects/api/errors";
import {
  createProjectStore,
  type ProjectStore,
} from "@/features/projects/api/store";

export type ProjectYarnsResult = {
  /** `false` si el enlace ya estaba (link) o no existía (unlink): operación idempotente. */
  changed: boolean;
  /** Estado del enlace N:N tras la operación. */
  yarnIds: string[];
};

/**
 * Ambos extremos del enlace deben ser del usuario de la sesión: un proyecto o
 * una lana ajenos se tratan como inexistentes (404).
 */
async function assertOwnedEnds(
  userId: string,
  projectId: string,
  yarnId: string,
  store: ProjectStore,
): Promise<void> {
  const project = await store.findById(userId, projectId);
  if (!project) {
    throw new ProjectNotFoundError();
  }
  const yarn = await store.findYarn(userId, yarnId);
  if (!yarn) {
    throw new YarnNotFoundError();
  }
}

/**
 * Enlaza una lana al proyecto. Es **solo referencia**: no lleva cantidad y no
 * descuenta stock de la lana (PRD §4.5/§4.6).
 */
export async function linkProjectYarn(
  userId: string,
  projectId: string,
  yarnId: string,
  store: ProjectStore = createProjectStore(),
): Promise<ProjectYarnsResult> {
  await assertOwnedEnds(userId, projectId, yarnId, store);

  const changed = await store.linkYarn(projectId, yarnId);
  return { changed, yarnIds: await store.listYarnIds(projectId) };
}

/** Quita el enlace. Tampoco toca el stock de la lana. */
export async function unlinkProjectYarn(
  userId: string,
  projectId: string,
  yarnId: string,
  store: ProjectStore = createProjectStore(),
): Promise<ProjectYarnsResult> {
  await assertOwnedEnds(userId, projectId, yarnId, store);

  const changed = await store.unlinkYarn(projectId, yarnId);
  return { changed, yarnIds: await store.listYarnIds(projectId) };
}
