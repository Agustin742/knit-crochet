import { NextResponse } from "next/server";

import {
  ImageUploadFailedError,
  ImageUploadUnavailableError,
  uploadImageInputSchema,
  uploadUserIdSchema,
  uploadUserImage,
} from "@/features/uploads";
import {
  errorResponse,
  readFormData,
  unexpectedErrorResponse,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

const ROUTE = "POST /api/uploads/image";

/**
 * Endpoint **único** de subida (PRD §11.7), compartido por los formularios de
 * Project, Yarn y Pattern: nada aquí sabe de ninguna entidad.
 *
 * Del formulario se lee **solo** el campo `file`. La carpeta y el `publicId` se
 * derivan del `userId` del JWT, así que ningún campo del body puede influir en
 * la ruta de destino en Cloudinary (deuda técnica 3).
 */
export const POST = withSession(
  ROUTE,
  async (userId: string, request: Request) => {
    const session = uploadUserIdSchema.safeParse(userId);
    if (!session.success) {
      return errorResponse("No autenticado.", 401);
    }

    const form = await readFormData(request);
    const parsed = uploadImageInputSchema.safeParse({ file: form?.get("file") });
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const { url } = await uploadUserImage(session.data, parsed.data.file);
      return NextResponse.json({ url }, { status: 201 });
    } catch (error) {
      if (error instanceof ImageUploadFailedError) {
        console.error(`[${ROUTE}]`, error);
        return errorResponse(
          "No se pudo subir la imagen. Inténtalo de nuevo.",
          502,
        );
      }
      if (error instanceof ImageUploadUnavailableError) {
        return unexpectedErrorResponse(ROUTE, error);
      }
      throw error;
    }
  },
);
