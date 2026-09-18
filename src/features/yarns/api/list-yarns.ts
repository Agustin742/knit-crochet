import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type { YarnFilters, YarnListItem } from "@/features/yarns/types";

export async function listYarns(
  userId: string,
  filters: YarnFilters = {},
  store: YarnStore = createYarnStore(),
): Promise<YarnListItem[]> {
  return store.listYarns(userId, filters);
}
