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
