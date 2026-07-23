import {
  BrandNotFoundError,
  BrandReferencedError,
} from "@/features/yarns/api/errors";
import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";

/**
 * Borrado bloqueante de una marca (PRD §12.7):
 * - 404 si la marca no existe o es de otro usuario (`findBrand` scopeado).
 * - Con hijos (algún tipo O alguna lana con ese `brandId`) → `BrandReferencedError`
 *   (409, cuerpo `{ error, types, yarns }`), sin borrar nada. NO hay `?force` ni
 *   cascada: las FKs `yarn_types → brands` y `yarns → brands` son `no action` a
 *   propósito, así que el usuario debe vaciar la marca antes.
 * - Sin hijos → borrado directo (204).
 *
 * El conteo de hijos ocurre ANTES del `delete`: borrar con hijos haría que
 * Postgres devolviera 500 por la FK.
 */
export async function deleteBrand(
  userId: string,
  brandId: string,
  store: YarnStore = createYarnStore(),
): Promise<void> {
  const brand = await store.findBrand(userId, brandId);
  if (!brand) {
    throw new BrandNotFoundError();
  }

  const types = await store.countBrandTypes(brandId);
  const yarns = await store.countBrandYarns(userId, brandId);
  if (types > 0 || yarns > 0) {
    throw new BrandReferencedError(types, yarns);
  }

  const deleted = await store.removeBrand(userId, brandId);
  if (!deleted) {
    throw new BrandNotFoundError();
  }
}
