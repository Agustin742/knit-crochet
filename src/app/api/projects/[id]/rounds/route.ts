import { NextResponse } from "next/server";

import {
  projectErrorResponse,
  projectNotFound,
  type ProjectRouteContext,
  readProjectId,
} from "@/app/api/projects/params";
import { addRounds, roundsDeltaSchema } from "@/features/projects";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

export const POST = withSession(
  "POST /api/projects/:id/rounds",
  async (userId: string, request: Request, context: ProjectRouteContext) => {
    const id = await readProjectId(context);
    if (!id) {
      return projectNotFound();
    }

    const parsed = roundsDeltaSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const project = await addRounds(userId, id, parsed.data.delta);
      return NextResponse.json({ project }, { status: 200 });
    } catch (error) {
      return projectErrorResponse(error);
    }
  },
);
