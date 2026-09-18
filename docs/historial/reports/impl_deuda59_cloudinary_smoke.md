# impl — Deuda técnica 59: subida REAL a Cloudinary (smoke)

> **No es una feature de `feature_list.json`.** No se tocó `feature_list.json` ni `deudas.md`.
> Objetivo: **medir**, contra la cuenta real de Cloudinary, las dos cosas que el `fetch` mockeado
> no podía medir — (1) que la firma de `buildUploadSignature` sea la que Cloudinary espera de
> verdad, y (2) que la respuesta real tenga la forma que `extractSecureUrl` asume (`secure_url`).

---

## 1. Veredicto de la medición (lo importante)

| Pregunta de la deuda 59 | Resultado medido |
|---|---|
| ¿La firma real de `buildUploadSignature` es aceptada por Cloudinary? | **Sí, a la primera.** `201` con URL servible; y el `/destroy` del teardown, firmado con la **misma** función, devolvió `200 {"result":"ok"}`. |
| ¿La respuesta real trae `secure_url` con la forma que asume `extractSecureUrl`? | **Sí.** El endpoint respondió `201 { url: "https://res.cloudinary.com/..." }`; si el campo no existiera o fuera otro, `extractSecureUrl` habría devuelto `null` → `malformed_response` → **502**. Además la URL es `https:`, que es exactamente lo que distingue `secure_url` de `url`. |
| ¿Apareció un bug de producción, como en la deuda 6 (`isDuplicateColorCode` sin desenvolver `.cause`)? | **No.** Toda la cadena real (Route Handler → `uploadUserImage` → `uploadImage` → HTTP) se comportó igual que contra el doble. Cero cambios de comportamiento en producción. |
| ¿El rechazo real de Cloudinary sale como 502? | **Sí.** Bytes de texto declarados `image/png` (deuda 58) → Cloudinary `400 Invalid image file` → endpoint `502 { error }`. |

**La deuda 59 queda saldada por medición** (el tachado en `deudas.md` lo asienta el líder).
Como subproducto, la **deuda 58 queda medida**: se confirmó empíricamente que nuestro filtro es
declarativo (un `.txt` con `type=image/png` pasa nuestra validación) y que la segunda línea de
defensa —Cloudinary— efectivamente lo rechaza y el rechazo está bien traducido.

---

## 2. Archivos creados / modificados

**Creados**

- `src/__smoke__/cloudinary.smoke.test.ts` — el smoke. Guardado por **`SMOKE_CLOUDINARY`**
  (flag propio; **no** reutiliza `SMOKE_NEON` porque esta cadena **no toca la DB**: verificado
  leyendo el código — `uploadUserIdSchema` es `z.uuid()` y el `userId` solo alimenta
  `buildUserImageFolder`; nunca se consulta `users`. El `userId` del smoke es un
  `crypto.randomUUID()` que no existe en Postgres y la subida funciona igual).
- `src/__smoke__/env.ts` — helper compartido `resolveEnvValue(name)` (ver §6, decisión 1).

**Modificados**

- `src/__smoke__/auth.smoke.test.ts` — borra su copia local de `resolveEnvValue`, importa la compartida.
- `src/__smoke__/neon.smoke.test.ts` — borra `resolveDatabaseUrl()`, usa `resolveEnvValue("DATABASE_URL")`.
- `src/shared/lib/cloudinary/upload.ts` — **una palabra**: `const CLOUDINARY_API_BASE` → `export const`
  (+ comentario). Sin cambio de comportamiento.
- `src/shared/lib/cloudinary/index.ts` — reexporta `CLOUDINARY_API_BASE`.

Diff completo de producción (es todo lo que cambia fuera de `__smoke__/`):

```diff
--- a/src/shared/lib/cloudinary/upload.ts
+++ b/src/shared/lib/cloudinary/upload.ts
@@ -1,6 +1,7 @@
 import { getCloudinaryConfig } from "@/shared/lib/cloudinary/config";

-const CLOUDINARY_API_BASE = "https://api.cloudinary.com/v1_1";
+/** Raíz de la API REST de Cloudinary; el nombre de la cuenta cuelga de aquí. */
+export const CLOUDINARY_API_BASE = "https://api.cloudinary.com/v1_1";
--- a/src/shared/lib/cloudinary/index.ts
+++ b/src/shared/lib/cloudinary/index.ts
@@ export {
   buildUploadSignature,
+  CLOUDINARY_API_BASE,
   CloudinaryUploadError,
```

**Nada de `deudas.md`, `feature_list.json`, `current.md` ni `history.md` fue tocado.**

### Qué hace cada caso

1. **Camino feliz por el endpoint completo.** Cookie de sesión **real**: JWT firmado con
   `signSessionToken` y el `JWT_SECRET` real, puesto en la cookie `JWT_COOKIE_NAME`
   (`kc_session`, leída del código: `shared/lib/auth/jwt.ts` → `session.ts` → `withSession` de
   `shared/lib/http.ts`; **no** se escribió el literal a mano, se importa la constante).
   `Request` con `FormData` y un **PNG real de 1x1** (70 bytes, firma `\x89PNG` + IHDR + IDAT +
   IEND, embebido en base64 y documentado en el archivo). Asserts: `201` + `{ url }`;
   `fetch(url)` → `200` + `content-type: image/*` + bytes > 0; la URL contiene
   `buildUserImageFolder(userId)`; la URL es `https:`.
2. **Rechazo real → 502** (mide la deuda 58, anotado como comentario en el propio test).
3. **Teardown en `afterAll`:** `POST .../image/destroy` firmado con el **mismo**
   `buildUploadSignature` de producción, así la limpieza **también** ejercita la firma.
   Comentario explícito de que esto es higiene del test y **no** salda la deuda 61 (la app sigue
   sin borrar nada).

Constantes derivadas, cero hardcode: `ACCEPTED_IMAGE_TYPES` (de ahí sale `image/png`),
`buildUserImageFolder` / `UPLOADS_ROOT_FOLDER`, `JWT_COOKIE_NAME`, `CLOUDINARY_API_BASE`.
`MAX_IMAGE_BYTES` no aplica: el archivo real son 70 bytes y aquí no se mide el tope.

---

## 3. Salida REAL — verde (estado final del repo)

```
$ SMOKE_CLOUDINARY=1 pnpm vitest run src/__smoke__/cloudinary.smoke.test.ts --reporter=verbose

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

stdout | ... > 1. PNG real por el endpoint completo → 201 { url } y la URL sirve la imagen
[smoke-cloudinary] 1. subida -> status=201 body={"url":"https://res.cloudinary.com/dd1zea1lo/image/upload/v1785952881/knit-crochet/users/8c16fd90-9e73-4382-ace0-5d55ece5bcec/0ece570d-2bfa-4881-8ed9-3d7b696dfa83.png"}

stdout | ... > 1. PNG real por el endpoint completo → 201 { url } y la URL sirve la imagen
[smoke-cloudinary] 1. GET url -> status=200 content-type=image/png bytes=70

 ✓ ... > 1. PNG real por el endpoint completo → 201 { url } y la URL sirve la imagen 2049ms

stdout | ... > 2. bytes que no son imagen declarados image/png → Cloudinary rechaza → 502
[smoke-cloudinary] 2. subida falsa -> status=502 body={"error":"No se pudo subir la imagen. Inténtalo de nuevo."}

 ✓ ... > 2. bytes que no son imagen declarados image/png → Cloudinary rechaza → 502 284ms

stdout | ... > smoke: subida real a Cloudinary
[smoke-cloudinary] teardown destroy knit-crochet/users/8c16fd90-9e73-4382-ace0-5d55ece5bcec/0ece570d-2bfa-4881-8ed9-3d7b696dfa83 -> 200 {"result":"ok"}

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  3.98s
```

Detalles que valen oro y que el mock nunca pudo dar:

- `bytes=70` en el `GET`: **los mismos 70 bytes** del PNG que se subió, servidos por el CDN de
  Cloudinary. No es un 200 de una página de error.
- La URL incluye `knit-crochet/users/<uuid>` → el `folder` **firmado** viajó y Cloudinary lo honró.
- El `destroy` firmado devolvió `{"result":"ok"}` → segunda confirmación independiente de la firma.
- No se imprime ningún secreto. `dd1zea1lo` es el **cloud name**, que es público por diseño
  (aparece en toda URL de imagen que la app sirva al navegador); `CLOUDINARY_API_SECRET`,
  `JWT_SECRET` y `DATABASE_URL` no aparecen en ninguna salida de este informe.

En el caso 2, el `console.error` del handler imprime el error real (útil, y sin secretos):

```
[POST /api/uploads/image] ImageUploadFailedError: No se pudo subir la imagen.
  reason: 'rejected',
  [cause]: CloudinaryUploadError: Cloudinary rechazó la subida: Invalid image file
    reason: 'rejected',
    status: 400,
```

---

## 4. REGLA 3 — condición doble, ejecutada de verdad

### 4.1 En ROJO: `buildUploadSignature` roto a propósito

Mutación aplicada en `src/shared/lib/cloudinary/upload.ts` (separador de los parámetros firmables):

```diff
-    .join("&");
+    .join(",");
```

Salida **real** (recortada de los stack traces, no de los datos):

```
$ SMOKE_CLOUDINARY=1 pnpm vitest run src/__smoke__/cloudinary.smoke.test.ts --reporter=verbose

stderr | ... > 1. PNG real por el endpoint completo → 201 { url } y la URL sirve la imagen
[POST /api/uploads/image] ImageUploadFailedError: No se pudo subir la imagen.
  reason: 'rejected',
  [cause]: CloudinaryUploadError: Cloudinary rechazó la subida: Invalid Signature 47ed92b92c9fcd80ea0ec49a48d15e1af40af9a1. String to sign - 'folder=knit-crochet/users/85da779a-326f-458e-ba04-cdc52dbafa42&public_id=fff6569c-116b-4880-8080-cd522b374167&timestamp=1785952805'.
    reason: 'rejected',
    status: 401,

stdout | ... > 1. PNG real ...
[smoke-cloudinary] 1. subida -> status=502 body={"error":"No se pudo subir la imagen. Inténtalo de nuevo."}

 × ... > 1. PNG real por el endpoint completo → 201 { url } y la URL sirve la imagen 740ms
   → expected 502 to be 201 // Object.is equality

 ✓ ... > 2. bytes que no son imagen declarados image/png → Cloudinary rechaza → 502 284ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__smoke__/cloudinary.smoke.test.ts > ... > 1. PNG real por el endpoint completo → 201 { url } y la URL sirve la imagen
AssertionError: expected 502 to be 201 // Object.is equality

- Expected
+ Received

- 201
+ 502

 ❯ src/__smoke__/cloudinary.smoke.test.ts:178:31
    178|       expect(observed.status).toBe(201);
       |                               ^

 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
   Duration  2.05s
```

Lectura: Cloudinary respondió **401 `Invalid Signature`** y hasta nos devolvió su
`String to sign` — que es **exactamente** la cadena canónica que el código produce cuando el
separador es `&`. Es la confirmación más directa posible de que el algoritmo de
`buildUploadSignature` (orden alfabético + `clave=valor` unidos por `&` + `api_secret`) es el
que la API espera.

**Hallazgo honesto del rojo:** el caso 2 **siguió verde** con la firma rota, porque su assert es
"cualquier fallo aguas arriba → 502" y un 401 de firma también lo es. O sea: **el único caso
sensible a la firma es el 1**. Queda fichado abajo como deuda 63 para que nadie lo confunda con
cobertura doble.

### 4.2 En VERDE: mutación revertida

Restaurado `.join("&")` y re-ejecutado: **2 passed**, con la salida completa pegada en el §3
(subida `201`, `GET` de la URL `200 image/png 70 bytes`, `destroy` `{"result":"ok"}`).
`git diff` sobre `upload.ts` confirma que lo único que queda en el archivo es el `export`.

---

## 5. No corre en la suite hermética

Suite completa, sin ninguna variable `SMOKE_*`:

```
$ pnpm test
$ vitest run

 Test Files  52 passed | 3 skipped (55)
      Tests  547 passed | 13 skipped (560)
   Duration  49.73s
```

Baseline previa: **52 passed | 2 skipped** archivos, **547 passed | 11 skipped** tests.
Ahora: **3 skipped** archivos (el nuevo) y **13 skipped** tests (los 2 nuevos). Ni un test más
en verde, ni uno menos: el archivo nuevo aporta exactamente 2 tests saltados.

Y una comprobación extra de hermeticidad de verdad (no de palabra): **se movió el `.env` fuera
del repo** y se corrió la carpeta de smokes; si algo leyera el `.env` o la red en el top-level,
esto explotaría. Salida real (el `.env` se restauró en el mismo comando):

```
$ mv .env .env.smokecheck.bak && pnpm vitest run src/__smoke__ --reporter=verbose ; mv .env.smokecheck.bak .env

 ↓ src/__smoke__/cloudinary.smoke.test.ts > smoke: subida real a Cloudinary > 1. PNG real ...
 ↓ src/__smoke__/cloudinary.smoke.test.ts > smoke: subida real a Cloudinary > 2. bytes que no son imagen ...
 ↓ src/__smoke__/auth.smoke.test.ts > ... (5)
 ↓ src/__smoke__/neon.smoke.test.ts > ... (6)

 Test Files  3 skipped (3)
      Tests  13 skipped (13)
   Duration  2.17s
exit=0
```

---

## 6. Decisiones no obvias (y su justificación)

**1. `resolveEnvValue` estaba duplicado: se extrajo a `src/__smoke__/env.ts` y se refactorizaron
los dos smokes existentes.** Escribir una tercera copia era el olor que avisaba el encargo; dejar
el helper nuevo *y* las dos copias viejas habría sido peor (tres definiciones). El archivo **no**
termina en `.test.ts`, así que el `include` de `vitest.config.ts` (`src/**/*.{test,spec}.{ts,tsx}`)
no lo recoge como suite y no altera el conteo. Como tocar los smokes de Neon es tocar código que
no puedo verificar con `pnpm test` (queda skipped), **se ejecutaron los dos contra Neon real** para
no dejarlo a fe:

```
$ SMOKE_NEON=1 pnpm vitest run src/__smoke__/auth.smoke.test.ts
 Test Files  1 passed (1)   Tests  5 passed (5)   Duration 10.89s

$ SMOKE_NEON=1 pnpm vitest run src/__smoke__/neon.smoke.test.ts
 Test Files  1 passed (1)   Tests  6 passed (6)   Duration 22.66s
```

(De paso queda registrado que el caso 4 de `neon.smoke.test.ts` —el de la deuda 6, `UNIQUE
(brandId, colorCode)` → `DuplicateColorCodeError`— **hoy pasa** contra la DB real: la regresión
que aquel smoke destapó sigue arreglada.)

**2. Se exportó `CLOUDINARY_API_BASE` en vez de escribir la URL a mano en el teardown.** La regla
del repo es "cero hardcode donde haya constante"; la constante existía pero era privada del módulo.
El cambio es aditivo, de una palabra, y no altera ningún comportamiento (lint + typecheck + 547
tests verdes lo confirman). La alternativa —copiar `https://api.cloudinary.com/v1_1` en el smoke—
habría creado un tercer sitio donde vive la misma URL (ya está duplicada en `upload.test.ts`).

**3. El único doble del smoke es `next/headers`.** `withSession` no lee la cookie del `Request`:
la lee con `cookies()` de `next/headers` (vía `requireSessionUserId` en
`shared/lib/auth/session.ts`), que fuera de una petición servida por Next no tiene contexto donde
buscarla. Se mockea **solo** ese módulo, con el mismo `cookieJar` que ya usa
`src/app/api/uploads/uploads-routes.test.ts`, y el valor que sirve es un **JWT real firmado con el
`JWT_SECRET` real** que `verifySessionToken` verifica sin atajos. Nada de lo que la deuda 59 pide
medir (firma, forma de la respuesta) pasa por ahí. La alternativa —levantar `next start`— habría
cambiado la técnica establecida por `auth.smoke.test.ts` (invocar el Route Handler importado) y
metido un servidor y un build en la ecuación. Queda fichado como deuda 64 lo que ese doble deja sin
medir.

**4. Limpieza: qué se borró y qué no.** El `afterAll` borra el **asset** con `/destroy` firmado
(medido: `200 {"result":"ok"}`). Lo que `/destroy` **no** borra es la **carpeta**
`knit-crochet/users/<uuid>` que la subida crea implícitamente. Medido con la Admin API tras las
corridas: `total_count 3` carpetas vacías (una por corrida con subida exitosa). Se limpiaron a
mano con `DELETE /folders/<path>` y la cuenta quedó en `total_count 0`. **No se automatizó** porque
borrar carpetas exige la **Admin API con auth básica** (`api_key:api_secret` en la cabecera), un
camino de credencial que la app no usa en ningún sitio y que no quise introducir en un test.
Fichado como deuda 65.

**5. El PNG está embebido como base64 en el test, no leído de disco.** El archivo no depende de
ningún fixture externo y el comentario explica por qué tiene que ser un PNG **real**: Cloudinary
decodifica el archivo, así que con bytes de relleno el caso feliz no podría distinguir "firma
inválida" de "imagen inválida" — que es justo la distinción que la deuda 59 quiere hacer.

---

## 7. `bash ./init.sh` (salida real, estado final)

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

 Test Files  52 passed | 3 skipped (55)
      Tests  547 passed | 13 skipped (560)
   Start at  15:04:23
   Duration  52.85s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

---

## 8. Deuda nueva encontrada (propuesta — **no** asentada en `deudas.md`)

> `deudas.md` tiene hoy 62 fichas; estas se proponen numeradas a partir de la 63. Las asienta el líder.

**63. El caso "rechazo → 502" del smoke de Cloudinary no distingue *por qué* falló la subida.**
Medido en la mutación de la Regla 3: con `buildUploadSignature` roto, el caso 2 del smoke
(`src/__smoke__/cloudinary.smoke.test.ts`) **siguió verde**, porque un `401 Invalid Signature` y un
`400 Invalid image file` desembocan los dos en el mismo `502 { error }` — que es el contrato
deliberado del endpoint (no se filtra al cliente el motivo del proveedor).
**Escenario de fallo concreto:** si mañana alguien rompe la firma y solo se mira el caso 2 (o si se
añaden más casos de error copiando ese molde), el smoke da una falsa sensación de cobertura. **El
único caso sensible a la firma es el 1**, el del camino feliz.
**Arreglo natural:** si algún día importa distinguirlos, el `reason` de `CloudinaryUploadError`
(`network` / `rejected` / `malformed_response`) ya lo lleva y no llega a ningún assert; hoy solo se
ve en el `console.error`. Emparenta con la deuda 57 (ramas de error que ningún test distingue).

**64. Ninguna prueba, en ningún nivel, mide "cookie del navegador → `userId`" en una ruta privada.**
`withSession` lee la sesión con `cookies()` de `next/headers`, no del `Request`. Fuera de una
petición servida por Next ese módulo no tiene contexto, así que **todos** los tests de rutas
privadas —los unitarios y ahora también el smoke de Cloudinary— lo sustituyen por un `cookieJar` en
memoria. Lo que se mide de verdad es "token válido → `userId`"; lo que **nadie** ha medido es que el
navegador mande la cookie y que Next la entregue (atributos `Secure`/`SameSite`/`path`, el
`src/proxy.ts`, el dominio de despliegue).
**Escenario de fallo concreto:** una cookie que en producción no viaja (por `Secure` sobre http, por
`sameSite`, o porque el proxy no la propaga) da un **401 en el navegador** con toda la suite en
verde. Es la deuda 59 exactamente, un piso más arriba: contra el proveedor ya medimos; contra el
navegador, todavía no.
**Cuándo se cierra:** con un smoke contra `next start` (o contra el despliegue de Vercel) que use un
cliente HTTP real con cookie jar. Los formularios #22/#25/#28 son la ocasión natural.

**65. El smoke de Cloudinary deja una carpeta vacía por corrida; y borrar carpetas necesita una
credencial que la app no usa.** Medido con la Admin API tras las corridas de esta sesión:
`knit-crochet/users` tenía **3 carpetas vacías** (una por subida exitosa) después de que el
teardown borrara los assets con `/destroy` — porque `/destroy` borra el archivo, no la carpeta que
la subida creó implícitamente al firmar `folder=`. Se limpiaron a mano (`DELETE /folders/<path>` →
`{"deleted":[...]}`, quedó `total_count 0`), pero el teardown **no** lo automatiza: exige la Admin
API con auth básica `api_key:api_secret`, un camino de credencial que no existe en ningún punto de
`src/`.
**Escenario de fallo concreto:** cada ejecución del smoke deja basura acumulándose en la cuenta;
sin nadie mirando, en un año son cientos de carpetas huérfanas. Y, mirado desde el producto, es la
otra cara de la **deuda 61**: la app no borra imágenes **ni** carpetas, así que un usuario borrado
deja su carpeta para siempre. **No es lo mismo que la 61** (aquella es sobre los archivos y sobre
el contrato del `publicId` único; ésta es sobre las carpetas y sobre que no tenemos ningún cliente
de la Admin API), pero se cierran juntas el día que se contemple el borrado.
