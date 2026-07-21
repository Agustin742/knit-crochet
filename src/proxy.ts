import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { JWT_COOKIE_NAME, verifySessionToken } from "@/shared/lib/auth/jwt";

// Este archivo corre en TODA request que pase el matcher: su grafo de imports
// debe quedarse en la verificación de firma del JWT. Nunca importar Drizzle,
// `@/shared/db` ni el hashing de passwords desde aquí.

/** Endpoints de auth accesibles sin sesión. */
const PUBLIC_API_ROUTES = ["/api/auth/register", "/api/auth/login"];

/** Páginas accesibles sin sesión (igualdad exacta: todo lo demás es privado). */
const PUBLIC_PAGES = ["/", "/login", "/register"];

export const LOGIN_PATH = "/login";

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    return PUBLIC_API_ROUTES.includes(pathname);
  }
  return PUBLIC_PAGES.includes(pathname);
}

function unauthorized(request: NextRequest, pathname: string): NextResponse {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const loginUrl = new URL(LOGIN_PATH, request.nextUrl);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) {
    return unauthorized(request, pathname);
  }

  try {
    await verifySessionToken(token);
  } catch {
    return unauthorized(request, pathname);
  }

  return NextResponse.next();
}

export const config = {
  // El matcher se analiza estáticamente en build: debe ser un literal inline.
  // Una constante importada se ignora EN SILENCIO y deja el proxy sin cobertura.
  // Aquí solo se excluyen assets; la separación público/privado vive arriba,
  // en TypeScript, y es fail-closed.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
