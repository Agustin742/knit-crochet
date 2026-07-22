# Informe de implementación — Feature #5 `cloudinary_upload`

- **Estado:** implementada, `feature_list.json` queda en `in_progress` (cierre a cargo del reviewer).
- **PRD:** §12.11, §2 (Cloudinary: se guarda **solo la URL** en la DB).
- **Alcance respetado:** helper puro de `shared/lib`. No se han creado endpoints ni
  se han tocado features de datos (#6, #8, #9 cablearán la URL en sus entidades).

## Archivos

Creados:

- `src/shared/lib/cloudinary/config.ts` — lectura de configuración desde env + `MissingCloudinaryConfigError`.
- `src/shared/lib/cloudinary/upload.ts` — `uploadImage`, `buildUploadSignature`, `CloudinaryUploadError`, tipo `UploadedImage`.
- `src/shared/lib/cloudinary/index.ts` — superficie pública del módulo (`@/shared/lib/cloudinary`).
- `src/shared/lib/cloudinary/config.test.ts` — 3 tests.
- `src/shared/lib/cloudinary/upload.test.ts` — 7 tests.

Modificados:

- `progress/current.md` (bitácora).
- `.env.example` — **sin cambios**: ya contenía `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`
  y `CLOUDINARY_API_SECRET` bajo el bloque "(feature #5)". Los nombres implementados
  coinciden exactamente con los ya documentados; no hacía falta añadir nada.

No se ha añadido ninguna dependencia (`package.json` / `pnpm-lock.yaml` intactos).

## Decisión técnica: `fetch` directo (elegido) vs SDK `cloudinary`

**Elegido: `fetch` directo contra `https://api.cloudinary.com/v1_1/<cloud>/image/upload`
con upload firmado.** Justificación contra los criterios, en el orden dado:

1. **Build en Vercel bajo pnpm.** Cero dependencias nuevas ⇒ cero riesgo de binarios
   nativos, de `postinstall` o de árboles fantasma con el node-linker de pnpm. El SDK
   `cloudinary` es JS puro, pero arrastra un árbol transitivo notable (`lodash`, `q`,
   `proxy-agent`/`https-proxy-agent`…), pesa en el bundle serverless y es una dependencia
   pesada que `architecture.md` pide justificar. Para lo que necesitamos —un POST
   multipart— no aporta nada.
2. **Route Handlers de Next 16.** `fetch`, `FormData`, `Blob` y `crypto.subtle` son
   globales estándar disponibles tanto en el runtime Node como en Edge. El SDK depende
   de `https`/streams de Node y quedaría atado al runtime Node. La opción elegida deja
   ambos runtimes abiertos.
3. **Mockeable en el borde.** El borde es exactamente un global: `vi.stubGlobal("fetch", …)`.
   No hay que interceptar módulos ni singletons de configuración del SDK, ni hay riesgo de
   red real accidental (los tests fallan si algo intenta salir sin mock).

**Cómo se firma la petición** (documentado también en el JSDoc de `buildUploadSignature`):
se toman los parámetros firmables (`timestamp` y, si se pasan, `folder` y `public_id`),
se ordenan alfabéticamente, se serializan como `clave=valor` unidos por `&`, se concatena
el `api_secret` al final y se calcula **SHA-1** (hex) con `crypto.subtle.digest`. El
multipart lleva `file`, los parámetros firmados, `api_key` y `signature`. **El `api_secret`
nunca viaja en la petición.** Hay un test con firma fija (`timestamp=1700000000`, `folder`
conocido) verificada contra `crypto.createHash("sha1")` de Node, y un test que asegura que
el `FormData` no contiene `api_secret`.

## Contrato de error (elegido: **excepción tipada**)

Coherente con el precedente del repo (`MissingDatabaseUrlError`, `MissingJwtSecretError`,
`InvalidSessionError`) y con `conventions.md` ("errores de dominio nombrados").

- `MissingCloudinaryConfigError` — falta configuración en env. Expone `missingVariables`
  (solo **nombres**, nunca valores). Sin valores por defecto hardcodeados. La config se
  lee **en cada llamada**, no a nivel de módulo: importar el archivo nunca lanza.
- `CloudinaryUploadError` — fallo de subida, con discriminante `reason`:
  - `"network"` — `fetch` rechazó (se conserva el original en `cause`).
  - `"rejected"` — respuesta no-2xx; `status` con el código HTTP y el `error.message`
    de Cloudinary en el mensaje.
  - `"malformed_response"` — cuerpo no-JSON o sin `secure_url`.

Contrato para el consumidor (Route Handlers de #6/#8/#9): **deben capturar** ambas y
traducirlas con `errorResponse`/`unexpectedErrorResponse` de `shared/lib/http.ts`
(sugerencia: `MissingCloudinaryConfigError` → 500, `CloudinaryUploadError` → 502/400 según
`reason`). Así un fallo de Cloudinary nunca tumba el endpoint. No se traga ningún error en
silencio, no se hace `console.log` dentro del helper y ningún mensaje incluye credenciales
(hay un test que lo comprueba explícitamente).

**Retorno explícito:** `uploadImage` devuelve `UploadedImage = { url: string }` — el tipo
deja claro que lo único que sale (y lo único persistible) es la URL; el binario no se
propaga ni se devuelve.

## Verificación — `bash ./init.sh`

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  12 passed (12)
      Tests  70 passed (70)
   Start at  20:43:30
   Duration  11.90s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**60 → 70 tests, 10 → 12 archivos. Ninguno roto.** Sin red real en ningún test.

## Riesgos / notas para el reviewer

- **`crypto.subtle` como global.** Disponible en Node ≥ 20 y en Edge; no se importa
  `node:crypto`, lo que mantiene el módulo agnóstico de runtime. Si el reviewer prefiere
  atarlo a Node, sería un cambio de una línea (pero perderíamos compatibilidad Edge).
- **`index.ts` en `shared/lib/cloudinary`.** `shared/lib/auth` no tiene barrel (se importa
  por ruta). Aquí sí se ha añadido para que `@/shared/lib/cloudinary` sea importable tal y
  como lo enuncia el `acceptance`. Si se prefiere homogeneidad estricta con `auth`, se
  elimina y se importa por archivo.
- **`buildUploadSignature` es pública.** Se exporta para poder testear la firma de forma
  determinista contra un valor conocido. No es parte del uso normal.
- **Timestamp firmado.** Cloudinary rechaza firmas con desviación temporal grande; se usa
  `Date.now()` del servidor (test con `vi.setSystemTime`). Sin reintentos: un fallo de red
  es un `CloudinaryUploadError` que decide el consumidor.
- **`folder`/`publicId` son opcionales y no se sanean** (los pasa el servicio llamante, no
  el usuario). Cuando #6/#8/#9 los cableen, el valor debe venir de constantes/`userId`
  validados con zod en el endpoint, no del body crudo.
