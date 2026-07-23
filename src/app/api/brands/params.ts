import { NextResponse } from "next/server";

import {
  BrandNotFoundError,
  BrandReferencedError,
  YarnTypeNotFoundError,
  YarnTypeReferencedError,
  brandIdSchema,
  yarnTypeIdSchema,
} from "@/features/yarns";
import { errorResponse, type ErrorBody } from "@/shared/lib/http";

export type BrandRouteContext = { params: Promise<{ id: string }> };
export type BrandTypeRouteContext = {
  params: Promise<{ id: string; typeId: string }>;
};

export const brandNotFound = (): NextResponse<ErrorBody> =>
  errorResponse("La marca no existe.", 404);

export const yarnTypeNotFound = (): NextResponse<ErrorBody> =>
  errorResponse("El tipo no existe.", 404);

/** Un id con formato inválido no puede existir: se responde 404, no 400. */
export async function readBrandId(
  context: BrandRouteContext,
): Promise<string | null> {
  const { id } = await context.params;
  const parsed = brandIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

/** Parsea `:id` (marca) y `:typeId` (tipo); id malformado → null (→ 404). */
export async function readBrandTypeIds(
  context: BrandTypeRouteContext,
): Promise<{ brandId: string; typeId: string } | null> {
  const { id, typeId } = await context.params;
  const brand = brandIdSchema.safeParse(id);
  const type = yarnTypeIdSchema.safeParse(typeId);
  if (!brand.success || !type.success) {
    return null;
  }
  return { brandId: brand.data, typeId: type.data };
}

/**
 * Traduce los errores de dominio de los catálogos: 404 para marca/tipo
 * ajeno/inexistente y 409 (bloqueo, sin `?force`) cuando tienen hijos, con los
 * contadores en el cuerpo. El resto sube a `withSession`.
 */
export function brandErrorResponse(error: unknown): NextResponse {
  if (error instanceof BrandNotFoundError) {
    return brandNotFound();
  }
  if (error instanceof YarnTypeNotFoundError) {
    return yarnTypeNotFound();
  }
  if (error instanceof BrandReferencedError) {
    return NextResponse.json(
      { error: error.message, types: error.types, yarns: error.yarns },
      { status: 409 },
    );
  }
  if (error instanceof YarnTypeReferencedError) {
    return NextResponse.json(
      { error: error.message, yarns: error.yarns },
      { status: 409 },
    );
  }
  throw error;
}
