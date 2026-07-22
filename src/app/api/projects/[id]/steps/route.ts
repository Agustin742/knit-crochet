import { NextResponse } from "next/server";

import {
  projectErrorResponse,
  projectNotFound,
  type ProjectRouteContext,
  readProjectId,
} from "@/app/api/projects/params";
import { completedStepsSchema, setCompletedSteps } from "@/features/projects";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

export const PATCH = withSession(
  "PATCH /api/projects/:id/steps",
  async (userId: string, request: Request, context: ProjectRouteContext) => {
    const id = await readProjectId(context);
    if (!id) {
      return projectNotFound();
    }

    const parsed = completedStepsSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const project = await setCompletedSteps(
        userId,
        id,
        parsed.data.completedSteps,
      );
      return NextResponse.json({ project }, { status: 200 });
    } catch (error) {
      return projectErrorResponse(error);
    }
  },
);
