import { ProjectNotFoundError } from "@/features/projects";
import { NoActiveSessionError } from "@/features/time-tracking/api/errors";
import {
  createCraftSessionStore,
  type CraftSessionStore,
} from "@/features/time-tracking/api/store";
import type { StopSessionResult } from "@/features/time-tracking/types";

const MILLIS_PER_SECOND = 1000;

/**
 * Duración en segundos enteros. Se trunca hacia abajo y nunca es negativa: un
 * reloj que retrocede no puede restar tiempo al proyecto.
 */
export function calculateDuration(start: Date, end: Date): number {
  const seconds = Math.floor(
    (end.getTime() - start.getTime()) / MILLIS_PER_SECOND,
  );
  return Math.max(0, seconds);
}

/**
 * Detiene el cronómetro: setea `end`, calcula `duration` en el servidor y
 * refresca el cache `Project.time` (PRD §4.7).
 *
 * `Project.time` se **recalcula** como Σ `duration` de las sesiones del
 * proyecto, no se incrementa con el delta: el cache queda derivado de su fuente
 * en la misma operación, así que se auto-sana en cada stop y no acumula deriva
 * si alguien edita el proyecto o se pierde/repite una escritura.
 *
 * Doble stop: si no hay sesión abierta lanza `NoActiveSessionError` → 409.
 */
export async function stopSession(
  userId: string,
  projectId: string,
  store: CraftSessionStore = createCraftSessionStore(),
  now: Date = new Date(),
): Promise<StopSessionResult> {
  const project = await store.findProject(userId, projectId);
  if (!project) {
    throw new ProjectNotFoundError();
  }

  const active = await store.findActive(userId, projectId);
  if (!active) {
    throw new NoActiveSessionError();
  }

  const session = await store.close(userId, active.id, {
    end: now,
    duration: calculateDuration(active.start, now),
  });
  if (!session) {
    throw new NoActiveSessionError();
  }

  const time = await store.sumDuration(userId, projectId);
  await store.setProjectTime(userId, projectId, time);

  return { session, time };
}
