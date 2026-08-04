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
    // Sin sesión, las tres siguen siendo públicas: lo que cambia con la cookie
    // puesta son las dos de auth (deuda 36), no ésta.
    for (const path of ["/", "/login", "/register"]) {
      const response = await proxy(buildRequest(path));
      expect(response.status).toBe(200);
    }
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

    it("deja entrar al Dashboard, que es una página como cualquier otra", async () => {
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
