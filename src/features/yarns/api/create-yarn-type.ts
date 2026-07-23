import { BrandNotFoundError } from "@/features/yarns/api/errors";
import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type {
  CreateYarnTypeInput,
  YarnTypeRecord,
} from "@/features/yarns/types";

/**
 * Crea un tipo bajo una marca. La marca debe existir y ser del usuario, si no
 * `BrandNotFoundError` (404): impide colgar un tipo de una marca ajena.
 */
export async function createYarnType(
  userId: string,
  brandId: string,
  input: CreateYarnTypeInput,
  store: YarnStore = createYarnStore(),
): Promise<YarnTypeRecord> {
  const brand = await store.findBrand(userId, brandId);
  if (!brand) {
    throw new BrandNotFoundError();
  }
  return store.createYarnType({ brandId, name: input.name });
}
