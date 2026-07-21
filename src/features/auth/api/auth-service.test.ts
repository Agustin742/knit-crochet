import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser } from "@/features/auth/api/current-user";
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  UserNotFoundError,
} from "@/features/auth/api/errors";
import { loginUser } from "@/features/auth/api/login";
import { registerUser } from "@/features/auth/api/register";
import type { AuthUserStore, NewUserRecord } from "@/features/auth/api/store";
import type { UserRecord } from "@/features/auth/types";
import { verifySessionToken } from "@/shared/lib/auth/jwt";
import { verifyPassword } from "@/shared/lib/auth/password";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

function createInMemoryStore(): AuthUserStore & { rows: UserRecord[] } {
  const rows: UserRecord[] = [];
  return {
    rows,
    async findByEmail(email) {
      return rows.find((row) => row.email === email);
    },
    async findById(id) {
      return rows.find((row) => row.id === id);
    },
    async create(input: NewUserRecord) {
      const now = new Date();
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
}

describe("features/auth services", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("registers a user hashing the password and issuing a session token", async () => {
    const store = createInMemoryStore();

    const { user, token } = await registerUser(
      { email: "tejedora@example.com", password: "lana-1234", name: "Tejedora" },
      store,
    );

    expect(user).not.toHaveProperty("passwordHash");
    expect(user.email).toBe("tejedora@example.com");
    expect(store.rows[0]?.passwordHash).not.toBe("lana-1234");
    await expect(
      verifyPassword("lana-1234", store.rows[0]?.passwordHash ?? ""),
    ).resolves.toBe(true);
    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: user.id,
    });
  });

  it("rejects a duplicated email with EmailAlreadyRegisteredError", async () => {
    const store = createInMemoryStore();
    const input = {
      email: "tejedora@example.com",
      password: "lana-1234",
      name: "Tejedora",
    };
    await registerUser(input, store);

    await expect(registerUser(input, store)).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError,
    );
    expect(store.rows).toHaveLength(1);
  });

  it("logs in with valid credentials", async () => {
    const store = createInMemoryStore();
    const { user: registered } = await registerUser(
      { email: "tejedora@example.com", password: "lana-1234", name: "Tejedora" },
      store,
    );

    const { user, token } = await loginUser(
      { email: "tejedora@example.com", password: "lana-1234" },
      store,
    );

    expect(user.id).toBe(registered.id);
    expect(user).not.toHaveProperty("passwordHash");
    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: registered.id,
    });
  });

  it("rejects a wrong password and an unknown email with the same error", async () => {
    const store = createInMemoryStore();
    await registerUser(
      { email: "tejedora@example.com", password: "lana-1234", name: "Tejedora" },
      store,
    );

    await expect(
      loginUser(
        { email: "tejedora@example.com", password: "password-erronea" },
        store,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(
      loginUser({ email: "otra@example.com", password: "lana-1234" }, store),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("returns the current user without passwordHash and fails for an unknown id", async () => {
    const store = createInMemoryStore();
    const { user } = await registerUser(
      { email: "tejedora@example.com", password: "lana-1234", name: "Tejedora" },
      store,
    );

    await expect(getCurrentUser(user.id, store)).resolves.toEqual(user);
    await expect(
      getCurrentUser("user-inexistente", store),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
