import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidSessionError, signSessionToken } from "@/shared/lib/auth/jwt";
import {
  clearSessionCookie,
  getSessionUserId,
  requireSessionUserId,
  setSessionCookie,
} from "@/shared/lib/auth/session";

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

describe("shared/lib/auth/session", () => {
  beforeEach(() => {
    cookieJar.clear();
    vi.stubEnv("JWT_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("extracts the userId from a valid session cookie", async () => {
    cookieJar.set("kc_session", await signSessionToken({ userId: "user-1" }));

    await expect(getSessionUserId()).resolves.toBe("user-1");
    await expect(requireSessionUserId()).resolves.toBe("user-1");
  });

  it("returns null without cookie and throws from requireSessionUserId", async () => {
    await expect(getSessionUserId()).resolves.toBeNull();
    await expect(requireSessionUserId()).rejects.toBeInstanceOf(
      InvalidSessionError,
    );
  });

  it("returns null when the cookie holds an invalid token", async () => {
    cookieJar.set("kc_session", "not-a-jwt");

    await expect(getSessionUserId()).resolves.toBeNull();
  });

  it("sets an httpOnly SameSite=Lax cookie on the response", () => {
    const response = setSessionCookie(NextResponse.json({ ok: true }), "token");
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("kc_session=token");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=604800");
  });

  it("clears the cookie with Max-Age=0", () => {
    const response = clearSessionCookie(NextResponse.json({ ok: true }));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("kc_session=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("HttpOnly");
  });
});
