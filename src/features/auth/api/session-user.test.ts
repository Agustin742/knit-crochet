import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionUser } from "@/features/auth/api/session-user";
import type { AuthUserStore, NewUserRecord } from "@/features/auth/api/store";
import type { UserRecord } from "@/features/auth/types";

/**
 * Se dobla la LECTURA DE LA COOKIE (`next/headers` no existe fuera de una
 * request), no la capa de datos: el store es un doble en memoria de verdad.
 */
const sessionState = vi.hoisted(() => ({
  getSessionUserId: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("@/shared/lib/auth/session", () => ({
  getSessionUserId: sessionState.getSessionUserId,
}));

function userRow(id: string): UserRecord {
  const now = new Date();
  return {
    id,
    email: "ada@example.com",
    name: "Ada",
    passwordHash: "hash",
    createdAt: now,
    updatedAt: now,
  };
}

function storeWith(rows: UserRecord[]): AuthUserStore {
  return {
    async findByEmail(email) {
      return rows.find((row) => row.email === email);
    },
    async findById(id) {
      return rows.find((row) => row.id === id);
    },
    async create(_input: NewUserRecord) {
      throw new Error("no se usa en estos tests");
    },
  };
}

afterEach(() => {
  sessionState.getSessionUserId.mockReset();
});

describe("getSessionUser", () => {
  it("devuelve el usuario de la sesión sin su hash de password", async () => {
    sessionState.getSessionUserId.mockResolvedValue("user-1");

    const user = await getSessionUser(storeWith([userRow("user-1")]));

    expect(user).toMatchObject({ id: "user-1", name: "Ada" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("devuelve null sin sesión, y no toca la capa de datos", async () => {
    sessionState.getSessionUserId.mockResolvedValue(null);
    const store = storeWith([userRow("user-1")]);
    const findById = vi.spyOn(store, "findById");

    expect(await getSessionUser(store)).toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it("devuelve null si la cookie es válida pero el usuario ya no existe", async () => {
    // Cuenta borrada con la sesión todavía viva: para el caparazón es una
    // visita anónima, no un 500. El endpoint `me` sigue devolviendo su 404.
    sessionState.getSessionUserId.mockResolvedValue("user-borrado");

    expect(await getSessionUser(storeWith([]))).toBeNull();
  });

  it("propaga cualquier otro error de la capa de datos", async () => {
    sessionState.getSessionUserId.mockResolvedValue("user-1");
    const store = storeWith([]);
    store.findById = async () => {
      throw new Error("la base no responde");
    };

    await expect(getSessionUser(store)).rejects.toThrow("la base no responde");
  });
});
