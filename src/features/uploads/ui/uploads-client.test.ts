// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/features/uploads/validation";

import {
  NETWORK_ERROR_MESSAGE,
  UPLOADS_IMAGE_ENDPOINT,
  UPLOAD_CREATED_STATUS,
  UPLOAD_FILE_FIELD,
  UPLOAD_IMAGE_REJECTED_MESSAGE,
  UPLOAD_PROVIDER_DOWN_MESSAGE,
  UPLOAD_UNAUTHORIZED_MESSAGE,
  UNEXPECTED_ERROR_MESSAGE,
  uploadImage,
} from "./uploads-client";

/**
 * `uploadImage` (design D10) — la lana usa esto en vez de un quinto clon
 * dentro de `yarns-client.ts`; es el mismo contrato de tres puntos que ya
 * midió `uploadProjectImage` (`projects-client.ts:640-679`, deuda 60): el
 * navegador pone su propia frontera de `multipart`, el éxito es SÓLO 201, y
 * el endpoint no admite ningún otro campo.
 */
const fetchSpy = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function unreadableResponse(status: number): Response {
  return new Response("<html>", {
    status,
    headers: { "content-type": "text/html" },
  });
}

function imagen(type = "image/png"): File {
  return new File(["bytes"], "madeja.png", { type });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("uploadImage", () => {
  it("trata el 201 como el éxito y devuelve la URL", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(UPLOAD_CREATED_STATUS, {
        url: "https://res.cloudinary.test/kc/u/2.png",
      }),
    );

    const result = await uploadImage(imagen());

    expect(result).toEqual({
      ok: true,
      data: "https://res.cloudinary.test/kc/u/2.png",
    });
    expect(UPLOAD_CREATED_STATUS).toBe(201);
  });

  it("un 200 NO se acepta como subida hecha", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(200, { url: "https://res.cloudinary.test/kc/u/2.png" }),
    );

    const result = await uploadImage(imagen());

    expect(result.ok).toBe(false);
  });

  it("manda multipart con SÓLO el campo `file`, sin fijar el tipo de contenido", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(201, { url: "https://res.cloudinary.test/kc/u/2.png" }),
    );

    const archivo = imagen();
    await uploadImage(archivo);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(UPLOADS_IMAGE_ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");

    const body = init?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get(UPLOAD_FILE_FIELD)).toBe(archivo);
    expect(UPLOAD_FILE_FIELD).toBe("file");

    /* Fijar el tipo de contenido a mano rompe el multipart: el navegador
       tiene que poner el suyo CON la frontera, que sólo él conoce. */
    expect(init?.headers).toBeUndefined();
  });

  it("un formato o tamaño rechazados devuelven el motivo del servidor", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(400, { error: "Formato no admitido. Usa image/jpeg." }),
    );

    const result = await uploadImage(imagen("image/gif"));

    expect(result).toEqual({
      ok: false,
      message: "Formato no admitido. Usa image/jpeg.",
    });
  });

  it("con el cuerpo ilegible, cada status trae un mensaje que dice qué hacer", async () => {
    const casos: [number, string][] = [
      [400, UPLOAD_IMAGE_REJECTED_MESSAGE],
      [401, UPLOAD_UNAUTHORIZED_MESSAGE],
      [502, UPLOAD_PROVIDER_DOWN_MESSAGE],
    ];

    for (const [status, message] of casos) {
      fetchSpy.mockResolvedValue(unreadableResponse(status));
      await expect(uploadImage(imagen())).resolves.toEqual({
        ok: false,
        message,
      });
      expect(message).not.toBe(UNEXPECTED_ERROR_MESSAGE);
    }
  });

  it("el mensaje de rechazo nombra los formatos y el tamaño de verdad", () => {
    for (const tipo of ACCEPTED_IMAGE_TYPES) {
      const extension = tipo.split("/")[1] ?? "";
      expect(UPLOAD_IMAGE_REJECTED_MESSAGE.toLowerCase()).toContain(extension);
    }
    expect(UPLOAD_IMAGE_REJECTED_MESSAGE).toContain(
      String(MAX_IMAGE_BYTES / (1024 * 1024)),
    );
  });

  it("sin red devuelve un error tipado, no una excepción", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));

    await expect(uploadImage(imagen())).resolves.toEqual({
      ok: false,
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it("un 201 con cuerpo ilegible es tan inservible como un 500", async () => {
    fetchSpy.mockResolvedValue(unreadableResponse(UPLOAD_CREATED_STATUS));

    const result = await uploadImage(imagen());

    expect(result).toEqual({ ok: false, message: UNEXPECTED_ERROR_MESSAGE });
  });

  it("un 201 sin `url` en el cuerpo es tan inservible como un 500 (R3-001)", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(UPLOAD_CREATED_STATUS, {}));

    const result = await uploadImage(imagen());

    expect(result).toEqual({ ok: false, message: UNEXPECTED_ERROR_MESSAGE });
  });

  it("un 201 con `url` nula es tan inservible como un 500 (R3-001)", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(UPLOAD_CREATED_STATUS, { url: null }),
    );

    const result = await uploadImage(imagen());

    expect(result).toEqual({ ok: false, message: UNEXPECTED_ERROR_MESSAGE });
  });
});
