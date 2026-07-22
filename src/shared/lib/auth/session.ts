import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import {
  InvalidSessionError,
  JWT_COOKIE_NAME,
  JWT_MAX_AGE_SECONDS,
  verifySessionToken,
} from "@/shared/lib/auth/jwt";

// Se reexporta para que un Route Handler privado necesite un solo import de
// sesión (el error y el helper que lo lanza viven en el mismo módulo).
export { InvalidSessionError };

async function readSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(JWT_COOKIE_NAME)?.value;
}

/**
 * Devuelve el `userId` de la sesión actual, o `null` si no hay cookie válida.
 * Úsalo cuando la ruta tenga un comportamiento distinto para invitados.
 */
export async function getSessionUserId(): Promise<string | null> {
  const token = await readSessionToken();
  if (!token) {
    return null;
  }

  try {
    const { userId } = await verifySessionToken(token);
    return userId;
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return null;
    }
    throw error;
  }
}

/**
 * Devuelve el `userId` de la sesión actual o lanza `InvalidSessionError`.
 * Es el helper por defecto de todo Route Handler privado: el scoping por
 * usuario se hace siempre con este valor, nunca con datos del request.
 */
export async function requireSessionUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new InvalidSessionError();
  }
  return userId;
}

export function setSessionCookie<T extends NextResponse>(
  response: T,
  token: string,
): T {
  response.cookies.set({
    name: JWT_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: JWT_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSessionCookie<T extends NextResponse>(response: T): T {
  response.cookies.set({
    name: JWT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
