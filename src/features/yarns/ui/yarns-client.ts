import type { YarnFilters } from "@/features/yarns/types";

import type {
  SerializedYarnListItem,
  SerializedYarnRecord,
  YarnDetailPayload,
  YarnListPayload,
} from "./types";

/**
 * Costura HTTP de `/lanas` (RFC-04). Cuarto clon del mismo patrón que ya
 * fichó la deuda 129 (`projects-client.ts`, enmienda **E1(h)**): no hay
 * cliente compartido de navegador en el repo, y extraerlo ahora tocaría dos
 * features ya revisadas. Se importa por RUTA INTERNA (`@/features/yarns/types`)
 * y no por el barrel del feature: el barrel arrastra `./api` → Drizzle al
 * bundle del navegador.
 */
export const YARNS_ENDPOINT = "/api/yarns";

export const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
export const UNEXPECTED_ERROR_MESSAGE =
  "Algo salió mal. Intentá de nuevo en unos segundos.";

export type YarnsRequestResult =
  | { ok: true; data: SerializedYarnListItem[] }
  | { ok: false; message: string };

function yarnsQuery(filters: YarnFilters): string {
  const params = new URLSearchParams();
  if (filters.brandId !== undefined) {
    params.set("brandId", filters.brandId);
  }
  if (filters.typeId !== undefined) {
    params.set("typeId", filters.typeId);
  }
  if (filters.colorFamily !== undefined) {
    params.set("colorFamily", filters.colorFamily);
  }
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/**
 * `GET /api/yarns`, con los mismos tres filtros que el endpoint acepta
 * (design D6): `brandId`, `typeId`, `colorFamily`, combinados por el
 * servidor con AND. En S3 se llama sin filtros; S4b los conecta al árbol y a
 * la fila de swatches.
 */
export async function getYarns(
  filters: YarnFilters,
): Promise<YarnsRequestResult> {
  let response: Response;
  try {
    response = await fetch(`${YARNS_ENDPOINT}${yarnsQuery(filters)}`, {
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }

  try {
    const body = (await response.json()) as YarnListPayload;
    return { ok: true, data: body.yarns };
  } catch {
    // Un 200 con cuerpo ilegible es tan inservible como un 500.
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }
}

/**
 * `PATCH /api/yarns/:id` (design D2). El cuerpo lleva **sólo** `usedQuantity`
 * — eso es lo que le permite a `YarnsView` conservar `brandName`/`typeName`
 * sin refrescar la lista: `brandId`/`typeId` provadamente no pueden cambiar.
 *
 * **`data` es `SerializedYarnRecord`, no `SerializedYarnListItem`**: tiparlo
 * como la lista compilaría, pero entregaría `brandName`/`typeName`
 * `undefined` en el primer render tras la mezcla — la única jugada prohibida
 * de este cambio (`design.md` D2).
 */
export type YarnPatchResult =
  | { ok: true; data: SerializedYarnRecord }
  | { ok: false; message: string };

export async function patchYarnUsedQuantity(
  id: string,
  usedQuantity: number,
): Promise<YarnPatchResult> {
  let response: Response;
  try {
    response = await fetch(`${YARNS_ENDPOINT}/${id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usedQuantity }),
    });
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }

  try {
    const body = (await response.json()) as YarnDetailPayload;
    return { ok: true, data: body.yarn };
  } catch {
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }
}
