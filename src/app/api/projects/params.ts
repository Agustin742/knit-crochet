import type { NextResponse } from "next/server";

import {
  ProjectNotFoundError,
  projectIdSchema,
  YarnNotFoundError,
  yarnIdSchema,
} from "@/features/projects";
import { errorResponse, type ErrorBody } from "@/shared/lib/http";

export type ProjectRouteContext = { params: Promise<{ id: string }> };
export type ProjectYarnRouteContext = {
  params: Promise<{ id: string; yarnId: string }>;
};

/** Un id con formato inválido no puede existir: se responde 404, no 400. */
export async function readProjectId(
  context: ProjectRouteContext | ProjectYarnRouteContext,
): Promise<string | null> {
  const { id } = await context.params;
  const parsed = projectIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function readYarnId(
  context: ProjectYarnRouteContext,
): Promise<string | null> {
  const { yarnId } = await context.params;
  const parsed = yarnIdSchema.safeParse(yarnId);
  return parsed.success ? parsed.data : null;
}

export const projectNotFound = (): NextResponse<ErrorBody> =>
  errorResponse("El proyecto no existe.", 404);

export const yarnNotFound = (): NextResponse<ErrorBody> =>
  errorResponse("La lana no existe.", 404);

/** Traduce los errores de dominio del feature a 404; el resto sube a `withSession`. */
export function projectErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (
    error instanceof ProjectNotFoundError ||
    error instanceof YarnNotFoundError
  ) {
    return errorResponse(error.message, 404);
  }
  throw error;
}
