import type { CraftType } from "@/shared/config";

import type {
  LinkedYarnIdsPayload,
  PatternPayload,
  ProjectListPayload,
  ProjectPayload,
  SerializedCraftSession,
  SerializedPattern,
  SerializedProject,
  SerializedProjectDetail,
  SessionListPayload,
  StopSessionPayload,
  YarnListPayload,
  YarnOption,
} from "./types";

/**
 * Costura HTTP de la lista de proyectos (RFC-03, enmienda **E1(h)**).
 *
 * Es el **tercer clon** del mismo patrón, y se duplica a propósito: no hay
 * cliente compartido de navegador en el repo (`shared/lib/http.ts` importa
 * `next/server` y es exclusivamente de Route Handlers), y extraer uno tocaría
 * dos features ya `done` y revisadas (auth y dashboard) y sus tests. Queda
 * fichado como deuda para no llegar a cinco copias en #21/#22.
 *
 * Hereda las cinco decisiones del molde (`features/dashboard/ui/dashboard-client.ts`):
 * endpoints y mensajes como **constantes exportadas** —para que los tests los
 * importen en vez de reescribirlos—, `fetch` pelado con
 * `credentials: "same-origin"`, resultado como **unión discriminada** en vez de
 * excepciones, `status: 0` = la petición no llegó a salir, y lector de error
 * defensivo (un 500 puede responder HTML; un 200 con cuerpo ilegible es tan
 * inservible como un 500).
 *
 * **Y ensancha una:** el molde mira sólo `response.ok`, que funde 200 y 201. El
 * quick-start necesita distinguirlos —201 = arranqué yo, 200 = ya estaba
 * corriendo (E1(e))—, así que el `status` viaja **también en el camino OK**.
 */
export const PROJECTS_ENDPOINT = "/api/projects";
export const YARNS_ENDPOINT = "/api/yarns";

/** `POST /api/projects/:id/sessions/start` — arranca (o reutiliza) una sesión. */
export function sessionStartEndpoint(projectId: string): string {
  return `${PROJECTS_ENDPOINT}/${projectId}/sessions/start`;
}

export const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
export const UNEXPECTED_ERROR_MESSAGE =
  "Algo salió mal. Intentá de nuevo en unos segundos.";

/** `status: 0` = la petición no llegó a salir (red caída, DNS, CORS). */
export type ProjectsRequestResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

/**
 * Los cuatro filtros que el toolbar manda al servidor. **"Buscar" no está**, y
 * no es un olvido: `projectFiltersSchema` no tiene ninguna clave de texto y es
 * un `z.object` **sin `.strict()`**, así que `?search=` respondería **200 con la
 * lista sin filtrar** — no un 400. Un buscador cableado contra un parámetro
 * inexistente no falla: miente. Por eso el texto se filtra en cliente (E1(a)).
 *
 * El rango de fechas (`?from=&to=`) existe en el backend pero **no entra en
 * #20** (E1(b)).
 */
export type ProjectListFilters = {
  /**
   * `true` = en curso o en pausa; `false` = terminados o abandonados. Siempre se
   * manda: **el backend no tiene default de "activos"** —sin el parámetro
   * devuelve todo—, así que el "default activos" del RFC es de cliente. Y sólo
   * acepta las cadenas `"true"`/`"false"`: `?active=1` responde 400.
   */
  active: boolean;
  /** `undefined` = sin filtro. El endpoint acepta UN craft type por petición. */
  type?: CraftType;
  /** Medida en mm. El filtro es contención jsonb: un solo valor por petición. */
  needle?: number;
  yarnId?: string;
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
): Promise<ProjectsRequestResult<T>> {
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
    return {
      ok: true,
      status: response.status,
      data: (await response.json()) as T,
    };
  } catch {
    // Un 200 con cuerpo ilegible es tan inservible como un 500.
    return {
      ok: false,
      status: response.status,
      message: UNEXPECTED_ERROR_MESSAGE,
    };
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
 * `GET /api/projects`. La respuesta viene **envuelta** en `{ projects }` —a
 * diferencia de la de métricas del Dashboard, que es plana: la asimetría es del
 * contrato—. No se pide ni `limit` ni `offset` porque **no existen**: el
 * endpoint no pagina y el orden (`startDate` descendente) es fijo.
 */
export async function getProjects(
  filters: ProjectListFilters,
): Promise<ProjectsRequestResult<SerializedProject[]>> {
  const result = await request<ProjectListPayload>(
    `${PROJECTS_ENDPOINT}${queryString({
      active: filters.active ? "true" : "false",
      type: filters.type,
      needle: filters.needle === undefined ? undefined : String(filters.needle),
      yarnId: filters.yarnId,
    })}`,
  );
  return result.ok
    ? { ok: true, status: result.status, data: result.data.projects }
    : result;
}

/**
 * `GET /api/yarns` para poblar el desplegable de "lana usada". Responde
 * **envuelto** (`{ yarns }`) y devuelve la fila cruda: `brandId`/`typeId` son
 * **UUID, no nombres**, así que de aquí sólo se rescatan los tres campos con los
 * que se puede etiquetar por color (E1(d)).
 */
export async function getYarnOptions(): Promise<
  ProjectsRequestResult<YarnOption[]>
> {
  const result = await request<YarnListPayload>(YARNS_ENDPOINT);
  return result.ok
    ? { ok: true, status: result.status, data: result.data.yarns }
    : result;
}

/**
 * `POST /api/projects/:id/sessions/start` — el quick-start de la tarjeta.
 *
 * **Sin cuerpo**: el esquema es `z.strictObject({}).nullish()`, así que mandar
 * cualquier campo responde 400. Y es **idempotente**: **201** si crea la sesión,
 * **200** si ya había una abierta y la reutiliza. Nunca 409, nunca duplica,
 * nunca reinicia el `start` (el 409 vive en el *stop*, no aquí). Por eso el
 * botón puede ser optimista: un doble toque no corrompe nada.
 */
export function startCraftSession(
  projectId: string,
): Promise<ProjectsRequestResult<unknown>> {
  return request<unknown>(sessionStartEndpoint(projectId), { method: "POST" });
}

/** Creada = **201**; reutilizada = 200. Es la única señal de "ya estaba corriendo". */
export const SESSION_CREATED_STATUS = 201;

/**
 * `GET /api/projects/:id` — el detalle que abre el cajón (RFC-03 §3).
 *
 * Devuelve el proyecto **y sus lanas enlazadas** en claves hermanas: eso lo saldó
 * la feature #17 (deuda 5), así que el cajón no necesita una segunda petición
 * para el tab Lanas.
 *
 * **Vive acá y no en un cliente nuevo.** Es la misma pantalla y el mismo molde
 * (E1(h) ya fichó que hay tres clones del patrón en el repo); abrir un cuarto
 * para un endpoint hermano del que ya está en este archivo sería empeorar la
 * deuda por trámite.
 *
 * Un id con formato inválido responde **404, no 400** —lo dice el Route
 * Handler—, así que el camino de error es uno solo: el mensaje que venga.
 */
export function projectDetailEndpoint(projectId: string): string {
  return `${PROJECTS_ENDPOINT}/${projectId}`;
}

export function getProjectDetail(
  projectId: string,
): Promise<ProjectsRequestResult<SerializedProjectDetail>> {
  return request<SerializedProjectDetail>(projectDetailEndpoint(projectId));
}

/* ============================================================================
   Las acciones del cajón de detalle (RFC-03 §3, tanda 2 de la enmienda E3(a)).

   Todas viven en ESTE archivo por lo mismo que `getProjectDetail`: son la misma
   pantalla y el mismo molde. E1(h) ya fichó que hay tres clones del patrón en el
   repo; abrir un cuarto para los endpoints hermanos del que ya está aquí sería
   empeorar la deuda por trámite.
   ============================================================================ */

export function projectRoundsEndpoint(projectId: string): string {
  return `${projectDetailEndpoint(projectId)}/rounds`;
}
export function projectStepsEndpoint(projectId: string): string {
  return `${projectDetailEndpoint(projectId)}/steps`;
}
export function projectYarnsEndpoint(projectId: string): string {
  return `${projectDetailEndpoint(projectId)}/yarns`;
}
export function projectYarnEndpoint(projectId: string, yarnId: string): string {
  return `${projectYarnsEndpoint(projectId)}/${yarnId}`;
}
export function projectSessionsEndpoint(projectId: string): string {
  return `${projectDetailEndpoint(projectId)}/sessions`;
}
export function sessionStopEndpoint(projectId: string): string {
  return `${projectSessionsEndpoint(projectId)}/stop`;
}
export function patternEndpoint(patternId: string): string {
  return `${PATTERNS_ENDPOINT}/${patternId}`;
}

export const PATTERNS_ENDPOINT = "/api/patterns";

const JSON_HEADERS = { "content-type": "application/json" };

function jsonRequest<T>(
  url: string,
  method: string,
  body: unknown,
): Promise<ProjectsRequestResult<T>> {
  return request<T>(url, {
    method,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

/**
 * Petición cuya respuesta correcta **no tiene cuerpo**. Existe porque el camino
 * feliz de `request` llama a `response.json()`, y sobre un **204** eso lanza: el
 * desenlace de una lana se leería como un fallo aunque el servidor lo hubiera
 * hecho bien.
 */
async function requestWithoutBody(
  url: string,
  init: RequestInit,
): Promise<ProjectsRequestResult<null>> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", ...init });
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE };
  }
  return response.ok
    ? { ok: true, status: response.status, data: null }
    : {
        ok: false,
        status: response.status,
        message: await readErrorMessage(response),
      };
}

/** Los endpoints que devuelven el proyecto entero ya recalculado. */
async function projectMutation(
  url: string,
  method: string,
  body: unknown,
): Promise<ProjectsRequestResult<SerializedProject>> {
  const result = await jsonRequest<ProjectPayload>(url, method, body);
  return result.ok
    ? { ok: true, status: result.status, data: result.data.project }
    : result;
}

/**
 * `POST /api/projects/:id/rounds` — suma o resta vueltas.
 *
 * El delta puede ser negativo y el servicio **impide que `rounds` baje de 0**,
 * así que un "menos" de más no puede dejar el contador en negativo. Devuelve el
 * proyecto con `progress` **ya recalculado** por la única fuente del cálculo del
 * backend: el porcentaje no se vuelve a calcular en el navegador, que es como se
 * desincronizan las dos mitades.
 */
export function addProjectRounds(
  projectId: string,
  delta: number,
): Promise<ProjectsRequestResult<SerializedProject>> {
  return projectMutation(projectRoundsEndpoint(projectId), "POST", { delta });
}

/**
 * `PATCH /api/projects/:id` con la meta. **No hay endpoint propio de
 * `targetRounds`**: es una columna del proyecto y se actualiza como tal. El
 * servidor recalcula `progress` porque el parche toca la meta.
 */
export function updateProjectTargetRounds(
  projectId: string,
  targetRounds: number,
): Promise<ProjectsRequestResult<SerializedProject>> {
  return projectMutation(projectDetailEndpoint(projectId), "PATCH", {
    targetRounds,
  });
}

/**
 * `PATCH /api/projects/:id/steps` — **reemplaza** el conjunto entero de pasos
 * completados; no es un "marcar uno". El servidor lo normaliza (sin duplicados y
 * ascendente), así que el orden en que se manden da igual.
 */
export function setProjectSteps(
  projectId: string,
  completedSteps: readonly number[],
): Promise<ProjectsRequestResult<SerializedProject>> {
  return projectMutation(projectStepsEndpoint(projectId), "PATCH", {
    completedSteps: [...completedSteps],
  });
}

/**
 * `POST /api/projects/:id/yarns` — enlaza una lana. **Idempotente**: 201 si crea
 * el enlace, 200 si ya existía; nunca 409.
 *
 * Devuelve **sólo ids**. Los nombres de marca y tipo salen de un JOIN que sólo
 * hace `GET /api/projects/:id`, así que quien enlaza tiene que volver a pedir el
 * detalle para poder etiquetar la lana recién añadida.
 */
export function linkProjectYarn(
  projectId: string,
  yarnId: string,
): Promise<ProjectsRequestResult<LinkedYarnIdsPayload>> {
  return jsonRequest<LinkedYarnIdsPayload>(
    projectYarnsEndpoint(projectId),
    "POST",
    { yarnId },
  );
}

/**
 * `DELETE /api/projects/:id/yarns/:yarnId` — **204 tanto si había enlace como si
 * no**: desenlazar es idempotente y su respuesta no tiene cuerpo.
 */
export function unlinkProjectYarn(
  projectId: string,
  yarnId: string,
): Promise<ProjectsRequestResult<null>> {
  return requestWithoutBody(projectYarnEndpoint(projectId, yarnId), {
    method: "DELETE",
  });
}

/**
 * `GET /api/projects/:id/sessions` — el historial, de la más reciente a la más
 * antigua. **Es también la única forma de saber si el cronómetro corre**: la
 * sesión abierta es la que tiene `end` en nulo.
 */
export async function getProjectSessions(
  projectId: string,
): Promise<ProjectsRequestResult<SerializedCraftSession[]>> {
  const result = await request<SessionListPayload>(
    projectSessionsEndpoint(projectId),
  );
  return result.ok
    ? { ok: true, status: result.status, data: result.data.sessions }
    : result;
}

/**
 * `PATCH /api/projects/:id/sessions/stop`.
 *
 * **Sin cuerpo**, igual que el arranque: el esquema es `z.strictObject({})
 * .nullish()`. Y ojo con la asimetría, que es la contraria a la que uno supone:
 * arrancar dos veces es gratis (200 reutilizando), pero **parar dos veces
 * responde 409** con "No hay ninguna sesión de tejido en marcha".
 */
export function stopCraftSession(
  projectId: string,
): Promise<ProjectsRequestResult<StopSessionPayload>> {
  return request<StopSessionPayload>(sessionStopEndpoint(projectId), {
    method: "PATCH",
  });
}

/**
 * `GET /api/patterns/:id` — el patrón del proyecto, del que salen los pasos de
 * la checklist.
 *
 * Se pide **sólo si el proyecto tiene patrón**. `GET /api/projects/:id` trae
 * `patternId`, no el patrón: las instrucciones viven en la tabla de patrones y
 * nadie las aplana en el detalle.
 */
export async function getPattern(
  patternId: string,
): Promise<ProjectsRequestResult<SerializedPattern>> {
  const result = await request<PatternPayload>(patternEndpoint(patternId));
  return result.ok
    ? { ok: true, status: result.status, data: result.data.pattern }
    : result;
}
