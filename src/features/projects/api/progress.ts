/**
 * `progress = round(rounds / targetRounds * 100)` con clamp 0..100 (PRD §4.2).
 * Si `targetRounds <= 0` no hay meta contra la que medir → 0 (y evita dividir
 * por cero). Es la ÚNICA fuente del cálculo: cualquier mutación de
 * `rounds`/`targetRounds` (PATCH, endpoint de rounds…) debe pasar por aquí.
 */
export function calculateProgress(
  rounds: number,
  targetRounds: number,
): number {
  if (targetRounds <= 0) {
    return 0;
  }
  const raw = Math.round((rounds / targetRounds) * 100);
  return Math.min(100, Math.max(0, raw));
}
