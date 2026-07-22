import { NextResponse } from "next/server";

import { getCurrentUser, UserNotFoundError } from "@/features/auth";
import { errorResponse, withSession } from "@/shared/lib/http";

export const GET = withSession("GET /api/auth/me", async (userId: string) => {
  try {
    const user = await getCurrentUser(userId);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return errorResponse(error.message, 404);
    }
    throw error;
  }
});
