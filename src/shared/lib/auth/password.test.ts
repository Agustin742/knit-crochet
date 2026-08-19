import { describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "@/shared/lib/auth/password";

// Tope propio SÓLO para este archivo (`vi.setConfig` no sale de aquí).
// Por qué es lento: `bcryptjs` es JS puro (sin binding nativo) y el coste 12 es
// DELIBERADO — encarecer el hasheo es la defensa contra la fuerza bruta, así que
// no se toca. Medido en esta máquina: una operación bcrypt cuesta ~1-1.5 s, y el
// segundo test hace tres (1 hash + 2 compare) → 2878-4543 ms ociosa, o sea que
// rozaba el tope por defecto de 5000 ms sin siquiera tener carga.
// 20 s ≈ 4x el peor tiempo medido (4543 ms): margen para una máquina cargada sin
// convertir un cuelgue real en una espera eterna. Deuda 145.
vi.setConfig({ testTimeout: 20_000 });

describe("shared/lib/auth/password", () => {
  it("hashes a password with the bcrypt format and never stores it in clear", async () => {
    const passwordHash = await hashPassword("s3cret-password");

    expect(passwordHash).not.toBe("s3cret-password");
    expect(passwordHash).toHaveLength(60);
    expect(passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const passwordHash = await hashPassword("s3cret-password");

    await expect(verifyPassword("s3cret-password", passwordHash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("otra-password", passwordHash)).resolves.toBe(
      false,
    );
  });
});
