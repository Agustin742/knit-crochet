import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCEPTED_IMAGE_TYPES,
  buildUserImageFolder,
  MAX_IMAGE_BYTES,
} from "@/features/uploads";
import { signSessionToken } from "@/shared/lib/auth/jwt";

const SECRET = "test-secret-suficientemente-largo-para-hs256";
const USER_ID = "9c2d0f6e-3a4b-4c5d-8e9f-0a1b2c3d4e5f";
const API_SECRET = "top-secret";
const SECURE_URL =
  "https://res.cloudinary.com/knit-crochet/image/upload/v1/users/foto.jpg";

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

const { POST: uploadImageRoute } = await import(
  "@/app/api/uploads/image/route"
);

const BASE_URL = "https://test.local/api/uploads/image";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function cloudinaryOk(): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(jsonResponse({ secure_url: SECURE_URL }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function imageFile(
  options: { type?: string; bytes?: number; name?: string } = {},
): File {
  const { type = "image/jpeg", bytes = 3, name = "foto.jpg" } = options;
  return new File([new Uint8Array(bytes)], name, { type });
}

function uploadRequest(entries: Record<string, string | Blob>): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    form.append(key, value);
  }
  return new Request(BASE_URL, { method: "POST", body: form });
}

/** El multipart que el helper de Cloudinary acabó enviando a la red. */
function sentToCloudinary(
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  call = 0,
): FormData {
  return fetchMock.mock.calls[call]?.[1]?.body as FormData;
}

async function errorOf(response: Response): Promise<string> {
  return ((await response.json()) as { error: string }).error;
}

describe("api/uploads/image route handler", () => {
  beforeEach(async () => {
    cookieJar.clear();
    vi.stubEnv("JWT_SECRET", SECRET);
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "knit-crochet");
    vi.stubEnv("CLOUDINARY_API_KEY", "123456789");
    vi.stubEnv("CLOUDINARY_API_SECRET", API_SECRET);
    cookieJar.set("kc_session", await signSessionToken({ userId: USER_ID }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("successful upload", () => {
    it("answers 201 with only the URL of the uploaded image", async () => {
      const fetchMock = cloudinaryOk();

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile() }),
      );

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ url: SECURE_URL });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("accepts every type of the whitelist", async () => {
      for (const type of ACCEPTED_IMAGE_TYPES) {
        const fetchMock = cloudinaryOk();

        const response = await uploadImageRoute(
          uploadRequest({ file: imageFile({ type }) }),
        );

        expect(response.status).toBe(201);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      }
    });

    it("accepts a file sitting exactly on the size limit", async () => {
      const fetchMock = cloudinaryOk();

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile({ bytes: MAX_IMAGE_BYTES }) }),
      );

      expect(response.status).toBe(201);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("destination derived from the session (deuda técnica 3)", () => {
    it("sends the folder derived from the session userId", async () => {
      const fetchMock = cloudinaryOk();

      await uploadImageRoute(uploadRequest({ file: imageFile() }));

      expect(sentToCloudinary(fetchMock).get("folder")).toBe(
        buildUserImageFolder(USER_ID),
      );
    });

    it("ignores a folder and a publicId injected through the form", async () => {
      const fetchMock = cloudinaryOk();

      await uploadImageRoute(
        uploadRequest({
          file: imageFile(),
          folder: "../otro-usuario",
          public_id: "avatar",
          publicId: "avatar",
        }),
      );

      const sent = sentToCloudinary(fetchMock);
      expect(sent.get("folder")).toBe(buildUserImageFolder(USER_ID));
      expect(sent.get("public_id")).not.toBe("avatar");
      expect(sent.get("public_id")).not.toContain("otro-usuario");
    });

    it("gives every upload of the same user a different publicId", async () => {
      const fetchMock = cloudinaryOk();

      await uploadImageRoute(uploadRequest({ file: imageFile() }));
      await uploadImageRoute(uploadRequest({ file: imageFile() }));

      const first = sentToCloudinary(fetchMock, 0);
      const second = sentToCloudinary(fetchMock, 1);
      expect(second.get("public_id")).not.toBe(first.get("public_id"));
      expect(second.get("folder")).toBe(first.get("folder"));
    });

    it("keeps two users apart", async () => {
      const otherUser = "1b7f4a2c-5d6e-4f80-9a1b-2c3d4e5f6071";
      const fetchMock = cloudinaryOk();

      await uploadImageRoute(uploadRequest({ file: imageFile() }));
      cookieJar.set(
        "kc_session",
        await signSessionToken({ userId: otherUser }),
      );
      await uploadImageRoute(uploadRequest({ file: imageFile() }));

      expect(sentToCloudinary(fetchMock, 0).get("folder")).toBe(
        buildUserImageFolder(USER_ID),
      );
      expect(sentToCloudinary(fetchMock, 1).get("folder")).toBe(
        buildUserImageFolder(otherUser),
      );
    });
  });

  describe("rejected input never reaches Cloudinary (PRD §11.9)", () => {
    it("answers 401 without a session and does not call Cloudinary", async () => {
      const fetchMock = cloudinaryOk();
      cookieJar.clear();

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile() }),
      );

      expect(response.status).toBe(401);
      expect(await errorOf(response)).toBe("No autenticado.");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("answers 401 when the session does not hold a valid user id", async () => {
      const fetchMock = cloudinaryOk();
      cookieJar.set("kc_session", await signSessionToken({ userId: "user-1" }));

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile() }),
      );

      expect(response.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("answers 400 for a type outside the whitelist and does not call Cloudinary", async () => {
      const fetchMock = cloudinaryOk();

      const response = await uploadImageRoute(
        uploadRequest({
          file: imageFile({ type: "image/gif", name: "foto.gif" }),
        }),
      );

      expect(response.status).toBe(400);
      expect(await errorOf(response)).toContain("Formato no admitido");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("answers 400 for a file over the size limit and does not call Cloudinary", async () => {
      const fetchMock = cloudinaryOk();

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile({ bytes: MAX_IMAGE_BYTES + 1 }) }),
      );

      expect(response.status).toBe(400);
      expect(await errorOf(response)).toContain("supera el máximo");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("answers 400 when the file is missing and does not call Cloudinary", async () => {
      const fetchMock = cloudinaryOk();

      const response = await uploadImageRoute(uploadRequest({}));

      expect(response.status).toBe(400);
      expect(await errorOf(response)).toBe("Falta el archivo de imagen.");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("answers 400 when the field carries text instead of a file", async () => {
      const fetchMock = cloudinaryOk();

      const response = await uploadImageRoute(
        uploadRequest({ file: "https://example.com/foto.jpg" }),
      );

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("answers 400 for an empty file and does not call Cloudinary", async () => {
      const fetchMock = cloudinaryOk();

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile({ bytes: 0 }) }),
      );

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("answers 400 when the body is not multipart at all", async () => {
      const fetchMock = cloudinaryOk();

      const response = await uploadImageRoute(
        new Request(BASE_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ file: "foto.jpg" }),
        }),
      );

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("upload failures translated to an HTTP status", () => {
    it("answers 502 when Cloudinary rejects the upload, without leaking the secret", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            jsonResponse({ error: { message: "Invalid image file" } }, 400),
          ),
      );

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile() }),
      );
      const message = await errorOf(response);

      expect(response.status).toBe(502);
      expect(message).toBe("No se pudo subir la imagen. Inténtalo de nuevo.");
      expect(message).not.toContain(API_SECRET);
      expect(message).not.toContain("Invalid image file");
      expect(consoleError).toHaveBeenCalled();
    });

    it("answers 502 when the network to Cloudinary fails", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")),
      );

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile() }),
      );

      expect(response.status).toBe(502);
      expect(consoleError).toHaveBeenCalled();
    });

    it("answers 502 when Cloudinary answers without a URL", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ok: true })),
      );

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile() }),
      );

      expect(response.status).toBe(502);
      expect(consoleError).toHaveBeenCalled();
    });

    it("answers 500 when Cloudinary is not configured, without calling the network", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const fetchMock = cloudinaryOk();
      vi.stubEnv("CLOUDINARY_API_SECRET", "");

      const response = await uploadImageRoute(
        uploadRequest({ file: imageFile() }),
      );

      expect(response.status).toBe(500);
      expect(await errorOf(response)).toBe("Error interno del servidor.");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
