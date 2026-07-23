import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type { BrandRecord, CreateBrandInput } from "@/features/yarns/types";

export async function createBrand(
  userId: string,
  input: CreateBrandInput,
  store: YarnStore = createYarnStore(),
): Promise<BrandRecord> {
  return store.createBrand({ userId, name: input.name });
}
