import { afterEach, describe, expect, it, vi } from "vitest";

const VALID_URL = "postgres://user:password@host.neon.tech/db?sslmode=require";

describe("shared/db client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("exposes a configured Drizzle client when DATABASE_URL is set", async () => {
    vi.stubEnv("DATABASE_URL", VALID_URL);
    const { db, createDbClient } = await import("@/shared/db");

    expect(typeof db.select).toBe("function");
    expect(typeof db.insert).toBe("function");

    const client = createDbClient();
    expect(typeof client.select).toBe("function");
  });

  it("uses an explicit connection string when provided", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { createDbClient } = await import("@/shared/db");

    const client = createDbClient(VALID_URL);
    expect(typeof client.select).toBe("function");
  });

  it("throws MissingDatabaseUrlError from createDbClient when env is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { createDbClient, MissingDatabaseUrlError } = await import(
      "@/shared/db"
    );

    expect(() => createDbClient()).toThrow(MissingDatabaseUrlError);
    try {
      createDbClient();
      expect.unreachable("createDbClient should have thrown");
    } catch (error) {
      expect((error as Error).name).toBe("MissingDatabaseUrlError");
    }
  });

  it("fails lazily with the named error on first use of db when env is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { db, MissingDatabaseUrlError } = await import("@/shared/db");

    expect(() => db.select).toThrow(MissingDatabaseUrlError);
  });
});
