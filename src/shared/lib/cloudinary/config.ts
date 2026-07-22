export const CLOUDINARY_ENV_VARS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

export class MissingCloudinaryConfigError extends Error {
  readonly missingVariables: readonly string[];

  constructor(missingVariables: readonly string[]) {
    super(
      `Faltan variables de entorno de Cloudinary: ${missingVariables.join(", ")}. Configúralas en el entorno antes de subir imágenes (ver .env.example).`,
    );
    this.name = "MissingCloudinaryConfigError";
    this.missingVariables = missingVariables;
  }
}

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function readEnv(name: string, missing: string[]): string {
  const value = process.env[name];
  if (!value) {
    missing.push(name);
    return "";
  }
  return value;
}

/**
 * Lee la configuración de Cloudinary del entorno en cada llamada (no a nivel de
 * módulo) para que importar este archivo nunca lance y para poder sustituir el
 * entorno en tests. Nunca hay valores por defecto: sin credenciales, error.
 *
 * El error solo nombra las variables que faltan; jamás incluye sus valores.
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  const missing: string[] = [];
  const config: CloudinaryConfig = {
    cloudName: readEnv("CLOUDINARY_CLOUD_NAME", missing),
    apiKey: readEnv("CLOUDINARY_API_KEY", missing),
    apiSecret: readEnv("CLOUDINARY_API_SECRET", missing),
  };

  if (missing.length > 0) {
    throw new MissingCloudinaryConfigError(missing);
  }

  return config;
}
