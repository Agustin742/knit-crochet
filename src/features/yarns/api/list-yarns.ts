import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type { YarnFilters, YarnRecord } from "@/features/yarns/types";

export async function listYarns(
  userId: string,
  filters: YarnFilters = {},
  store: YarnStore = createYarnStore(),
): Promise<YarnRecord[]> {
  return store.listYarns(userId, filters);
}
