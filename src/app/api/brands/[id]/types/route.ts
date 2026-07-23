import { NextResponse } from "next/server";

import {
  BrandNotFoundError,
  brandIdSchema,
  createYarnType,
  createYarnTypeSchema,
  listYarnTypes,
} from "@/features/yarns";
import {
  errorResponse,
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

type BrandRouteContext = { params: Promise<{ id: string }> };

const brandNotFound = (): NextResponse => errorResponse("La marca no existe.", 404);

/** Un id con formato inválido no puede existir: se responde 404, no 400. */
async function readBrandId(context: BrandRouteContext): Promise<string | null> {
  const { id } = await context.params;
  const parsed = brandIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export const GET = withSession(
  "GET /api/brands/:id/types",
  async (userId: string, _request: Request, context: BrandRouteContext) => {
    const brandId = await readBrandId(context);
    if (!brandId) {
      return brandNotFound();
    }

    try {
      const types = await listYarnTypes(userId, brandId);
      return NextResponse.json({ types }, { status: 200 });
    } catch (error) {
      if (error instanceof BrandNotFoundError) {
        return brandNotFound();
      }
      throw error;
    }
  },
);

export const POST = withSession(
  "POST /api/brands/:id/types",
  async (userId: string, request: Request, context: BrandRouteContext) => {
    const brandId = await readBrandId(context);
    if (!brandId) {
      return brandNotFound();
    }

    const parsed = createYarnTypeSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const type = await createYarnType(userId, brandId, parsed.data);
      return NextResponse.json({ type }, { status: 201 });
    } catch (error) {
      if (error instanceof BrandNotFoundError) {
        return brandNotFound();
      }
      throw error;
    }
  },
);
