import { errors, jwtVerify, SignJWT } from "jose";

export const JWT_COOKIE_NAME = "kc_session";
export const JWT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = "knit-crochet";
const JWT_AUDIENCE = "knit-crochet-app";
const JWT_EXPIRATION = "7d";

export class MissingJwtSecretError extends Error {
  constructor() {
    super(
      "JWT_SECRET no está definida. Configúrala en el entorno antes de usar la autenticación (ver .env.example).",
    );
    this.name = "MissingJwtSecretError";
  }
}

export class InvalidSessionError extends Error {
  constructor() {
    super("Sesión inválida o expirada.");
    this.name = "InvalidSessionError";
  }
}

export type SessionPayload = {
  userId: string;
};

// El secreto se lee en cada llamada (no a nivel de módulo) para que importar
// este archivo nunca lance y para que el entorno se pueda sustituir en tests.
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new MissingJwtSecretError();
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRATION)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      // `algorithms` explícito: sin él, jose aceptaría cualquier algoritmo
      // soportado (algorithm confusion).
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new InvalidSessionError();
    }

    return { userId: payload.sub };
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      throw new InvalidSessionError();
    }
    throw error;
  }
}
