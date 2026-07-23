import { NextResponse } from "next/server";

import { createBrand, createBrandSchema, listBrands } from "@/features/yarns";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

export const GET = withSession(
  "GET /api/brands",
  async (userId: string, _request: Request) => {
    const brands = await listBrands(userId);
    return NextResponse.json({ brands }, { status: 200 });
  },
);

export const POST = withSession(
  "POST /api/brands",
  async (userId: string, request: Request) => {
    const parsed = createBrandSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const brand = await createBrand(userId, parsed.data);
    return NextResponse.json({ brand }, { status: 201 });
  },
);
