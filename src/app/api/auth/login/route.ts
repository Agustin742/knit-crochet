import { NextResponse } from "next/server";

import { InvalidCredentialsError, loginSchema, loginUser } from "@/features/auth";
import {
  errorResponse,
  readJsonBody,
  unexpectedErrorResponse,
  validationErrorResponse,
} from "@/shared/lib/http";
import { setSessionCookie } from "@/shared/lib/auth/session";

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  try {
    const { user, token } = await loginUser(parsed.data);
    return setSessionCookie(NextResponse.json({ user }, { status: 200 }), token);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return errorResponse(error.message, 401);
    }
    return unexpectedErrorResponse("POST /api/auth/login", error);
  }
}
