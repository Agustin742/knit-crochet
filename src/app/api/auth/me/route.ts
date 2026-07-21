import { NextResponse } from "next/server";

import { getCurrentUser, UserNotFoundError } from "@/features/auth";
import { InvalidSessionError } from "@/shared/lib/auth/jwt";
import { requireSessionUserId } from "@/shared/lib/auth/session";
import { errorResponse, unexpectedErrorResponse } from "@/shared/lib/http";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireSessionUserId();
    const user = await getCurrentUser(userId);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return errorResponse("No autenticado.", 401);
    }
    if (error instanceof UserNotFoundError) {
      return errorResponse(error.message, 404);
    }
    return unexpectedErrorResponse("GET /api/auth/me", error);
  }
}
