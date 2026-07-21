import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/shared/lib/auth/password";

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
