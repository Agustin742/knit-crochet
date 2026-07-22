/**
 * Se usa también cuando el proyecto existe pero es de otro usuario: el BFF
 * responde 404 para no revelar su existencia (nunca 403).
 */
export class ProjectNotFoundError extends Error {
  constructor() {
    super("El proyecto no existe.");
    this.name = "ProjectNotFoundError";
  }
}

/**
 * Misma regla para el otro extremo del enlace N:N: una lana de otro usuario es
 * indistinguible de una inexistente (404, nunca 403).
 */
export class YarnNotFoundError extends Error {
  constructor() {
    super("La lana no existe.");
    this.name = "YarnNotFoundError";
  }
}
