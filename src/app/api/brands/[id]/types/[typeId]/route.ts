import { NextResponse } from "next/server";

import { deleteYarnType } from "@/features/yarns";
import { withSession } from "@/shared/lib/http";
import {
  brandErrorResponse,
  type BrandTypeRouteContext,
  readBrandTypeIds,
  yarnTypeNotFound,
} from "@/app/api/brands/params";

export const DELETE = withSession(
  "DELETE /api/brands/:id/types/:typeId",
  async (userId: string, _request: Request, context: BrandTypeRouteContext) => {
    const ids = await readBrandTypeIds(context);
    if (!ids) {
      return yarnTypeNotFound();
    }

    try {
      await deleteYarnType(userId, ids.brandId, ids.typeId);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return brandErrorResponse(error);
    }
  },
);
