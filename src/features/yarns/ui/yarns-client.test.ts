import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NETWORK_ERROR_MESSAGE,
  UNEXPECTED_ERROR_MESSAGE,
  YARNS_ENDPOINT,
  getYarns,
} from "./yarns-client";
import type { SerializedYarnListItem } from "./types";

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
