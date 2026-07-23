import { PatternNotFoundError } from "@/features/patterns/api/errors";
import {
  createPatternStore,
  type PatternStore,
} from "@/features/patterns/api/store";
import type { PatternRecord } from "@/features/patterns/types";

/**
 * Devuelve el patrón del usuario o lanza `PatternNotFoundError`. Un patrón de
 * otro usuario es indistinguible de uno inexistente.
 */
export async function getPattern(
  userId: string,
  id: string,
  store: PatternStore = createPatternStore(),
): Promise<PatternRecord> {
  const pattern = await store.findById(userId, id);
  if (!pattern) {
    throw new PatternNotFoundError();
  }
  return pattern;
}
