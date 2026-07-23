import { NextResponse } from "next/server";

import { craftSessionErrorResponse } from "@/app/api/projects/[id]/sessions/errors";
import {
  projectNotFound,
  type ProjectRouteContext,
  readProjectId,
} from "@/app/api/projects/params";
import { listSessions } from "@/features/time-tracking";
import { withSession } from "@/shared/lib/http";

export const GET = withSession(
  "GET /api/projects/:id/sessions",
  async (userId: string, _request: Request, context: ProjectRouteContext) => {
    const id = await readProjectId(context);
    if (!id) {
      return projectNotFound();
    }

    try {
      const sessions = await listSessions(userId, id);
      return NextResponse.json({ sessions }, { status: 200 });
    } catch (error) {
      return craftSessionErrorResponse(error);
    }
  },
);
