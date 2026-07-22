import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import {
  InvalidSessionError,
  requireSessionUserId,
} from "@/shared/lib/auth/session";

export type ErrorBody = { error: string };

export function errorResponse(
  message: string,
  status: number,
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message }, { status });
}

export function validationErrorResponse(
  error: ZodError,
): NextResponse<ErrorBody> {
  const [issue] = error.issues;
  return errorResponse(issue?.message ?? "Datos inválidos.", 400);
}

/** Devuelve `undefined` si el body no es JSON válido (lo valida luego zod). */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return undefined;
  }
}

export function unexpectedErrorResponse(
  context: string,
  error: unknown,
): NextResponse<ErrorBody> {
  console.error(`[${context}]`, error);
  return errorResponse("Error interno del servidor.", 500);
}

/** Traduce un fallo de sesión a 401 JSON; el resto de errores a 500. */
export function sessionErrorResponse(
  route: string,
  error: unknown,
): NextResponse<ErrorBody> {
  if (error instanceof InvalidSessionError) {
    return errorResponse("No autenticado.", 401);
  }
  return unexpectedErrorResponse(route, error);
}

/**
 * Envuelve un Route Handler privado: resuelve el `userId` del JWT y se lo pasa
 * como primer argumento. Mapea la sesión inválida a 401 y cualquier error no
 * controlado a 500, así el handler solo trata sus errores de dominio.
 *
 * ```ts
 * export const GET = withSession(
 *   "GET /api/projects/:id",
 *   async (userId, request: Request, context: { params: Promise<{ id: string }> }) => { ... },
 * );
 * ```
 */
export function withSession<TArgs extends unknown[]>(
  route: string,
  handler: (userId: string, ...args: TArgs) => Promise<NextResponse>,
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args: TArgs): Promise<NextResponse> => {
    let userId: string;
    try {
      userId = await requireSessionUserId();
    } catch (error) {
      return sessionErrorResponse(route, error);
    }

    try {
      return await handler(userId, ...args);
    } catch (error) {
      return unexpectedErrorResponse(route, error);
    }
  };
}
