/**
 * Entrada inválida para una calculadora (PRD §7). Las calculadoras son lógica
 * pura sin DB ni endpoint, pero igual validan en el borde: números no positivos
 * o no enteros donde se exige un entero lanzan este error nombrado (nunca un
 * `Error` genérico), coherente con el resto del repo. Al cablear la UI, el
 * cliente lo captura y muestra `message`.
 */
export class InvalidCalculatorInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCalculatorInputError";
  }
}
