# impl_uploads_image — feature #15 `uploads_image`

> Implementer. Feature **#15**, `POST /api/uploads/image`. Slice de **backend**: no aplica el checklist
> visual del SDD §9 (no hay UI, ni RTL, ni axe). **La feature queda en `in_progress`**: no la marco `done`.

> ⚠️ **Este informe tiene dos rondas.** Las secciones 1-9 son la **primera ronda** y se conservan tal cual
> se escribieron (el leader pidió no borrarlas). La **§10 es la segunda ronda**, posterior al review, y
> **corrige el tope de tamaño de 5 MB a 4 MB**. Donde las secciones 1-9 digan "5 MB", manda la §10: el valor
> vigente es **4 MB**. Ese texto queda como registro de lo que se decidió el 2026-08-04, no como contrato.

---

## 1. Qué se construyó

Un **único endpoint compartido** `POST /api/uploads/image` que recibe un archivo por `multipart/form-data`,
lo sube a Cloudinary con el helper ya existente (#5) y devuelve `{ url }`. No sabe nada de ninguna entidad:
lo consumirán tal cual los formularios de Project (#22), Yarn (#25) y Pattern (#28).

Contrato implementado, tal como quedó cerrado en **PRD §11.9**:

| Regla | Dónde vive | Status |
|---|---|---|
| Lista blanca `image/jpeg`, `image/png`, `image/webp` | `features/uploads/validation.ts` | `400` |
| Tamaño máximo 5 MB *(← corregido a **4 MB** en la §10; ver aviso de arriba)* | `features/uploads/validation.ts` | `400` |
| Ambas **antes** de llamar a Cloudinary | orden del Route Handler (validar → delegar) | — |
| `folder` determinista por `userId` del JWT | `buildUserImageFolder()` | — |
| `publicId` único por subida | `createImagePublicId()` (`crypto.randomUUID()`) | — |
| `folder`/`publicId` **nunca** del body crudo (deuda 3) | el handler lee **solo** el campo `file` | — |

---

## 2. Archivos creados / modificados

### Creados

| Archivo | Qué hace |
|---|---|
| `src/features/uploads/validation.ts` | `ACCEPTED_IMAGE_TYPES`, `MAX_IMAGE_BYTES`, `uploadUserIdSchema` (`z.uuid()`), `uploadImageInputSchema` (zod sobre el `Blob`). |
| `src/features/uploads/api/errors.ts` | Errores de dominio `ImageUploadFailedError` (falla el proveedor) e `ImageUploadUnavailableError` (falta configuración). |
| `src/features/uploads/api/upload-user-image.ts` | Servicio `uploadUserImage(userId, file, upload = uploadImage)` + `buildUserImageFolder`, `createImagePublicId`, `UPLOADS_ROOT_FOLDER`. Traduce las excepciones de Cloudinary a errores de dominio. |
| `src/features/uploads/api/index.ts`, `src/features/uploads/index.ts` | Barrels (misma forma que `features/patterns/`). |
| `src/features/uploads/api/upload-user-image.test.ts` | 8 tests del servicio con un doble inyectado. |
| `src/app/api/uploads/image/route.ts` | Route Handler fino: `withSession` → valida `userId` con zod → lee el multipart → valida con zod → delega → traduce errores a HTTP. |
| `src/app/api/uploads/uploads-routes.test.ts` | 19 tests del handler real con `fetch` mockeado **en el borde**. |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/shared/lib/http.ts` | + `readFormData(request)`: hermano de `readJsonBody`, devuelve `undefined` si el cuerpo no es multipart válido (lo rechaza luego zod, sin `try/catch` en el handler). |
| `src/shared/lib/http.test.ts` | + 2 tests de `readFormData` (multipart OK / cuerpo JSON → `undefined`). |
| `progress/current.md` | Feature en curso + plan. |

**No se tocó** `feature_list.json` (sigue `in_progress`), ni `progress/deudas.md`, ni ninguna otra feature.
**No hizo falta tocar `src/proxy.ts`**: `/api/uploads/image` no está en `PUBLIC_API_ROUTES`, y esa lista es
fail-closed, así que la ruta ya nace privada. Lo comprobé leyendo `isPublicPath`, no asumiéndolo.

---

## 3. Decisiones que tomé yo (y por qué)

**D1 — Feature nuevo `src/features/uploads/`, no `shared/lib`.** `architecture.md` §"Reglas de capas" (2)
dice que la lógica vive en `features/<x>/api/` y que el Route Handler solo parsea/valida/delega. La
derivación del destino y la traducción de errores **son** lógica. `shared/lib/cloudinary` sigue siendo el
transporte genérico (no sabe de usuarios); el feature es quien decide *dónde* va la imagen de *este* usuario.
Estructura copiada de `features/patterns/`: `validation.ts` + `api/{errors,index,...}.ts` + `index.ts`.
**Sin `schema.ts` ni `types.ts`**: no hay tabla ni entidad — el único tipo, `UploadedImage`, ya existe en
`shared/lib/cloudinary`, y duplicarlo habría sido inventar estructura.

**D2 — Status de éxito: `201`.** El repo devuelve `201` en los POST que crean un recurso
(`POST /api/patterns`), y aquí se crea un asset en Cloudinary. Ni el PRD ni los RFC fijan el status, así que
lo elijo y lo dejo escrito. **El consumidor de #22/#25/#28 debe esperar `201`, no `200`.**

**D3 — `502` para el fallo del proveedor y `500` para la configuración ausente.** Los dos casos que el
docstring de `uploadImage` obliga a capturar se traducen a códigos distintos a propósito:
- `CloudinaryUploadError` (red / rechazo / respuesta ilegible) → **`502`** + `{ error: "No se pudo subir la
  imagen. Inténtalo de nuevo." }`. Reintentar puede funcionar: el defecto es aguas arriba.
- `MissingCloudinaryConfigError` → **`500`** vía `unexpectedErrorResponse`. Reintentar **no** arregla nada:
  el defecto es de nuestro despliegue.

`conventions.md` enumera "400/401/404/409/500" como *los códigos usados en el PRD*; el `502` es un añadido
consciente, y es el que distingue "falló el tercero" de "fallamos nosotros". Si el reviewer prefiere
colapsar ambos a `500`, es un cambio de una línea en el handler y de dos aserciones en el test. **En ningún
caso se propaga el mensaje de Cloudinary ni un stack trace al cliente**: hay una aserción que comprueba que
ni el `api_secret` ni el texto de Cloudinary aparecen en la respuesta.

**D4 — `userId` inválido → `401`, no `400` ni `500`.** El `userId` sale del JWT y es un `uuid` de la tabla
`users` (`src/features/auth/schema.ts`). Si no valida, lo que hay roto es la sesión, no la petición: por eso
`uploadUserIdSchema` es `z.uuid()` y su fallo responde `No autenticado.`. Es **fail-closed**: si algún día
cambia el tipo de id de usuario, este endpoint se cae en rojo de forma ruidosa en vez de escribir en una
carpeta con un nombre arbitrario. Hay un test que lo fija (sesión firmada con `"user-1"` → `401`, y
Cloudinary sin llamar).

**D5 — Rechazo del archivo vacío (0 bytes).** No está en el contrato cerrado, y **no lo reabre**: es un
guardián adicional en la misma dirección (no gastar red ni cuota). Un archivo de 0 bytes no es una imagen.
Si el reviewer lo considera fuera de alcance, se quita borrando un `.refine` y un test.

**D6 — `readFormData` en `shared/lib/http`, junto a `readJsonBody`.** El cuerpo es multipart, así que
`readJsonBody` no aplica; verifiqué que `request.formData()` funciona sobre el `Request` estándar de este
runtime (Node 24 / undici) y sobre Next 16.2.10 — hay test propio y el `pnpm build` lista la ruta. Se le da
la **misma semántica** que a su hermano (fallo → `undefined` → lo rechaza zod) para que el handler no tenga
un `try/catch` extra y para que "no es multipart" caiga en el mismo `400` que "falta el archivo".

**D7 — `folder` = `knit-crochet/users/<userId>`.** Raíz común (`UPLOADS_ROOT_FOLDER`) + el id del usuario.
**No** se segmenta por entidad (`/projects`, `/yarns`): el endpoint es compartido y no debe saber quién le
llama; meter la entidad exigiría un campo del body, que es exactamente lo que la deuda 3 prohíbe.

---

## 4. Cómo se cumple el punto 3 del contrato (rechazo antes de Cloudinary)

No es un comentario: es el **orden** del handler. `uploadUserImage` es la única puerta a la red y se llama
**después** del `safeParse`, con un `return` de por medio:

```ts
const parsed = uploadImageInputSchema.safeParse({ file: form?.get("file") });
if (!parsed.success) {
  return validationErrorResponse(parsed.error);   // ← no hay red más allá de aquí
}
const { url } = await uploadUserImage(session.data, parsed.data.file);
```

Los tests lo miden por el sitio correcto: mockean **`fetch`** (el borde real, igual que
`src/shared/lib/cloudinary/upload.test.ts`) y afirman `expect(fetchMock).not.toHaveBeenCalled()`. No miden
una bandera intermedia, sino la ausencia de la llamada de red.

Lo mismo vale para la deuda 3: el handler construye el input con `{ file: form?.get("file") }` y **nada
más**. No existe un camino por el que otro campo del formulario llegue a `uploadUserImage`, y los tests lo
comprueban inyectando `folder`, `public_id` y `publicId` en el multipart.

**El par que se mide se deriva del código**: los tests importan `buildUserImageFolder`, `MAX_IMAGE_BYTES` y
`ACCEPTED_IMAGE_TYPES` del propio feature y comparan contra lo que el helper acabó metiendo en el `FormData`
enviado a la red. No hay ningún literal elegido a mano que pueda quedarse desincronizado del código.

---

## 5. CONDICIÓN DOBLE — ejecutada en las dos direcciones, salida real

### 5.1 Gate del PRD §11.9 — "el archivo rechazado no llega a Cloudinary"

**Rojo.** Rompí el orden en `src/app/api/uploads/image/route.ts`: la subida pasa a ejecutarse **antes** de
la validación (los `400` se siguen devolviendo, lo único que cambia es que la red ya se gastó).

```
       × answers 400 for a type outside the whitelist and does not call Cloudinary 6ms
       × answers 400 for a file over the size limit and does not call Cloudinary 30ms
       × answers 400 for an empty file and does not call Cloudinary 2ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/app/api/uploads/uploads-routes.test.ts > api/uploads/image route handler > rejected input never reaches Cloudinary (PRD §11.9) > answers 400 for a type outside the whitelist and does not call Cloudinary
 FAIL  src/app/api/uploads/uploads-routes.test.ts > api/uploads/image route handler > rejected input never reaches Cloudinary (PRD §11.9) > answers 400 for a file over the size limit and does not call Cloudinary
 FAIL  src/app/api/uploads/uploads-routes.test.ts > api/uploads/image route handler > rejected input never reaches Cloudinary (PRD §11.9) > answers 400 for an empty file and does not call Cloudinary
 Test Files  1 failed (1)
      Tests  3 failed | 16 passed (19)
```

Mensaje de una de las tres (obsérvese que el `400` seguía siendo correcto; lo que cae es la llamada de red):

```
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times

Received:

  1st vi.fn() call:

    Array [
      "https://api.cloudinary.com/v1_1/knit-crochet/image/upload",
      Object {
        "body": FormData {},
        "method": "POST",
      },
    ]


Number of calls: 1
```

**Verde.** Restaurado el orden original:

```
 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  00:09:03
   Duration  1.18s (transform 131ms, setup 420ms, import 340ms, tests 129ms, environment 0ms)
```

### 5.2 Gate de la deuda 3 — "el body crudo no influye en la ruta de destino"

**Rojo.** Hice que el `folder` saliera del formulario:
`uploadUserImage((form?.get("folder") as string | null) ?? session.data, parsed.data.file)`.

```
       × ignores a folder and a publicId injected through the form 9ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/app/api/uploads/uploads-routes.test.ts > api/uploads/image route handler > destination derived from the session (deuda técnica 3) > ignores a folder and a publicId injected through the form
AssertionError: expected 'knit-crochet/users/../otro-usuario' to be 'knit-crochet/users/9c2d0f6e-3a4b-4c5d…' // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 18 passed (19)
```

El valor recibido, `knit-crochet/users/../otro-usuario`, es exactamente el escape que la deuda 3 describe:
un campo del formulario saliendo de la carpeta del usuario.

**Verde.** Restaurado el handler:

```
 Test Files  2 passed (2)
      Tests  27 passed (27)
   Start at  00:10:57
   Duration  1.48s (transform 310ms, setup 1.14s, import 617ms, tests 144ms, environment 0ms)
```

---

## 6. Verificación final (salida real, sin redondear)

### `bash ./init.sh`

```
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (32 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  51 passed | 2 skipped (53)
      Tests  544 passed | 11 skipped (555)
   Start at  00:12:40
   Duration  57.14s (transform 4.31s, setup 45.58s, import 49.44s, tests 29.64s, environment 15.48s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Antes de esta feature el árbol estaba en **515 passed | 11 skipped** (49 archivos + 2 skipped). Ahora:
**544 passed | 11 skipped**, **51 archivos + 2 skipped**. Diferencia: **+29 tests** (19 del handler,
8 del servicio, 2 de `readFormData`) y **+2 archivos**. Los 2 skipped siguen siendo los dos smokes.

### `pnpm build`

```
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 10.9s
  Running TypeScript ...
  Finished TypeScript in 9.9s ...
  Collecting page data using 3 workers ...
  Generating static pages using 3 workers (0/15) ...
✓ Generating static pages using 3 workers (15/15) in 358ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/auth/me
├ ƒ /api/auth/register
├ ƒ /api/brands
├ ƒ /api/brands/[id]
├ ƒ /api/brands/[id]/types
├ ƒ /api/brands/[id]/types/[typeId]
├ ƒ /api/dashboard/metrics
├ ƒ /api/patterns
├ ƒ /api/patterns/[id]
├ ƒ /api/projects
├ ƒ /api/projects/[id]
├ ƒ /api/projects/[id]/rounds
├ ƒ /api/projects/[id]/sessions
├ ƒ /api/projects/[id]/sessions/start
├ ƒ /api/projects/[id]/sessions/stop
├ ƒ /api/projects/[id]/steps
├ ƒ /api/projects/[id]/yarns
├ ƒ /api/projects/[id]/yarns/[yarnId]
├ ƒ /api/uploads/image
├ ƒ /api/yarns
├ ƒ /api/yarns/[id]
├ ƒ /login
└ ○ /register


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

`/api/uploads/image` aparece en la tabla de rutas como dinámica (`ƒ`), que es lo esperado para un Route
Handler con sesión.

---

## 7. Cobertura de tests frente al acceptance

| Criterio del acceptance / del encargo | Test |
|---|---|
| Subida OK, Cloudinary mockeado en el borde | `answers 201 with only the URL of the uploaded image` |
| Los 3 tipos de la lista blanca se aceptan (iterando la constante) | `accepts every type of the whitelist` |
| Límite exacto de 5 MB aceptado (frontera derivada de `MAX_IMAGE_BYTES`) | `accepts a file sitting exactly on the size limit` |
| 401 sin sesión | `answers 401 without a session and does not call Cloudinary` |
| 401 con sesión sin `userId` válido | `answers 401 when the session does not hold a valid user id` |
| 400 tipo no permitido, **sin llamar a Cloudinary** | `answers 400 for a type outside the whitelist…` |
| 400 tamaño excedido, **sin llamar a Cloudinary** | `answers 400 for a file over the size limit…` |
| 400 archivo ausente, **sin llamar a Cloudinary** | `answers 400 when the file is missing…` |
| 400 campo de texto en vez de archivo / cuerpo no multipart / archivo vacío | 3 tests más del mismo bloque |
| `folder` derivado del `userId` | `sends the folder derived from the session userId` |
| `folder`/`publicId` del formulario sin efecto (deuda 3) | `ignores a folder and a publicId injected through the form` |
| `publicId` único por subida | `gives every upload of the same user a different publicId` + `uses a unique publicId on every upload…` |
| Aislamiento entre usuarios | `keeps two users apart` + `isolates users: two userIds never share a folder` |
| `CloudinaryUploadError` traducido a status HTTP (3 razones) | `answers 502 when Cloudinary rejects…`, `…when the network fails`, `…without a URL` |
| `MissingCloudinaryConfigError` traducido a status HTTP | `answers 500 when Cloudinary is not configured, without calling the network` |
| Sin fuga del secreto ni del mensaje del proveedor | aserciones dentro del test de `502` |
| Traducción de errores en el servicio (unidad) | 3 tests en `upload-user-image.test.ts` |

---

## 8. Deuda nueva que dejo o encuentro

Ninguna de estas bloquea el cierre de #15; las dejo fichadas aquí para que el leader las consolide en
`progress/deudas.md` (que **no** he tocado).

1. **El endpoint no verifica el contenido real del archivo, solo el `Content-Type` que declara el cliente.**
   `file.type` viene de la parte multipart y lo escribe quien sube. Un ejecutable renombrado a `.jpg` con
   `Content-Type: image/jpeg` pasa el filtro y llega a Cloudinary. La mitigación real —inspeccionar los
   *magic bytes* de la cabecera— **no** está en el contrato cerrado y no la he metido para no ampliar el
   alcance. El riesgo está acotado (Cloudinary rechaza lo que no es imagen y el `502` lo traduce, y la URL
   se sirve desde su dominio, no desde el nuestro), pero conviene que esté escrito.

2. **No hay límite de frecuencia ni de volumen por usuario.** Con sesión válida se puede subir un archivo
   de 5 MB tantas veces como se quiera; cada subida crea un `publicId` nuevo, así que nada se sobrescribe y
   nada se borra. Es la contrapartida deliberada de la decisión "publicId único" del PRD §11.9: se cambia
   riesgo de corrupción silenciosa por consumo de cuota.

3. **Ninguna imagen se borra nunca de Cloudinary.** El PRD no contempla el borrado, así que al reemplazar
   la foto de un proyecto la anterior queda huérfana en el proveedor para siempre. Es consecuencia directa
   del contrato, no un defecto de esta implementación, pero hoy no hay nadie que lo repare.

4. **Todo lo anterior está medido solo contra `fetch` mockeado.** Nadie ha subido todavía un archivo real a
   una cuenta real de Cloudinary. Aplica la regla 4 de `current.md` ("para lo que se sirve al navegador,
   medí contra un servidor real"): el smoke con credenciales reales sigue pendiente y solo podrá hacerse
   cuando exista el formulario (#22/#25/#28), o con un `curl` manual con la cookie de sesión.

5. **Contrato pendiente de comunicar a los consumidores** (#22, #25, #28): éxito = **`201`** con
   `{ url }`; el campo del formulario debe llamarse **`file`**; los errores llegan como `{ error }` con
   `400` / `401` / `502` / `500`. Si alguno de esos tres formularios asume `200`, romperá.

---

## 8-bis. Efecto colateral del `pnpm build` (no es mío, pero conviene saberlo)

`pnpm build` reescribe `next-env.d.ts` (archivo **generado**, con su propio "should not be edited"):
cambia el import de `./.next/dev/types/routes.d.ts` a `./.next/types/routes.d.ts`. Es el vaivén normal
entre `next dev` y `next build`; aparece en `git status` como modificado y volverá a cambiar en cuanto
alguien levante `pnpm dev`. Lo dejo como lo dejó el build y **re-ejecuté `pnpm typecheck` después**:
sigue en verde (`exit=0`).

## 9. Estado (primera ronda)

- Feature #15: **`in_progress`** (la cierra el reviewer y después el usuario). No la he marcado `done`.
- `bash ./init.sh` **verde**; `pnpm build` **verde**.
- Sin archivos temporales, sin `console.log` de depuración (el único `console.error` es el log de servidor
  del `502`, deliberado y cubierto por test), sin TODOs.

---
---

# 10. SEGUNDA RONDA — respuesta al review (`progress/reports/review_uploads_image.md`)

Veredicto recibido: **CAMBIOS REQUERIDOS, 2 bloqueantes** (B1 y B2), más una **decisión nueva del usuario**
(el tope baja a 4 MB). Los tres puntos están hechos. **El código de producción solo cambia en una
constante**: el resto del diff es un archivo de tests nuevo.

## 10.1 Qué cambié, y qué NO cambié

| # | Origen | Cambio |
|---|---|---|
| B1 | Reviewer, bloqueante | **Ancla de la lista blanca**: un test que compara `ACCEPTED_IMAGE_TYPES` contra los tres literales del PRD por **igualdad exacta del array**. |
| B2 | Reviewer, bloqueante | **Ancla del tope**: un test que fija `MAX_IMAGE_BYTES` a `4 * 1024 * 1024`, más un segundo que lo mantiene por debajo del límite de la plataforma. |
| 3 | Usuario (PRD §11.9 actualizado + ficha 15) | **`MAX_IMAGE_BYTES` pasa de 5 MB a 4 MB**, con el porqué preservado en el docstring. |

**Lo que deliberadamente NO toqué**, porque el reviewer lo dio por correcto y tocarlo habría creado la
deuda 18/22/23:

- Los **tests de frontera siguen derivando** de la constante (`MAX_IMAGE_BYTES`, `MAX_IMAGE_BYTES + 1`,
  iteración de `ACCEPTED_IMAGE_TYPES`). No convertí ni uno a literal. La mitad (b) del par ya estaba bien;
  solo faltaba la mitad (a), el **ancla**.
- El Route Handler, el servicio, los errores de dominio, `readFormData` y los 27 tests anteriores: **sin un
  solo cambio**. Verificado por `git status`: los únicos archivos de código tocados en esta ronda son
  `src/features/uploads/validation.ts` (una constante y su docstring) y el archivo de tests nuevo.
- `feature_list.json`, `progress/deudas.md`, el PRD y las secciones 1-9 de este informe: intactos.

### Archivos de la segunda ronda

| Archivo | Cambio |
|---|---|
| `src/features/uploads/validation.test.ts` | **Nuevo.** 3 tests: ancla de la lista blanca (B1), ancla del tope (B2) y ancla del límite de plataforma. |
| `src/features/uploads/validation.ts` | `MAX_IMAGE_BYTES`: `5 * 1024 * 1024` → `4 * 1024 * 1024`, con el docstring reescrito para conservar el razonamiento. |
| `progress/current.md` | Nota de la segunda ronda. |

## 10.2 Por qué el ancla no rompe la regla del par derivado

Es la nota que cierra los bloqueantes del reviewer y la escribo en el propio archivo de tests para que
sobreviva a este informe:

> Es el **único** sitio del feature donde un literal está justificado, porque **ahí el literal *es* el
> contrato**. El resto de tests derivan su valor de la constante y deben seguir haciéndolo.

Las dos mitades hacen cosas distintas y por eso hacen falta las dos:

- **(a) El ancla** responde *"¿la constante sigue valiendo lo que el usuario decidió?"*. Compara contra el
  PRD. Es la que faltaba: sin ella, el reviewer pudo abrir la lista a `application/pdf` y decuplicar el tope
  con la suite en verde (27/27 las dos veces).
- **(b) Los tests de comportamiento** responden *"¿el endpoint se comporta según la constante?"*. Comparan
  contra el código. Si escribieran el literal a mano, medirían una cosa mientras el código consume otra —
  la deuda 18/22/23 exacta.

## 10.3 El tope baja a 4 MB: el motivo, para que no se pierda

El valor **no es una preferencia, es lo que cabe**. El deploy es Vercel y sus funciones limitan el cuerpo de
petición a **4,5 MB**, aplicado **a nivel de infraestructura**: no se sube desde `vercel.json` ni desde el
código, y lo que lo excede muere con un **`413 FUNCTION_PAYLOAD_TOO_LARGE`** de la plataforma **antes de que
el handler exista** — el cliente recibiría un error que no es nuestro `{ error }`. Con el tope en 5 MB, mi
test `accepts a file sitting exactly on the size limit` certificaba en verde un caso que **en producción
siempre falla**. Los 4 MB dejan margen para el sobrecoste del `multipart`.

El razonamiento queda en **tres sitios ejecutables o legibles**, no solo aquí:

1. El docstring de `MAX_IMAGE_BYTES` en `validation.ts`, con la frase **"quien suba este tope tiene que
   resolver antes el límite de la plataforma"** (la salida es subir del navegador directo a Cloudinary con
   una firma, en vez de pasar el binario por la función).
2. El PRD §11.9, que actualizó el leader.
3. **Un test que lo hace ejecutable**: `stays below the request body limit of the platform` compara
   `MAX_IMAGE_BYTES` contra `4.5 * 1024 * 1024`. Si alguien sube el tope sin resolver la plataforma, no se
   topa con un comentario que puede ignorar: se topa con un rojo. Es la pieza que convierte "está
   documentado" en "está protegido".

**Cero rastros del valor viejo.** Barrí `src/**` buscando `5 MB` y `5 * 1024`: los únicos aciertos son los
**4,5 MB** del límite de Vercel, en el docstring y en el test. El mensaje de error del 400 ya se generaba a
partir de la constante (`${MAX_IMAGE_BYTES / (1024 * 1024)} MB`), así que ahora dice "4 MB" solo.

## 10.4 CONDICIÓN DOBLE de B1 — la lista blanca, en las dos direcciones

El ancla tiene que caer tanto si **sobra** un tipo como si **falta** uno. Ejecuté las dos.

### Rojo 1 — se AÑADE un tipo (`"image/svg+xml"`, la mutación C del reviewer)

```
     × accepts exactly the three types of the whitelist, no more and no less 15ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/features/uploads/validation.test.ts > features/uploads contract anchors (PRD §11.9) > accepts exactly the three types of the whitelist, no more and no less
AssertionError: expected [ 'image/jpeg', 'image/png', …(2) ] to deeply equal [ 'image/jpeg', 'image/png', …(1) ]
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 29 passed (30)
```

Es exactamente el caso que antes pasaba **27/27 en verde**. (Nótese que el test
`accepts every type of the whitelist` sigue en verde con el tipo añadido: itera la constante, así que se
auto-aprueba. Ese es el motivo de que el ancla tenga que ser un test aparte y no un retoque de aquel.)

### Rojo 2 — se QUITA un tipo (`["image/jpeg", "image/png"]`)

```
     × accepts exactly the three types of the whitelist, no more and no less 15ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/features/uploads/validation.test.ts > features/uploads contract anchors (PRD §11.9) > accepts exactly the three types of the whitelist, no more and no less
AssertionError: expected [ 'image/jpeg', 'image/png' ] to deeply equal [ 'image/jpeg', 'image/png', …(1) ]
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 29 passed (30)
```

Cae en las dos direcciones, que es justo lo que `toContain` no habría dado.

### Verde — restaurada la lista blanca

```
 Test Files  3 passed (3)
      Tests  30 passed (30)
   Start at  01:11:33
   Duration  1.81s (transform 355ms, setup 2.30s, import 903ms, tests 150ms, environment 0ms)
```

## 10.5 CONDICIÓN DOBLE de B2 — el tope, en las dos direcciones

### Rojo 1 — el tope se decuplica a 50 MB (la mutación A del reviewer)

```
     × caps the upload at 4 MB 8ms
     × stays below the request body limit of the platform 1ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/features/uploads/validation.test.ts > features/uploads contract anchors (PRD §11.9) > caps the upload at 4 MB
AssertionError: expected 52428800 to be 4194304 // Object.is equality
 FAIL  src/features/uploads/validation.test.ts > features/uploads contract anchors (PRD §11.9) > stays below the request body limit of the platform
AssertionError: expected 52428800 to be less than 4718592
 Test Files  1 failed | 2 passed (3)
      Tests  2 failed | 28 passed (30)
```

Antes: **27/27 verde**. Ahora caen **dos** anclas: la del contrato y la de la plataforma.

### Rojo 2 — alguien revierte al valor viejo de 5 MB

Esta dirección me importaba más que la de 50 MB, porque es la regresión **realista**: alguien que no lea el
PRD y "restaure" los 5 MB del acuerdo original.

```
     × caps the upload at 4 MB 7ms
     × stays below the request body limit of the platform 1ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/features/uploads/validation.test.ts > features/uploads contract anchors (PRD §11.9) > caps the upload at 4 MB
AssertionError: expected 5242880 to be 4194304 // Object.is equality
 FAIL  src/features/uploads/validation.test.ts > features/uploads contract anchors (PRD §11.9) > stays below the request body limit of the platform
AssertionError: expected 5242880 to be less than 4718592
 Test Files  1 failed | 2 passed (3)
      Tests  2 failed | 28 passed (30)
```

`5242880 > 4718592`: el ancla de plataforma **caza el valor viejo por sí sola**, sin depender de que alguien
se acuerde de actualizar el número del contrato. Es lo que hace que la deuda 55 quede realmente cerrada y no
solo documentada.

### Verde — restaurados los 4 MB

```
 Test Files  3 passed (3)
      Tests  30 passed (30)
   Start at  01:14:03
   Duration  1.37s (transform 261ms, setup 1.68s, import 670ms, tests 109ms, environment 0ms)
```

## 10.6 Verificación final de la segunda ronda (salida real, sin redondear)

### `bash ./init.sh` — VERDE

```
── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (32 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  52 passed | 2 skipped (54)
      Tests  547 passed | 11 skipped (558)
   Start at  01:14:36
   Duration  48.14s (transform 3.56s, setup 38.23s, import 39.91s, tests 27.17s, environment 12.95s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Evolución de los números, que es lo que pedía el leader:**

| Momento | Archivos | Tests |
|---|---|---|
| Antes de #15 | 49 passed + 2 skipped (51) | 515 passed \| 11 skipped |
| Fin de la 1.ª ronda (y medición del reviewer) | 51 passed + 2 skipped (53) | 544 passed \| 11 skipped |
| **Fin de la 2.ª ronda** | **52 passed + 2 skipped (54)** | **547 passed \| 11 skipped (558)** |

**+1 archivo y +3 tests** en esta ronda, que son exactamente los tres del ancla. Sube, como tenía que subir.
Los 11 skipped siguen siendo los mismos (los dos smokes).

### `pnpm build` — VERDE

```
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 10.2s
  Running TypeScript ...
  Finished TypeScript in 8.5s ...
  Collecting page data using 3 workers ...
  Generating static pages using 3 workers (0/15) ...
  Generating static pages using 3 workers (3/15)
  Generating static pages using 3 workers (7/15)
```

Y en la tabla de rutas de la misma ejecución:

```
├ ƒ /api/uploads/image
ƒ Proxy (Middleware)
```

La ruta sigue registrada y dinámica.

## 10.7 Sobre las observaciones no bloqueantes del reviewer

No he actuado sobre ninguna: son deudas fichadas (55-62) y el encargo era explícito en no ampliar el
alcance. Dos apuntes que sí conviene que el leader tenga a mano al consolidar:

- **Deuda 55 (el choque con Vercel) queda materialmente resuelta por esta ronda**, no solo documentada: el
  tope está por debajo del límite de la plataforma **y hay un test que lo mantiene ahí**. Lo que queda vivo
  de la ficha es el caveat honesto del reviewer: **sigue sin medirse contra un despliegue real** (no hay
  deploy), y el 4,5 MB de mi test es el valor documentado por la plataforma, no uno que yo haya observado.
- **Deuda 57** (la rama redundante de `ImageUploadUnavailableError`) sigue tal cual. Es una decisión de
  producto pequeña —darle mensaje propio o borrarla— y no la tomo yo por mi cuenta a estas alturas del
  ciclo. La dejo señalada.
- **Deuda 60** (comunicar el contrato a #22/#25/#28) cambia de contenido con esta ronda: además del `201`,
  el campo `file` y los códigos `400`/`401`/`502`/`500`, ahora hay que decirles que **el tope que valide el
  cliente es 4 MB, no 5**. Si un formulario acepta hasta 5 MB, dejará al usuario elegir un archivo que el
  servidor rechazará.

## 10.8 Estado final

- Feature #15: **sigue en `in_progress`**. No la he marcado `done` — la cierra el leader.
- `bash ./init.sh` **verde** (547 passed | 11 skipped); `pnpm build` **verde**.
- Los dos bloqueantes B1 y B2 están cerrados, cada uno con su condición doble ejecutada en **las dos
  direcciones** y la salida real pegada arriba.
- El tope vigente es **4 MB**, sin rastro del valor anterior en código, tests ni docstrings.
- No toqué `feature_list.json`, ni `progress/deudas.md`, ni el PRD, ni las secciones 1-9 de este informe.
