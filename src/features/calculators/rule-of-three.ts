import { InvalidCalculatorInputError } from "@/features/calculators/errors";
import type { RuleOfThreeInput } from "@/features/calculators/types";

/**
 * Regla de 3 para estimar cuántos ovillos de una lana equivalen a otra por
 * metraje (PRD §7.2): `skeinsB = ceil(skeinsA × lengthB / lengthA)`.
 *
 * Redondeo SIEMPRE hacia arriba (`Math.ceil`): un resultado fraccionario
 * significa que hace falta comprar el ovillo siguiente completo; nunca se
 * redondea a la baja para no quedarse corto de lana.
 *
 * Validación: `skeinsA` debe ser un entero positivo (ovillos enteros) y
 * `lengthA`/`lengthB` deben ser números finitos positivos (`lengthA` no puede
 * ser 0: división por cero). En otro caso lanza `InvalidCalculatorInputError`.
 */
export function calculateRuleOfThree(input: RuleOfThreeInput): number {
  const { skeinsA, lengthA, lengthB } = input;

  if (!Number.isInteger(skeinsA) || skeinsA <= 0) {
    throw new InvalidCalculatorInputError(
      "Los ovillos deben ser un número entero mayor que 0.",
    );
  }
  if (!Number.isFinite(lengthA) || lengthA <= 0) {
    throw new InvalidCalculatorInputError(
      "El metraje de la lana de referencia debe ser mayor que 0.",
    );
  }
  if (!Number.isFinite(lengthB) || lengthB <= 0) {
    throw new InvalidCalculatorInputError(
      "El metraje de la lana objetivo debe ser mayor que 0.",
    );
  }

  return Math.ceil((skeinsA * lengthB) / lengthA);
}
