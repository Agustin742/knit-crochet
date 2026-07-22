import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildUploadSignature,
  CloudinaryUploadError,
  MissingCloudinaryConfigError,
  uploadImage,
} from "@/shared/lib/cloudinary";

const SECURE_URL =
  "https://res.cloudinary.com/knit-crochet/image/upload/v1/projects/bufanda.jpg";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function imageFile(): Blob {
  return new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
}

function stubCloudinaryEnv(): void {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "knit-crochet");
  vi.stubEnv("CLOUDINARY_API_KEY", "123456789");
  vi.stubEnv("CLOUDINARY_API_SECRET", "top-secret");
}

describe("shared/lib/cloudinary/upload", () => {
  beforeEach(() => {
    stubCloudinaryEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns only the final URL on a successful upload", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ secure_url: SECURE_URL, public_id: "projects/bufanda" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadImage(imageFile(), {
      folder: "knit-crochet/projects",
    });

    expect(result).toEqual({ url: SECURE_URL });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("posts a signed multipart request to the configured cloud", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ secure_url: SECURE_URL }));
    vi.stubGlobal("fetch", fetchMock);

    await uploadImage(imageFile(), { folder: "knit-crochet/projects" });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.cloudinary.com/v1_1/knit-crochet/image/upload",
    );
    expect(init?.method).toBe("POST");

    const body = init?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("timestamp")).toBe("1700000000");
    expect(body.get("folder")).toBe("knit-crochet/projects");
    expect(body.get("api_key")).toBe("123456789");
    expect(body.get("signature")).toBe(
      "b5b55b1b2502210d97454f1b7c4adbfa74304425",
    );
    expect(body.get("api_secret")).toBeNull();
    expect(body.get("file")).toBeInstanceOf(Blob);
  });

  it("signs the parameters sorted alphabetically with the api secret", async () => {
    await expect(
      buildUploadSignature(
        { timestamp: "1700000000", folder: "knit-crochet/projects" },
        "top-secret",
      ),
    ).resolves.toBe("b5b55b1b2502210d97454f1b7c4adbfa74304425");
  });

  it("throws a controlled CloudinaryUploadError when Cloudinary rejects the upload", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ error: { message: "Invalid image file" } }, 400),
      );
    vi.stubGlobal("fetch", fetchMock);

    const failure = await uploadImage(imageFile()).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(CloudinaryUploadError);
    const uploadError = failure as CloudinaryUploadError;
    expect(uploadError.name).toBe("CloudinaryUploadError");
    expect(uploadError.reason).toBe("rejected");
    expect(uploadError.status).toBe(400);
    expect(uploadError.message).toContain("Invalid image file");
    expect(uploadError.message).not.toContain("top-secret");
  });

  it("throws a controlled CloudinaryUploadError when the network fails", async () => {
    const networkError = new TypeError("fetch failed");
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(networkError);
    vi.stubGlobal("fetch", fetchMock);

    const failure = await uploadImage(imageFile()).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(CloudinaryUploadError);
    expect((failure as CloudinaryUploadError).reason).toBe("network");
    expect((failure as CloudinaryUploadError).cause).toBe(networkError);
  });

  it("throws a controlled CloudinaryUploadError when the response has no URL", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ public_id: "projects/bufanda" }));
    vi.stubGlobal("fetch", fetchMock);

    const failure = await uploadImage(imageFile()).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(CloudinaryUploadError);
    expect((failure as CloudinaryUploadError).reason).toBe(
      "malformed_response",
    );
  });

  it("throws MissingCloudinaryConfigError without calling the network", async () => {
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadImage(imageFile())).rejects.toBeInstanceOf(
      MissingCloudinaryConfigError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
