import {
  YarnTypeNotFoundError,
  YarnTypeReferencedError,
} from "@/features/yarns/api/errors";
import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";

/**
 * Borrado bloqueante de un tipo (PRD §12.7):
 * - 404 si el tipo no existe, no pertenece a esa marca, o la marca es de otro
 *   usuario (`findYarnType` valida la cadena tipo → marca → usuario con el join).
 * - Con hijos (alguna lana con ese `typeId`) → `YarnTypeReferencedError` (409,
 *   cuerpo `{ error, yarns }`), sin borrar nada. NO hay `?force` ni cascada: la
 *   FK `yarns → yarn_types` es `no action`, así que el usuario vacía primero.
 * - Sin hijos → borrado directo (204).
 */
export async function deleteYarnType(
  userId: string,
  brandId: string,
  typeId: string,
  store: YarnStore = createYarnStore(),
): Promise<void> {
  const type = await store.findYarnType(userId, brandId, typeId);
  if (!type) {
    throw new YarnTypeNotFoundError();
  }

  const yarns = await store.countTypeYarns(userId, typeId);
  if (yarns > 0) {
    throw new YarnTypeReferencedError(yarns);
  }

  const deleted = await store.removeYarnType(brandId, typeId);
  if (!deleted) {
    throw new YarnTypeNotFoundError();
  }
}
