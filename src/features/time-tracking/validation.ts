import { z } from "zod";

export const sessionProjectIdSchema = z.uuid();

/**
 * `start` y `stop` no aceptan entrada: `start`, `end` y `duration` son valores
 * derivados que calcula el servidor (mismo principio que `progress` en #6). El
 * objeto estricto rechaza con 400 cualquier intento de mandarlos desde el
 * cliente, y `nullish` permite invocarlos sin body.
 */
export const sessionCommandSchema = z
  .strictObject({}, "Esta operación no admite datos: el servidor los calcula.")
  .nullish()
  .transform(() => ({}));

export type SessionCommandPayload = z.infer<typeof sessionCommandSchema>;
