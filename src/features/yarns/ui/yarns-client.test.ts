import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CreateYarnPayload,
  UpdateYarnPayload,
} from "@/features/yarns/validation";

import {
  DUPLICATE_COLOR_CODE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  UNEXPECTED_ERROR_MESSAGE,
  YARNS_ENDPOINT,
  createYarn,
  getYarns,
  patchYarnUsedQuantity,
  updateYarn,
} from "./yarns-client";
import type { SerializedYarnListItem, SerializedYarnRecord } from "./types";

const fetchSpy = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const CRUDA: SerializedYarnListItem = {
  id: "0f1c4d3a-1111-4111-8111-111111111111",
  userId: "u",
  image: null,
  brandId: "brand-1",
  typeId: "type-1",
  brandName: "Malabrigo",
  typeName: "Merino Worsted",
  colorName: "Natural",
  colorCode: "N1",
  colorFamily: "neutral",
  quantity: 3,
  usedQuantity: 0,
  length: 100,
  fiber: "Lana",
  recommendedNeedle: { min: 4, max: 5 },
  thickness: 4.5,
  lot: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("getYarns", () => {
  it("pide el endpoint pelado sin filtros", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { yarns: [CRUDA] }));

    const result = await getYarns({});

    expect(fetchSpy).toHaveBeenCalledWith(
      YARNS_ENDPOINT,
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result).toEqual({ ok: true, data: [CRUDA] });
  });

  it("construye la cadena de consulta a partir de los filtros", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { yarns: [] }));

    await getYarns({ brandId: "brand-1", colorFamily: "blue" });

    const [url] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`${YARNS_ENDPOINT}?brandId=brand-1&colorFamily=blue`);
  });

  it("un filtro ausente no entra en la cadena de consulta", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { yarns: [] }));

    await getYarns({ typeId: "type-1" });

    const [url] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`${YARNS_ENDPOINT}?typeId=type-1`);
  });

  it("una respuesta que no es 200 se vuelve un error tipado", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(401, { error: "Sin sesión." }));

    const result = await getYarns({});

    expect(result).toEqual({ ok: false, message: UNEXPECTED_ERROR_MESSAGE });
  });

  it("la red caída se vuelve un error tipado sin lanzar", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));

    const result = await getYarns({});

    expect(result).toEqual({ ok: false, message: NETWORK_ERROR_MESSAGE });
  });

  it("un 200 con cuerpo ilegible es tan inservible como un 500", async () => {
    fetchSpy.mockResolvedValue(
      new Response("<html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await getYarns({});

    expect(result).toEqual({ ok: false, message: UNEXPECTED_ERROR_MESSAGE });
  });
});

const PATCHED: SerializedYarnRecord = {
  id: CRUDA.id,
  userId: "u",
  image: null,
  brandId: "brand-1",
  typeId: "type-1",
  colorName: "Natural",
  colorCode: "N1",
  colorFamily: "neutral",
  quantity: 3,
  usedQuantity: 2,
  length: 100,
  fiber: "Lana",
  recommendedNeedle: { min: 4, max: 5 },
  thickness: 4.5,
  lot: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("patchYarnUsedQuantity", () => {
  it("el cuerpo es exactamente { usedQuantity }", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { yarn: PATCHED }));

    await patchYarnUsedQuantity(CRUDA.id, 2);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`${YARNS_ENDPOINT}/${CRUDA.id}`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ usedQuantity: 2 });
  });

  it("un 200 devuelve la fila cruda, sin brandName ni typeName", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { yarn: PATCHED }));

    const result = await patchYarnUsedQuantity(CRUDA.id, 2);

    expect(result).toEqual({ ok: true, data: PATCHED });
  });

  it("un 400 de validación se vuelve un error tipado", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(400, { error: "usedQuantity inválido" }),
    );

    const result = await patchYarnUsedQuantity(CRUDA.id, -1);

    expect(result.ok).toBe(false);
  });

  it("un 404 (lana borrada por otro) se vuelve un error tipado", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(404, { error: "No encontrada" }));

    const result = await patchYarnUsedQuantity(CRUDA.id, 2);

    expect(result.ok).toBe(false);
  });

  it("la red caída se vuelve un error tipado sin lanzar", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));

    const result = await patchYarnUsedQuantity(CRUDA.id, 2);

    expect(result).toEqual({ ok: false, message: NETWORK_ERROR_MESSAGE });
  });
});

/**
 * `createYarn`/`updateYarn` (backlog 25, design D7). El 409 de cualquiera de
 * los dos se traduce a `field: "colorCode"` porque hoy es la ÚNICA restricción
 * `UNIQUE` que cualquiera de los dos endpoints devuelve como 409 (ver el
 * comentario junto a `DUPLICATE_COLOR_CODE_MESSAGE` en `yarns-client.ts`).
 */
const CREATE_PAYLOAD: CreateYarnPayload = {
  brandId: "brand-1",
  typeId: "type-1",
  colorName: "Natural",
  colorCode: "N1",
  colorFamily: "neutral",
  length: 100,
  fiber: "Lana",
  recommendedNeedle: { min: 4, max: 5 },
  thickness: 4.5,
  lot: new Date("2026-01-01T00:00:00.000Z"),
};

const SAVED: SerializedYarnRecord = {
  id: CRUDA.id,
  userId: "u",
  image: null,
  brandId: "brand-1",
  typeId: "type-1",
  colorName: "Natural",
  colorCode: "N1",
  colorFamily: "neutral",
  quantity: 0,
  usedQuantity: 0,
  length: 100,
  fiber: "Lana",
  recommendedNeedle: { min: 4, max: 5 },
  thickness: 4.5,
  lot: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("createYarn", () => {
  it("manda POST al endpoint pelado con el payload como cuerpo", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(201, { yarn: SAVED }));

    await createYarn(CREATE_PAYLOAD);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(YARNS_ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(
      JSON.parse(JSON.stringify(CREATE_PAYLOAD)),
    );
  });

  it("un 201 resuelve { ok: true, data } con la fila cruda", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(201, { yarn: SAVED }));

    const result = await createYarn(CREATE_PAYLOAD);

    expect(result).toEqual({ ok: true, data: SAVED });
  });

  it("un 409 se vuelve { ok: false, field: 'colorCode' } (D7)", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(409, { error: "El código de color ya existe." }),
    );

    const result = await createYarn(CREATE_PAYLOAD);

    expect(result).toEqual({
      ok: false,
      field: "colorCode",
      message: DUPLICATE_COLOR_CODE_MESSAGE,
    });
  });

  it("un 400 se vuelve { ok: false, field: null } con el repliegue genérico", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(400, { error: "Datos inválidos." }),
    );

    const result = await createYarn(CREATE_PAYLOAD);

    expect(result).toEqual({
      ok: false,
      field: null,
      message: UNEXPECTED_ERROR_MESSAGE,
    });
  });

  it("un 404 se vuelve { ok: false, field: null }", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(404, { error: "No encontrada" }));

    const result = await createYarn(CREATE_PAYLOAD);

    expect(result).toEqual({
      ok: false,
      field: null,
      message: UNEXPECTED_ERROR_MESSAGE,
    });
  });

  it("la red caída se vuelve { ok: false, field: null } sin lanzar", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));

    const result = await createYarn(CREATE_PAYLOAD);

    expect(result).toEqual({
      ok: false,
      field: null,
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it("un 201 con cuerpo ilegible es tan inservible como un 500", async () => {
    fetchSpy.mockResolvedValue(
      new Response("<html>", {
        status: 201,
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await createYarn(CREATE_PAYLOAD);

    expect(result).toEqual({
      ok: false,
      field: null,
      message: UNEXPECTED_ERROR_MESSAGE,
    });
  });
});

describe("updateYarn", () => {
  it("manda PATCH al endpoint del id con SÓLO el patch como cuerpo", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { yarn: SAVED }));

    const patch: UpdateYarnPayload = { colorCode: "N2" };
    await updateYarn(CRUDA.id, patch);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`${YARNS_ENDPOINT}/${CRUDA.id}`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ colorCode: "N2" });
  });

  it("un 200 resuelve { ok: true, data } con la fila cruda", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { yarn: SAVED }));

    const result = await updateYarn(CRUDA.id, { colorCode: "N2" });

    expect(result).toEqual({ ok: true, data: SAVED });
  });

  it("un 409 se vuelve { ok: false, field: 'colorCode' } (D7)", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(409, { error: "El código de color ya existe." }),
    );

    const result = await updateYarn(CRUDA.id, { colorCode: "N1" });

    expect(result).toEqual({
      ok: false,
      field: "colorCode",
      message: DUPLICATE_COLOR_CODE_MESSAGE,
    });
  });

  it("un 400 se vuelve { ok: false, field: null }", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(400, { error: "Datos inválidos." }),
    );

    const result = await updateYarn(CRUDA.id, { colorCode: "N1" });

    expect(result).toEqual({
      ok: false,
      field: null,
      message: UNEXPECTED_ERROR_MESSAGE,
    });
  });

  it("un 404 se vuelve { ok: false, field: null }", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(404, { error: "No encontrada" }));

    const result = await updateYarn(CRUDA.id, { colorCode: "N1" });

    expect(result).toEqual({
      ok: false,
      field: null,
      message: UNEXPECTED_ERROR_MESSAGE,
    });
  });

  it("la red caída se vuelve { ok: false, field: null } sin lanzar", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));

    const result = await updateYarn(CRUDA.id, { colorCode: "N1" });

    expect(result).toEqual({
      ok: false,
      field: null,
      message: NETWORK_ERROR_MESSAGE,
    });
  });
});
