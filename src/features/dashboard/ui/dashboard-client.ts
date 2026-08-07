import type { DashboardMetrics } from "@/features/dashboard/types";
import type {
  ProjectListPayload,
  SerializedProject,
} from "@/features/projects/ui";
import type { CraftType } from "@/shared/config";

/**
 * Costura HTTP del Dashboard. No hay cliente compartido para el navegador en el
 * repo (`shared/lib/http.ts` es exclusivamente de servidor), así que esto copia
 * la forma del único precedente, `features/auth/ui/auth-client.ts`: endpoints y
 * mensajes como constantes exportadas —para que los tests los importen en vez de
 * reescribirlos—, `fetch` pelado con `credentials: "same-origin"`, resultado
 * como unión discriminada en vez de excepciones, y un lector de error defensivo
 * porque un 500 puede responder HTML.
 */
export const METRICS_ENDPOINT = "/api/dashboard/metrics";
export const PROJECTS_ENDPOINT = "/api/projects";

export const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
export const UNEXPECTED_ERROR_MESSAGE =
  "Algo salió mal. Intentá de nuevo en unos segundos.";

/** `status: 0` = la petición no llegó a salir (red caída, DNS, CORS). */
export type DashboardRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export type DashboardQuery = {
  year: number;
  /**
   * `undefined` = sin filtro. Los dos botones de tipo son **combinables**
   * (RFC-02 §1) y el endpoint sólo acepta UN craft type, así que "los dos
   * marcados" y "ninguno marcado" piden lo mismo: todo.
   */
  type?: CraftType;
};

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

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<DashboardRequestResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", ...init });
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await readErrorMessage(response),
    };
  }

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    // Un 200 con cuerpo ilegible es tan inservible como un 500.
    return { ok: false, status: response.status, message: UNEXPECTED_ERROR_MESSAGE };
  }
}

function queryString(entries: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/**
 * `GET /api/dashboard/metrics`. La respuesta es el objeto **PLANO**
 * (`DashboardMetrics`), sin envoltorio — a diferencia de la de proyectos. La
 * asimetría es del contrato, no un descuido de aquí.
 */
export function getMetrics(
  query: DashboardQuery,
): Promise<DashboardRequestResult<DashboardMetrics>> {
  return request<DashboardMetrics>(
    `${METRICS_ENDPOINT}${queryString({
      year: String(query.year),
      type: query.type,
    })}`,
  );
}

/**
 * `GET /api/projects?active=true`. La respuesta viene **envuelta** en
 * `{ projects }`, y `active` sólo acepta las cadenas literales `true`/`false`
 * (`?active=1` responde 400).
 *
 * No se pide ni `limit` ni `offset` porque el contrato no los tiene: el tope de
 * ~15 y el orden son de cliente (RFC-02 §3).
 */
export async function getActiveProjects(
  query: DashboardQuery,
): Promise<DashboardRequestResult<SerializedProject[]>> {
  const result = await request<ProjectListPayload>(
    `${PROJECTS_ENDPOINT}${queryString({
      active: "true",
      type: query.type,
    })}`,
  );
  return result.ok ? { ok: true, data: result.data.projects } : result;
}

/**
 * `POST /api/projects` de la creación rápida (RFC-02 §6: aquí sólo el modal de
 * alta, no el CRUD). Manda lo mínimo que el schema exige —nombre y tipo—; el
 * resto de campos tienen default en la tabla y son trabajo del formulario
 * completo (#22). Éxito = **201**.
 */
export function createProject(input: {
  name: string;
  type: CraftType;
}): Promise<DashboardRequestResult<unknown>> {
  return request<unknown>(PROJECTS_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
