/** Entrada de la calculadora de aumentos (PRD §7.1). */
export type IncreasesInput = {
  /** Puntos actuales (P). Entero positivo. */
  currentStitches: number;
  /** Aumentos a repartir (A). Entero positivo. */
  stitchesToAdd: number;
};

/** Entrada de la regla de 3 (PRD §7.2). */
export type RuleOfThreeInput = {
  /** Ovillos de la lana de referencia. Entero positivo. */
  skeinsA: number;
  /** Metros por ovillo de la lana de referencia. Positivo (no puede ser 0). */
  lengthA: number;
  /** Metros por ovillo de la lana objetivo. Positivo. */
  lengthB: number;
};
