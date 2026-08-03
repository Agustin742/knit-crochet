import type { ZodError } from "zod";

/**
 * Traduce los issues de zod a un mapa `campo → mensaje` (el primero de cada
 * campo, que es lo que pinta `Field`).
 *
 * Se valida en el cliente con los MISMOS schemas del servidor porque la
 * respuesta 400 de los endpoints devuelve sólo el mensaje del primer issue y
 * **sin `path`** (`shared/lib/http.ts`): con ese cuerpo es imposible saber qué
 * campo falló. Validando antes de enviar, el error por campo sale del `path` que
 * zod sí da, y el cuerpo del servidor queda reservado para el error de
 * formulario.
 */
export function toFieldErrors<Key extends string>(
  error: ZodError,
): Partial<Record<Key, string>> {
  const fieldErrors: Partial<Record<Key, string>> = {};

  for (const issue of error.issues) {
    const [key] = issue.path;
    if (typeof key === "string" && fieldErrors[key as Key] === undefined) {
      fieldErrors[key as Key] = issue.message;
    }
  }

  return fieldErrors;
}
