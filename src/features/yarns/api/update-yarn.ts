import { assertBrandAndType } from "@/features/yarns/api/assert-yarn-refs";
import { YarnNotFoundError } from "@/features/yarns/api/errors";
import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type {
  UpdateYarnInput,
  YarnPatch,
  YarnRecord,
} from "@/features/yarns/types";

/**
 * Actualiza una lana del usuario. Si cambia `brandId`/`typeId` revalida el
 * scoping cruzado (marca y tipo del usuario, tipo bajo esa marca). Un
 * `colorCode` duplicado lo traduce el store a `DuplicateColorCodeError` (→ 409).
 */
export async function updateYarn(
  userId: string,
  id: string,
  input: UpdateYarnInput,
  store: YarnStore = createYarnStore(),
): Promise<YarnRecord> {
  const existing = await store.findYarn(userId, id);
  if (!existing) {
    throw new YarnNotFoundError();
  }

  if (input.brandId !== undefined || input.typeId !== undefined) {
    await assertBrandAndType(
      userId,
      input.brandId ?? existing.brandId,
      input.typeId ?? existing.typeId,
      store,
    );
  }

  const patch: YarnPatch = { ...input, updatedAt: new Date() };
  const updated = await store.updateYarn(userId, id, patch);
  if (!updated) {
    throw new YarnNotFoundError();
  }
  return updated;
}
