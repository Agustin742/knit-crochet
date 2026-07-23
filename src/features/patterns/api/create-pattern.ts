import {
  createPatternStore,
  type PatternStore,
} from "@/features/patterns/api/store";
import type {
  CreatePatternInput,
  PatternRecord,
} from "@/features/patterns/types";

/**
 * Crea un patrón del usuario. `inLibrary` por defecto es `false` (embebido); el
 * store aplica el resto de defaults (`instructions`/`metadata` vacíos).
 */
export async function createPattern(
  userId: string,
  input: CreatePatternInput,
  store: PatternStore = createPatternStore(),
): Promise<PatternRecord> {
  return store.create({ ...input, userId });
}
