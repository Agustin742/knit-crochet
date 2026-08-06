import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { resolveEnvValue } from "@/__smoke__/env";
import { ACCEPTED_IMAGE_TYPES, buildUserImageFolder } from "@/features/uploads";
import { JWT_COOKIE_NAME, signSessionToken } from "@/shared/lib/auth/jwt";
import {
  buildUploadSignature,
  CLOUDINARY_API_BASE,
  getCloudinaryConfig,
} from "@/shared/lib/cloudinary";

/**
 * Smoke test de la CADENA DE SUBIDA contra la cuenta REAL de Cloudinary
 * (deuda técnica #59). Ejercita el Route Handler real
 * (`POST /api/uploads/image`) → `uploadUserImage` → `uploadImage` → HTTP real.
 * Nada de dobles de `fetch`: lo que se mide es justo lo que el mock no podía
 * medir — que la firma de `buildUploadSignature` sea la que Cloudinary espera y
 * que la respuesta real tenga el campo que `extractSecureUrl` asume.
 *
 * Está guardado por `SMOKE_CLOUDINARY` (flag propio: esta cadena NO toca la DB,
 * el `userId` solo tiene que ser un uuid válido —lo valida `uploadUserIdSchema`
 * y de ahí se deriva la carpeta—, no una fila de `users`). En la corrida
 * hermética (`pnpm test`) el archivo queda SKIPPED y no lee `.env` ni abre red:
 * todo el I/O vive dentro de `beforeAll` / `it` / `afterAll`.
 *
 *   SMOKE_CLOUDINARY=1 pnpm vitest run src/__smoke__/cloudinary.smoke.test.ts
 */

// `withSession` (shared/lib/http.ts) lee la sesión con `cookies()` de
// `next/headers` (shared/lib/auth/session.ts), que fuera de una petición de
// Next no tiene contexto. Este es el ÚNICO doble del archivo, y no toca nada de
// lo que se mide: el token que sirve es un JWT REAL firmado con el `JWT_SECRET`
// real y verificado por `verifySessionToken` sin atajos.
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

const RUN_SMOKE = Boolean(process.env.SMOKE_CLOUDINARY);
const BASE_URL = "https://smoke.local/api/uploads/image";

/** Carpeta de destino: se deriva del uuid, que no necesita existir en `users`. */
const USER_ID = crypto.randomUUID();

/**
 * PNG REAL de 1x1 (70 bytes: firma `\x89PNG`, IHDR, IDAT e IEND). Tiene que ser
 * un PNG de verdad y no bytes cualesquiera porque Cloudinary decodifica el
 * archivo en su lado: con relleno vacío rechazaría la subida y el caso feliz no
 * podría distinguir "firma inválida" de "imagen inválida".
 */
const REAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function mimeTypeFor(extension: string): string {
  const type = ACCEPTED_IMAGE_TYPES.find((candidate) =>
    candidate.endsWith(`/${extension}`),
  );
  if (!type) {
    throw new Error(`La lista blanca no admite ${extension}`);
  }
  return type;
}

function uploadRequest(file: Blob): Request {
  const form = new FormData();
  form.append("file", file);
  return new Request(BASE_URL, { method: "POST", body: form });
}

type Observed = {
  status: number;
  text: string;
  body: { url?: string; error?: string };
};

async function postUpload(file: Blob): Promise<Observed> {
  const response = await uploadImageRoute(uploadRequest(file));
  const text = await response.text();
  let body: Observed["body"] = {};
  try {
    body = JSON.parse(text) as Observed["body"];
  } catch {
    body = {};
  }
  return { status: response.status, text, body };
}

/**
 * `knit-crochet/users/<uuid>/<publicId>` a partir de la URL: es lo único que el
 * endpoint devuelve y es lo que necesita `/destroy` para borrar.
 */
function publicIdFromUrl(url: string): string {
  const { pathname } = new URL(url);
  const afterUpload = pathname.split("/image/upload/")[1] ?? "";
  return afterUpload.replace(/^v\d+\//, "").replace(/\.[^./]+$/, "");
}

const uploadedPublicIds: string[] = [];

/**
 * Teardown: borra de Cloudinary lo subido firmando con el MISMO
 * `buildUploadSignature` de producción, así la limpieza también ejercita la
 * firma (si la firma estuviera mal, `/destroy` respondería 401).
 *
 * Ojo: esto es higiene del test, NO del producto. La app sigue sin borrar nada
 * (deuda #61) y este archivo no pretende saldarla.
 */
async function destroyUploaded(publicId: string): Promise<string> {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await buildUploadSignature(
    { public_id: publicId, timestamp },
    config.apiSecret,
  );

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("api_key", config.apiKey);
  form.append("signature", signature);

  const response = await fetch(
    `${CLOUDINARY_API_BASE}/${config.cloudName}/image/destroy`,
    { method: "POST", body: form },
  );
  return `${response.status} ${await response.text()}`;
}

describe.skipIf(!RUN_SMOKE)("smoke: subida real a Cloudinary", () => {
  beforeAll(async () => {
    // `getCloudinaryConfig()` y el firmado del JWT leen `process.env` en cada
    // llamada: basta con poblarlo antes de la primera petición.
    process.env.CLOUDINARY_CLOUD_NAME = resolveEnvValue(
      "CLOUDINARY_CLOUD_NAME",
    );
    process.env.CLOUDINARY_API_KEY = resolveEnvValue("CLOUDINARY_API_KEY");
    process.env.CLOUDINARY_API_SECRET = resolveEnvValue(
      "CLOUDINARY_API_SECRET",
    );
    process.env.JWT_SECRET = resolveEnvValue("JWT_SECRET");

    cookieJar.set(
      JWT_COOKIE_NAME,
      await signSessionToken({ userId: USER_ID }),
    );
  }, 30_000);

  afterAll(async () => {
    for (const publicId of uploadedPublicIds) {
      const result = await destroyUploaded(publicId);
      console.log(`[smoke-cloudinary] teardown destroy ${publicId} -> ${result}`);
    }
  }, 60_000);

  it(
    "1. PNG real por el endpoint completo → 201 { url } y la URL sirve la imagen",
    async () => {
      const png = new File(
        [Uint8Array.from(Buffer.from(REAL_PNG_BASE64, "base64"))],
        "smoke.png",
        { type: mimeTypeFor("png") },
      );
      const observed = await postUpload(png);
      console.log(
        `[smoke-cloudinary] 1. subida -> status=${observed.status} body=${observed.text}`,
      );

      expect(observed.status).toBe(201);
      expect(observed.body.url).toBeDefined();
      const url = observed.body.url ?? "";
      uploadedPublicIds.push(publicIdFromUrl(url));

      // La carpeta viajó FIRMADA (va en los parámetros de la firma) y
      // Cloudinary la honró: si el `folder` no se hubiera firmado bien, la
      // subida habría sido rechazada, no colocada en otra ruta.
      expect(url).toContain(buildUserImageFolder(USER_ID));
      // `secure_url` y no `url`: el campo que lee `extractSecureUrl` es el https.
      expect(new URL(url).protocol).toBe("https:");

      // EL ASSERT QUE SALDA LA DEUDA: la URL que devolvimos sirve la imagen de
      // verdad. Prueba a la vez que la firma fue aceptada y que
      // `extractSecureUrl` leyó el campo correcto de la respuesta real.
      const served = await fetch(url);
      const contentType = served.headers.get("content-type") ?? "";
      const bytes = (await served.arrayBuffer()).byteLength;
      console.log(
        `[smoke-cloudinary] 1. GET url -> status=${served.status} content-type=${contentType} bytes=${bytes}`,
      );
      expect(served.status).toBe(200);
      expect(contentType.startsWith("image/")).toBe(true);
      expect(bytes).toBeGreaterThan(0);
    },
    60_000,
  );

  it(
    "2. bytes que no son imagen declarados image/png → Cloudinary rechaza → 502",
    async () => {
      // MIDE LA DEUDA #58: nuestro filtro es declarativo (mira `file.type`, que
      // lo escribe el cliente), así que esto lo pasa. Quien decide de verdad es
      // Cloudinary, y su rechazo tiene que salir como 502 { error }.
      const fake = new File(
        [new TextEncoder().encode("esto no es una imagen, son letras")],
        "mentira.png",
        { type: mimeTypeFor("png") },
      );
      const observed = await postUpload(fake);
      console.log(
        `[smoke-cloudinary] 2. subida falsa -> status=${observed.status} body=${observed.text}`,
      );

      expect(observed.status).toBe(502);
      expect(observed.body.error).toBe(
        "No se pudo subir la imagen. Inténtalo de nuevo.",
      );
      expect(observed.body.url).toBeUndefined();
    },
    60_000,
  );
});
