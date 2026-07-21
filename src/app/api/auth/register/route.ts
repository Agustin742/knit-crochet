import { NextResponse } from "next/server";

import {
  EmailAlreadyRegisteredError,
  registerSchema,
  registerUser,
} from "@/features/auth";
import {
  errorResponse,
  readJsonBody,
  unexpectedErrorResponse,
  validationErrorResponse,
} from "@/shared/lib/http";
import { setSessionCookie } from "@/shared/lib/auth/session";

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = registerSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  try {
    const { user, token } = await registerUser(parsed.data);
    return setSessionCookie(NextResponse.json({ user }, { status: 201 }), token);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return errorResponse(error.message, 409);
    }
    return unexpectedErrorResponse("POST /api/auth/register", error);
  }
}
