import { BrandNotFoundError } from "@/features/yarns/api/errors";
import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type { YarnTypeRecord } from "@/features/yarns/types";

export async function listYarnTypes(
  userId: string,
  brandId: string,
  store: YarnStore = createYarnStore(),
): Promise<YarnTypeRecord[]> {
  const brand = await store.findBrand(userId, brandId);
  if (!brand) {
    throw new BrandNotFoundError();
  }
  return store.listYarnTypes(userId, brandId);
}
