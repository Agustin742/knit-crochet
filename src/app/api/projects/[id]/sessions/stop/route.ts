import { NextResponse } from "next/server";

import { craftSessionErrorResponse } from "@/app/api/projects/[id]/sessions/errors";
import {
  projectNotFound,
  type ProjectRouteContext,
  readProjectId,
} from "@/app/api/projects/params";
import { sessionCommandSchema, stopSession } from "@/features/time-tracking";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

export const PATCH = withSession(
  "PATCH /api/projects/:id/sessions/stop",
  async (userId: string, request: Request, context: ProjectRouteContext) => {
    const id = await readProjectId(context);
    if (!id) {
      return projectNotFound();
    }

    const parsed = sessionCommandSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const { session, time } = await stopSession(userId, id);
      return NextResponse.json({ session, time }, { status: 200 });
    } catch (error) {
      return craftSessionErrorResponse(error);
    }
  },
);
