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

/**
 * Filtro de **tipo**, lo único que las dos peticiones comparten. `undefined` =
 * sin filtro: los dos botones de tipo son **combinables** (RFC-02 §1) y el
 * endpoint sólo acepta UN craft type, así que "los dos marcados" y "ninguno
 * marcado" piden lo mismo: todo.
 */
export type TypeQuery = {
  type?: CraftType;
};

/**
 * Lo que pide el panel de métricas: un año, y el filtro de tipo. El año es
 * **suyo y sólo suyo** — la lista de proyectos en curso NO se filtra por año
 * (RFC-02 §7-quinquies, E4 a), y por eso ya no hay un tipo común a las dos.
 */
export type DashboardQuery = TypeQuery & {
  year: number;
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
 *
 * **NO recibe año** (RFC-02 §7-quinquies, E4 a): "proyectos en curso" es lo que
 * está abierto AHORA, no una rebanada del año. Antes aceptaba un `year` que
 * nunca mandaba —el parámetro mentía, deuda 153— y esa mentira sostenía un
 * `isEmpty` que hacía inalcanzable el estado vacío. El filtro de tipo sí se
 * manda: ése también es del presente.
 */
export async function getActiveProjects(
  query: TypeQuery,
): Promise<DashboardRequestResult<SerializedProject[]>> {
  const result = await request<ProjectListPayload>(
    `${PROJECTS_ENDPOINT}${queryString({
      active: "true",
      type: query.type,
    })}`,
  );
  return result.ok ? { ok: true, data: result.data.projects } : result;
}

/*
 * **Acá vivía `createProject`, y se retiró con la enmienda E7 (a).**
 *
 * Mandaba sólo `{name, type}` —su propio JSDoc decía que el resto era trabajo
 * del formulario completo de #22—, y cuando ese formulario llegó, el Dashboard
 * se quedó con el modal viejo: dos altas distintas con el mismo título (ficha
 * **185**). Ahora el Dashboard monta el `ProjectFormDialog` de `/proyectos`, que
 * usa el `createProject` de `projects-client.ts` — ya probado y aprobado—, así
 * que este era un segundo camino al mismo endpoint sin nadie que lo usara.
 */
