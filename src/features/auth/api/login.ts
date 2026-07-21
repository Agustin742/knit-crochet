import { InvalidCredentialsError } from "@/features/auth/api/errors";
import {
  type AuthUserStore,
  createAuthUserStore,
  toPublicUser,
} from "@/features/auth/api/store";
import type { AuthResult, LoginUserInput } from "@/features/auth/types";
import { signSessionToken } from "@/shared/lib/auth/jwt";
import { verifyPassword } from "@/shared/lib/auth/password";

export async function loginUser(
  input: LoginUserInput,
  store: AuthUserStore = createAuthUserStore(),
): Promise<AuthResult> {
  const existing = await store.findByEmail(input.email);
  // Error idéntico para email inexistente y password incorrecta: no se filtra
  // qué emails están registrados.
  if (!existing) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await verifyPassword(
    input.password,
    existing.passwordHash,
  );
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const user = toPublicUser(existing);
  return { user, token: await signSessionToken({ userId: user.id }) };
}
