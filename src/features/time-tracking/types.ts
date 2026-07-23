import type { craftSessions } from "@/features/time-tracking/schema";

export type CraftSessionRecord = typeof craftSessions.$inferSelect;
export type NewCraftSessionRecord = typeof craftSessions.$inferInsert;

/** Lo mínimo que time-tracking necesita saber de un proyecto: que es del usuario. */
export type ProjectTimeRef = { id: string; time: number };

/** `started` es `false` cuando ya había un cronómetro corriendo y se reutiliza. */
export type StartSessionResult = {
  session: CraftSessionRecord;
  started: boolean;
};

/** `time` es la suma cacheada de `Project.time` recalculada tras cerrar. */
export type StopSessionResult = {
  session: CraftSessionRecord;
  time: number;
};
