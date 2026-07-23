import { NextResponse } from "next/server";

import { PatternNotFoundError, patternIdSchema } from "@/features/patterns";
import { errorResponse, type ErrorBody } from "@/shared/lib/http";

export type PatternRouteContext = { params: Promise<{ id: string }> };

/** Un id con formato inválido no puede existir: se responde 404, no 400. */
export async function readPatternId(
  context: PatternRouteContext,
): Promise<string | null> {
  const { id } = await context.params;
  const parsed = patternIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export const patternNotFound = (): NextResponse<ErrorBody> =>
  errorResponse("El patrón no existe.", 404);

/** Un parámetro vacío (`?type=`) significa "sin filtro", no un valor inválido. */
export function readQuery(request: Request): Record<string, string> {
  const entries = [...new URL(request.url).searchParams].filter(
    ([, value]) => value !== "",
  );
  return Object.fromEntries(entries);
}

/** Traduce los errores de dominio del feature a 404; el resto sube a `withSession`. */
export function patternErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof PatternNotFoundError) {
    return errorResponse(error.message, 404);
  }
  throw error;
}
