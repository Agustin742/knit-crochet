/**
 * Se usa también cuando el patrón existe pero es de otro usuario: el BFF
 * responde 404 para no revelar su existencia (nunca 403).
 */
export class PatternNotFoundError extends Error {
  constructor() {
    super("El patrón no existe.");
    this.name = "PatternNotFoundError";
  }
}
