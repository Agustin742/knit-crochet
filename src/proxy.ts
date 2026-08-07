import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { JWT_COOKIE_NAME, verifySessionToken } from "@/shared/lib/auth/jwt";

// Este archivo corre en TODA request que pase el matcher: su grafo de imports
// debe quedarse en la verificación de firma del JWT. Nunca importar Drizzle,
// `@/shared/db` ni el hashing de passwords desde aquí.

/** Endpoints de auth accesibles sin sesión. */
const PUBLIC_API_ROUTES = ["/api/auth/register", "/api/auth/login"];

/**
 * Páginas accesibles sin sesión (igualdad exacta: todo lo demás es privado).
 *
 * `/` **no** está: es el Dashboard, y no hay landing pública (RFC-02 §7-bis,
 * enmienda E1.1; salda la deuda 1). Sin sesión rebota a `/login?next=/`.
 *
 * Hoy coincide elemento a elemento con `AUTH_PAGES`, y **es una coincidencia,
 * no una identidad**: no las unifiques. Ver el JSDoc de `AUTH_PAGES`.
 */
const PUBLIC_PAGES = ["/login", "/register"];

/**
 * Páginas que sólo tienen sentido SIN sesión (deuda 36). La allowlist de arriba
 * decide si la sesión es **obligatoria**; ésta, si **sobra**. Son las páginas y
 * no los endpoints: redirigir un `POST /api/auth/login` rompería el propio
 * acceso, y el reemplazo de sesión que hace el alta es una decisión del endpoint,
 * no del proxy.
 *
 * Que desde la enmienda E1.1 tenga **el mismo contenido** que `PUBLIC_PAGES` no
 * autoriza a fundirlas: son dos preguntas distintas y coinciden sólo porque hoy
 * las dos únicas páginas públicas son de auth. El día que exista una pública que
 * no lo sea (términos, recuperar contraseña), la fusión redirigiría a quien ya
 * tiene sesión fuera de una página que sí quería ver.
 */
const AUTH_PAGES = ["/login", "/register"];

export const LOGIN_PATH = "/login";
export const HOME_PATH = "/";

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    return PUBLIC_API_ROUTES.includes(pathname);
  }
  return PUBLIC_PAGES.includes(pathname);
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  try {
    await verifySessionToken(token);
    return true;
  } catch {
    return false;
  }
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
  const authenticated = await hasValidSession(request);

  /* Con sesión abierta, las pantallas de acceso y de alta no tienen nada que
     ofrecer y sí mucho que romper: un marcador de `/login` enseñaba el
     formulario y respondía "Email o contraseña incorrectos." a alguien que ya
     estaba dentro, y un alta desde `/register` sustituía la sesión en silencio.
     Es el único sitio donde se puede arreglar: la cookie es `httpOnly` y ésta es
     la única capa que la ve antes de renderizar (deuda 36).
     El destino es siempre el Dashboard, sin honrar el `?next=`: ese parámetro lo
     escribe este mismo proxy para volver DESPUÉS de autenticarse, y hacerle caso
     aquí abriría un redirector desde una ruta pública. */
  if (authenticated && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL(HOME_PATH, request.nextUrl));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!authenticated) {
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
