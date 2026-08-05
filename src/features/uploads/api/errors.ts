import type { CloudinaryUploadFailureReason } from "@/shared/lib/cloudinary";

/**
 * La subida falló aguas arriba (red, rechazo de Cloudinary o respuesta
 * ilegible). El fallo es del proveedor, no del archivo: el archivo ya pasó el
 * filtro local de tipo y tamaño.
 */
export class ImageUploadFailedError extends Error {
  readonly reason: CloudinaryUploadFailureReason;

  constructor(
    reason: CloudinaryUploadFailureReason,
    options: { cause?: unknown } = {},
  ) {
    super("No se pudo subir la imagen.", { cause: options.cause });
    this.name = "ImageUploadFailedError";
    this.reason = reason;
  }
}

/**
 * Falta configuración de Cloudinary en el entorno. Se distingue del fallo de
 * subida porque el culpable es nuestro despliegue, no el proveedor: reintentar
 * no arregla nada.
 */
export class ImageUploadUnavailableError extends Error {
  constructor(options: { cause?: unknown } = {}) {
    super("El servicio de imágenes no está configurado.", {
      cause: options.cause,
    });
    this.name = "ImageUploadUnavailableError";
  }
}
