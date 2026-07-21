import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/shared/lib/auth/session";

export async function POST(): Promise<NextResponse> {
  return clearSessionCookie(NextResponse.json({ ok: true }, { status: 200 }));
}
