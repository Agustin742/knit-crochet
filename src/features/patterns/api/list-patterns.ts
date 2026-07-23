import {
  createPatternStore,
  type PatternStore,
} from "@/features/patterns/api/store";
import type {
  PatternFilters,
  PatternRecord,
} from "@/features/patterns/types";

export async function listPatterns(
  userId: string,
  filters: PatternFilters = {},
  store: PatternStore = createPatternStore(),
): Promise<PatternRecord[]> {
  return store.list(userId, filters);
}
