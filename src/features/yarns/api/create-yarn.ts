import { assertBrandAndType } from "@/features/yarns/api/assert-yarn-refs";
import { createYarnStore, type YarnStore } from "@/features/yarns/api/store";
import type { CreateYarnInput, YarnRecord } from "@/features/yarns/types";

/**
 * Crea una lana tras validar el scoping cruzado (marca y tipo del usuario). Un
 * `colorCode` duplicado para la marca lo traduce el store a
 * `DuplicateColorCodeError` (→ 409). Enlazar a un proyecto no toca stock.
 */
export async function createYarn(
  userId: string,
  input: CreateYarnInput,
  store: YarnStore = createYarnStore(),
): Promise<YarnRecord> {
  await assertBrandAndType(userId, input.brandId, input.typeId, store);
  return store.createYarn({ ...input, userId });
}
