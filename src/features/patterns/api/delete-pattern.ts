import { PatternNotFoundError } from "@/features/patterns/api/errors";
import {
  createPatternStore,
  type PatternStore,
} from "@/features/patterns/api/store";

/**
 * Borra un patrón del usuario. Los proyectos que lo referenciaban quedan con
 * `patternId = null`: lo hace Postgres por la FK `projects.pattern_id → patterns`
 * (`ON DELETE set null`, regla S2). El servicio NO limpia nada a mano ni avisa
 * de cuántos proyectos lo usaban (eso sería confirmación de UI, fuera de este
 * alcance): solo comprueba la propiedad y borra.
 */
export async function deletePattern(
  userId: string,
  id: string,
  store: PatternStore = createPatternStore(),
): Promise<void> {
  const existing = await store.findById(userId, id);
  if (!existing) {
    throw new PatternNotFoundError();
  }

  const deleted = await store.remove(userId, id);
  if (!deleted) {
    throw new PatternNotFoundError();
  }
}
