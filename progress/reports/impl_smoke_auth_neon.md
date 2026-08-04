# Smoke test de la cadena de auth contra Neon real — deudas #45 y #46

**Objetivo:** saldar la **deuda 46** (la cadena de auth nunca se ejercitó contra
Postgres real) y, con ella, **diagnosticar la deuda 45** (*"el alta no rechaza un
email ya registrado"*). Tarea de **verificación**: cero cambios en código de
producción.

## Montaje

- Archivo nuevo: **`src/__smoke__/auth.smoke.test.ts`**, guardado por el **mismo
  flag** que el precedente: `SMOKE_NEON`. En la corrida hermética normal queda
  **SKIPPED** y **no abre ninguna conexión** (el cliente Drizzle se construye
  perezosamente dentro de `beforeAll` vía `createDbClient(url)`; en el top-level
  del módulo no hay más que imports).
- **Ejercita los Route Handlers reales** con un `Request` real:
  `POST` de `src/app/api/auth/register/route.ts` y de
  `src/app/api/auth/login/route.ts`. Eso cubre la cadena entera —
  *route handler → zod → servicio (`registerUser`/`loginUser`) → `createAuthUserStore`
  → Drizzle → Postgres* — **y además** la serialización de la respuesta (status,
  cuerpo JSON, cabecera `set-cookie`). No se dobla nada: ni el store (como hace
  `auth-routes.test.ts`) ni `fetch` (como hacen los tests de UI).
- Los handlers usan el **store por defecto** (`db` de `@/shared/db`, que lee
  `process.env.DATABASE_URL` en su primer uso). Por eso `beforeAll` puebla
  `process.env.DATABASE_URL` y `process.env.JWT_SECRET` desde `.env` **antes** de
  la primera petición (helper `resolveEnvValue`, generalización del
  `resolveDatabaseUrl` del precedente). El cliente que usa el propio test para
  inspeccionar la base es uno aparte, creado con la misma URL.
- Emails únicos por corrida con `STAMP = Date.now()`:
  `smoke+<stamp>@knit.test`, `smoke-dup+<stamp>@knit.test`,
  `Fulano+<stamp>@Knit.Test`, `smoke-login+<stamp>@knit.test`.
- Cada caso **recoge primero** (status + cuerpo crudo + filas reales de la
  columna `email`), **loguea** y **después** asserta: así, aunque un assert
  falle, la evidencia cruda ya está impresa.
- Comando:
  `SMOKE_NEON=1 pnpm exec vitest run src/__smoke__/auth.smoke.test.ts --reporter=verbose --disable-console-intercept`

## Resultado: 5/5 confirmados — **la cadena de servidor está sana**

| # | Comportamiento | Resultado |
|---|----------------|-----------|
| 1 | Alta feliz → 201, fila en Postgres, `passwordHash` ≠ contraseña en claro | ✅ confirmado |
| 2 | **CASO CENTRAL:** alta con email ya registrado → **409** | ✅ **confirmado (409 real)** |
| 3 | Normalización del email (caja + espacios) → el duplicado también da **409** | ✅ confirmado |
| 4 | Login OK → 200 + cookie; password errónea y email inexistente → **401 idéntico** | ✅ confirmado |
| 5 | `users` tiene constraint **UNIQUE real** sobre `email` en la base | ✅ confirmado |

### 1. Alta feliz

`POST /api/auth/register` con email nuevo devuelve **201**, el cuerpo trae
`user` **sin `passwordHash`**, y en Postgres queda **una** fila cuyo
`password_hash` empieza por `$2b$12$` (bcrypt coste 12) — **no** es la
contraseña en claro. La cookie `kc_session` sale `HttpOnly` y su token
**verifica** contra `verifySessionToken` con el `userId` del usuario creado.

### 2. Caso central: alta duplicada → **409, no 201 ni 500**

Dos altas seguidas con **la misma cadena exacta**:

- 1.ª → `201`
- 2.ª → **`409`** con cuerpo `{"error":"Ya existe una cuenta con ese email."}`
- En la columna `email` queda **UNA sola fila**.

Es exactamente el status que el formulario sabe pintar (`EMAIL_TAKEN_STATUS = 409`
en `src/features/auth/ui/RegisterForm.tsx`). **La hipótesis nº 1 de la deuda 45
—que la traducción del error de duplicado fallara y saliera un 500 o un 201
espurio— queda descartada contra la base real.**

**Por qué aquí no pasa lo que pasó con las lanas:** `createYarn` confía en que el
**driver** le devuelva la violación `23505` y la traduce con una heurística
(`isDuplicateColorCode`), que es donde estaba el bug. `registerUser`
(`src/features/auth/api/register.ts`) **no depende del error del driver**: hace
un `findByEmail` **previo** y lanza `EmailAlreadyRegisteredError` antes de
insertar. El camino nunca llega al `DrizzleQueryError` envuelto, así que la
discrepancia doble-vs-Postgres del precedente no aplica.

> Nota de robustez (no es un fallo observado, y **no se toca en esta tarea**): ese
> `findByEmail` + `insert` es un *check-then-act* sin transacción. Dos altas
> **simultáneas** del mismo email podrían pasar las dos comprobaciones y la
> segunda chocaría contra la constraint UNIQUE, que **nadie traduce** → 500. El
> smoke es secuencial y no lo reproduce; queda como observación para fichar.

### 3. Normalización del email (la "sospecha nº 1"): también 409

- Alta con `Fulano+<stamp>@Knit.Test` → **201**, y lo guardado en la columna
  `email` es **`fulano+<stamp>@knit.test`** (minúsculas).
- Alta con `fulano+<stamp>@knit.test` (misma dirección, otra caja) → **409**.
- Alta con `"  Fulano+<stamp>@Knit.Test  "` (espacios delante y detrás) → **409**.
- Filas creadas por este caso: **una sola**. No hubo duplicados que limpiar.

Funciona porque `emailSchema` (`src/features/auth/validation.ts`) hace
`.trim().toLowerCase()` **antes** de validar el formato, y el handler usa
`parsed.data`, es decir el valor **ya normalizado**, tanto para consultar como
para guardar. La unicidad no depende del casing.

### 4. Login real

- Credenciales correctas → **200**, `user` sin `passwordHash`, cookie
  `kc_session` cuyo token verifica con el `userId` correcto.
- Password incorrecta → **401** `{"error":"Email o contraseña incorrectos."}`.
- Email inexistente → **401** con el **cuerpo idéntico byte a byte** (se compara
  el texto crudo, no el objeto). No se filtra qué cuentas existen. Ninguna de las
  dos respuestas trae `set-cookie`.

### 5. Constraint UNIQUE real en la base

Consulta directa a `information_schema` y a `pg_indexes`:

```
constraints users = [{"constraint_name":"users_pkey","constraint_type":"PRIMARY KEY","column_name":"id"},
                     {"constraint_name":"users_email_unique","constraint_type":"UNIQUE","column_name":"email"}]
índices users     = [{"indexname":"users_pkey","indexdef":"CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)"},
                     {"indexname":"users_email_unique","indexdef":"CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (email)"}]
```

La constraint **existe de verdad** en la base (no solo en el schema Drizzle): la
red de seguridad de último recurso está puesta. Es un índice único sobre el valor
literal de `email`, no sobre `lower(email)` — la normalización a minúsculas la
garantiza la capa zod, no la base.

## Salida real cruda del smoke (`SMOKE_NEON=1`)

```
 RUN  v4.1.10 C:/_dev/projects/knit-crochet

[smoke-auth] 1. alta feliz -> status=201 body={"user":{"id":"49bd6a24-2c86-4093-97cb-d3caeb23b2f9","email":"smoke+1785781569311@knit.test","name":"Smoke Alta","createdAt":"2026-08-03T18:26:09.674Z","updatedAt":"2026-08-03T18:26:09.674Z"}}
[smoke-auth] 1. filas en users = [{"email":"smoke+1785781569311@knit.test","hash":"$2b$12$keWRye/I0erq3B7pb533TehP1UfZkLhSDOUxLaXH/3N5Sv7s7gpgq"}]
 ✓ src/__smoke__/auth.smoke.test.ts > smoke: cadena de auth contra Neon real > 1. alta feliz → 201, usuario en Postgres y passwordHash != contraseña en claro 2079ms
[smoke-auth] 2. primera alta -> status=201 body={"user":{"id":"ff93844a-600c-4a80-889f-aa65a04c2f35","email":"smoke-dup+1785781569311@knit.test","name":"Smoke Dup","createdAt":"2026-08-03T18:26:11.023Z","updatedAt":"2026-08-03T18:26:11.023Z"}}
[smoke-auth] 2. SEGUNDA alta (misma cadena exacta) -> status=409 body={"error":"Ya existe una cuenta con ese email."}
[smoke-auth] 2. columna email en Postgres = [{"id":"ff93844a-600c-4a80-889f-aa65a04c2f35","email":"smoke-dup+1785781569311@knit.test"}]
 ✓ src/__smoke__/auth.smoke.test.ts > smoke: cadena de auth contra Neon real > 2. CASO CENTRAL — alta con email ya registrado → 409 (deuda #45) 2045ms
[smoke-auth] 3. alta con "Fulano+1785781569311@Knit.Test" -> status=201 body={"user":{"id":"8630c2f2-2f6f-428f-8e88-d565632d88a6","email":"fulano+1785781569311@knit.test","name":"Smoke Caja","createdAt":"2026-08-03T18:26:13.062Z","updatedAt":"2026-08-03T18:26:13.062Z"}}
[smoke-auth] 3. alta con "fulano+1785781569311@knit.test" -> status=409 body={"error":"Ya existe una cuenta con ese email."}
[smoke-auth] 3. alta con "  Fulano+1785781569311@Knit.Test  " (con espacios) -> status=409 body={"error":"Ya existe una cuenta con ese email."}
[smoke-auth] 3. columna email en Postgres = [{"id":"49bd6a24-2c86-4093-97cb-d3caeb23b2f9","email":"smoke+1785781569311@knit.test","name":"Smoke Alta"},{"id":"ff93844a-600c-4a80-889f-aa65a04c2f35","email":"smoke-dup+1785781569311@knit.test","name":"Smoke Dup"},{"id":"8630c2f2-2f6f-428f-8e88-d565632d88a6","email":"fulano+1785781569311@knit.test","name":"Smoke Caja"}]
 ✓ src/__smoke__/auth.smoke.test.ts > smoke: cadena de auth contra Neon real > 3. normalización del email (caja y espacios) → el duplicado también es 409 1214ms
[smoke-auth] 4. alta previa -> status=201 body={"user":{"id":"397eebf5-4384-4e97-87da-15756499c0bd","email":"smoke-login+1785781569311@knit.test","name":"Smoke Login","createdAt":"2026-08-03T18:26:14.254Z","updatedAt":"2026-08-03T18:26:14.254Z"}}
[smoke-auth] 4. login correcto -> status=200 body={"user":{"id":"397eebf5-4384-4e97-87da-15756499c0bd","email":"smoke-login+1785781569311@knit.test","name":"Smoke Login","createdAt":"2026-08-03T18:26:14.254Z","updatedAt":"2026-08-03T18:26:14.254Z"}}
[smoke-auth] 4. password incorrecta -> status=401 body={"error":"Email o contraseña incorrectos."}
[smoke-auth] 4. email inexistente -> status=401 body={"error":"Email o contraseña incorrectos."}
 ✓ src/__smoke__/auth.smoke.test.ts > smoke: cadena de auth contra Neon real > 4. login real: credenciales correctas → 200 + cookie; erróneas → 401 idéntico 1801ms
[smoke-auth] 5. constraints users = [{"constraint_name":"users_pkey","constraint_type":"PRIMARY KEY","column_name":"id"},{"constraint_name":"users_email_unique","constraint_type":"UNIQUE","column_name":"email"}]
[smoke-auth] 5. índices users = [{"indexname":"users_pkey","indexdef":"CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)"},{"indexname":"users_email_unique","indexdef":"CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (email)"}]
 ✓ src/__smoke__/auth.smoke.test.ts > smoke: cadena de auth contra Neon real > 5. la tabla users tiene constraint UNIQUE real sobre email en la DB 362ms
[smoke-auth] teardown: filas a borrar = [{"id":"49bd6a24-2c86-4093-97cb-d3caeb23b2f9","email":"smoke+1785781569311@knit.test"},{"id":"ff93844a-600c-4a80-889f-aa65a04c2f35","email":"smoke-dup+1785781569311@knit.test"},{"id":"8630c2f2-2f6f-428f-8e88-d565632d88a6","email":"fulano+1785781569311@knit.test"},{"id":"397eebf5-4384-4e97-87da-15756499c0bd","email":"smoke-login+1785781569311@knit.test"}]
[smoke-auth] teardown: filas del stamp restantes = 0 | total users = 1

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  15:26:06
   Duration  11.04s (transform 269ms, setup 778ms, import 1.48s, tests 8.19s, environment 0ms)
```

## DB limpia (verificado post-run)

Teardown **explícito y ordenado** en `afterAll` (no hay transacción
multi-statement en `neon-http`): borra por `email LIKE '%<stamp>%'`, lo que
arrastra **todas** las variantes del caso 3 aunque hubieran creado duplicados.
Estos usuarios no tienen filas hijas (el smoke solo toca auth), así que un solo
`delete` sobre `users` basta. Corre **aunque un assert falle** (vitest ejecuta el
teardown igualmente).

- Filas creadas por el smoke: **4** (una por caso, ver el log del teardown).
- Filas del stamp **restantes tras el teardown: 0** (asertado en `afterAll`).

Conteo posterior con consulta directa a Neon (cliente aparte, fuera de vitest):

```
users            1   <-- NO es del smoke, ver abajo
projects         0
patterns         0
brands           0
yarn_types       0
yarns            0
project_yarns    0
craft_sessions   0
```

Ese `users = 1` es **preexistente**: es la cuenta que el propio usuario creó a
mano en el navegador el **2026-08-02T01:40:31Z** (`name: "Agus"`, `password_hash`
con prefijo `$2b$12$`), la de la sesión en la que reportó las deudas 44 y 45. **El
smoke no la creó ni la tocó**, y no se ha borrado. La base quedó **exactamente
como estaba**.

**Dato relevante para la deuda 45:** en esa tabla hay **una sola fila** para ese
email. Si el alta duplicada no se hubiera rechazado en el navegador, habría dos.
El estado real de la base es **consistente con que el servidor sí devolvió 409**.

## Suite hermética intacta (`bash ./init.sh`, sin el flag)

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  46 passed | 2 skipped (48)
      Tests  481 passed | 11 skipped (492)
   Start at  15:28:23
   Duration  44.58s (transform 3.12s, setup 34.18s, import 38.24s, tests 26.86s, environment 11.72s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**481 passed** (los mismos de antes, ninguno nuevo en la corrida hermética) y
**11 skipped** — antes eran 6 (los del smoke de Neon) y ahora son 6 + **5** del
smoke de auth. Archivos: 2 skipped (los dos smokes). **Cero conexiones** abiertas
en la corrida hermética.

## Decisiones no obvias

1. **Mismo flag `SMOKE_NEON`, no uno nuevo.** El gate es el mismo ("¿hablo con
   Neon de verdad?"); con dos flags habría que recordar dos comandos y uno de los
   dos smokes se quedaría sin correr por olvido.
2. **Se ejercitan los Route Handlers, no solo los servicios.** El síntoma de la
   deuda 45 está descrito en términos de **status HTTP**, así que el smoke tenía
   que llegar hasta la respuesta. De paso queda cubierta la cookie `set-cookie`
   contra un `NextResponse` real.
3. **`process.env.DATABASE_URL` y `JWT_SECRET` se poblan en `beforeAll`.** Los
   handlers no admiten inyección de store (usan el `db` por defecto), y ese
   cliente es un `Proxy` que resuelve la URL **en su primer uso**. Poblar el env
   antes de la primera petición es la única forma de que el código de producción
   corra tal cual, sin mockearlo.
4. **Recoger → loguear → asertar.** Si un assert falla, el `expect` corta el test
   y la evidencia posterior no se imprimiría. Con este orden, la salida cruda
   (status, cuerpo, contenido de la columna `email`) siempre queda registrada.
5. **Teardown por `LIKE '%<stamp>%'`** en vez de por lista de emails: cubre las
   variantes normalizadas del caso 3 y cualquier duplicado inesperado, sin
   depender de qué acabó guardándose.
6. **Cero cambios de producción.** No se tocó nada bajo `src/features/`,
   `src/app/` ni `src/shared/`. El único archivo nuevo es el smoke.

## Veredicto sobre las deudas 45 y 46

### Deuda 46 — **SALDADA**

La cadena de auth ya está ejercitada de punta a punta contra Postgres real:
*Route Handler → zod → servicio → store Drizzle → Neon*, con la respuesta HTTP
(status, cuerpo, cookie) verificada sobre objetos reales. El smoke queda en el
repo guardado por flag, como el de las lanas, y cubre alta, duplicado,
normalización, login (los tres caminos) y la existencia real de la constraint
UNIQUE. Es una **guardia viva**: si mañana alguien rompe la traducción del
duplicado o la normalización del email, este archivo lo dice.

### Deuda 45 — **NO reproducida en el servidor. El defecto NO está donde se
suponía.**

La hipótesis nº 1 (*"la traducción del error de duplicado falla y sale un 500 o un
201 espurio"*) queda **descartada con evidencia**: contra Neon real,
`POST /api/auth/register` con un email ya registrado responde **409** con el
cuerpo `{"error":"Ya existe una cuenta con ese email."}`, tanto con la cadena
idéntica como con distinta caja o con espacios. La base queda con una sola fila.
La sospecha de normalización (nº 1 del encargo) tampoco se sostiene: se guarda
siempre en minúsculas y sin espacios.

**Lo que esto deja abierto** (para enrutar como diagnóstico aparte; aquí no se
toca nada):

- El 409 llega bien y `RegisterForm` lo mapea a un error del campo email
  (`EMAIL_TAKEN_STATUS = 409` → `setFieldErrors({ email: result.message })`), y
  `Field` sí pinta el mensaje. O sea que **el camino de código, leído, es
  correcto**; lo que falta es evidencia de **qué pasó en la pantalla del
  usuario**, que ningún test automático puede dar.
- **Siguiente paso de diagnóstico recomendado** (30 segundos, en el navegador):
  repetir el alta duplicada con la pestaña **Network** abierta y mirar la
  petición `register`. Si el status es **409** —que es lo que este smoke dice que
  el servidor devuelve—, el defecto es de **presentación** (el mensaje aparece
  bajo el campo email, en texto pequeño y monoespaciado, y pudo pasar
  desapercibido, o el foco no se movió), no del servidor, y hay que fichar la
  deuda en esos términos. Si el status **no** es 409, entonces lo que difiere es
  el entorno de ejecución (build de producción, otra `DATABASE_URL`), no la
  lógica, y eso es una tercera línea de investigación.
- **Observación adicional a fichar** (encontrada leyendo el código, no
  reproducida): el *check-then-act* de `registerUser` no es atómico; dos altas
  **concurrentes** del mismo email darían un 500 al chocar con la constraint
  UNIQUE, porque nadie traduce ese error del driver. Es el mismo patrón que causó
  el bug de las lanas, pero por una puerta distinta.
