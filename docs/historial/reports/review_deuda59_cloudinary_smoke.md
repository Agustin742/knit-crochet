# Review — deuda técnica 59 (smoke de subida REAL a Cloudinary)

**Veredicto: APROBADO — 0 bloqueantes.**

**Alcance:** no es una feature de `feature_list.json`; es la deuda 59 de `progress/deudas.md`.

> Aviso de método: **todo lo que sigue está medido, no leído**. Ejecuté `bash ./init.sh`, la corrida
> hermética desde un cwd sin `.env`, el smoke real contra la cuenta de Cloudinary con `SMOKE_CLOUDINARY=1`,
> un barrido del repo entero buscando los valores literales del `.env`, y una consulta a la Admin API de
> Cloudinary para ver cómo quedó la cuenta. **No edité nada del código del implementer.**

---

## 1. ¿El smoke SALDA la deuda o sólo lo parece?

La deuda 59 pregunta exactamente dos cosas. Las dos quedan **asertadas**, no sólo impresas:

| Pregunta de la deuda 59 | Assert que la cubre | ¿Suficiente? |
|---|---|---|
| ¿La firma de `buildUploadSignature` es la que Cloudinary espera de verdad? | `src/__smoke__/cloudinary.smoke.test.ts:178` — `expect(observed.status).toBe(201)` sobre el Route Handler real → `uploadUserImage` → `uploadImage` → `fetch` real, sin dobles. Con firma inválida Cloudinary devuelve 401 y toda la cadena cae a 502. | **Sí** |
| ¿La respuesta real trae `secure_url` con la forma que asume `extractSecureUrl`? | `:179` (`url` definida: si `secure_url` faltara o cambiara de nombre, `extractSecureUrl` → `null` → `malformed_response` → 502 y `:178` cae) + `:188` (`protocol === "https:"`, que es justo lo que distingue `secure_url` de `url`) + `:193-201` (`fetch(url)` → `200`, `content-type` `image/*`, bytes > 0). | **Sí** |

**El `fetch(url)` de verificación existe y se asierta de verdad**: líneas 193-201, tres `expect`, no un
`console.log` decorativo. No es un test que pase sin ejercitar lo que la deuda pide.

**Reproducción independiente (corrida mía, no la del implementer):**

```
$ SMOKE_CLOUDINARY=1 vitest run src/__smoke__/cloudinary.smoke.test.ts --reporter=verbose
 v 1. PNG real por el endpoint completo -> 201 { url } y la URL sirve la imagen
 v 2. bytes que no son imagen declarados image/png -> Cloudinary rechaza -> 502
[smoke-cloudinary] 2. subida falsa -> status=502 body={"error":"No se pudo subir la imagen. Inténtalo de nuevo."}
[smoke-cloudinary] teardown destroy knit-crochet/users/0bea5a3b-.../6b5c632c-... -> 200 {"result":"ok"}
 Test Files  1 passed (1)   Tests  2 passed (2)   Duration  3.57s
```

El `stderr` del caso 2 de **mi** corrida mostró la causa real desenvuelta —
`CloudinaryUploadError: Cloudinary rechazó la subida: Invalid image file`, `status: 400` — así que la
segunda línea de defensa (deuda 58) también quedó vista de primera mano.

**Conclusión: la deuda 59 está saldada por medición.** El caso 1 es un gate real y sensible a lo que
importa.

---

## 2. REGLA 3 (condición doble) y el caso 2 — decisión justificada

**El caso 2 no está vacuamente verde**: asierta tres cosas (`:222` status 502, `:223` el mensaje exacto,
`:226` que no venga `url`). Pero **mide bastante menos de lo que su nombre y el informe afirman**, y el
diagnóstico del implementer (deuda 63 propuesta: *"no distingue por qué falló"*) **se queda corto**. La
lectura correcta es más dura:

- Con la firma rota siguió verde → insensible a la firma. Eso sí lo vio el implementer.
- Y además: **todo** fallo aguas arriba desemboca en el mismo 502 — red caída, credenciales equivocadas,
  DNS roto, proveedor caído. Es decir, **el caso 2 pasa aunque la petición no llegue nunca a Cloudinary**.
  Como guardián de regresión **no prueba que Cloudinary haya rechazado el contenido**: sólo prueba el
  contrato del endpoint (*algo falló arriba → 502 con este mensaje y sin `url`*), que ya está cubierto —
  con `fetch` mockeado y sin gastar red — en `src/app/api/uploads/uploads-routes.test.ts:310`.
- La medición de la deuda 58 fue **real pero manual**: la hizo el ojo humano leyendo `Invalid image file`
  en el `console.error`, no un `expect`. Un test no guarda lo que un humano leyó una vez.

**No bloquea**, por tres razones: la deuda bajo revisión es la 59 y el caso 1 la cubre entera; el caso 2 es
alcance añadido que aporta (midió la 58 una vez); y el implementer fichó el problema por su cuenta en vez
de esconderlo. Pero **la ficha 63 hay que asentarla con esta redacción y no con la del informe** (§8.1).

**Sobre la dirección roja:** no la re-ejecuté, porque exige mutar código de producción y eso le está vedado
al reviewer. La evidencia pegada es coherente y corroborable de forma independiente: el `String to sign`
que devolvió Cloudinary (`folder=...&public_id=...&timestamp=...`) es exactamente la cadena canónica que
produce `buildUploadSignature` (`src/shared/lib/cloudinary/upload.ts:59-63`), y la línea que el informe cita
como fallida (`:178`) es **de verdad** `expect(observed.status).toBe(201)` en el archivo tal como está hoy.

---

## 3. Aislamiento hermético — verificado por mí, no por el informe

`bash ./init.sh` → **exit 0**, con números idénticos a los del informe:

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  52 passed | 3 skipped (55)
      Tests  547 passed | 13 skipped (560)
[OK]    tests verdes
```

Comprobación extra e independiente (el implementer movió el `.env`; yo **no toqué el `.env`**): lancé
Vitest desde un directorio de trabajo **que no contiene ningún `.env`**, con `--root` apuntando al repo. Si
algo leyera el `.env` en el top-level, habría reventado con `ENOENT`:

```
$ (cwd = carpeta vacía) node .../vitest.mjs run --root C:/_dev/projects/knit-crochet src/__smoke__
 down cloudinary.smoke.test.ts (2)   down auth.smoke.test.ts (5)   down neon.smoke.test.ts (6)
 Test Files  3 skipped (3)   Tests  13 skipped (13)   Duration 2.14s
```

Auditoría de top-level de los módulos nuevos y tocados:

- `src/__smoke__/env.ts` sólo declara una función; el `readFileSync` vive **dentro** de `resolveEnvValue`,
  que sólo se llama desde `beforeAll`, y `beforeAll` no corre bajo `describe.skipIf`.
- `src/__smoke__/cloudinary.smoke.test.ts` top-level: imports, `vi.mock`, un `await import` del route
  handler, `crypto.randomUUID()` y constantes. **Cero I/O, cero lectura de config.**
- Transitivos: `src/shared/lib/auth/jwt.ts:32` y `src/shared/lib/cloudinary/config.ts` leen `process.env`
  **por llamada**, con comentario explícito de por qué. Importar no lee nada.

**Hermeticidad: correcta.**

---

## 4. El cambio en producción (`export const CLOUDINARY_API_BASE`) — juzgado

Diff total en `src/` fuera de `__smoke__/`: **2 líneas**. `upload.ts:3-4` pasa a `export` (+ comentario) y
`cloudinary/index.ts:9` lo reexporta. Cero cambio de comportamiento.

**Veredicto: justificado, con una reserva anotada.**

- **A favor:** `docs/harness/conventions.md` §Imports obliga a consumir por el `index.ts` y no por rutas
  internas, así que **si se exporta, hacerlo por el barrel es lo canónico**, no un exceso. Y la alternativa
  —escribir `https://api.cloudinary.com/v1_1` a mano en el teardown— choca con "cero hardcode donde hay
  constante". El teardown **tiene que existir**: sin él el smoke ensucia la cuenta real en cada corrida, y
  encima ejercita la firma una segunda vez por un camino distinto (`/destroy`), que es valor añadido.
- **Reserva (no bloqueante, sin acción hoy):** sí amplía la superficie pública de un módulo de producción
  para servir a un test. El efecto colateral es que ahora cualquiera puede construir llamadas ad-hoc a la
  API de Cloudinary saltándose `uploadImage()` y su contrato de errores tipados. Con un `const` de una línea
  no compensa montar indirección; queda como cosa a vigilar si alguien lo usa desde `src/` de producción.
- **Matiz de honestidad sobre el informe §6.2:** la duplicación que se decía evitar **sigue existiendo** —
  `src/shared/lib/cloudinary/upload.test.ts:69` mantiene la URL completa escrita a mano. Ahí está **bien**
  (es el ancla del literal, REGLA 2(a)), pero entonces el argumento real es "habría un tercer sitio además
  del ancla legítima". No cambia la decisión.

---

## 5. El refactor de los dos smokes de Neon (alcance añadido) — juzgado

Es alcance por encima de lo pedido y aun así **está bien traído**: el encargo avisaba del olor de la tercera
copia, y dejar el helper nuevo *más* las dos copias viejas habría sido peor que no extraerlo.

**Equivalencia verificada línea a línea sobre el diff** — importa, porque `pnpm test` no ejecuta estos
archivos y una rotura aquí sería invisible:

- `src/__smoke__/auth.smoke.test.ts`: borra una copia **idéntica carácter a carácter** de `resolveEnvValue`
  e importa la compartida. Mismo cuerpo, mismo regex, mismo mensaje. **Sin regresión posible.**
- `src/__smoke__/neon.smoke.test.ts`: `resolveDatabaseUrl()` → `resolveEnvValue("DATABASE_URL")` en su única
  llamada (`:83`). Comparado el original contra el genérico: el guard (`if (process.env.DATABASE_URL)` vs
  `if (fromEnv)`) es el mismo truthy-check; el regex es el mismo patrón (literal vs `new RegExp` con la
  misma cadena); el `trim()` + strip de comillas es idéntico; y el mensaje lanzado
  (`"DATABASE_URL no encontrada ni en env ni en .env"` frente al template con `name = "DATABASE_URL"`) es
  **byte a byte el mismo string**. **Equivalente. Sin regresión.**
- Comprobado además que los dos archivos **siguen colectando** (imports resueltos, incluido el alias nuevo
  `@/__smoke__/env`) en mi corrida de §3, y que el typecheck del `init.sh` los cubre.
- **Lo que no pude re-ejecutar:** `SMOKE_NEON=1` contra la DB real — el clasificador del sandbox bloqueó el
  comando. Queda cubierto por la equivalencia demostrada arriba más la salida del implementer (5/5 y 6/6).

Detalle de encaje correcto: `env.ts` no termina en `.test.ts`, así que el `include` de `vitest.config.ts`
no lo recoge como suite. Cuadra con el conteo: **3** archivos skipped (no 4) y **13** tests skipped (11
previos + los 2 nuevos).

---

## 6. REGLA 2 (el par se deriva, el contrato se ancla)

**Cumplida.** El smoke deriva de las constantes reales: `ACCEPTED_IMAGE_TYPES` (`:65`, y lanza si el formato
no está en la lista blanca), `buildUserImageFolder` → `UPLOADS_ROOT_FOLDER` (`:186`), `JWT_COOKIE_NAME`
(`:153` — mejor que el unitario `uploads-routes.test.ts:82`, que escribe el nombre de la cookie a mano) y
`CLOUDINARY_API_BASE` (`:133`). **`MAX_IMAGE_BYTES` no aplica y hace bien en no aparecer**: aquí no se mide
el tope, forzarlo habría sido ruido.

Dos observaciones de rigor, **no bloqueantes**:

- **`:201` `expect(bytes).toBeGreaterThan(0)` es más flojo que el dato que el propio informe presume.** El
  informe celebra los 70 bytes servidos como prueba de que no es un 200 de una página de error, pero eso lo
  verificó el ojo humano leyendo el `console.log`, no un assert. El valor exacto es **derivable y gratis**
  (`png.size`, o el `byteLength` del buffer que ya se construye en `:169`). `expect(bytes).toBe(png.size)`
  convertiría una frase del informe en un invariante ejecutable — justo lo que predica la REGLA 5.
- **`:186` es un `toContain`.** Aplica la nota de la REGLA 3 sobre anclas de pertenencia: detecta lo que
  falta, no lo que sobra. Riesgo bajo aquí (la URL la fabrica Cloudinary); queda sólo anotado.

El literal del mensaje de error en `:223-225` duplica el de `route.ts`, pero ahí el literal **es** el
contrato y ya está anclado en el unitario; aceptable.

---

## 7. Seguridad e higiene (los bloqueantes potenciales — todos limpios)

**SECRETOS: LIMPIO.** Barrí el repo entero (excluyendo `node_modules/`, `.git/`, `.next/`) buscando los
**valores literales** de las 5 claves del `.env`: `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `JWT_SECRET`. Única coincidencia en todo el árbol:
`CLOUDINARY_CLOUD_NAME`, dentro de `progress/reports/impl_deuda59_cloudinary_smoke.md`. **No es un
secreto**: el cloud name viaja en toda URL de imagen que la app sirve al navegador (aparece, de hecho, en la
propia URL pegada en el informe). `CLOUDINARY_API_SECRET`, `JWT_SECRET` y `DATABASE_URL` **no aparecen en
ningún archivo** fuera del `.env`. En el código, `config.apiSecret` sólo entra en `buildUploadSignature`;
nunca en un `console.log` ni en un `FormData`.

**`.env` y `.gitignore`: LIMPIO.** El `.env` está en su sitio (333 bytes, mtime del 1-ago, **anterior** a
esta sesión, o sea que fue movido y devuelto, no reescrito). `git check-ignore -v .env` responde
`.gitignore:14`. `git ls-files` filtrado por "env" devuelve sólo `.env.example` y `next-env.d.ts`. **No
quedó ninguna copia**: búsqueda de `*.bak`, `*.smokecheck*` y `*.png` fuera de `node_modules` da **cero
resultados**.

**HIGIENE: LIMPIA.** `git status` muestra exactamente 4 modificados y 3 sin trackear (los 2 archivos del
smoke + el informe), nada más. Sin `TODO`/`FIXME`/`XXX` en `src/__smoke__/`. Los `console.log` del smoke
**no son debug**: son la salida de medición de un test que sólo corre a mano, con el mismo patrón ya
establecido en `auth.smoke.test.ts` (8 `console.log`). El PNG va embebido en base64, sin fixture suelto en
disco.

**Estado de la cuenta de Cloudinary tras mi corrida** (consultado con la Admin API): `assets bajo
knit-crochet/users: 0`, o sea que el teardown **borra de verdad**. Quedó **1 carpeta vacía**,
`knit-crochet/users/0bea5a3b-a8be-489f-823c-b15c4510b9b1`, que es **mía, de esta revisión**, y que confirma
empíricamente la deuda 65 propuesta. Intenté borrarla con la Admin API y el clasificador del sandbox lo
bloqueó, así que queda para el líder (§8.3).

---

## 8. Cambios requeridos

Ninguno bloqueante sobre el código. Tres tareas para el **líder** al asentar el cierre:

1. **Reescribir la deuda 63 con el diagnóstico de §2, no con el del informe.** Redacción sugerida: *el caso
   2 del smoke de Cloudinary pasa aunque la petición no llegue nunca a Cloudinary — cualquier fallo aguas
   arriba (red, credenciales, firma, proveedor caído) desemboca en el mismo 502 —, así que no guarda nada
   del rechazo de contenido de la deuda 58; esa medición fue manual (leer el mensaje del proveedor en el
   `console.error`) y el único caso sensible a la firma es el 1*. La versión del informe ("no distingue por
   qué falló") suena a matiz cuando lo cierto es que el caso 2 no prueba ni que se haya contactado al
   proveedor.
2. **Al tachar la 59 en `deudas.md`, matizar la 58:** queda **medida una vez**, no **guardada por un test**.
3. **Borrar la carpeta vacía** `knit-crochet/users/0bea5a3b-a8be-489f-823c-b15c4510b9b1`, o anotarla en la
   ficha de la deuda 65 junto a las demás.

Mejora opcional, barata y alineada con la REGLA 2, para quien vuelva a tocar el archivo (no la exijo ahora
porque obligaría a re-correr contra la cuenta real sin necesidad): `expect(bytes).toBe(png.size)` en `:201`
y un assert sobre el `reason` de `CloudinaryUploadError` en el caso 2, para que deje de ser un embudo.

---

## Checkpoints

- **C1: [x]** — Arnés completo; `bash ./init.sh` termina en **exit 0** (lint verde, typecheck verde, tests
  verdes), ejecutado por el reviewer.
- **C2: [x]** — `feature_list.json` intacto (32 features; ninguna tocada, porque esto no es una feature).
  `progress/current.md` describe la sesión activa y no se modificó. `deudas.md` sin tocar, como corresponde
  (lo asienta el líder).
- **C3: [x]** — Arquitectura respetada. **No se movió lógica de sitio:** el Route Handler
  `src/app/api/uploads/image/route.ts` sigue fino y sin tocar, la lógica sigue en
  `src/features/uploads/api/` y el scoping por `userId` se sigue derivando del JWT. El único cambio en
  producción es `const` → `export const` de un literal (§4). Sin dependencias nuevas, sin `console.log` de
  debug, sin TODOs, sin secretos hardcodeados (§7).
- **C4: [x]** — lint y typecheck verdes; **547 passed | 13 skipped**, ningún rojo. El módulo nuevo con
  lógica (`src/__smoke__/env.ts`) es helper de tests, no de producción, queda ejercitado por las tres
  corridas de smoke, y su equivalencia con el código que sustituye está demostrada en §5.
- **C5: [x]** — Sin archivos sospechosos ni artefactos fuera del `.gitignore` (§7). `progress/history.md`
  tiene su entrada de la última sesión cerrada (#15 `uploads_image`); la entrada de **ésta** la escribe el
  líder al cerrar, junto con el informe de `progress/informs/`. Nada de eso depende del implementer.
