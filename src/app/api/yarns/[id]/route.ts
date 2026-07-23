import { NextResponse } from "next/server";

import {
  deleteYarn,
  forceFlagSchema,
  getYarn,
  updateYarn,
  updateYarnSchema,
} from "@/features/yarns";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";
import {
  readQuery,
  readYarnId,
  type YarnRouteContext,
  yarnErrorResponse,
  yarnNotFound,
} from "@/app/api/yarns/params";

export const GET = withSession(
  "GET /api/yarns/:id",
  async (userId: string, _request: Request, context: YarnRouteContext) => {
    const id = await readYarnId(context);
    if (!id) {
      return yarnNotFound();
    }

    try {
      const yarn = await getYarn(userId, id);
      return NextResponse.json({ yarn }, { status: 200 });
    } catch (error) {
      return yarnErrorResponse(error);
    }
  },
);

export const PATCH = withSession(
  "PATCH /api/yarns/:id",
  async (userId: string, request: Request, context: YarnRouteContext) => {
    const id = await readYarnId(context);
    if (!id) {
      return yarnNotFound();
    }

    const parsed = updateYarnSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const yarn = await updateYarn(userId, id, parsed.data);
      return NextResponse.json({ yarn }, { status: 200 });
    } catch (error) {
      return yarnErrorResponse(error);
    }
  },
);

export const DELETE = withSession(
  "DELETE /api/yarns/:id",
  async (userId: string, request: Request, context: YarnRouteContext) => {
    const id = await readYarnId(context);
    if (!id) {
      return yarnNotFound();
    }

    const parsed = forceFlagSchema.safeParse(readQuery(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      await deleteYarn(userId, id, parsed.data.force ?? false);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return yarnErrorResponse(error);
    }
  },
);
