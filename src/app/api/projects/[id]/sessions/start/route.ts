import { NextResponse } from "next/server";

import { craftSessionErrorResponse } from "@/app/api/projects/[id]/sessions/errors";
import {
  projectNotFound,
  type ProjectRouteContext,
  readProjectId,
} from "@/app/api/projects/params";
import { sessionCommandSchema, startSession } from "@/features/time-tracking";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

export const POST = withSession(
  "POST /api/projects/:id/sessions/start",
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
      const { session, started } = await startSession(userId, id);
      return NextResponse.json({ session }, { status: started ? 201 : 200 });
    } catch (error) {
      return craftSessionErrorResponse(error);
    }
  },
);
