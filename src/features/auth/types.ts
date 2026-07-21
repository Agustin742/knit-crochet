import type { users } from "@/features/auth/schema";

export type UserRecord = typeof users.$inferSelect;

/** Usuario tal y como sale del BFF: nunca incluye `passwordHash`. */
export type PublicUser = Omit<UserRecord, "passwordHash">;

export type RegisterUserInput = {
  email: string;
  password: string;
  name: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
};

export type AuthResult = {
  user: PublicUser;
  token: string;
};
