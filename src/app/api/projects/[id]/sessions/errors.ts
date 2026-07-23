import type { NextResponse } from "next/server";

import { ProjectNotFoundError } from "@/features/projects";
import { NoActiveSessionError } from "@/features/time-tracking";
import { errorResponse, type ErrorBody } from "@/shared/lib/http";

/**
 * Traduce los errores de dominio del cronómetro: proyecto ajeno/inexistente a
 * 404 y "no hay cronómetro corriendo" a 409. El resto sube a `withSession`.
 */
export function craftSessionErrorResponse(
  error: unknown,
): NextResponse<ErrorBody> {
  if (error instanceof ProjectNotFoundError) {
    return errorResponse(error.message, 404);
  }
  if (error instanceof NoActiveSessionError) {
    return errorResponse(error.message, 409);
  }
  throw error;
}
