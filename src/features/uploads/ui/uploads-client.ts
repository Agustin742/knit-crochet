import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/features/uploads/validation";

/**
 * Costura HTTP de la subida de imágenes (design D10, backlog 25). `#22`
 * (`projects-client.ts:582-679`) ya midió los tres puntos del contrato de
 * `POST /api/uploads/image`; este cliente los repite para el feature
 * `uploads` en vez de sumar un quinto clon dentro de `yarns-client.ts` —
 * entrada 28 (formulario de patrones) también lo va a necesitar. Migrar
 * `projects-client.ts` a este cliente compartido queda como deuda de
 * seguimiento (ver `docs/historial/deuda-tecnica.md`, deuda 200); la deuda
 * 129 (cliente HTTP compartido) sigue abierta.
 */
export const UPLOADS_IMAGE_ENDPOINT = "/api/uploads/image";

export const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
export const UNEXPECTED_ERROR_MESSAGE =
  "Algo salió mal. Intentá de nuevo en unos segundos.";

/**
 * El endpoint lee SÓLO este campo del formulario
 * (`app/api/uploads/image/route.ts`). Mandarlo con otro nombre responde 400
 * con "Falta el archivo de imagen.", que parece un problema del archivo y no
 * lo es.
 */
export const UPLOAD_FILE_FIELD = "file";

/**
 * Éxito = 201, no 200. El endpoint responde 201 con `{ url }`; un cliente
 * escrito contra `response.ok` confundiría los dos, y ningún test que
 * devuelva 201 lo delataría.
 */
export const UPLOAD_CREATED_STATUS = 201;

/* Los formatos y el tope se DERIVAN de la validación del servidor: si mañana
   entra un formato nuevo, el mensaje lo dice sin que nadie se acuerde de
   venir acá. */
const UPLOAD_ACCEPTED_FORMATS = ACCEPTED_IMAGE_TYPES.map(
  (type) => type.split("/")[1]?.toUpperCase() ?? type,
).join(", ");

const UPLOAD_MAX_MB = MAX_IMAGE_BYTES / (1024 * 1024);

/**
 * Repliegues por status, usados SÓLO si el cuerpo del servidor no se puede
 * leer — cuando el servidor manda su `{ error }`, ése gana porque es más
 * preciso (dice si falló el formato o el tamaño).
 */
export const UPLOAD_IMAGE_REJECTED_MESSAGE = `No pudimos usar esa imagen. Tiene que ser ${UPLOAD_ACCEPTED_FORMATS} y pesar menos de ${UPLOAD_MAX_MB} MB.`;
export const UPLOAD_UNAUTHORIZED_MESSAGE =
  "Tu sesión caducó. Volvé a entrar y probá de nuevo con la foto.";
/** 502 = el proveedor de imágenes falló, no el archivo. Reintentar sirve. */
export const UPLOAD_PROVIDER_DOWN_MESSAGE =
  "El servicio de imágenes no responde ahora mismo. Probá de nuevo en un minuto.";

const UPLOAD_FALLBACKS: Record<number, string> = {
  400: UPLOAD_IMAGE_REJECTED_MESSAGE,
  401: UPLOAD_UNAUTHORIZED_MESSAGE,
  502: UPLOAD_PROVIDER_DOWN_MESSAGE,
};

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
  } catch {
    // Un 500 puede responder HTML: el repliegue es la salida correcta.
  }
  return fallback;
}

export type UploadImageResult =
  | { ok: true; data: string }
  | { ok: false; message: string };

/**
 * `POST /api/uploads/image` — sube la foto y devuelve SU URL.
 *
 * Tres cosas que no se pueden tocar sin romperlo:
 *
 * 1. `multipart/form-data` con el campo `file`. El cuerpo es un `FormData` y
 *    NO se fija la cabecera de tipo de contenido a mano: el navegador tiene
 *    que poner la suya CON la frontera del multipart, que sólo él conoce.
 * 2. Éxito = 201 (ver `UPLOAD_CREATED_STATUS`).
 * 3. El endpoint no admite ningún otro campo: la carpeta y el identificador
 *    en el proveedor se derivan del JWT, no del cuerpo.
 *
 * Devuelve la URL pelada, no el payload: lo que el formulario guarda en
 * `values.image` es una cadena.
 */
export async function uploadImage(file: File): Promise<UploadImageResult> {
  const body = new FormData();
  body.append(UPLOAD_FILE_FIELD, file);

  let response: Response;
  try {
    response = await fetch(UPLOADS_IMAGE_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      body,
    });
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }

  if (response.status !== UPLOAD_CREATED_STATUS) {
    return {
      ok: false,
      message: await readErrorMessage(
        response,
        UPLOAD_FALLBACKS[response.status] ?? UNEXPECTED_ERROR_MESSAGE,
      ),
    };
  }

  try {
    const payload = (await response.json()) as Partial<{ url: string }>;
    if (typeof payload.url !== "string") {
      // Un 201 con cuerpo válido pero sin `url` no deja ninguna URL que
      // guardar — es tan inservible como uno ilegible (R3-001).
      return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
    }
    return { ok: true, data: payload.url };
  } catch {
    // Un 201 con cuerpo ilegible no deja ninguna URL que guardar.
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }
}
