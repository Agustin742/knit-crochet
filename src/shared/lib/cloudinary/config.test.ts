import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCloudinaryConfig,
  MissingCloudinaryConfigError,
} from "@/shared/lib/cloudinary";

function stubCloudinaryEnv(): void {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "knit-crochet");
  vi.stubEnv("CLOUDINARY_API_KEY", "123456789");
  vi.stubEnv("CLOUDINARY_API_SECRET", "top-secret");
}

describe("shared/lib/cloudinary/config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the configuration from the environment", () => {
    stubCloudinaryEnv();

    expect(getCloudinaryConfig()).toEqual({
      cloudName: "knit-crochet",
      apiKey: "123456789",
      apiSecret: "top-secret",
    });
  });

  it("throws MissingCloudinaryConfigError listing every missing variable", () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("CLOUDINARY_API_KEY", "");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");

    expect(() => getCloudinaryConfig()).toThrow(MissingCloudinaryConfigError);
    try {
      getCloudinaryConfig();
      expect.unreachable("getCloudinaryConfig should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingCloudinaryConfigError);
      const configError = error as MissingCloudinaryConfigError;
      expect(configError.name).toBe("MissingCloudinaryConfigError");
      expect(configError.missingVariables).toEqual([
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
      ]);
    }
  });

  it("throws when only the secret is missing and never leaks credentials", () => {
    stubCloudinaryEnv();
    vi.stubEnv("CLOUDINARY_API_SECRET", "");

    try {
      getCloudinaryConfig();
      expect.unreachable("getCloudinaryConfig should have thrown");
    } catch (error) {
      const configError = error as MissingCloudinaryConfigError;
      expect(configError.missingVariables).toEqual(["CLOUDINARY_API_SECRET"]);
      expect(configError.message).not.toContain("123456789");
    }
  });
});
