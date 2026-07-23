/**
 * Detener un cronómetro que no está corriendo no es un "no existe" (el proyecto
 * sí existe y es del usuario): es un conflicto de estado, así que el BFF
 * responde 409 y nunca 404/500. Ver la decisión del doble stop en
 * `progress/reports/impl_time_tracking.md`.
 */
export class NoActiveSessionError extends Error {
  constructor() {
    super("No hay ninguna sesión de tejido en marcha.");
    this.name = "NoActiveSessionError";
  }
}
