import {
  ImageUploadFailedError,
  ImageUploadUnavailableError,
} from "@/features/uploads/api/errors";
import {
  CloudinaryUploadError,
  MissingCloudinaryConfigError,
  uploadImage,
  type UploadedImage,
  type UploadImageOptions,
} from "@/shared/lib/cloudinary";

/** Raíz común de las subidas; cada usuario cuelga de aquí con su propia carpeta. */
export const UPLOADS_ROOT_FOLDER = "knit-crochet/users";

export type ImageUploader = (
  file: Blob,
  options?: UploadImageOptions,
) => Promise<UploadedImage>;

/**
 * Determinista por usuario: todas sus imágenes viven bajo la misma carpeta, y
 * el único origen posible del valor es el `userId` del JWT (deuda técnica 3).
 */
export function buildUserImageFolder(userId: string): string {
  return `${UPLOADS_ROOT_FOLDER}/${userId}`;
}

/**
 * Único por subida a propósito (PRD §11.9). Las entidades guardan la **URL**:
 * un `publicId` determinista haría que la segunda foto de un usuario
 * sobrescribiera la primera en Cloudinary y rompiera en silencio las URLs ya
 * persistidas en filas anteriores.
 */
export function createImagePublicId(): string {
  return crypto.randomUUID();
}

/**
 * Sube la imagen de un usuario y devuelve su URL. Traduce las excepciones del
 * helper de Cloudinary a errores de dominio para que el Route Handler decida el
 * status HTTP sin conocer al proveedor.
 */
export async function uploadUserImage(
  userId: string,
  file: Blob,
  upload: ImageUploader = uploadImage,
): Promise<UploadedImage> {
  try {
    return await upload(file, {
      folder: buildUserImageFolder(userId),
      publicId: createImagePublicId(),
    });
  } catch (error) {
    if (error instanceof MissingCloudinaryConfigError) {
      throw new ImageUploadUnavailableError({ cause: error });
    }
    if (error instanceof CloudinaryUploadError) {
      throw new ImageUploadFailedError(error.reason, { cause: error });
    }
    throw error;
  }
}
