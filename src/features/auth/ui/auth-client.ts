export const LOGIN_ENDPOINT = "/api/auth/login";
export const REGISTER_ENDPOINT = "/api/auth/register";

export const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
export const UNEXPECTED_ERROR_MESSAGE =
  "Algo salió mal. Intentá de nuevo en unos segundos.";

/** `status: 0` = la petición no llegó a salir (red caída, DNS, CORS). */
export type AuthRequestResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

async function readErrorMessage(response: Response): Promise<string> {
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
    // Un 500 puede responder HTML: el mensaje genérico es la salida correcta.
  }
  return UNEXPECTED_ERROR_MESSAGE;
}

/**
 * POST de los dos endpoints de auth. Devuelve sólo lo que el formulario puede
 * usar: si fue bien (la cookie de sesión la setea el servidor y es `httpOnly`,
 * el cliente no la ve ni la necesita) y, si no, el **status** y el mensaje.
 *
 * El status es lo que decide DÓNDE se pinta el error: el cuerpo de estos
 * endpoints nunca dice qué campo falló (`{ error: string }` y nada más), así que
 * `409` en register es la única señal de "email duplicado" y `401` en login es,
 * a propósito, el mismo mensaje para email inexistente y password errónea.
 */
export async function postAuth(
  endpoint: string,
  payload: unknown,
): Promise<AuthRequestResult> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE };
  }

  // `ok` cubre el 200 del login y el 201 del register.
  if (response.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    status: response.status,
    message: await readErrorMessage(response),
  };
}
