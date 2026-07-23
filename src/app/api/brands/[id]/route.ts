import { NextResponse } from "next/server";

import { deleteBrand } from "@/features/yarns";
import { withSession } from "@/shared/lib/http";
import {
  brandErrorResponse,
  brandNotFound,
  type BrandRouteContext,
  readBrandId,
} from "@/app/api/brands/params";

export const DELETE = withSession(
  "DELETE /api/brands/:id",
  async (userId: string, _request: Request, context: BrandRouteContext) => {
    const brandId = await readBrandId(context);
    if (!brandId) {
      return brandNotFound();
    }

    try {
      await deleteBrand(userId, brandId);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return brandErrorResponse(error);
    }
  },
);
