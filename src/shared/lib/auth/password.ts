import { compare, hash } from "bcryptjs";

// bcrypt trunca la password a 72 bytes: la validación zod la limita a 72
// caracteres para que dos passwords distintas no colisionen en silencio.
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_MIN_LENGTH = 8;

const BCRYPT_COST = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, BCRYPT_COST);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plainPassword, passwordHash);
}
