import { NextResponse } from "next/server";

import {
  createYarn,
  createYarnSchema,
  listYarns,
  yarnFiltersSchema,
} from "@/features/yarns";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";
import { readQuery, yarnErrorResponse } from "@/app/api/yarns/params";

export const GET = withSession(
  "GET /api/yarns",
  async (userId: string, request: Request) => {
    const parsed = yarnFiltersSchema.safeParse(readQuery(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const yarns = await listYarns(userId, parsed.data);
    return NextResponse.json({ yarns }, { status: 200 });
  },
);

export const POST = withSession(
  "POST /api/yarns",
  async (userId: string, request: Request) => {
    const parsed = createYarnSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const yarn = await createYarn(userId, parsed.data);
      return NextResponse.json({ yarn }, { status: 201 });
    } catch (error) {
      return yarnErrorResponse(error);
    }
  },
);
