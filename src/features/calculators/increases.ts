import { InvalidCalculatorInputError } from "@/features/calculators/errors";
import type { IncreasesInput } from "@/features/calculators/types";

/**
 * Formatea un tramo "teje N p, aumenta 1 (×count)". Decisiones de fraseo:
 * - Si `stitches === 0` (ocurre cuando `P < A`: aumentos consecutivos sin puntos
 *   intermedios) se omite el "teje 0 p" sin sentido y queda solo "aumenta 1 (×count)".
 * - El multiplicador se emite SIEMPRE como "(×count)", también para `count === 1`,
 *   por consistencia con el formato canónico (no se pluraliza ni se elide en ×1).
 */
function formatSegment(stitches: number, count: number): string {
  if (stitches === 0) {
    return `aumenta 1 (×${count})`;
  }
  return `teje ${stitches} p, aumenta 1 (×${count})`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Reparte `stitchesToAdd` (A) aumentos de forma pareja sobre `currentStitches`
 * (P) y devuelve una instrucción legible en español (PRD §7.1).
 *
 * Algoritmo (distribución uniforme del remanente):
 *   base      = floor(P / A)   // puntos entre aumentos
 *   remainder = P mod A        // aumentos que llevan un punto extra antes
 * → `remainder` tramos de (base+1) puntos + aumento, luego (A - remainder)
 *   tramos de `base` puntos + aumento. Cada aumento suma 1 punto: Total = P + A.
 *
 * Casos borde resueltos:
 * - `remainder === 0` (P múltiplo de A): un único tramo de `base` p sin el tramo
 *   (base+1) ni un "(×0)".
 * - `P < A` (`base === 0`): el segundo tramo son aumentos consecutivos, se frasea
 *   sin "teje 0 p" (ver `formatSegment`).
 *
 * Validación: P y A deben ser enteros positivos; en otro caso lanza
 * `InvalidCalculatorInputError`.
 */
export function calculateIncreases(input: IncreasesInput): string {
  const { currentStitches: p, stitchesToAdd: a } = input;

  if (!Number.isInteger(p) || !Number.isInteger(a)) {
    throw new InvalidCalculatorInputError(
      "Los puntos y los aumentos deben ser números enteros.",
    );
  }
  if (p <= 0 || a <= 0) {
    throw new InvalidCalculatorInputError(
      "Los puntos y los aumentos deben ser mayores que 0.",
    );
  }

  const base = Math.floor(p / a);
  const remainder = p % a;
  const total = p + a;

  let body: string;
  if (remainder === 0) {
    body = formatSegment(base, a);
  } else {
    const first = formatSegment(base + 1, remainder);
    const second = formatSegment(base, a - remainder);
    body = `${first}; luego ${second}`;
  }

  return `${capitalize(body)}. Total: ${total} p.`;
}
