import { describe, expect, it, vi } from "vitest";

import {
  buildUserImageFolder,
  ImageUploadFailedError,
  ImageUploadUnavailableError,
  UPLOADS_ROOT_FOLDER,
  uploadUserImage,
  type ImageUploader,
} from "@/features/uploads";
import {
  CloudinaryUploadError,
  MissingCloudinaryConfigError,
} from "@/shared/lib/cloudinary";

const USER_ID = "9c2d0f6e-3a4b-4c5d-8e9f-0a1b2c3d4e5f";
const SECURE_URL =
  "https://res.cloudinary.com/knit-crochet/image/upload/v1/users/foto.jpg";

function imageFile(): Blob {
  return new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
}

function uploaderStub(): ReturnType<typeof vi.fn<ImageUploader>> {
  return vi.fn<ImageUploader>().mockResolvedValue({ url: SECURE_URL });
}

function failingUploader(error: unknown): ImageUploader {
  return vi.fn<ImageUploader>().mockRejectedValue(error);
}

describe("features/uploads uploadUserImage", () => {
  it("returns only the URL of the uploaded image", async () => {
    const upload = uploaderStub();

    await expect(uploadUserImage(USER_ID, imageFile(), upload)).resolves.toEqual(
      { url: SECURE_URL },
    );
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("derives the folder from the userId, under the shared root", async () => {
    const upload = uploaderStub();

    await uploadUserImage(USER_ID, imageFile(), upload);

    const [, options] = upload.mock.calls[0] ?? [];
    expect(options?.folder).toBe(buildUserImageFolder(USER_ID));
    expect(options?.folder).toBe(`${UPLOADS_ROOT_FOLDER}/${USER_ID}`);
  });

  it("isolates users: two userIds never share a folder", () => {
    const other = "1b7f4a2c-5d6e-4f80-9a1b-2c3d4e5f6071";

    expect(buildUserImageFolder(USER_ID)).not.toBe(buildUserImageFolder(other));
  });

  it("uses a unique publicId on every upload so a photo never overwrites another", async () => {
    const upload = uploaderStub();

    await uploadUserImage(USER_ID, imageFile(), upload);
    await uploadUserImage(USER_ID, imageFile(), upload);

    const first = upload.mock.calls[0]?.[1];
    const second = upload.mock.calls[1]?.[1];
    expect(first?.publicId).toBeTruthy();
    expect(second?.publicId).toBeTruthy();
    expect(second?.publicId).not.toBe(first?.publicId);
    expect(second?.folder).toBe(first?.folder);
  });

  it("hands the very same file over to the uploader", async () => {
    const upload = uploaderStub();
    const file = imageFile();

    await uploadUserImage(USER_ID, file, upload);

    expect(upload.mock.calls[0]?.[0]).toBe(file);
  });

  it("translates a CloudinaryUploadError into ImageUploadFailedError keeping the reason", async () => {
    const cause = new CloudinaryUploadError("network", "sin red");

    const failure = await uploadUserImage(
      USER_ID,
      imageFile(),
      failingUploader(cause),
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ImageUploadFailedError);
    expect((failure as ImageUploadFailedError).reason).toBe("network");
    expect((failure as ImageUploadFailedError).cause).toBe(cause);
  });

  it("translates a MissingCloudinaryConfigError into ImageUploadUnavailableError", async () => {
    const cause = new MissingCloudinaryConfigError(["CLOUDINARY_API_SECRET"]);

    const failure = await uploadUserImage(
      USER_ID,
      imageFile(),
      failingUploader(cause),
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ImageUploadUnavailableError);
    expect((failure as ImageUploadUnavailableError).cause).toBe(cause);
  });

  it("rethrows an unknown error untouched instead of disguising it", async () => {
    const cause = new Error("boom");

    const failure = await uploadUserImage(
      USER_ID,
      imageFile(),
      failingUploader(cause),
    ).catch((error: unknown) => error);

    expect(failure).toBe(cause);
  });
});
