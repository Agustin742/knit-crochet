# Review — feature #5 `cloudinary_upload`

**Veredicto: APROBADO**

Revisor: agente `reviewer`. Fecha: 2026-07-21.
Ámbito: `src/shared/lib/cloudinary/{config,upload,index}.ts` + `config.test.ts` + `upload.test.ts`,
contra `docs/harness/{architecture,conventions,verification}.md`, `CHECKPOINTS.md`,
`docs/product/PRD-01-estructura-funcional.md` §2 y §12.11, y el `acceptance` de #5.

## Verificación ejecutada (por el revisor, no copiada del informe)

`bash ./init.sh` → VERDE, exit 0: lint verde, typecheck verde,
**Test Files 12 passed (12) / Tests 70 passed (70)**, "[OK] Entorno listo".

Conteo real confirmado: **70 tests en 12 archivos** (antes 60 en 10 → +10 tests, +2 archivos).
Ninguno roto. Coincide exactamente con lo declarado por el implementer.

**Dependencias:** `git diff --stat` no toca `package.json` ni `pnpm-lock.yaml`. Diff total de la
sesión: `feature_list.json`, `progress/current.md`, `tsconfig.tsbuildinfo` (artefacto ya trackeado)
+ directorio nuevo `src/shared/lib/cloudinary/`. **Cero dependencias nuevas**, coherente con la
decisión de no usar el SDK.

## Checklist punto por punto

### 1. Config desde env, sin credenciales hardcodeadas — [x]

- `config.ts:41-54` `getCloudinaryConfig()` lee `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET` de `process.env` **en cada llamada** (no a nivel de módulo): importar el
  archivo nunca lanza y es sustituible en tests. Mismo patrón que `MissingDatabaseUrlError` /
  `MissingJwtSecretError` (#2/#4).
- `readEnv` (`config.ts:25-32`) **sin valor por defecto**: si falta, acumula el nombre y termina en
  error. Ningún fallback para el secret.
- `.env.example` ya documenta las tres variables con esos nombres exactos bajo el bloque
  "(feature #5)" — verificado; no hacía falta modificarlo.
- **Sin fugas:** `MissingCloudinaryConfigError` solo expone `missingVariables` (nombres) y su mensaje
  (`config.ts:11-13`) solo interpola nombres. Cero `console.*` en el módulo (grep: sin `console`,
  sin `any`, sin `TODO`). Cubierto por `config.test.ts:50-62` y `upload.test.ts:112`.

### 2. Devuelve la URL final; el tipo deja explícito que solo se persiste la URL — [x]

- `upload.ts:30-32`: `export type UploadedImage = { url: string }`, con JSDoc citando PRD §2
  ("el binario nunca sale de Cloudinary ni se guarda en Postgres"). El `Blob` entra y no se propaga
  a ningún retorno.
- `extractSecureUrl` (`upload.ts:65-71`) exige `secure_url` string no vacío → se devuelve la URL
  **https** definitiva, no `url` (http). Correcto para persistir en `Project.image`, `Pattern.image`,
  `Yarn.image` (PRD §4, `string | null` = URL Cloudinary).

### 3. Manejo de error explícito, usable desde un endpoint — [x]

- `CloudinaryUploadError` (`upload.ts:10-24`) con discriminante
  `reason: "network" | "rejected" | "malformed_response"`, `status?: number` y `cause` preservada.
- Las tres rutas de fallo lanzan: red (`:129-135`, conserva `cause`), no-2xx (`:137-143`, con `status`
  y el `error.message` de Cloudinary), cuerpo ilegible o sin `secure_url` (`:145-163`).
- **Nada se traga en silencio.** El único `catch` vacío es `readRejectionMessage` (`upload.ts:82-84`)
  y está justificado con comentario: si el cuerpo de error no es JSON degrada a `HTTP <status>` y el
  `CloudinaryUploadError` de fuera **se lanza igualmente**.
- Contrato para el consumidor documentado en el JSDoc de `uploadImage` (`:88-96`): el Route Handler
  captura y traduce con `errorResponse`/`unexpectedErrorResponse` de `shared/lib/http.ts`. Es
  capturable y tipado: un fallo de Cloudinary no tumba el endpoint. Conforme a `conventions.md`
  ("errores de dominio nombrados") y `architecture.md` regla 6.

### 4. Corrección de la firma criptográfica (auditoría principal) — [x] CORRECTA

context7 y WebFetch/WebSearch **no están disponibles** en este entorno, así que la verificación se
hizo (a) contra la especificación de *signed upload* de la API de Cloudinary y (b) **empíricamente**,
recomputando la firma con una implementación independiente (`node:crypto`), fuera del test.

Algoritmo exigido por Cloudinary para `POST /v1_1/<cloud_name>/image/upload` firmado:
1. Todos los parámetros enviados **excepto** `file`, `cloud_name`, `resource_type`, `api_key`
   (y la propia `signature`).
2. Orden **alfabético por nombre**.
3. Serializar `nombre=valor` unidos por `&`.
4. **Concatenar el `api_secret` al final**, sin separador.
5. **SHA-1** en hexadecimal minúscula (SHA-1 es el algoritmo por defecto; SHA-256 solo si la cuenta
   se configura con `signature_algorithm`, que no es el caso).

Contraste con `buildUploadSignature` (`upload.ts:54-63`) + `uploadImage` (`:103-121`):

- Paso 1 — OK. Solo se firman `timestamp` y, si vienen, `folder` y `public_id` (`:103-111`).
  `file`, `api_key` y `signature` se añaden al `FormData` **después** (`:115-121`) y no entran en
  `signedParams`. `cloud_name` y `resource_type` viajan en la **URL** (`:126`,
  `/v1_1/${cloudName}/image/upload`), no como params → correctamente fuera de la firma. Los
  opcionales solo se añaden si son truthy, así que nunca se firma un `folder=` vacío que no se
  enviaría: firma y body siempre coinciden.
- Paso 2 — OK. `.sort(([a],[b]) => a.localeCompare(b))` (`:59`).
- Paso 3 — OK. `clave=valor` unidos por `&` (`:60-61`).
- Paso 4 — OK. `sha1Hex(canonical + apiSecret)` (`:62`): secret al final, sin `&` ni `=`.
- Paso 5 — OK. `crypto.subtle.digest("SHA-1", …)` + hex minúscula con `padStart(2,"0")` (`:39-47`).
  El `padStart` está bien puesto (bug clásico: los bytes < 0x10 perderían el cero a la izquierda).

**Verificación empírica independiente** (recomputada por el revisor con `node:crypto`):

    sha1("folder=knit-crochet/projects&timestamp=1700000000top-secret")
      = b5b55b1b2502210d97454f1b7c4adbfa74304425

Idéntico al valor que produce `buildUploadSignature` y al afirmado en `upload.test.ts:78-80` y
`:85-92`. Es decir: la cadena canónica construida es exactamente la que exige el proveedor y el
digest es SHA-1 hex correcto. **No es un test tautológico**: la constante es reproducible con
cualquier implementación de SHA-1 ajena al repo.

- **El `api_secret` nunca viaja.** `upload.ts:115-121`: al `FormData` van `file`, params firmados,
  `api_key` y `signature`. El secret solo es input del hash. No hay query string. Aserción explícita
  en `upload.test.ts:81` (`expect(body.get("api_secret")).toBeNull()`).
- **No acaba en logs:** cero `console.*`; ningún mensaje interpola el secret (test `:112`).

Conclusión: **la firma es correcta**; no hay riesgo de "falla solo en producción". La decisión de
`fetch` firmado en vez del SDK queda aceptada (cero deps, compatible Node y Edge, borde mockeable
en un solo global), y está documentada en el JSDoc además del informe.

Observación **no bloqueante**: `localeCompare` (`:59`) es sensible a locale/ICU y trata la puntuación
distinto a la comparación por código de carácter que implica "orden alfabético" en la doc. Con las
claves actuales (`folder`, `public_id`, `timestamp`) el orden es idéntico en ambos criterios, así que
hoy la firma es correcta. Si #6/#8/#9 añaden params firmables con guion bajo que puedan colisionar,
conviene un comparador binario (`a < b ? -1 : 1`). Deuda anotada, no corregir ahora.

### 5. Tests con el borde mockeado, no tautológicos — [x]

`upload.test.ts` (7) + `config.test.ts` (3). El borde mockeado es exactamente el global `fetch`
(`vi.stubGlobal`) y el entorno (`vi.stubEnv`), con `afterEach` que hace
`unstubAllEnvs/unstubAllGlobals/useRealTimers`. **Sin red real** en ningún test.

- Feliz (`:41-55`): afirma el **resultado** (`{ url: SECURE_URL }`), no solo que no lanza.
- Contrato de petición (`:57-83`): con `vi.setSystemTime` fija el `timestamp` y verifica URL, método,
  `timestamp`, `folder`, `api_key`, **firma exacta**, ausencia de `api_secret` y presencia del `file`.
- Firma aislada (`:85-92`): contra valor conocido, verificado por mí con `node:crypto`.
- Error `rejected` (`:94-113`): mock 400 → tipo, `name`, `reason`, `status` 400, propagación del
  mensaje de Cloudinary y **ausencia del secret**. Ejercita `!response.ok` + `readRejectionMessage`.
- Error `network` (`:115-127`): `mockRejectedValue` → `reason: "network"` y `cause` preservada.
- Error `malformed_response` (`:129-143`): 200 sin `secure_url` → ejercita `extractSecureUrl`.
- Falta de config (`:145-154`): secret vacío → `MissingCloudinaryConfigError` **y** `fetch` no llamado
  (prueba el corte antes de la red, no solo el tipo del error).
- `config.test.ts`: lectura OK; todas las variables faltantes listadas en orden; solo-secret-faltante
  sin filtrar el api_key.

Cumple `verification.md` Nivel 0 y Nivel 1 (feliz + ≥1 error) y evita el anti-patrón "test que solo
verifica que la función no lanza".

### 6. Alcance respetado — [x]

Solo se ha creado `src/shared/lib/cloudinary/`. **No** hay `route.ts` nuevos ni cambios en
`src/features/**`, `src/app/**`, `src/shared/db/**` o schemas (`git diff --stat` lo confirma).
Ubicación correcta según `architecture.md` ("shared/lib: jwt, hashing, **cloudinary**, fetch client")
y `conventions.md` §"Dónde va cada cosa". El cableado de la URL queda para #6/#8/#9.

Convenciones: código en inglés, prosa/JSDoc en español, comillas dobles, `async/await`, imports con
alias `@/`, `UPPER_SNAKE` en `CLOUDINARY_API_BASE`/`CLOUDINARY_ENV_VARS`, `PascalCase` en tipos y
errores, sin `any` (`unknown` + narrowing en `extractSecureUrl` y `readRejectionMessage`), comentarios
solo donde explican un *por qué*. Conforme.

El barrel `index.ts` es correcto: el `acceptance` dice "`shared/lib/cloudinary` expone una función de
upload" y `conventions.md` pide `index.ts` como API pública. La asimetría con `shared/lib/auth` (sin
barrel) es menor y no justifica rechazo. `buildUploadSignature` exportada para test determinista:
aceptado, documentado en el JSDoc y es lo que permite auditar la firma sin red.

### 7. Estado de la feature — [x]

`feature_list.json`: #5 en `"in_progress"`. El implementer **no** la marcó `done`.
Estados: 1-4 `done`, 5 `in_progress`, 6-11 `pending` → una sola feature en curso.

## Checkpoints (CHECKPOINTS.md)

- **C1 — El arnés está completo:** [x] archivos base y los 3 docs presentes; `bash ./init.sh` exit 0.
- **C2 — El estado es coherente:** [x] una sola feature `in_progress`; las `done` (#1-#4) tienen tests
  que pasan (70 verdes en total); `progress/current.md` describe la sesión activa, sin basura.
- **C3 — El código respeta la arquitectura:** [x] helper en `shared/lib` (capa correcta), sin UI ni DB
  implicadas, sin lógica en `route.ts` (no hay endpoints nuevos), **cero dependencias nuevas**, sin
  `console.log` ni TODOs, **sin secretos hardcodeados**. El scoping por `userId` no aplica a un helper
  sin acceso a datos; se activa en #6/#8/#9.
- **C4 — La verificación es real:** [x] lint y typecheck verdes; 70/70 tests verdes; los dos módulos
  con lógica no trivial (`config.ts`, `upload.ts`) tienen tests de feliz + error.
- **C5 — La sesión se cerró bien:** [~] **pendiente del leader; no imputable al implementer ni
  bloqueante para esta feature.** Al cerrar faltan: (a) entrada en `progress/history.md` para la sesión
  de #5, (b) marcar #5 como `done` en `feature_list.json`, (c) vaciar `progress/current.md`.
  No hay `*.tmp` ni artefactos sospechosos nuevos.

## Cambios requeridos

Ninguno bloqueante. La feature queda **APROBADA** y lista para pasar a `done`.

## Notas / deuda (no bloqueante, para el leader)

1. **Orden de firma con `localeCompare`** (`upload.ts:59`): correcto con las claves actuales; migrar a
   comparador binario cuando #6/#8/#9 añadan más params firmables, para no depender del locale/ICU.
2. **`tsconfig.tsbuildinfo` está trackeado** en git (aparece modificado en cada sesión). Es artefacto
   de build: añadir a `.gitignore` y dejar de versionarlo. Pre-existente a #5.
3. **Sanitización de `folder`/`publicId`**: el helper no los sanea (correcto: los pasa el servicio, no
   el usuario). Al cablearlos en #6/#8/#9 deben venir de constantes o del `userId` del JWT, validados
   con zod en el endpoint, **nunca del body crudo**.
4. **Deuda de #4 sigue viva:** reexportar `InvalidSessionError` desde `session.ts` y añadir
   `withSession`/`sessionErrorResponse` en `shared/lib/http.ts` al arrancar #6.
5. **`crypto.subtle` como global**: correcto y deliberado (Node ≥20 y Edge). Sin cambio.
