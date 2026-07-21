import { UserNotFoundError } from "@/features/auth/api/errors";
import {
  type AuthUserStore,
  createAuthUserStore,
  toPublicUser,
} from "@/features/auth/api/store";
import type { PublicUser } from "@/features/auth/types";

export async function getCurrentUser(
  userId: string,
  store: AuthUserStore = createAuthUserStore(),
): Promise<PublicUser> {
  const existing = await store.findById(userId);
  if (!existing) {
    throw new UserNotFoundError();
  }
  return toPublicUser(existing);
}
