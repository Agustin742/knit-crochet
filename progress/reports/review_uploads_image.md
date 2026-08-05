# Review — feature #15 `uploads_image` (`POST /api/uploads/image`)

**Veredicto: CAMBIOS REQUERIDOS — 2 bloqueantes** (ambos son un test de una línea; el código de
producción no se toca).

> Aviso de método: **todo lo que sigue está medido**, no leído. Ejecuté `bash ./init.sh`, `pnpm build` y
> **6 mutaciones deliberadas** sobre el código del implementer, restaurándolo después desde copia y
> re-verificando el árbol (`diff -r` limpio + `init.sh` verde otra vez). **No edité nada de forma
> permanente.**

---

## 0. Resumen ejecutivo

La implementación es **buena**. La arquitectura es correcta, el contrato del PRD §11.9 está cumplido punto
por punto en el **código**, el endpoint es genuinamente genérico, la deuda 3 está saldada de verdad (lo
comprobé rompiéndola) y ninguna excepción de Cloudinary queda sin traducir. El cambio en `shared/lib/http.ts`
—lo que más preocupaba— es **estrictamente aditivo y no afecta a ningún consumidor**.

Lo que bloquea es **una sola cosa, y es exactamente la que el encargo pedía cazar**: los **dos valores del
contrato que cerró el usuario** (la lista blanca exacta y el tope de 5 MB) **no están sujetos por ningún
test**. Puedo cambiarlos por cualquier otra cosa y los 27 tests siguen en verde. Es la deuda 18/22/23/33/40/43
en su forma espejo: en vez de "el test mide una cosa y el código consume otra", aquí es "el test mide lo que
el código diga, sea lo que sea".

---

## 1. Verificación ejecutada (salida real, sin retocar)

### `bash ./init.sh` — VERDE

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  51 passed | 2 skipped (53)
      Tests  544 passed | 11 skipped (555)
   Start at  00:24:05
   Duration  62.49s (transform 6.45s, setup 46.54s, import 56.81s, tests 38.44s, environment 14.58s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Coincide con los números del usuario (544 passed | 11 skipped, 51 archivos + 2 skipped) y con los del
informe del implementer.** Sin discrepancia.

Segunda ejecución, tras restaurar los archivos de mis mutaciones (para probar que devolví el árbol
exactamente como estaba):

```
 Test Files  51 passed | 2 skipped (53)
      Tests  544 passed | 11 skipped (555)
   Start at  00:32:09
   Duration  46.37s (transform 3.31s, setup 35.76s, import 38.73s, tests 26.53s, environment 12.65s)
```

### `pnpm build` — VERDE

```
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 8.5s
  Running TypeScript ...
  Finished TypeScript in 8.3s ...
✓ Generating static pages using 3 workers (15/15) in 372ms

Route (app)
...
├ ƒ /api/uploads/image
...
ƒ Proxy (Middleware)
```

La ruta aparece registrada y dinámica (`ƒ`). `pnpm` siempre; `npm`/`npx` no se usaron.

---

## 2. El cambio en `src/shared/lib/http.ts` (punto 1 del encargo)

**Respuesta corta: es aditivo puro y no afecta a ningún endpoint existente. No hay riesgo.**

El diff completo, entero, es **una función nueva**:

```diff
+/** Devuelve `undefined` si el body no es multipart válido (lo valida luego zod). */
+export async function readFormData(
+  request: Request,
+): Promise<FormData | undefined> {
+  try {
+    return await request.formData();
+  } catch {
+    return undefined;
+  }
+}
```

No se modificó ni una línea de `errorResponse`, `validationErrorResponse`, `readJsonBody`,
`unexpectedErrorResponse`, `sessionErrorResponse` ni `withSession`. No cambia ninguna firma, ningún tipo
exportado, ningún comportamiento.

### Enumeración de consumidores (28 archivos importan de `@/shared/lib/http`)

| Grupo | Archivos | ¿Afectado? |
|---|---|---|
| auth | `api/auth/login`, `api/auth/register`, `api/auth/me` | **No** |
| projects | `api/projects/route.ts`, `[id]/route.ts`, `[id]/rounds`, `[id]/steps`, `[id]/sessions`, `[id]/sessions/start`, `[id]/sessions/stop`, `[id]/sessions/errors.ts`, `[id]/yarns`, `[id]/yarns/[yarnId]`, `params.ts` | **No** |
| yarns | `api/yarns/route.ts`, `[id]/route.ts`, `params.ts` | **No** |
| patterns | `api/patterns/route.ts`, `[id]/route.ts`, `params.ts` | **No** |
| brands | `api/brands/route.ts`, `[id]/route.ts`, `[id]/types`, `[id]/types/[typeId]`, `params.ts` | **No** |
| dashboard | `api/dashboard/metrics/route.ts` | **No** |
| tests | `shared/lib/http.test.ts` | Sólo suma 2 tests |
| **nuevo** | `api/uploads/image/route.ts` | Único consumidor de `readFormData` |

`readFormData` tiene **exactamente un consumidor de producción**. Ninguna respuesta de ningún endpoint
existente cambia por esto, y la suite completa (544 tests) lo confirma.

### ¿Era necesario tocarlo, o se podía resolver dentro del feature?

**Sí era razonable, y el sitio es el correcto.** `conventions.md` §"Dónde va cada cosa" dice literalmente
*"Utilidades compartidas (jwt, hashing, cloudinary, **fetch**) → `shared/lib`"*. `readFormData` es el hermano
literal de `readJsonBody` (mismo contrato: fallo → `undefined` → lo rechaza zod), vive tres líneas más abajo,
y meterlo en `features/uploads/` habría dejado dos utilidades gemelas en dos capas distintas — justo la
heterogeneidad que `conventions.md` combate en su primera frase. **Decisión correcta, sin objeción.**

Único matiz no bloqueante: nace con un solo consumidor. Es aceptable por simetría con `readJsonBody`, pero si
#22/#25/#28 acaban no usándolo, conviene revisarlo.

---

## 3. El contrato del PRD §11.9, punto por punto (punto 2 del encargo)

| Regla del contrato | Dónde | ¿Cumple en el código? | ¿Sujeta por un test que pueda caer en rojo? |
|---|---|---|---|
| Lista blanca **exacta** `image/jpeg`, `image/png`, `image/webp`, y nada más | `validation.ts:8-12` | Sí | **NO — bloqueante B1** |
| Tope de **5 MB** | `validation.ts:15` | Sí | **NO — bloqueante B2** |
| Las **dos** comprobaciones **antes** de llamar a Cloudinary | orden de `route.ts:37-43` | Sí | Sí (verificado con mutación) |
| `publicId` **único por subida** | `upload-user-image.ts:35-37` (`crypto.randomUUID()`) | Sí | Sí (verificado con mutación) |
| `folder` determinista por `userId` | `upload-user-image.ts:25-27` | Sí | Sí (verificado con mutación) |

### 3.1 `publicId` único: dos subidas del mismo usuario NO colisionan — **medido**

Es el motivo entero de la decisión, así que lo rompí a propósito. Mutación: `createImagePublicId()` pasa a
devolver una constante (`return "avatar";`) — es decir, un `publicId` determinista, exactamente lo que el PRD
prohíbe porque haría que la segunda foto sobrescribiera la primera.

```
 Test Files  2 failed (2)
      Tests  3 failed | 24 passed (27)
   Start at  00:29:44
```

**Tres tests en rojo.** El gate es real: si alguien vuelve a un `publicId` determinista, la suite se entera.
Restaurado → 27/27 verde.

### 3.2 `folder` determinista y aislamiento entre usuarios

Cubierto por `sends the folder derived from the session userId`, `keeps two users apart` (handler, contra el
`FormData` que sale a la red) e `isolates users: two userIds never share a folder` (servicio). Correcto: el
`userId` sale del JWT (`withSession` → `requireSessionUserId`), pasa por `z.uuid()` y no hay ninguna otra
fuente posible.

---

## 4. Deuda 3: busqué el bypass activamente (punto 3 del encargo)

**No hay bypass. Recorrí todos los caminos, no me conformé con el test.**

1. `route.ts:37` construye el input con **`{ file: form?.get("file") }`** y nada más. Ningún otro campo del
   formulario se lee jamás.
2. `uploadUserImage(userId, file)` sólo acepta esos dos parámetros; `folder` y `publicId` se **generan
   dentro** (`upload-user-image.ts:50-53`). No hay parámetro por el que se puedan inyectar.
3. `uploadImage` (`shared/lib/cloudinary/upload.ts:103-121`) construye `signedParams` **exclusivamente** desde
   `options.folder`/`options.publicId`. El `file` se añade al `FormData` como binario, sin influir en la ruta.
4. **Vía del nombre de archivo:** comprobada. Cloudinary usaría el nombre del fichero como `public_id` sólo con
   `use_filename`, que no se envía, y además el `public_id` explícito siempre gana. Cerrada.
5. **Vía del `userId`:** viene del `sub` del JWT firmado y pasa por `z.uuid()` antes de construir la ruta, así
   que ni siquiera una sesión manipulada puede meter un `../`.

Y lo verifiqué **rompiéndolo**. Mutación: que el `folder` salga del formulario.

```
      const { url } = await uploadUserImage((form?.get("folder") as string | null) ?? session.data, parsed.data.file);
```

```
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 26 passed (27)
   Start at  00:30:06
```

**Rojo.** Coincide exactamente con lo que declara el informe del implementer (1 fallo). Restaurado → verde.

---

## 5. El endpoint no se tumba ante un fallo de Cloudinary (punto 4 del encargo)

**Las dos excepciones están capturadas y traducidas. No queda ninguna ruta de excepción sin capturar.**

| Excepción | Traducción | Ruta |
|---|---|---|
| `CloudinaryUploadError` (3 razones: `network`, `rejected`, `malformed_response`) | `ImageUploadFailedError` → **502** + `{ error }` genérico | `upload-user-image.ts:58` → `route.ts:46-52` |
| `MissingCloudinaryConfigError` | `ImageUploadUnavailableError` → **500** | `upload-user-image.ts:55` → `route.ts:53-55` |
| Cualquier otra cosa | Re-lanzada sin disfrazar → la captura `withSession` (`http.ts:88-92`) → **500** | `route.ts:56` |

**No hay ninguna excepción que escape**: `withSession` envuelve el handler entero en `try/catch`, así que
incluso el `throw error` final acaba en un 500 con `{ error: "Error interno del servidor." }`. Comprobado
también que no se filtra nada: el test del 502 asserta que ni el `api_secret` ni el texto de Cloudinary
("Invalid image file") aparecen en la respuesta. Correcto.

**Verificado con mutación.** Anulé la rama del 502 (`error instanceof ImageUploadFailedError` → `false`):

```
 Test Files  1 failed (1)
      Tests  3 failed | 16 passed (19)
   Start at  00:31:25
```

**Hallazgo no bloqueante (→ deuda 57):** hice la misma mutación sobre la rama de
`ImageUploadUnavailableError` y **la suite siguió en verde, 19/19**:

```
      if (false) {
        return unexpectedErrorResponse(ROUTE, error);
      }
```
```
 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  00:31:09
```

Motivo: `withSession` ya produce **exactamente** el mismo 500 + `console.error` por su catch-all. La rama es
**redundante en comportamiento** y su test no la distingue del camino genérico. **No es un defecto** —el
requisito "ambas capturadas y traducidas a un status HTTP" **se cumple**, sólo que una se cumple dos veces—
pero conviene saberlo: si mañana alguien borra esa rama por "código muerto", ningún test se entera, y si
mañana se quiere un mensaje propio para "servicio no configurado", hoy nada lo protege.

---

## 6. El endpoint es genérico (punto 5 del encargo)

**Correcto, sin reservas.** Barrí `src/features/uploads/**` y `src/app/api/uploads/**`: **cero** apariciones
de `Project`, `Yarn`, `Pattern`, `projectId`, `yarnId` o `patternId`. El `folder` es
`knit-crochet/users/<userId>` — sin segmento de entidad, que es la decisión correcta: segmentar por entidad
exigiría un campo del body, que es justo lo que la deuda 3 prohíbe. `features/uploads/` no importa ningún
otro feature. Un único endpoint, compartible tal cual por #22/#25/#28.

Sin `schema.ts` ni `types.ts`: correcto, no hay tabla ni entidad propia, y `UploadedImage` ya existe en
`shared/lib/cloudinary`. Duplicarlo habría sido inventar estructura.

---

## 7. La regla del par derivado (punto 6 del encargo) — AQUÍ ESTÁ LO BLOQUEANTE

El implementer aplicó bien la mitad de la regla: los tests de frontera **derivan** su valor de
`MAX_IMAGE_BYTES` y de `ACCEPTED_IMAGE_TYPES` en vez de escribir un literal a mano. Eso está bien y evita la
desincronización.

**Pero al derivarlo todo, el valor del contrato se quedó sin ancla.** Si el test dice "acepta
`MAX_IMAGE_BYTES` y rechaza `MAX_IMAGE_BYTES + 1`", entonces el test sigue verde **sea cual sea**
`MAX_IMAGE_BYTES`. Y eso lo medí:

### Mutación A — el tope de 5 MB pasa a 50 MB

```
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
```
```
 Test Files  2 passed (2)
      Tests  27 passed (27)
   Start at  00:28:28
```

**27/27 VERDE.** El tope que cerró el usuario en el PRD se puede decuplicar y **nadie se entera**.

### Mutación C — la lista blanca se abre a SVG y PDF

```
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
] as const;
```
```
 Test Files  2 passed (2)
      Tests  27 passed (27)
   Start at  00:29:06
```

**27/27 VERDE.** El PRD §11.9 dice literalmente *"Es una **lista blanca**, no una lista negra: lo no
enumerado se rechaza"* — y hoy se le puede enumerar **cualquier cosa**, incluido `image/svg+xml` (que es un
documento ejecutable, no una imagen inerte), sin que la suite proteste. El test
`accepts every type of the whitelist` **itera la constante**, así que un tipo añadido se auto-aprueba.

Sólo `image/gif` está sujeto **por accidente**, porque el test de rechazo lo cita literalmente. Lo verifiqué
(mutación B: añadir `image/gif` → `1 failed | 26 passed (27)`). Es decir: la protección existente cubre
**un** tipo de los infinitos posibles, y por casualidad.

**Diagnóstico:** falta la **otra mitad** del par. El patrón correcto es *un* test que ancle la constante al
literal del contrato + los tests de comportamiento derivados de la constante (que ya existen y están bien).
Hoy sólo está la segunda mitad.

### El resto de gates SÍ pueden caer en rojo (verificado uno a uno)

| Gate | Mutación | Resultado |
|---|---|---|
| Rechazo antes de Cloudinary | subir antes de validar | **6 failed / 13 passed (19)** — cae |
| Deuda 3 (`folder` del body) | `folder` desde el form | **1 failed / 26 passed (27)** — cae |
| `publicId` único | `publicId` constante | **3 failed / 24 passed (27)** — cae |
| Traducción a 502 | rama anulada | **3 failed / 16 passed (19)** — cae |
| Traducción a 500 | rama anulada | **19 passed (19)** — NO cae (§5) |
| Tope 5 MB | 5 MB → 50 MB | **27 passed (27)** — NO cae → **B2** |
| Lista blanca cerrada | + SVG + PDF | **27 passed (27)** — NO cae → **B1** |

---

## 8. La CONDICIÓN DOBLE del implementer: verificada por mí (punto 7 del encargo)

**Los números reproducen. No hay discrepancia con el informe.**

| Lo que declara el informe | Lo que me sale a mí | Veredicto |
|---|---|---|
| §5.2 rojo (deuda 3): `1 failed \| 18 passed (19)` | `1 failed \| 26 passed (27)` — **el mismo y único fallo**; yo corrí los 2 archivos, él sólo el del handler | **Coincide** |
| §5.2 verde: `2 passed (2)`, `27 passed (27)` | `27 passed (27)` en 2 archivos | **Coincide** |
| §6 `init.sh`: `544 passed \| 11 skipped`, `51 passed \| 2 skipped (53)` | Idéntico, dos veces | **Coincide** (y con el usuario) |
| §6 `pnpm build` verde con `/api/uploads/image` en la tabla | Idéntico | **Coincide** |
| §5.1 rojo (orden): `3 failed \| 16 passed (19)` | `6 failed \| 13 passed (19)` | Ver abajo |

Sobre la única cifra distinta: **no es una discrepancia, es que mi mutación fue más agresiva que la suya.**
Él movió la subida delante de la validación conservando el resto; yo además inyecté un `Blob` sustituto
cuando el campo `file` no era válido, con lo que también gasté red en los casos "falta el archivo", "campo de
texto" y "cuerpo no multipart" — tres tests más. **La dirección y el mecanismo son los mismos y el gate queda
demostrado.** Dicho esto, la lección de #31 se mantiene: yo no puedo *confirmar* su 3, sólo confirmar que el
gate cae. Su cifra es plausible y consistente con su descripción.

---

## 9. Arquitectura y convenciones

| Regla | Estado |
|---|---|
| Lógica en `features/<x>/api/`, Route Handler fino (parsea → valida → delega → serializa) | OK — el handler tiene 30 líneas y cero lógica de negocio |
| Validación zod en el borde | OK — `uploadUserIdSchema` + `uploadImageInputSchema`, ambos antes de la lógica |
| Scoping por `userId` del JWT | OK — `withSession` + `z.uuid()`; ningún dato del request influye en el destino |
| UI no accede a la DB | N/A (slice de backend, sin UI) |
| Errores explícitos y tipados, sin `any`, sin stack traces al cliente | OK — errores de dominio propios; el único cast es `readonly string[]` en `validation.ts:17`, legítimo |
| Feature-first `src/{app,features,shared}` | OK — estructura calcada de `features/patterns/` |
| Barrels: se consume otro feature por su `index.ts` | OK — `route.ts` importa de `@/features/uploads` |
| Idioma: código en inglés, prosa/UI en español | OK |
| Nombres (`UPPER_SNAKE` constantes, `camelCase` funciones, `PascalCase` tipos) | OK |
| Comillas dobles, `async/await` | OK |
| Comentarios sólo para el *por qué* no obvio | OK — todos los docstrings explican una decisión, ninguno narra el código |
| Sin dependencias nuevas | OK |
| Sin secretos hardcodeados | OK — todo por entorno |
| Sin `console.log` de debug ni TODOs | OK — el único `console.error` es el log de servidor del 502, deliberado y cubierto por test |
| Nombre del archivo de tests de ruta (`<x>-routes.test.ts`) | OK — consistente con los otros 8 |
| `src/proxy.ts` | OK — correctamente **no** tocado: `isPublicPath` es fail-closed para `/api/`, la ruta nace privada |

Sobre las decisiones que el implementer dejó abiertas al reviewer:

- **D2 (`201`):** lo acepto. Es coherente con `POST /api/patterns` y se crea un recurso en Cloudinary. Queda
  como contrato para #22/#25/#28.
- **D3 (`502` vs `500`):** lo acepto. `conventions.md` enumera los códigos *del PRD*, no una lista cerrada, y
  la distinción "falló el tercero" / "fallamos nosotros" es correcta y está razonada por escrito.
- **D4 (`userId` inválido → `401`):** lo acepto, y es la elección fail-closed correcta. Verifiqué que la rama
  es **alcanzable**: `verifySessionToken` (`jwt.ts:66`) sólo exige que `sub` sea string no vacío, **no** que
  sea uuid. Así que el test que firma una sesión con `"user-1"` está midiendo el código del handler, no un
  rechazo previo. No es un test fantasma.
- **D5 (rechazo de 0 bytes):** lo acepto. No reabre el contrato, va en la misma dirección y es barato.

---

## Checkpoints

- **C1:** [x] — Archivos base y los 3 docs existen; `bash ./init.sh` termina en **exit code 0** (ejecutado dos
  veces por mí).
- **C2:** [x] — Exactamente **una** feature en `in_progress` (la #15, verificado: un solo match en
  `feature_list.json:246`). `progress/current.md` describe la sesión activa, sin basura anterior.
- **C3:** [x] — Capas respetadas: handler fino, lógica en `features/uploads/api/`, zod en el borde, scoping por
  `userId` del JWT, feature-first, sin dependencias nuevas, sin `console.log` de debug, sin secretos.
- **C4:** [ ]  ← Razón: `pnpm lint` y typecheck pasan y los 544 tests están verdes, **pero la verificación no
  es real para los dos valores del contrato**: `src/features/uploads/validation.ts:8-12` (lista blanca) y `:15`
  (5 MB) pueden cambiarse a cualquier cosa —`application/pdf`, `image/svg+xml`, 50 MB— y la suite sigue en
  **27/27 verde**. Medido, no supuesto (mutaciones A y C, §7).
- **C5:** [ ]  ← Razón: no hay artefactos sospechosos y `feature_list.json` refleja el estado correcto
  (`in_progress`), pero `progress/history.md` **no tiene entrada de esta sesión** (la última es del
  2026-08-03). Es tarea del **leader** al cerrar, no del implementer: no cuenta contra la feature, pero el
  checkpoint no se puede marcar hoy.

---

## Cambios requeridos — BLOQUEANTES (2)

Los dos son **tests nuevos**. **No hay que tocar código de producción**, porque el código de producción es
correcto: lo que falta es el ancla que impida que deje de serlo.

**B1 — Anclar la lista blanca a su valor exacto del contrato.**
Hoy `ACCEPTED_IMAGE_TYPES` (`src/features/uploads/validation.ts:8-12`) no tiene ningún test que fije **qué
tipos contiene**. Añadirle `"image/svg+xml"` y `"application/pdf"` deja los 27 tests en verde (§7, mutación
C). El PRD §11.9 dice "lista blanca, no lista negra: lo no enumerado se rechaza" — la **pertenencia exacta
es el contrato**, y hoy está desprotegida.
*Qué hacer:* en `src/features/uploads/api/upload-user-image.test.ts` (o en un test propio de `validation.ts`),
una aserción que compare `ACCEPTED_IMAGE_TYPES` contra los tres literales del PRD de forma **exacta**
(igualdad del array completo, **no** `toContain`: `toContain` no detecta lo que sobra, que es precisamente el
riesgo). Debe caer en rojo tanto si se **añade** un tipo como si se **quita** uno.
*Criterio de aceptación:* con `"image/svg+xml"` añadido a la constante, la suite tiene que ponerse roja.
Pegá la condición doble en las dos direcciones, con los números tal cual salgan.

**B2 — Anclar el tope de 5 MB a su valor exacto del contrato.**
Hoy `MAX_IMAGE_BYTES` (`src/features/uploads/validation.ts:15`) sólo se usa **derivado**: los tests miden
`MAX_IMAGE_BYTES` y `MAX_IMAGE_BYTES + 1`, así que siguen verdes con cualquier valor. Cambiarlo a
`50 * 1024 * 1024` deja los 27 tests en verde (§7, mutación A).
*Qué hacer:* una aserción que fije `MAX_IMAGE_BYTES` a **5 MB** expresados como el contrato los expresa
(`5 * 1024 * 1024`). **Los tests de frontera existentes se quedan como están** — están bien y la regla 2 de
`current.md` se sigue cumpliendo: el par derivado es correcto, lo que falta es el **ancla** del valor.
*Criterio de aceptación:* con el tope en 50 MB, la suite tiene que ponerse roja. Condición doble en las dos
direcciones con salida real.

> **Nota importante para no romper la regla 2 al arreglar esto.** B1 y B2 **no contradicen** la regla del par
> derivado. El patrón correcto tiene **dos piezas**: (a) **un** test que ancla la constante al literal del
> contrato —es el único sitio donde el literal está justificado, porque *ahí el literal ES el contrato*— y
> (b) todos los tests de comportamiento derivando de la constante. El implementer hizo (b) impecablemente;
> falta (a). No hay que convertir los tests de frontera a literales: eso sí sería la deuda 18/22/23.

---

## Observaciones NO bloqueantes

**O1 — La rama de `ImageUploadUnavailableError` en el handler es redundante en comportamiento.**
`route.ts:53-55` produce el mismo 500 + `console.error` que ya produce el catch-all de `withSession`.
Anularla deja 19/19 verde (§5). No es un defecto —el requisito de "ambas traducidas" se cumple— pero o se
elimina por redundante o se le da un comportamiento propio que un test pueda distinguir. → **deuda 57**.

**O2 — El tope de 5 MB choca con el límite de cuerpo de petición de Vercel.** El deploy es Vercel
(`architecture.md` §Stack) y sus funciones tienen un límite documentado de **~4,5 MB** de cuerpo de petición
(413 antes de que el handler exista). Con el sobrecoste del multipart encima, un archivo de 5 MB —el que el
test `accepts a file sitting exactly on the size limit` declara aceptable— **no podría llegar al endpoint en
producción**, y el cliente recibiría un error de plataforma que no es nuestro `{ error }`. Es un conflicto
entre el contrato cerrado y la plataforma, **no un defecto del implementer**: requiere decisión del usuario
(bajar el tope, o subir directo a Cloudinary desde el navegador con firma). **No lo he medido contra Vercel**
—no hay despliegue— así que lo doy como riesgo documentado a verificar, no como hecho medido. → **deuda 55**,
y creo que es la más importante de todas las que dejo.

**O3 — El cuerpo entero se carga en memoria antes de comprobar el tamaño.** `readFormData` llama a
`request.formData()`, que **bufferiza el archivo completo**, y sólo después zod mira `file.size`. El contrato
("antes de llamar a Cloudinary") **se cumple**, pero el rechazo no es tan barato como suena: una petición de
500 MB se materializa en RAM antes de devolver el 400. Mitigado en parte por O2. → **deuda 56**.

**O4 — Sólo se valida el `Content-Type` declarado, no el contenido real.** Es la deuda 1 del propio
implementer, y la confirmo: `file.type` lo escribe quien sube. Un binario cualquiera con
`Content-Type: image/jpeg` pasa el filtro. Fuera del contrato cerrado, correctamente no implementado; queda
fichado. → **deuda 58**.

**O5 — Nada se ha medido contra una cuenta real de Cloudinary.** Todo está contra `fetch` mockeado. Aplica la
regla 4 de `current.md`. El smoke real queda pendiente hasta #22/#25/#28 o un `curl` manual con cookie.
→ **deuda 59**.

**O6 — Contrato a comunicar a #22/#25/#28:** éxito **`201`** (no `200`) con `{ url }`; el campo del formulario
se llama **`file`**; errores `{ error }` con `400`/`401`/`502`/`500`. Si alguno de los tres formularios asume
`200`, romperá. Conviene que el leader lo asiente donde los consumidores lo vean. → **deuda 60**.

**O7 — Ninguna imagen se borra nunca de Cloudinary.** Consecuencia directa del contrato (`publicId` único +
el PRD no contempla borrado): al reemplazar una foto, la anterior queda huérfana para siempre. No es un
defecto de esta implementación. → **deuda 61**.

**O8 — Sin límite de frecuencia ni de volumen por usuario.** Con sesión válida se puede subir sin tope.
Contrapartida deliberada del `publicId` único. → **deuda 62**.

**O9 — `next-env.d.ts` aparece modificado.** Es un archivo **generado** por Next; el `pnpm build` reescribe su
import (`./.next/dev/types/routes.d.ts` → `./.next/types/routes.d.ts`) y `pnpm dev` lo revierte. Mi `pnpm build`
reprodujo lo mismo. No es del implementer y no bloquea; sólo conviene no comitearlo a ciegas.

---

## Deudas técnicas detectadas — numeradas desde la 55 (el libro mayor va por la 54)

> El reviewer **no** edita `progress/deudas.md`. Las dejo aquí para que el leader las consolide.

| # | Ficha | Severidad |
|---|---|---|
| **55** | El tope de 5 MB del PRD §11.9 supera el límite de ~4,5 MB de cuerpo de petición de las funciones de Vercel: un archivo de 5 MB no llegaría al endpoint en producción y el error no sería nuestro `{ error }`. Requiere decisión de producto (bajar el tope o subida directa a Cloudinary). **Sin medir contra un despliegue real.** | Alta |
| **56** | `readFormData` bufferiza el cuerpo completo en memoria antes de que zod mire `file.size`: el rechazo por tamaño no es barato. | Media |
| **57** | La rama `ImageUploadUnavailableError` de `src/app/api/uploads/image/route.ts:53-55` es redundante con el catch-all de `withSession` y ningún test la distingue (anularla deja 19/19 verde). | Baja |
| **58** | El endpoint confía en el `Content-Type` declarado por el cliente; no inspecciona los *magic bytes*. Un binario renombrado pasa el filtro local. | Media |
| **59** | Nadie ha subido todavía un archivo real a una cuenta real de Cloudinary: todo está medido contra `fetch` mockeado (regla 4 de `current.md`). | Media |
| **60** | El contrato de respuesta (**201**, campo `file`, errores 400/401/502/500) no está asentado en ningún sitio que vean los consumidores #22/#25/#28. | Media |
| **61** | Ninguna imagen se borra nunca de Cloudinary: al reemplazar una foto la anterior queda huérfana. Consecuencia del contrato, sin dueño hoy. | Baja |
| **62** | Sin límite de frecuencia ni de volumen de subida por usuario. | Baja |

*(Las fichas 1 y 2 del informe del implementer corresponden a mis 58 y 62; su 3 a mi 61; su 4 a mi 59; su 5 a
mi 60. Las 55, 56 y 57 son hallazgos míos.)*

---

## Estado en que dejo el repositorio

- **No edité ningún archivo del implementer.** Las 6 mutaciones se aplicaron y se revirtieron desde una copia
  de seguridad; `diff -r` contra el backup sale **limpio** y `bash ./init.sh` volvió a dar
  **544 passed | 11 skipped** después de restaurar.
- **No marqué la feature como `done` ni toqué `feature_list.json`.** Sigue en `in_progress`.
- **No toqué `progress/deudas.md`.**

## Qué falta para que esto sea APROBADO

Dos tests. B1 y B2, cada uno con su condición doble en las dos direcciones y la salida real pegada. El resto
del trabajo —arquitectura, contrato, deuda 3, manejo de errores, genericidad— **ya está bien y no hay que
tocarlo**.

---
---

# SEGUNDA RONDA — re-review de la corrección (2026-08-05)

**Veredicto: APROBADO — 0 bloqueantes.**

> Re-review **acotado**, como se pidió: no repito la revisión completa de la primera ronda, que sigue siendo
> válida y queda arriba como registro de por qué esto se rechazó. Aquí sólo verifico **el delta**.
>
> Método, otra vez: **medido, no leído**. 4 mutaciones nuevas, revertidas desde copia, con `diff -r` limpio
> al final. No edité nada de forma permanente.

## R2.0 — Qué cambió realmente (delta medido, no declarado)

Antes de creer nada, comparé el árbol de hoy contra la copia que me guardé del árbol de la primera ronda:

```
Only in src/features/uploads: validation.test.ts
diff -r .../backup/features/uploads/validation.ts src/features/uploads/validation.ts
14,15c14,24
< /** 5 MB (PRD §11.9): cubre una foto de móvil sin dejar el endpoint abierto. */
< export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
---
>  * 4 MB (PRD §11.9). El valor está **atado a la plataforma**, no elegido al gusto: [...]
> export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
=== app diff ===
(sin diferencias)
```

**El delta completo son exactamente dos cosas:** el valor de `MAX_IMAGE_BYTES` (+ su docstring) y un archivo
nuevo, `src/features/uploads/validation.test.ts`. **Nada más se tocó.**

Esto ya contesta, por sí solo y sin necesidad de leer código, la pregunta más importante que me hicieron
—¿picó en la deuda 18/22/23?—: ver **R2.3**.

## R2.1 — B1 RESUELTO: el ancla de la lista blanca detecta lo que sobra Y lo que falta

El implementer escribió **igualdad exacta del array completo** (`toEqual` sobre el spread), no `toContain`.
Lo verifiqué en **las dos direcciones**, que es justo lo que se me pidió distinguir.

**M1 — añadir un tipo (lo que SOBRA).** `"image/svg+xml"` dentro de `ACCEPTED_IMAGE_TYPES`.
En la primera ronda esta mutación daba **27/27 verde**. Ahora:

```
    "image/jpeg",
    "image/png",
    "image/webp",
+   "image/svg+xml",
  ]

 ❯ src/features/uploads/validation.test.ts:17:39
     16|   it("accepts exactly the three types of the whitelist, no more and no…
     17|     expect([...ACCEPTED_IMAGE_TYPES]).toEqual([

 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 29 passed (30)
   Start at  01:25:03
```

**ROJO.**

**M2 — quitar un tipo (lo que FALTA).** Borrado `"image/webp"` de la constante:

```
    "image/png",
-   "image/webp",
  ]

 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 29 passed (30)
   Start at  01:25:24
```

**ROJO también.** Un `toContain` habría pasado esta segunda y fallado la primera; escribió el correcto.
El `toHaveLength(3)` que acompaña es estrictamente redundante después de un `toEqual` del array entero
(`toEqual` ya falla por longitud), pero es inofensivo y el comentario que lo justifica documenta bien la
intención — **cosmético, no ficho deuda por esto**.

## R2.2 — B2 RESUELTO: el ancla del tope

**M3 — subir el tope a 50 MB.** En la primera ronda: **27/27 verde**. Ahora:

```
 FAIL  src/features/uploads/validation.test.ts > ... > stays below the request body limit of the platform
AssertionError: expected 52428800 to be less than 4718592

 Test Files  1 failed | 2 passed (3)
      Tests  2 failed | 28 passed (30)
   Start at  01:25:44
```

**ROJO, y con dos fallos**: cae el ancla del literal *y* cae el invariante de plataforma. Los dos gates que
antes no existían.

## R2.3 — La regla del par derivado NO se rompió (era el riesgo que avisé)

**Comprobado por `diff`, que es la prueba más fuerte posible: los dos archivos de test que ya existían son
byte a byte idénticos a los de la primera ronda.** `uploads-routes.test.ts` y `upload-user-image.test.ts`
**no se tocaron**. No hubo ninguna conversión de derivado a literal.

Y siguen derivando, verificado también sobre el contenido:

```
src/app/api/uploads/uploads-routes.test.ts:105:      for (const type of ACCEPTED_IMAGE_TYPES) {
src/app/api/uploads/uploads-routes.test.ts:121:        uploadRequest({ file: imageFile({ bytes: MAX_IMAGE_BYTES }) }),
src/app/api/uploads/uploads-routes.test.ts:234:        uploadRequest({ file: imageFile({ bytes: MAX_IMAGE_BYTES + 1 }) }),
```

**Las dos mitades están donde tienen que estar:** el literal vive **sólo** en el archivo de anclas —y el
docstring de `validation.test.ts` lo dice explícitamente, citando la deuda 18/22/23 para que nadie lo copie
al resto— y todo lo demás deriva de la constante. Es exactamente el patrón que pedí, sin efectos colaterales.

## R2.4 — El test de plataforma NO es decorativo (el punto que se me pidió juzgar)

Era la pregunta más fina del encargo, y tenía razón en desconfiar: `toBeLessThan` contra una constante local
es exactamente la forma que tiene un test de sentirse valioso sin medir nada. **Pero éste sí mide, y lo
demuestro con la mutación que lo separa del ancla.**

El riesgo real no es que alguien suba el tope a 50 MB (eso lo caza el ancla del literal). El riesgo real es
**alguien que suba el tope y "arregle" el test que se le pone rojo** — que es, literalmente, cómo nació este
defecto: el 5 MB se eligió de buena fe con información incompleta.

**M4 — el tope vuelve a 5 MB y el ancla se actualiza en el mismo commit a `toBe(5 * 1024 * 1024)`.** Es
decir: simulo al desarrollador que sube el límite y deja los tests en verde a base de seguirlos.

```
 FAIL  src/features/uploads/validation.test.ts > ... > stays below the request body limit of the platform
AssertionError: expected 5242880 to be less than 4718592
 ❯ src/features/uploads/validation.test.ts:43:29
     41|     const VERCEL_REQUEST_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;
     42|
     43|     expect(MAX_IMAGE_BYTES).toBeLessThan(VERCEL_REQUEST_BODY_LIMIT_BYT…

 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 29 passed (30)
   Start at  01:26:04
```

**El invariante de plataforma es el ÚNICO que se pone rojo.** Con el ancla ya "arreglada", es lo único que se
interpone entre el repositorio y la reaparición exacta del defecto original.

**Mi juicio: es mejor que lo que pedí, y coincido con el coordinador.** Yo pedí un literal; el implementer
entregó un **invariante ejecutable**. La diferencia práctica es grande: un párrafo del PRD sólo protege a
quien lo lea, y la deuda 55 habría vivido en un documento que nadie relee al cambiar una constante. Esto
convierte "el tope tiene que caber en la plataforma" en algo que **falla solo**, en el sitio y en el momento
en que alguien lo rompe, con un mensaje que dice el porqué. Es la forma correcta de saldar una deuda de este
tipo. Que quede como precedente.

Además el `toBeLessThan` es **estricto**, no `toBeLessThanOrEqual`, que es lo correcto: el sobrecoste del
`multipart` (cabeceras, `boundary`, resto de campos) va por encima del tamaño del archivo, así que el tope
tiene que quedar **por debajo** del límite, no pegado a él.

## R2.5 — No queda rastro del valor viejo

Barrí `src/` buscando `5 MB`, `5MB`, `5 * 1024` y `5242880`:

```
=== '5 MB' / '5MB' en src/ ===
src/features/uploads/validation.test.ts:34:   * limitan el cuerpo de petición a 4,5 MB **a nivel de infraestructura** (no
src/features/uploads/validation.test.ts:41:    const VERCEL_REQUEST_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;
src/features/uploads/validation.ts:16: * las funciones de Vercel limitan el cuerpo de petición a 4,5 MB a nivel de
```

**Los tres únicos aciertos son el `4,5` del límite de Vercel**, que es correcto y es otra cosa. Ni código, ni
tests, ni docstrings conservan el 5 MB.

**Sobre los mensajes que se serializan al cliente** (que era la parte que se me pidió mirar aparte): el texto
del error **se deriva de la constante**, no está escrito a mano —

```
`La imagen supera el máximo de ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`
```

— así que hoy dice "**4 MB**" y **no puede desincronizarse nunca** del tope real. Es la forma correcta.
Matiz menor, no bloqueante: el test del 400 por tamaño asserta `toContain("supera el máximo")` y no el
número, con lo que la cifra que ve el usuario no está sujeta; pero como es imposible que difiera del tope, no
aporta nada sujetarla y **no ficho deuda**.

## R2.6 — Suite completa y build

### `bash ./init.sh` — VERDE

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  52 passed | 2 skipped (54)
      Tests  547 passed | 11 skipped (558)
   Start at  01:26:54
   Duration  38.40s (transform 2.67s, setup 29.99s, import 31.29s, tests 24.03s, environment 9.39s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Coincide exactamente con los números del coordinador: 547 passed | 11 skipped, 52 archivos + 2 skipped.**
Venía de 544/51 en la primera ronda: **+3 tests, +1 archivo**, que son justo los tres del ancla nueva. Sin
discrepancia.

### `pnpm build` — VERDE

```
├ ƒ /api/uploads/image
...
ƒ Proxy (Middleware)
```

`pnpm` siempre; `npm`/`npx` no se usaron en ninguna de las dos rondas.

## R2.7 — El asentamiento documental (comprobado, no asumido)

- **PRD §11.9:** el tope dice **4 MB**, con el porqué de plataforma, el 413 `FUNCTION_PAYLOAD_TOO_LARGE`, la
  fecha de la corrección y el aviso a quien quiera subirlo (subida directa navegador→Cloudinary con firma).
  **Y conserva la historia**: *"se cerró primero en 5 MB el 2026-08-04 y se corrigió a 4 MB el 2026-08-05"*.
  Que quede el rastro de la decisión anterior y no un borrado en limpio es lo correcto.
- **`progress/deudas.md`:** la **55 nace tachada**, y la ficha vecina anota que el límite de Vercel **mitiga**
  la deuda del buffer en memoria (mi O3/56). Bien enlazado.

## R2.8 — Resumen de las mutaciones de esta ronda

| # | Mutación | 1ª ronda | 2ª ronda | Qué prueba |
|---|---|---|---|---|
| M1 | `"image/svg+xml"` **añadido** a la lista blanca | 27/27 **verde** | **1 failed / 29 passed (30)** | B1 caza lo que **sobra** |
| M2 | `"image/webp"` **quitado** de la lista blanca | (no probada) | **1 failed / 29 passed (30)** | B1 caza lo que **falta** → es `toEqual`, no `toContain` |
| M3 | Tope a 50 MB | 27/27 **verde** | **2 failed / 28 passed (30)** | B2 + invariante de plataforma |
| M4 | Tope a 5 MB **con el ancla actualizada en el mismo commit** | (no probada) | **1 failed / 29 passed (30)** | El invariante de plataforma **no es decorativo**: es el único que queda en pie |

## Checkpoints (revisados)

- **C1:** [x] — `bash ./init.sh` termina en exit code 0.
- **C2:** [x] — Una sola feature en `in_progress` (#15); `progress/current.md` describe la sesión activa.
- **C3:** [x] — Sin cambios respecto a la primera ronda: capas, zod en el borde, scoping por `userId`,
  handler fino. El delta no tocó nada de arquitectura.
- **C4:** [x] ← **Levantado.** Era el checkpoint que rechazaba esta feature. Lint y typecheck verdes, 547
  tests verdes, y —lo que faltaba— **la verificación ahora es real**: los dos valores del contrato tienen
  gates que **se ponen rojos**, medido con 4 mutaciones. Ninguno de los dos agujeros de la primera ronda
  sobrevive.
- **C5:** [ ] ← **Razón (sin cambios, y NO imputable a la feature):** `progress/history.md` sigue sin entrada
  de esta sesión (la última es del 2026-08-03). Es tarea del **leader** al cerrar la sesión, no del
  implementer, y no bloquea la aprobación de #15. Lo dejo apuntado para que no se cierre sin ella.

## Deuda nueva — una sola, la 63

> El libro mayor va por la 62. **No edité `progress/deudas.md`.**

| # | Ficha | Severidad |
|---|---|---|
| **63** | **El límite de 4,5 MB de Vercel es un supuesto codificado, nunca medido contra un despliegue real.** `VERCEL_REQUEST_BODY_LIMIT_BYTES` (`src/features/uploads/validation.test.ts:41`) es un hecho **externo** escrito a mano: si Vercel lo cambia, nada en el repositorio se entera y el invariante pasaría a proteger contra un número que ya no existe. Además nadie ha comprobado **empíricamente** las dos mitades del supuesto: que un archivo de 4 MB **llega** al handler, y que uno de 5 MB **muere con 413** antes de llegar. Es la contrapartida honesta de convertir la deuda 55 en un test: el test es correcto **si el número lo es**. Se salda con el mismo smoke pendiente de la deuda 59 (una subida real, ya con despliegue), midiendo las dos fronteras. Mientras tanto, el invariante es lo mejor disponible y es mucho mejor que nada. | Baja |

Nada más. Las 55-62 quedan como estaban; no encontré deuda adicional en el delta.

## Estado en que dejo el repositorio

- **No edité ningún archivo del implementer.** Las 4 mutaciones se revirtieron desde copia:
  `RESTORE OK — arbol identico al que dejo el implementer` (`diff -r` sin diferencias en los dos árboles), y
  `bash ./init.sh` volvió a dar **547 passed | 11 skipped** después de restaurar.
- **No marqué la feature como `done`, ni toqué `feature_list.json`, ni `progress/deudas.md`.**
- El único archivo que escribo es este informe.

## Veredicto final

**APROBADO — 0 bloqueantes.**

B1 y B2 están resueltos con el patrón correcto y **sin daño colateral**: el par derivado sigue intacto porque
los archivos de test existentes no se tocaron. El cambio de 5 MB a 4 MB está bien ejecutado en las tres capas
(código, tests, PRD) y sin rastro del valor viejo. Y el añadido que no pedí —el invariante contra el límite
de la plataforma— **es una mejora real y verificada**: es el único gate que sobrevive al escenario que
originó el defecto. Recomiendo que el patrón "deuda de entorno → invariante ejecutable en vez de párrafo"
se anote como precedente para el resto del proyecto.
