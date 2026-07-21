import { EmailAlreadyRegisteredError } from "@/features/auth/api/errors";
import {
  type AuthUserStore,
  createAuthUserStore,
  toPublicUser,
} from "@/features/auth/api/store";
import type { AuthResult, RegisterUserInput } from "@/features/auth/types";
import { signSessionToken } from "@/shared/lib/auth/jwt";
import { hashPassword } from "@/shared/lib/auth/password";

export async function registerUser(
  input: RegisterUserInput,
  store: AuthUserStore = createAuthUserStore(),
): Promise<AuthResult> {
  const existing = await store.findByEmail(input.email);
  if (existing) {
    throw new EmailAlreadyRegisteredError();
  }

  const created = await store.create({
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
  });

  const user = toPublicUser(created);
  return { user, token: await signSessionToken({ userId: user.id }) };
}
