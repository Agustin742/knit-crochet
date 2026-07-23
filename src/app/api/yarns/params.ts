import { NextResponse } from "next/server";

import {
  BrandNotFoundError,
  DuplicateColorCodeError,
  YarnNotFoundError,
  YarnReferencedError,
  YarnTypeNotFoundError,
  yarnIdSchema,
} from "@/features/yarns";
import { errorResponse, type ErrorBody } from "@/shared/lib/http";

export type YarnRouteContext = { params: Promise<{ id: string }> };

/** Un id con formato inválido no puede existir: se responde 404, no 400. */
export async function readYarnId(
  context: YarnRouteContext,
): Promise<string | null> {
  const { id } = await context.params;
  const parsed = yarnIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export const yarnNotFound = (): NextResponse<ErrorBody> =>
  errorResponse("La lana no existe.", 404);

/** Un parámetro vacío (`?force=`) significa "sin valor", no un valor inválido. */
export function readQuery(request: Request): Record<string, string> {
  const entries = [...new URL(request.url).searchParams].filter(
    ([, value]) => value !== "",
  );
  return Object.fromEntries(entries);
}

/**
 * Traduce los errores de dominio del feature yarns: 404 para recursos
 * ajenos/inexistentes, 409 para el `colorCode` duplicado y 409 con
 * `referencedBy` para el borrado bloqueado. El resto sube a `withSession`.
 */
export function yarnErrorResponse(error: unknown): NextResponse {
  if (
    error instanceof BrandNotFoundError ||
    error instanceof YarnTypeNotFoundError ||
    error instanceof YarnNotFoundError
  ) {
    return errorResponse(error.message, 404);
  }
  if (error instanceof DuplicateColorCodeError) {
    return errorResponse(error.message, 409);
  }
  if (error instanceof YarnReferencedError) {
    return NextResponse.json(
      { error: error.message, referencedBy: error.referencedBy },
      { status: 409 },
    );
  }
  throw error;
}
