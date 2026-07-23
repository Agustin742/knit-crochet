import { NextResponse } from "next/server";

import { getDashboardMetrics, metricsFiltersSchema } from "@/features/dashboard";
import {
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

/** Un parámetro vacío (`?year=`) significa "sin filtro", no un valor inválido. */
function readQuery(request: Request): Record<string, string> {
  const entries = [...new URL(request.url).searchParams].filter(
    ([, value]) => value !== "",
  );
  return Object.fromEntries(entries);
}

export const GET = withSession(
  "GET /api/dashboard/metrics",
  async (userId: string, request: Request) => {
    const parsed = metricsFiltersSchema.safeParse(readQuery(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const metrics = await getDashboardMetrics(userId, parsed.data);
    return NextResponse.json(metrics, { status: 200 });
  },
);
