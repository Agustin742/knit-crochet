import { eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import { users } from "@/features/auth/schema";
import type { PublicUser, UserRecord } from "@/features/auth/types";
import { db } from "@/shared/db";

export type NewUserRecord = {
  email: string;
  passwordHash: string;
  name: string;
};

/**
 * Único punto de acceso a la tabla `users`. Los servicios dependen de esta
 * interfaz (no de Drizzle) para poder testearse con un doble en memoria sin
 * mockear el ORM entero.
 */
export type AuthUserStore = {
  findByEmail(email: string): Promise<UserRecord | undefined>;
  findById(id: string): Promise<UserRecord | undefined>;
  create(input: NewUserRecord): Promise<UserRecord>;
};

export function createAuthUserStore(
  database: NeonHttpDatabase = db,
): AuthUserStore {
  return {
    async findByEmail(email) {
      const rows = await database
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return rows[0];
    },
    async findById(id) {
      const rows = await database
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return rows[0];
    },
    async create(input) {
      const rows = await database.insert(users).values(input).returning();
      const created = rows[0];
      if (!created) {
        throw new Error("No se pudo crear el usuario.");
      }
      return created;
    },
  };
}

export function toPublicUser(user: UserRecord): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
