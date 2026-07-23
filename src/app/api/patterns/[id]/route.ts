import { NextResponse } from "next/server";

import {
  deletePattern,
  getPattern,
  updatePattern,
  updatePatternSchema,
} from "@/features/patterns";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";
import {
  patternErrorResponse,
  patternNotFound,
  type PatternRouteContext,
  readPatternId,
} from "@/app/api/patterns/params";

export const GET = withSession(
  "GET /api/patterns/:id",
  async (userId: string, _request: Request, context: PatternRouteContext) => {
    const id = await readPatternId(context);
    if (!id) {
      return patternNotFound();
    }

    try {
      const pattern = await getPattern(userId, id);
      return NextResponse.json({ pattern }, { status: 200 });
    } catch (error) {
      return patternErrorResponse(error);
    }
  },
);

export const PATCH = withSession(
  "PATCH /api/patterns/:id",
  async (userId: string, request: Request, context: PatternRouteContext) => {
    const id = await readPatternId(context);
    if (!id) {
      return patternNotFound();
    }

    const parsed = updatePatternSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const pattern = await updatePattern(userId, id, parsed.data);
      return NextResponse.json({ pattern }, { status: 200 });
    } catch (error) {
      return patternErrorResponse(error);
    }
  },
);

export const DELETE = withSession(
  "DELETE /api/patterns/:id",
  async (userId: string, _request: Request, context: PatternRouteContext) => {
    const id = await readPatternId(context);
    if (!id) {
      return patternNotFound();
    }

    try {
      await deletePattern(userId, id);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return patternErrorResponse(error);
    }
  },
);
