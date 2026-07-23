import { NextResponse } from "next/server";

import {
  createPattern,
  createPatternSchema,
  listPatterns,
  patternFiltersSchema,
} from "@/features/patterns";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";
import { readQuery } from "@/app/api/patterns/params";

export const GET = withSession(
  "GET /api/patterns",
  async (userId: string, request: Request) => {
    const parsed = patternFiltersSchema.safeParse(readQuery(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const patterns = await listPatterns(userId, parsed.data);
    return NextResponse.json({ patterns }, { status: 200 });
  },
);

export const POST = withSession(
  "POST /api/patterns",
  async (userId: string, request: Request) => {
    const parsed = createPatternSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const pattern = await createPattern(userId, parsed.data);
    return NextResponse.json({ pattern }, { status: 201 });
  },
);
