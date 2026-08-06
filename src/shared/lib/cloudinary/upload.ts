import { getCloudinaryConfig } from "@/shared/lib/cloudinary/config";

/** Raíz de la API REST de Cloudinary; el nombre de la cuenta cuelga de aquí. */
export const CLOUDINARY_API_BASE = "https://api.cloudinary.com/v1_1";

export type CloudinaryUploadFailureReason =
  | "network"
  | "rejected"
  | "malformed_response";

export class CloudinaryUploadError extends Error {
  readonly reason: CloudinaryUploadFailureReason;
  readonly status: number | undefined;

  constructor(
    reason: CloudinaryUploadFailureReason,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "CloudinaryUploadError";
    this.reason = reason;
    this.status = options.status;
  }
}

/**
 * Único resultado de una subida: la URL. Es lo único que se persiste en la DB
 * (PRD §2); el binario nunca sale de Cloudinary ni se guarda en Postgres.
 */
export type UploadedImage = {
  url: string;
};

export type UploadImageOptions = {
  folder?: string;
  publicId?: string;
};

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Firma de la API de Cloudinary: sha1 de los parámetros firmables ordenados
 * alfabéticamente (`clave=valor` unidos por `&`) concatenados con el
 * `api_secret`. El secreto nunca viaja en la petición ni se registra.
 */
export async function buildUploadSignature(
  params: Readonly<Record<string, string>>,
  apiSecret: string,
): Promise<string> {
  const canonical = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return sha1Hex(`${canonical}${apiSecret}`);
}

function extractSecureUrl(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const url = (payload as { secure_url?: unknown }).secure_url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

async function readRejectionMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null) {
      const error = (payload as { error?: { message?: unknown } }).error;
      if (error && typeof error.message === "string") {
        return error.message;
      }
    }
  } catch {
    // Cuerpo no-JSON: nos quedamos con el status como única señal.
  }
  return `HTTP ${response.status}`;
}

/**
 * Sube una imagen a Cloudinary y devuelve su URL definitiva.
 *
 * Contrato de error (excepción tipada): ante cualquier fallo lanza
 * `CloudinaryUploadError` (red, rechazo de Cloudinary o respuesta ilegible) o
 * `MissingCloudinaryConfigError` si el entorno no está configurado. El
 * consumidor (Route Handler) **debe** capturarlas y traducirlas a su status
 * HTTP: así el fallo de subida nunca tumba el endpoint.
 */
export async function uploadImage(
  file: Blob,
  options: UploadImageOptions = {},
): Promise<UploadedImage> {
  const config = getCloudinaryConfig();

  const signedParams: Record<string, string> = {
    timestamp: Math.floor(Date.now() / 1000).toString(),
  };
  if (options.folder) {
    signedParams.folder = options.folder;
  }
  if (options.publicId) {
    signedParams.public_id = options.publicId;
  }

  const signature = await buildUploadSignature(signedParams, config.apiSecret);

  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(signedParams)) {
    form.append(key, value);
  }
  form.append("api_key", config.apiKey);
  form.append("signature", signature);

  let response: Response;
  try {
    response = await fetch(
      `${CLOUDINARY_API_BASE}/${config.cloudName}/image/upload`,
      { method: "POST", body: form },
    );
  } catch (error) {
    throw new CloudinaryUploadError(
      "network",
      "No se pudo contactar con Cloudinary para subir la imagen.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new CloudinaryUploadError(
      "rejected",
      `Cloudinary rechazó la subida: ${await readRejectionMessage(response)}`,
      { status: response.status },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new CloudinaryUploadError(
      "malformed_response",
      "Cloudinary devolvió una respuesta ilegible.",
      { status: response.status, cause: error },
    );
  }

  const url = extractSecureUrl(payload);
  if (!url) {
    throw new CloudinaryUploadError(
      "malformed_response",
      "Cloudinary no devolvió la URL de la imagen subida.",
      { status: response.status },
    );
  }

  return { url };
}
