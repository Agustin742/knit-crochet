import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config, proxy } from "@/proxy";
import { signSessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

function buildRequest(path: string, token?: string): NextRequest {
  const request = new NextRequest(new URL(path, "https://test.local"));
  if (token) {
    request.cookies.set("kc_session", token);
  }
  return request;
}

describe("proxy", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers 401 JSON on a private API route without token", async () => {
    const response = await proxy(buildRequest("/api/projects"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "No autenticado." });
  });

  it("answers 401 JSON on a private API route with an invalid token", async () => {
    const response = await proxy(buildRequest("/api/projects", "not-a-jwt"));

    expect(response.status).toBe(401);
  });

  it("redirects to login on a private page without token", async () => {
    const response = await proxy(buildRequest("/projects"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/projects");
  });

  it("lets public auth endpoints through without token", async () => {
    for (const path of ["/api/auth/login", "/api/auth/register"]) {
      const response = await proxy(buildRequest(path));
      expect(response.status).toBe(200);
    }
  });

  it("lets public pages through without token", async () => {
    // Invariante de bloqueo total: la puerta de entrada tiene que poder abrirse
    // SIN sesión. Desde la enmienda E1.1 son sólo estas dos —`/` es el Dashboard
    // y pasó a privada (deuda 1)—, y si alguien las quitara de la allowlist o la
    // vaciara, nadie podría llegar nunca a autenticarse. Lo que cambia con la
    // cookie puesta es que estas dos sobran (deuda 36), no que dejen de ser
    // públicas sin ella.
    for (const path of ["/login", "/register"]) {
      const response = await proxy(buildRequest(path));
      expect(response.status, path).toBe(200);
    }
  });

  /**
   * GATE DE LA DEUDA 1, y la mitad que de verdad impide la regresión. El test de
   * arriba sólo **enumera** páginas públicas: nunca falla cuando alguien vuelve
   * a añadir `/` a `PUBLIC_PAGES`, sólo cuando alguien la quita de la lista del
   * test. Este es positivo, así que sí cae en ese caso: exige que el Dashboard
   * esté DENTRO del mecanismo de rebote a la pantalla de acceso, exactamente
   * igual que cualquier otra página privada.
   *
   * El `?next=/` cierra el circuito de vuelta: `resolveNextPath` lo acepta como
   * ruta interna y el formulario de acceso navega ahí tras entrar.
   */
  it("redirects the Dashboard to login when there is no session", async () => {
    const response = await proxy(buildRequest("/"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/");
  });

  it("protects auth endpoints that are not in the public allowlist", async () => {
    const response = await proxy(buildRequest("/api/auth/me"));

    expect(response.status).toBe(401);
  });

  it("lets a private route through with a valid token", async () => {
    const token = await signSessionToken({ userId: "user-1" });

    const apiResponse = await proxy(buildRequest("/api/projects", token));
    const pageResponse = await proxy(buildRequest("/projects", token));

    expect(apiResponse.status).toBe(200);
    expect(pageResponse.status).toBe(200);
  });

  /**
   * GATE DE LA DEUDA 36. Las páginas de auth eran públicas por igualdad exacta y
   * el proxy **no miraba la cookie** al servirlas: con la sesión abierta, un
   * marcador de `/login` enseñaba el formulario y contestaba "Email o contraseña
   * incorrectos." a alguien que ya estaba dentro, y un alta desde `/register`
   * sustituía la sesión sin avisar. La allowlist decide si la sesión es
   * obligatoria; le faltaba la mitad que decide si sobra.
   */
  describe("con la sesión ya abierta (deuda 36)", () => {
    it("devuelve al Dashboard desde las páginas de acceso y de alta", async () => {
      const token = await signSessionToken({ userId: "user-1" });

      for (const path of ["/login", "/register"]) {
        const response = await proxy(buildRequest(path, token));

        expect(response.status, path).toBe(307);
        expect(
          new URL(response.headers.get("location") ?? "").pathname,
          path,
        ).toBe("/");
      }
    });

    it("ignora el ?next= al devolver: no es un redirector desde una ruta pública", async () => {
      const token = await signSessionToken({ userId: "user-1" });
      const request = new NextRequest(
        new URL("/login?next=//evil.example", "https://test.local"),
      );
      request.cookies.set("kc_session", token);

      const response = await proxy(request);

      const location = new URL(response.headers.get("location") ?? "");
      expect(location.pathname).toBe("/");
      expect(location.host).toBe("test.local");
      expect(location.search).toBe("");
    });

    it("no toca los endpoints de auth: redirigir un POST rompería el acceso", async () => {
      const token = await signSessionToken({ userId: "user-1" });

      for (const path of ["/api/auth/login", "/api/auth/register"]) {
        const response = await proxy(buildRequest(path, token));
        expect(response.status, path).toBe(200);
      }
    });

    /**
     * El DESTINO del redirect de arriba es alcanzable con sesión, y por eso no
     * hay bucle. Este test decía "el Dashboard es una página como cualquier
     * otra": era cierto cuando `/` era pública y lo único que probaba es que el
     * rebote de la deuda 36 no se pasaba de frenada. Desde la enmienda E1.1 `/`
     * es privada Y es el destino de ese rebote, así que ahora sostiene un
     * eslabón mucho más frágil: si `/` dejara de entrar con sesión, `/login`
     * mandaría a `/`, `/` mandaría a `/login`, y el rebote sería infinito.
     */
    it("deja entrar al Dashboard, destino del rebote: sin esto habría bucle", async () => {
      const token = await signSessionToken({ userId: "user-1" });

      expect((await proxy(buildRequest("/", token))).status).toBe(200);
    });
  });

  it("deja pasar a la pantalla de acceso con una cookie inválida", async () => {
    // Justo el caso en el que hay que poder entrar: la sesión caducó o la cookie
    // está corrupta, así que la persona necesita el formulario, no un rebote.
    const response = await proxy(buildRequest("/login", "not-a-jwt"));

    expect(response.status).toBe(200);
  });

  it("uses a matcher that covers app routes but excludes static assets", () => {
    const [source] = config.matcher;
    const matcher = new RegExp(`^${source ?? ""}$`);

    expect(matcher.test("/projects")).toBe(true);
    expect(matcher.test("/api/projects")).toBe(true);
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher.test("/_next/image")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
    expect(matcher.test("/logo.png")).toBe(false);
  });
});
