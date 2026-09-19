import type { BrandRecord, YarnTypeRecord } from "@/features/yarns/types";

/**
 * Costura HTTP del catálogo marca/tipo (RFC-04 §7-ter E2(c), design D5). Por
 * RUTA INTERNA (`@/features/yarns/types`) y no por el barrel del feature,
 * mismo motivo que `yarns-client.ts:9-11`: el barrel arrastra `./api` →
 * Drizzle al bundle del navegador.
 */

export type BrandTreeEntry = { brand: BrandRecord; types: YarnTypeRecord[] };
export type BrandTreeState =
  | { status: "loading" }
  | { status: "ready"; entries: BrandTreeEntry[] }
  | { status: "failed" };

/**
 * `GET /api/brands` y luego `Promise.all` sobre `GET /api/brands/:id/types`
 * (design D7): una sola vez, en paralelo, sin depender de ningún filtro. Un
 * fallo en cualquier tramo se atrapa entero y nunca se propaga — quien llama
 * lo lee como "panel deshabilitado", no como una excepción que tire la
 * página abajo. Movida verbatim desde `YarnBrandTree.tsx` (design D5): mismo
 * comportamiento, mismas aserciones, sólo cambia de archivo.
 */
export async function getBrandTree(): Promise<BrandTreeState> {
  try {
    const brandsResponse = await fetch("/api/brands", {
      credentials: "same-origin",
    });
    if (!brandsResponse.ok) {
      return { status: "failed" };
    }
    const { brands } = (await brandsResponse.json()) as {
      brands: BrandRecord[];
    };

    const entries = await Promise.all(
      brands.map(async (brand): Promise<BrandTreeEntry> => {
        const typesResponse = await fetch(`/api/brands/${brand.id}/types`, {
          credentials: "same-origin",
        });
        if (!typesResponse.ok) {
          throw new Error("no se pudo leer los tipos de la marca");
        }
        const { types } = (await typesResponse.json()) as {
          types: YarnTypeRecord[];
        };
        return { brand, types };
      }),
    );
    return { status: "ready", entries };
  } catch {
    return { status: "failed" };
  }
}

export type CreateBrandResult =
  | { ok: true; data: BrandRecord }
  | { ok: false; message: string };

export type CreateYarnTypeResult =
  | { ok: true; data: YarnTypeRecord }
  | { ok: false; message: string };

const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
const UNEXPECTED_ERROR_MESSAGE =
  "Algo salió mal. Intentá de nuevo en unos segundos.";

/** `POST /api/brands`, cuerpo `{ name }`; `201 { brand }` en éxito. */
export async function createBrand(name: string): Promise<CreateBrandResult> {
  let response: Response;
  try {
    response = await fetch("/api/brands", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }

  try {
    const body = (await response.json()) as { brand: BrandRecord };
    return { ok: true, data: body.brand };
  } catch {
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }
}

/** `POST /api/brands/:id/types`, cuerpo `{ name }`; `201 { type }` en éxito. */
export async function createYarnType(
  brandId: string,
  name: string,
): Promise<CreateYarnTypeResult> {
  let response: Response;
  try {
    response = await fetch(`/api/brands/${brandId}/types`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }

  try {
    const body = (await response.json()) as { type: YarnTypeRecord };
    return { ok: true, data: body.type };
  } catch {
    return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
  }
}
