import { NextResponse } from "next/server";
import type { ZodError } from "zod";

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
