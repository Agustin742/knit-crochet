import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUserStore, NewUserRecord } from "@/features/auth/api/store";
import type { UserRecord } from "@/features/auth/types";
import { verifySessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

// Solo se dobla el borde de datos: los Route Handlers, la validación zod, el
// hashing y la firma del JWT son los reales.
const dbState = vi.hoisted(() => {
  const rows: UserRecord[] = [];
  const store: AuthUserStore = {
    async findByEmail(email: string) {
      return rows.find((row) => row.email === email);
    },
    async findById(id: string) {
      return rows.find((row) => row.id === id);
    },
    async create(input: NewUserRecord) {
      const now = new Date("2026-07-21T10:00:00Z");
      const created: UserRecord = {
        id: `user-${rows.length + 1}`,
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      };
      rows.push(created);
      return created;
    },
  };
  return { rows, store };
});

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/features/auth/api/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/api/store")>();
  return { ...actual, createAuthUserStore: () => dbState.store };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

const { POST: register } = await import("@/app/api/auth/register/route");
const { POST: login } = await import("@/app/api/auth/login/route");
const { POST: logout } = await import("@/app/api/auth/logout/route");
const { GET: me } = await import("@/app/api/auth/me/route");

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_REGISTRATION = {
  email: "Tejedora@Example.com",
  password: "lana-1234",
  name: "Tejedora",
};

describe("api/auth route handlers", () => {
  beforeEach(() => {
    dbState.rows.length = 0;
    cookieJar.clear();
    vi.stubEnv("JWT_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("POST /api/auth/register creates the user and sets the session cookie", async () => {
    const response = await register(
      jsonRequest("https://test.local/api/auth/register", VALID_REGISTRATION),
    );
    const body = (await response.json()) as { user: { id: string } };

    expect(response.status).toBe(201);
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(dbState.rows).toHaveLength(1);
    expect(dbState.rows[0]?.email).toBe("tejedora@example.com");
    expect(dbState.rows[0]?.passwordHash).not.toBe("lana-1234");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=lax/i);

    const token = /kc_session=([^;]+)/.exec(setCookie)?.[1] ?? "";
    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: body.user.id,
    });
  });

  it("POST /api/auth/register rejects an invalid payload with 400", async () => {
    const response = await register(
      jsonRequest("https://test.local/api/auth/register", {
        email: "no-es-un-email",
        password: "corta",
        name: "",
      }),
    );

    expect(response.status).toBe(400);
    expect(dbState.rows).toHaveLength(0);
  });

  it("POST /api/auth/register rejects a duplicated email with 409", async () => {
    await register(
      jsonRequest("https://test.local/api/auth/register", VALID_REGISTRATION),
    );

    const response = await register(
      jsonRequest("https://test.local/api/auth/register", VALID_REGISTRATION),
    );

    expect(response.status).toBe(409);
    expect(dbState.rows).toHaveLength(1);
  });

  it("POST /api/auth/login returns the user and a session cookie", async () => {
    await register(
      jsonRequest("https://test.local/api/auth/register", VALID_REGISTRATION),
    );

    const response = await login(
      jsonRequest("https://test.local/api/auth/login", {
        email: "tejedora@example.com",
        password: "lana-1234",
      }),
    );
    const body = (await response.json()) as { user: { id: string } };

    expect(response.status).toBe(200);
    expect(body.user).not.toHaveProperty("passwordHash");

    const setCookie = response.headers.get("set-cookie") ?? "";
    const token = /kc_session=([^;]+)/.exec(setCookie)?.[1] ?? "";
    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: body.user.id,
    });
  });

  it("POST /api/auth/login answers 401 with invalid credentials", async () => {
    await register(
      jsonRequest("https://test.local/api/auth/register", VALID_REGISTRATION),
    );

    const wrongPassword = await login(
      jsonRequest("https://test.local/api/auth/login", {
        email: "tejedora@example.com",
        password: "password-erronea",
      }),
    );
    const unknownEmail = await login(
      jsonRequest("https://test.local/api/auth/login", {
        email: "otra@example.com",
        password: "lana-1234",
      }),
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
    expect(wrongPassword.headers.get("set-cookie")).toBeNull();
  });

  it("POST /api/auth/logout clears the session cookie", async () => {
    const response = await logout();

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("kc_session=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("GET /api/auth/me answers 401 without a session token", async () => {
    const response = await me();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "No autenticado." });
  });

  it("GET /api/auth/me answers 401 with an invalid session token", async () => {
    cookieJar.set("kc_session", "not-a-jwt");

    const response = await me();

    expect(response.status).toBe(401);
  });

  it("GET /api/auth/me returns the current user without passwordHash", async () => {
    const registerResponse = await register(
      jsonRequest("https://test.local/api/auth/register", VALID_REGISTRATION),
    );
    const setCookie = registerResponse.headers.get("set-cookie") ?? "";
    cookieJar.set("kc_session", /kc_session=([^;]+)/.exec(setCookie)?.[1] ?? "");

    const response = await me();
    const body = (await response.json()) as {
      user: { id: string; email: string };
    };

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("tejedora@example.com");
    expect(body.user).not.toHaveProperty("passwordHash");
  });
});
