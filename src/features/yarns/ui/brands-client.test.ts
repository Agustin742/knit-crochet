import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBrand,
  createYarnType,
  deleteBrand,
  deleteYarnType,
  getBrandTree,
} from "./brands-client";

const BRAND_A = { id: "brand-a", userId: "u", name: "Malabrigo" };
const BRAND_B = { id: "brand-b", userId: "u", name: "Cascada" };
const TYPE_A1 = { id: "type-a1", brandId: "brand-a", name: "Merino Worsted" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function defaultFetch(url: string): Promise<Response> {
  if (url === "/api/brands") {
    return Promise.resolve(jsonResponse(200, { brands: [BRAND_A, BRAND_B] }));
  }
  if (url === `/api/brands/${BRAND_A.id}/types`) {
    return Promise.resolve(jsonResponse(200, { types: [TYPE_A1] }));
  }
  if (url === `/api/brands/${BRAND_B.id}/types`) {
    return Promise.resolve(jsonResponse(200, { types: [] }));
  }
  return Promise.reject(new Error(`url inesperada: ${url}`));
}

const fetchSpy = vi.fn();

beforeEach(() => {
  fetchSpy.mockImplementation(defaultFetch);
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("getBrandTree — 1+N contra /api/brands y /api/brands/:id/types", () => {
  it("trae cada marca con sus tipos en un solo estado listo", async () => {
    const result = await getBrandTree();

    expect(result).toEqual({
      status: "ready",
      entries: [
        { brand: BRAND_A, types: [TYPE_A1] },
        { brand: BRAND_B, types: [] },
      ],
    });
  });

  it("degrada a failed si /api/brands no responde 200", async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse(401, { error: "Sin sesión." })),
    );

    const result = await getBrandTree();

    expect(result).toEqual({ status: "failed" });
  });

  it("degrada a failed si algún GET de tipos falla", async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url === `/api/brands/${BRAND_A.id}/types`) {
        return Promise.resolve(jsonResponse(500, { error: "boom" }));
      }
      return defaultFetch(url);
    });

    const result = await getBrandTree();

    expect(result).toEqual({ status: "failed" });
  });

  it("degrada a failed si la red se cae", async () => {
    fetchSpy.mockImplementationOnce(() => Promise.reject(new Error("sin red")));

    const result = await getBrandTree();

    expect(result).toEqual({ status: "failed" });
  });
});

describe("createBrand — POST /api/brands", () => {
  it("envía { name } y devuelve la marca creada en un 201", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(201, { brand: BRAND_A }));

    const result = await createBrand("Malabrigo");

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("/api/brands");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ name: "Malabrigo" });
    expect(result).toEqual({ ok: true, data: BRAND_A });
  });

  it("un 400 de validación se vuelve un error tipado", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(400, { error: "nombre inválido" }));

    const result = await createBrand("");

    expect(result.ok).toBe(false);
  });

  it("un 404 se vuelve un error tipado", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(404, { error: "no existe" }));

    const result = await createBrand("Malabrigo");

    expect(result.ok).toBe(false);
  });

  it("la red caída se vuelve un error tipado sin lanzar", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("sin red"));

    const result = await createBrand("Malabrigo");

    expect(result.ok).toBe(false);
  });
});

describe("createYarnType — POST /api/brands/:id/types", () => {
  it("envía { name } a la marca indicada y devuelve el tipo creado en un 201", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(201, { type: TYPE_A1 }));

    const result = await createYarnType(BRAND_A.id, "Merino Worsted");

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`/api/brands/${BRAND_A.id}/types`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ name: "Merino Worsted" });
    expect(result).toEqual({ ok: true, data: TYPE_A1 });
  });

  it("un 400 de validación se vuelve un error tipado", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(400, { error: "nombre inválido" }));

    const result = await createYarnType(BRAND_A.id, "");

    expect(result.ok).toBe(false);
  });

  it("un 404 (marca ajena o borrada) se vuelve un error tipado", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(404, { error: "La marca no existe." }));

    const result = await createYarnType("brand-ajena", "Merino Worsted");

    expect(result.ok).toBe(false);
  });

  it("la red caída se vuelve un error tipado sin lanzar", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("sin red"));

    const result = await createYarnType(BRAND_A.id, "Merino Worsted");

    expect(result.ok).toBe(false);
  });
});

describe("deleteBrand — DELETE /api/brands/:id", () => {
  it("un 204 se vuelve ok:true", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await deleteBrand(BRAND_A.id);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`/api/brands/${BRAND_A.id}`);
    expect(init?.method).toBe("DELETE");
    expect(result).toEqual({ ok: true });
  });

  it("un 404 (marca ajena o borrada) se vuelve kind: error", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(404, { error: "La marca no existe." }));

    const result = await deleteBrand(BRAND_A.id);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: "error" });
  });

  it("un 409 con hijos se vuelve kind: blocked con los DOS contadores", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(409, { error: "tiene hijos", types: 2, yarns: 5 }),
    );

    const result = await deleteBrand(BRAND_A.id);

    expect(result).toEqual({ ok: false, kind: "blocked", types: 2, yarns: 5 });
  });

  it("un 409 sin los contadores se vuelve kind: error, no blocked con undefined", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(409, { error: "tiene hijos" }));

    const result = await deleteBrand(BRAND_A.id);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: "error" });
  });

  it("un 409 con un solo contador válido (falta el otro) también se vuelve kind: error", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(409, { error: "tiene hijos", types: 2 }),
    );

    const result = await deleteBrand(BRAND_A.id);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: "error" });
  });

  it("la red caída se vuelve kind: error sin lanzar", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("sin red"));

    const result = await deleteBrand(BRAND_A.id);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: "error" });
  });
});

describe("deleteYarnType — DELETE /api/brands/:id/types/:typeId", () => {
  it("un 204 se vuelve ok:true", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await deleteYarnType(BRAND_A.id, TYPE_A1.id);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`/api/brands/${BRAND_A.id}/types/${TYPE_A1.id}`);
    expect(init?.method).toBe("DELETE");
    expect(result).toEqual({ ok: true });
  });

  it("un 404 se vuelve kind: error", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(404, { error: "El tipo no existe." }));

    const result = await deleteYarnType(BRAND_A.id, TYPE_A1.id);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: "error" });
  });

  it("un 409 con lanas se vuelve kind: blocked con UN contador", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(409, { error: "tiene lanas", yarns: 3 }));

    const result = await deleteYarnType(BRAND_A.id, TYPE_A1.id);

    expect(result).toEqual({ ok: false, kind: "blocked", yarns: 3 });
  });

  it("un 409 sin el contador se vuelve kind: error, no blocked con undefined", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(409, { error: "tiene lanas" }));

    const result = await deleteYarnType(BRAND_A.id, TYPE_A1.id);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: "error" });
  });

  it("la red caída se vuelve kind: error sin lanzar", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("sin red"));

    const result = await deleteYarnType(BRAND_A.id, TYPE_A1.id);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: "error" });
  });
});
