import { NextResponse } from "next/server";

import {
  projectErrorResponse,
  projectNotFound,
  type ProjectYarnRouteContext,
  readProjectId,
  readYarnId,
  yarnNotFound,
} from "@/app/api/projects/params";
import { unlinkProjectYarn } from "@/features/projects";
import { withSession } from "@/shared/lib/http";

/** 204 tanto si había enlace como si no: desenlazar es idempotente. */
export const DELETE = withSession(
  "DELETE /api/projects/:id/yarns/:yarnId",
  async (
    userId: string,
    _request: Request,
    context: ProjectYarnRouteContext,
  ) => {
    const id = await readProjectId(context);
    if (!id) {
      return projectNotFound();
    }
    const yarnId = await readYarnId(context);
    if (!yarnId) {
      return yarnNotFound();
    }

    try {
      await unlinkProjectYarn(userId, id, yarnId);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return projectErrorResponse(error);
    }
  },
);
