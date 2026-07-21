import { afterEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

describe("shared/lib/auth/jwt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.resetModules();
  });

  it("signs a token and verifies it back to the userId", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { signSessionToken, verifySessionToken } = await import(
      "@/shared/lib/auth/jwt"
    );

    const token = await signSessionToken({ userId: "user-1" });

    expect(token.split(".")).toHaveLength(3);
    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: "user-1",
    });
  });

  it("rejects a tampered token with InvalidSessionError", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { InvalidSessionError, signSessionToken, verifySessionToken } =
      await import("@/shared/lib/auth/jwt");

    const token = await signSessionToken({ userId: "user-1" });

    await expect(
      verifySessionToken(`${token.slice(0, -2)}xx`),
    ).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it("rejects a token signed with another secret", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { InvalidSessionError, signSessionToken, verifySessionToken } =
      await import("@/shared/lib/auth/jwt");
    const token = await signSessionToken({ userId: "user-1" });

    vi.stubEnv("JWT_SECRET", "otro-secreto-completamente-distinto-abcdef");

    await expect(verifySessionToken(token)).rejects.toBeInstanceOf(
      InvalidSessionError,
    );
  });

  it("rejects an expired token", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const { InvalidSessionError, signSessionToken, verifySessionToken } =
      await import("@/shared/lib/auth/jwt");
    const token = await signSessionToken({ userId: "user-1" });

    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));

    await expect(verifySessionToken(token)).rejects.toBeInstanceOf(
      InvalidSessionError,
    );
  });

  it("throws MissingJwtSecretError when JWT_SECRET is not configured", async () => {
    vi.stubEnv("JWT_SECRET", "");
    const { MissingJwtSecretError, signSessionToken } = await import(
      "@/shared/lib/auth/jwt"
    );

    await expect(signSessionToken({ userId: "user-1" })).rejects.toBeInstanceOf(
      MissingJwtSecretError,
    );
  });
});
