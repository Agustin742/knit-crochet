import { YarnNotFoundError } from "@/features/yarns/api/errors";
import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type { YarnRecord } from "@/features/yarns/types";

/**
 * Devuelve la lana del usuario o lanza `YarnNotFoundError`. Una lana de otro
 * usuario es indistinguible de una inexistente.
 */
export async function getYarn(
  userId: string,
  id: string,
  store: YarnStore = createYarnStore(),
): Promise<YarnRecord> {
  const yarn = await store.findYarn(userId, id);
  if (!yarn) {
    throw new YarnNotFoundError();
  }
  return yarn;
}
