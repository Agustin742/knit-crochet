import { PatternNotFoundError } from "@/features/patterns/api/errors";
import {
  createPatternStore,
  type PatternStore,
} from "@/features/patterns/api/store";
import type {
  PatternPatch,
  PatternRecord,
  UpdatePatternInput,
} from "@/features/patterns/types";

export async function updatePattern(
  userId: string,
  id: string,
  input: UpdatePatternInput,
  store: PatternStore = createPatternStore(),
): Promise<PatternRecord> {
  const existing = await store.findById(userId, id);
  if (!existing) {
    throw new PatternNotFoundError();
  }

  const patch: PatternPatch = { ...input, updatedAt: new Date() };
  const updated = await store.update(userId, id, patch);
  if (!updated) {
    throw new PatternNotFoundError();
  }
  return updated;
}
