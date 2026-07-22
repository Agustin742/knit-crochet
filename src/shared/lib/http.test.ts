import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signSessionToken } from "@/shared/lib/auth/jwt";
import { InvalidSessionError } from "@/shared/lib/auth/session";
import { sessionErrorResponse, withSession } from "@/shared/lib/http";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

describe("shared/lib/http withSession", () => {
  beforeEach(() => {
    cookieJar.clear();
    vi.stubEnv("JWT_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("passes the session userId and the original arguments to the handler", async () => {
    cookieJar.set("kc_session", await signSessionToken({ userId: "user-1" }));
    const handler = withSession(
      "GET /test",
      async (userId: string, suffix: string) =>
        NextResponse.json({ userId, suffix }, { status: 200 }),
    );

    const response = await handler("bufanda");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      userId: "user-1",
      suffix: "bufanda",
    });
  });

  it("answers 401 without a session cookie", async () => {
    const handler = vi.fn();

    const response = await withSession("GET /test", handler)();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "No autenticado." });
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 401 when the session cookie holds an invalid token", async () => {
    cookieJar.set("kc_session", "not-a-jwt");

    const response = await withSession("GET /test", async () =>
      NextResponse.json({ ok: true }),
    )();

    expect(response.status).toBe(401);
  });

  it("answers 500 without leaking the error thrown by the handler", async () => {
    cookieJar.set("kc_session", await signSessionToken({ userId: "user-1" }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await withSession("GET /test", async () => {
      throw new Error("boom");
    })();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Error interno del servidor.",
    });
    expect(consoleError).toHaveBeenCalled();
  });

  it("maps InvalidSessionError to 401 from sessionErrorResponse", async () => {
    const response = sessionErrorResponse("GET /test", new InvalidSessionError());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "No autenticado." });
  });
});
