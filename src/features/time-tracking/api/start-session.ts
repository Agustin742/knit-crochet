import { ProjectNotFoundError } from "@/features/projects";
import {
  createCraftSessionStore,
  type CraftSessionStore,
} from "@/features/time-tracking/api/store";
import type { StartSessionResult } from "@/features/time-tracking/types";

/**
 * Arranca el cronómetro creando una `CraftSession` con `end = null` (PRD §4.7).
 *
 * Doble start: si ya hay una sesión abierta se **reutiliza** y se devuelve con
 * `started: false` (el BFF responde 200 en vez de 201). El timer es un toggle de
 * UI: un doble click o un remontaje tras recargar no debe fragmentar el tiempo
 * en dos sesiones ni bloquear al usuario con un error. Así se mantiene la
 * invariante "como mucho una sesión abierta por proyecto".
 */
export async function startSession(
  userId: string,
  projectId: string,
  store: CraftSessionStore = createCraftSessionStore(),
  now: Date = new Date(),
): Promise<StartSessionResult> {
  const project = await store.findProject(userId, projectId);
  if (!project) {
    throw new ProjectNotFoundError();
  }

  const active = await store.findActive(userId, projectId);
  if (active) {
    return { session: active, started: false };
  }

  const session = await store.create({
    userId,
    projectId,
    start: now,
    end: null,
    duration: 0,
  });
  return { session, started: true };
}
