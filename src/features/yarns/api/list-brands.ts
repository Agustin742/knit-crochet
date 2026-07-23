import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type { BrandRecord } from "@/features/yarns/types";

export async function listBrands(
  userId: string,
  store: YarnStore = createYarnStore(),
): Promise<BrandRecord[]> {
  return store.listBrands(userId);
}
