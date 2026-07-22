import { NextResponse } from "next/server";

import {
  projectErrorResponse,
  projectNotFound,
  type ProjectRouteContext,
  readProjectId,
} from "@/app/api/projects/params";
import { linkProjectYarn, linkYarnSchema } from "@/features/projects";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

/** 201 si se creó el enlace, 200 si ya existía (idempotente, nunca 409). */
export const POST = withSession(
  "POST /api/projects/:id/yarns",
  async (userId: string, request: Request, context: ProjectRouteContext) => {
    const id = await readProjectId(context);
    if (!id) {
      return projectNotFound();
    }

    const parsed = linkYarnSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const { changed, yarnIds } = await linkProjectYarn(
        userId,
        id,
        parsed.data.yarnId,
      );
      return NextResponse.json({ yarnIds }, { status: changed ? 201 : 200 });
    } catch (error) {
      return projectErrorResponse(error);
    }
  },
);
