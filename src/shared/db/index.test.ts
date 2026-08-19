import { afterEach, describe, expect, it, vi } from "vitest";

const VALID_URL = "postgres://user:password@host.neon.tech/db?sslmode=require";

describe("shared/db client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // Tope SÓLO para este `it`, no para el archivo: es el único que paga el primer
  // `await import("@/shared/db")`, o sea el arranque en frío de `drizzle-orm/neon-http`
  // + `@neondatabase/serverless` pasando por la transformación de vite. Medido:
  // 3348-5837 ms este test (una pasada aislada YA se pasaba de los 5000 ms por
  // defecto) frente a 2-23 ms los otros tres, que reusan la caché de transformación
  // (el `vi.resetModules()` limpia el registro de módulos, no esa caché).
  // 20 s ≈ 3.4x el peor tiempo medido. Los otros tres se quedan con el tope global
  // a propósito: ahí un cuelgue debe salir rápido. Deuda 145.
  it(
    "exposes a configured Drizzle client when DATABASE_URL is set",
    { timeout: 20_000 },
    async () => {
      vi.stubEnv("DATABASE_URL", VALID_URL);
      const { db, createDbClient } = await import("@/shared/db");

      expect(typeof db.select).toBe("function");
      expect(typeof db.insert).toBe("function");

      const client = createDbClient();
      expect(typeof client.select).toBe("function");
    },
  );

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
