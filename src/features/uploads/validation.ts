import { z } from "zod";

/**
 * Lista blanca cerrada (PRD §11.9): lo que no está enumerado se rechaza. Es una
 * lista blanca y no una lista negra a propósito — un formato nuevo entra aquí
 * de forma explícita, nunca por omisión.
 */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/**
 * 4 MB (PRD §11.9). El valor está **atado a la plataforma**, no elegido al gusto:
 * las funciones de Vercel limitan el cuerpo de petición a 4,5 MB a nivel de
 * infraestructura —no se sube desde `vercel.json` ni desde el código— y lo que
 * lo excede muere con un `413 FUNCTION_PAYLOAD_TOO_LARGE` de la plataforma
 * **antes** de que este handler exista, así que el cliente recibiría un error
 * que no es nuestro `{ error }`. Los 4 MB dejan margen para el sobrecoste del
 * `multipart`. **Quien suba este tope tiene que resolver antes el límite de la
 * plataforma** (subida directa del navegador a Cloudinary con firma).
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const acceptedTypes: readonly string[] = ACCEPTED_IMAGE_TYPES;

/**
 * El `userId` con el que se construye la ruta de Cloudinary sale del JWT y pasa
 * por aquí antes de tocar nada: es un uuid de la tabla `users`, así que un valor
 * que no lo sea significa sesión corrupta, no petición inválida (deuda técnica 3).
 */
export const uploadUserIdSchema = z.uuid();

/**
 * El archivo se valida **antes** de llamar a Cloudinary (PRD §11.9): un archivo
 * que no pasa el filtro no consume red ni cuota.
 */
export const uploadImageInputSchema = z.object({
  file: z
    .instanceof(Blob, { error: "Falta el archivo de imagen." })
    .refine((file) => file.size > 0, "El archivo de imagen está vacío.")
    .refine(
      (file) => acceptedTypes.includes(file.type),
      `Formato no admitido. Usa ${ACCEPTED_IMAGE_TYPES.join(", ")}.`,
    )
    .refine(
      (file) => file.size <= MAX_IMAGE_BYTES,
      `La imagen supera el máximo de ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
    ),
});

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];
export type UploadImageInput = z.infer<typeof uploadImageInputSchema>;
