import type { Comparison } from "@/features/dashboard/types";
import { YARN_COMPARISONS } from "@/shared/config";

/**
 * Elige la comparativa más relatable para `yarnMeters` (PRD §8).
 *
 * Criterio: la **mayor** referencia cuyo `meters ≤ yarnMeters` (para que
 * `times ≥ 1`). Si ninguna cabe (`yarnMeters` menor que la referencia más
 * pequeña, incluido `yarnMeters = 0`), se usa la **menor** referencia; en ese
 * caso `times < 1` (y exactamente `0` cuando no se ha tejido nada).
 */
export function pickComparison(yarnMeters: number): Comparison {
  const sorted = [...YARN_COMPARISONS].sort((a, b) => a.meters - b.meters);
  const smallest = sorted[0];
  if (!smallest) {
    throw new Error("No hay comparativas de lana configuradas.");
  }

  const fitting = sorted.filter((ref) => ref.meters <= yarnMeters);
  const chosen = fitting.at(-1) ?? smallest;

  return {
    label: chosen.label,
    referenceMeters: chosen.meters,
    times: yarnMeters / chosen.meters,
  };
}
