import {
  BrandNotFoundError,
  YarnTypeNotFoundError,
} from "@/features/yarns/api/errors";
import type { YarnStore } from "@/features/yarns/api/store";

/**
 * Scoping cruzado de create/update de lana (PRD §4.4, §4.5): la `brandId` debe
 * ser una marca del usuario, y la `typeId` un tipo que exista y pertenezca a
 * esa marca (y por tanto al usuario). Cualquier fallo es 404, no 403.
 */
export async function assertBrandAndType(
  userId: string,
  brandId: string,
  typeId: string,
  store: YarnStore,
): Promise<void> {
  const brand = await store.findBrand(userId, brandId);
  if (!brand) {
    throw new BrandNotFoundError();
  }
  const type = await store.findYarnType(userId, brandId, typeId);
  if (!type) {
    throw new YarnTypeNotFoundError();
  }
}
