import type {
  CreateProjectPayload,
  UpdateProjectPayload,
} from "@/features/projects/validation";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/features/uploads/validation";
import type { CraftType } from "@/shared/config";

import type {
  LinkedYarnIdsPayload,
  PatternListPayload,
  PatternPayload,
  ProjectListPayload,
  ProjectPayload,
  SerializedCraftSession,
  SerializedPattern,
  SerializedProject,
  SerializedProjectDetail,
  SerializedProjectListItem,
  SessionListPayload,
  SessionPayload,
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

/**
 * El mensaje de error del servidor, o el repliegue.
 *
 * El repliegue es un parámetro (y no siempre el genérico) porque hay endpoints
 * donde **el status ya dice qué hacer** aunque el cuerpo no se pueda leer: una
 * subida que falla por 502 no es "algo salió mal", es "el servicio de imágenes
 * no responde, probá en un minuto". Ver `uploadProjectImage`.
 */
async function readErrorMessage(
  response: Response,
  fallback: string = UNEXPECTED_ERROR_MESSAGE,
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
 *
 * Cada proyecto trae **su cronómetro abierto o `null`** (enmienda E7 b3): es lo
 * que permite que la tarjeta sepa si corre **después de recargar la página**,
 * que es exactamente lo que la marca en memoria no podía prometer.
 */
export async function getProjects(
  filters: ProjectListFilters,
): Promise<ProjectsRequestResult<SerializedProjectListItem[]>> {
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
 *
 * **Devuelve la sesión** (enmienda E7 b1), que antes se tiraba como `unknown`:
 * es lo que deja la tarjeta en estado "corriendo" sin volver a pedir la lista, y
 * con el **arranque real** —el del 200 es el de antes, no el de ahora—, así que
 * el reloj empieza en el segundo que toca y no en cero.
 */
export async function startCraftSession(
  projectId: string,
): Promise<ProjectsRequestResult<SerializedCraftSession>> {
  const result = await request<SessionPayload>(
    sessionStartEndpoint(projectId),
    { method: "POST" },
  );
  return result.ok
    ? { ok: true, status: result.status, data: result.data.session }
    : result;
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

/* ============================================================================
   El CRUD del formulario (#22, tanda 1 de la enmienda E6).

   **Vive en ESTE archivo por decisión escrita en E6 (f).** La deuda 129 dice que
   el cliente HTTP de navegador va por su TERCER clon y que el momento natural de
   extraerlo era antes de #22. Bajo la moratoria de gates no interrumpe —no hay
   nada que un usuario pueda ver—, pero tampoco se empeora: escribir el CRUD donde
   ya vive el resto evita un CUARTO clon a coste cero.

   Los tipos de entrada se importan **como tipos** desde la validación del
   feature, no se reescriben: `import type` se borra en la compilación
   (`verbatimModuleSyntax`), así que el navegador no se lleva nada, y si mañana el
   esquema del endpoint gana un campo, éste lo gana también. Se importa por RUTA
   INTERNA y no por el barrel del feature a propósito: el barrel arrastra `./api`
   → Drizzle al bundle del navegador (mismo motivo que en `NewProjectDialog.tsx`).
   ============================================================================ */

/**
 * `POST /api/projects` — el alta **completa**. Éxito = **201** con `{ project }`.
 *
 * No es el mismo que el del Dashboard: aquél acepta **sólo `{ name, type }`** y
 * su propio JSDoc dice que el resto era trabajo de #22
 * (`dashboard/ui/dashboard-client.ts`). Éste manda el formulario entero —meta,
 * agujas, notas, foto, patrón—, que es lo que el esquema del endpoint admite.
 */
export function createProject(
  input: CreateProjectPayload,
): Promise<ProjectsRequestResult<SerializedProject>> {
  return projectMutation(PROJECTS_ENDPOINT, "POST", input);
}

/**
 * `PATCH /api/projects/:id` — el parche **genérico**. Éxito = **200** con el
 * proyecto ya recalculado.
 *
 * El que había (`updateProjectTargetRounds`) manda **un solo campo**, porque el
 * cajón de detalle sólo edita la meta. El formulario edita varios a la vez, y el
 * esquema del endpoint es el de alta en versión parcial: manda lo que le den.
 * Ojo con el único caso que rechaza: **un parche vacío responde 400** ("No hay
 * nada que actualizar."), no 200.
 */
export function updateProject(
  projectId: string,
  patch: UpdateProjectPayload,
): Promise<ProjectsRequestResult<SerializedProject>> {
  return projectMutation(projectDetailEndpoint(projectId), "PATCH", patch);
}

/**
 * `DELETE /api/projects/:id` — **204 sin cuerpo**.
 *
 * Usa `requestWithoutBody`, que existe justamente porque el camino feliz del
 * ayudante normal llama a `response.json()` y **eso lanza sobre un 204**: un
 * borrado hecho bien se leería como un fallo. Un id con formato inválido responde
 * **404, no 400** (lo decide el Route Handler), así que el camino de error es uno
 * solo: el mensaje que venga.
 */
export function deleteProject(
  projectId: string,
): Promise<ProjectsRequestResult<null>> {
  return requestWithoutBody(projectDetailEndpoint(projectId), {
    method: "DELETE",
  });
}

/**
 * Los dos filtros que `GET /api/patterns` admite (`patterns/validation.ts`).
 *
 * `inLibrary` es lo que separa un patrón **de biblioteca** (reusable en N
 * proyectos) de uno **embebido**. El formulario de #22 pide los de biblioteca:
 * **elegir entra en el alcance y crear un embebido no** (E6 a).
 */
export type PatternListFilters = {
  type?: CraftType;
  inLibrary?: boolean;
};

/**
 * `GET /api/patterns` — la biblioteca para elegir. Responde **envuelto**
 * (`{ patterns }`), como la lista de proyectos.
 *
 * Los filtros viajan como **cadenas literales**: el esquema es un enumerado de
 * dos cadenas con transformación, así que un `1` en vez de la palabra responde
 * **400**, no "sin filtro".
 */
export async function getPatterns(
  filters: PatternListFilters = {},
): Promise<ProjectsRequestResult<SerializedPattern[]>> {
  const result = await request<PatternListPayload>(
    `${PATTERNS_ENDPOINT}${queryString({
      type: filters.type,
      inLibrary:
        filters.inLibrary === undefined ? undefined : String(filters.inLibrary),
    })}`,
  );
  return result.ok
    ? { ok: true, status: result.status, data: result.data.patterns }
    : result;
}

/* ---------------------------------------------------------------------------
   La subida de la foto (enmienda E6 (h)).
   --------------------------------------------------------------------------- */

export const UPLOADS_IMAGE_ENDPOINT = "/api/uploads/image";

/**
 * El endpoint lee **sólo** este campo del formulario
 * (`app/api/uploads/image/route.ts`). Mandarlo con otro nombre responde 400 con
 * "Falta el archivo de imagen.", que parece un problema del archivo y no lo es.
 */
export const UPLOAD_FILE_FIELD = "file";

/**
 * **Éxito = 201, no 200.** El endpoint responde 201 con `{ url }`.
 *
 * **Aviso con ficha (deuda 60):** *asumir 200 rompe en el navegador y NO en los
 * tests*, porque un cliente escrito contra `response.ok` funde los dos y ningún
 * test que devuelva 201 lo delata. #22 es el **primer consumidor real de este
 * endpoint desde un navegador**, o sea la primera vez que ese error puede
 * manifestarse de verdad. Por eso el éxito se compara contra ESTE número y hay un
 * test que comprueba que un 200 **no** se acepta.
 */
export const UPLOAD_CREATED_STATUS = 201;

/* Los formatos y el tope se DERIVAN de la validación del servidor: si mañana
   entra un formato nuevo, el mensaje lo dice sin que nadie se acuerde de venir
   acá. Reescribirlos a mano es cómo el cartel y la regla se separan. */
const UPLOAD_ACCEPTED_FORMATS = ACCEPTED_IMAGE_TYPES.map(
  (type) => type.split("/")[1]?.toUpperCase() ?? type,
).join(", ");

const UPLOAD_MAX_MB = MAX_IMAGE_BYTES / (1024 * 1024);

/**
 * Los tres repliegues de la subida. Se usan **sólo si el cuerpo no se puede
 * leer**: cuando el servidor manda su `{ error }`, ése es más preciso (dice si
 * falló el formato o el tamaño). Existen porque en esta pantalla el status ya
 * dice qué hacer, y "algo salió mal" no ayuda a nadie a arreglar una foto.
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

/**
 * `POST /api/uploads/image` — sube la foto y devuelve **su URL**.
 *
 * Tres cosas que no se pueden tocar sin romperlo:
 *
 * 1. **`multipart/form-data` con el campo `file`.** El cuerpo es un `FormData` y
 *    **no se fija la cabecera de tipo de contenido a mano**: el navegador tiene
 *    que poner la suya CON la frontera del multipart, que sólo él conoce. Fijarla
 *    deja al servidor sin frontera y el 400 resultante parece del archivo.
 * 2. **Éxito = 201** (ver `UPLOAD_CREATED_STATUS`).
 * 3. **El endpoint no admite ningún otro campo**: la carpeta y el identificador
 *    en el proveedor se derivan del JWT, no del cuerpo.
 *
 * Devuelve la URL pelada, no el payload: lo que el formulario guarda en
 * `projects.image` es una cadena.
 */
export async function uploadProjectImage(
  file: File,
): Promise<ProjectsRequestResult<string>> {
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
    return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE };
  }

  if (response.status !== UPLOAD_CREATED_STATUS) {
    return {
      ok: false,
      status: response.status,
      message: await readErrorMessage(
        response,
        UPLOAD_FALLBACKS[response.status] ?? UNEXPECTED_ERROR_MESSAGE,
      ),
    };
  }

  try {
    const payload = (await response.json()) as { url: string };
    return { ok: true, status: response.status, data: payload.url };
  } catch {
    // Un 201 con cuerpo ilegible no deja ninguna URL que guardar.
    return {
      ok: false,
      status: response.status,
      message: UNEXPECTED_ERROR_MESSAGE,
    };
  }
}
