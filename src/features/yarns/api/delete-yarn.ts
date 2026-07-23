import {
  YarnNotFoundError,
  YarnReferencedError,
} from "@/features/yarns/api/errors";
import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";

/**
 * Borrado seguro de una lana (PRD §4.5, §4.6):
 * - 404 si la lana no existe o es de otro usuario.
 * - Referenciada por proyectos y sin `force` → `YarnReferencedError` (409),
 *   sin borrar nada.
 * - Referenciada y con `force` → primero se borran los enlaces `project_yarns`
 *   (la FK `project_yarns → yarns` es `no action`), luego la lana. La lógica de
 *   este borrado vive aquí (regla S2: advertencia/force sí van en el servicio).
 * - Sin referencias → borrado directo.
 */
export async function deleteYarn(
  userId: string,
  id: string,
  force = false,
  store: YarnStore = createYarnStore(),
): Promise<void> {
  const existing = await store.findYarn(userId, id);
  if (!existing) {
    throw new YarnNotFoundError();
  }

  const references = await store.countProjectReferences(id);
  if (references > 0) {
    if (!force) {
      throw new YarnReferencedError(references);
    }
    await store.removeProjectReferences(id);
  }

  const deleted = await store.removeYarn(userId, id);
  if (!deleted) {
    throw new YarnNotFoundError();
  }
}
