# impl — Deuda 145: fragilidad por tiempo en tests (timeouts)

> **NO es una feature.** `feature_list.json` no se toca.
> Informe incremental: se actualiza al terminar cada paso, no al final.

## Objetivo

`bash ./init.sh` sale EXIT 1 con 3 tests en rojo, todos con el mismo mensaje
`Error: Test timed out in 5000ms`. El coste de CPU es deliberado (bcrypt cost 12)
o de arranque en frío (drizzle+neon vía vite). El arreglo es **dar un
`testTimeout` acotado por archivo/test**, medido, no abaratar el hasheo ni saltar
tests.

## Plan

1. [x] Leer ficha 145, `vitest.config.ts`, `init.sh`, los 3 archivos en rojo.
2. [ ] **Medir** cada archivo aislado (varias pasadas) para derivar el número real.
3. [ ] Aplicar `testTimeout` de alcance por archivo/test con comentario que
       explique el número y qué lo hace lento.
4. [ ] **REGLA 3**: romper `verifyPassword` y romper algo del test de `db`;
       confirmar rojo con salida real pegada aquí; restaurar.
5. [ ] Verificación de cierre: 3 archivos aislados verdes + `init.sh` 2 veces,
       EXIT 0, redirigido a archivo, con ambas duraciones.
6. [ ] Tachar la deuda 145 en `progress/deudas.md` explicando cómo se saldó.

## Estado

- Paso 1 hecho. Paso 2 en curso.

## Hallazgos (se rellena por paso)

### Paso 1 — lectura

- `vitest.config.ts` NO declara `testTimeout` → tope por defecto de vitest (5000 ms).
- `src/shared/lib/auth/password.ts`: `bcryptjs` (JS puro) con `BCRYPT_COST = 12`.
  - test 1 ("hashes a password…"): **1 hash**.
  - test 2 ("verifies the right password and rejects a wrong one"): **1 hash + 2 compare** = 3 ops.
- `src/shared/db/index.test.ts`: 4 `it`, el primero paga el `await import("@/shared/db")`
  en frío (transformación vite de drizzle-orm + @neondatabase/serverless); los
  siguientes reusan el grafo de módulos (hay `vi.resetModules()` en `afterEach`,
  que invalida el registro de módulos pero **no** la caché de transformación de vite).

### Paso 2 — medición aislada (máquina descargada), `--testTimeout=60000`

Comando: `pnpm exec vitest run <archivo> --testTimeout=60000 --reporter=verbose`

`src/shared/lib/auth/password.test.ts` (3 pasadas):

| test | p1 | p2 | p3 | peor |
|---|---|---|---|---|
| hashes a password… (1 hash) | 1065 ms | 2029 ms | 1278 ms | **2029 ms** |
| verifies the right password… (1 hash + 2 compare) | 3101 ms | 2878 ms | 4543 ms | **4543 ms** |

→ una operación bcrypt cost 12 en `bcryptjs` cuesta **~1-1.5 s** en esta máquina, **ociosa**.
El segundo test hace 3 → ya roza el tope por defecto de 5000 ms **sin carga**.

`src/shared/db/index.test.ts` (3 pasadas):

| test | p1 | p2 | p3 | peor |
|---|---|---|---|---|
| exposes a configured Drizzle client… (1er `await import`) | 5837 ms | 3348 ms | 4693 ms | **5837 ms** |
| uses an explicit connection string… | 6 ms | 7 ms | 4 ms | 7 ms |
| throws MissingDatabaseUrlError… | 4 ms | 23 ms | 22 ms | 23 ms |
| fails lazily… | 11 ms | 2 ms | 3 ms | 11 ms |

→ **confirmada la raíz distinta**: el coste está **todo** en el primer `it`, que paga el
arranque en frío de `drizzle-orm/neon-http` + `@neondatabase/serverless` a través de la
transformación de vite. Los otros tres cuestan **milisegundos** (el `vi.resetModules()`
invalida el registro de módulos pero **no** la caché de transformación). Una pasada aislada
llegó a **5837 ms > 5000 ms**: este test se pasa del tope **incluso sin carga**.

`src/features/auth/api/auth-service.test.ts` (2 pasadas):

| test | p1 | p2 | peor |
|---|---|---|---|
| registers a user hashing… | 3171 ms | 3567 ms | **3567 ms** |
| rejects a duplicated email… | 1807 ms | 1471 ms | 1807 ms |
| logs in with valid credentials | 3604 ms | 3519 ms | **3604 ms** |
| rejects a wrong password and an unknown email… | 4315 ms | 3981 ms | **4315 ms** |
| returns the current user without passwordHash… | 1500 ms | 1832 ms | 1832 ms |

→ **hallazgo que corrige el diagnóstico de partida**: no es un solo test el frágil. **Los 5**
son bcrypt-bound, y el peor **no** es el que salió en rojo (`rejects a wrong password…`, 4315 ms,
está más cerca del tope que `registers a user…`). Que sólo cayera uno es azar de reparto de carga.
El alcance correcto aquí es **el archivo entero**, no el test que casualmente falló.

### Paso 2b — mecanismo elegido

`vi.setConfig({ testTimeout })` (tipado en vitest 4: `RuntimeOptions = Pick<SerializedConfig,
"allowOnly" | "testTimeout" | "hookTimeout" | ...>`) aplica **sólo al archivo de test actual**.
Es el alcance por archivo que pide la ficha, sin tocar el tope global.
Para alcance por test, vitest 4 acepta `it(name, { timeout }, fn)` (`TestOptions.timeout`).

### Paso 2c — pasada COMPLETA medida con tope alto (`--testTimeout=120000`)

`pnpm exec vitest run --testTimeout=120000 --reporter=verbose` → **EXIT 0**,
`Test Files 77 passed | 3 skipped (80)` · `Tests 1336 passed | 13 skipped (1349)`,
`Duration 263.39s`.

Esto ya demuestra el diagnóstico: **con el tope alto no falla nada**. Los 3 rojos del
baseline no eran fallos de lógica, eran el reloj.

**Hallazgo NUEVO y más grave que los tres reportados** — los tests más lentos de toda la
suite bajo carga **no son** los que fallaron:

| ms | test |
|---|---|
| **7501** | `src/app/api/auth/auth-routes.test.ts` > POST /api/auth/login answers 401 with invalid credentials |
| **7161** | `src/app/api/auth/auth-routes.test.ts` > POST /api/auth/login returns the user and a session cookie |
| 4390 | `src/shared/db/index.test.ts` > exposes a configured Drizzle client… |
| 3782 | `src/shared/lib/auth/password.test.ts` > verifies the right password… |
| 3741 | `auth-routes.test.ts` > POST /api/auth/register rejects a duplicated email with 409 |
| 3547 | `auth-routes.test.ts` > POST /api/auth/register creates the user and sets the session cookie |
| 3219 | `ProjectsView.test.tsx` > no tiene violaciones de axe con la lista cargada |
| 3056 | `auth-routes.test.ts` > GET /api/auth/me returns the current user… |

`src/app/api/auth/auth-routes.test.ts` **no estaba en la lista de rojos** y sin embargo
**dos de sus tests tardan 7.1-7.5 s bajo carga**: con el tope por defecto de 5000 ms sólo
pasan por suerte de reparto. Es la misma raíz (`bcryptjs` cost 12 real a través de los Route
Handlers: el archivo dobla **sólo** el borde de datos, el hashing y el JWT son los de verdad).
**Si sólo se arreglan los 3 archivos reportados, la puerta sigue dependiendo de la carga** —
que es exactamente lo que la ficha 145 quiere eliminar. Entra en el alcance.

### Paso 3 — números elegidos (regla: ~4x el peor tiempo que medí)

| alcance | tope | peor medido | factor | qué lo hace lento |
|---|---|---|---|---|
| `password.test.ts` (archivo) | 20 s | 4543 ms | 4.4x | 3 ops bcrypt cost 12 en JS puro |
| `auth-service.test.ts` (archivo) | 20 s | 4315 ms | 4.6x | hash/compare reales en register+login |
| `auth-routes.test.ts` (archivo) | 30 s | 7501 ms | 4.0x | bcrypt real + import de los Route Handlers de Next |
| `db/index.test.ts` (SÓLO el 1er `it`) | 20 s | 5837 ms | 3.4x | arranque en frío drizzle+neon vía transform de vite |
| global `vitest.config.ts` | 10 s | 3219 ms | 3.1x | el test genérico más lento (axe sobre `ProjectsView`) |

Sobre el global: **no es "por las dudas"**. Medido: fuera de los 4 archivos de arriba, el test
más lento de la suite entera bajo carga es **3219 ms**. El baseline del leader duró **432 s**
frente a mis **263 s** → factor de carga observado **~1.6x**; 3219 × 1.6 = **~5.2 s**, o sea
ese test **también** se pasa de 5000 ms en una máquina más cargada. 10 s le da ~3x de margen
y **sigue cazando un cuelgue real en 10 s**, no en minutos.

### Paso 3b — cambios aplicados

| archivo | cambio |
|---|---|
| `vitest.config.ts` | `testTimeout: 10_000` global + comentario con la medición que lo justifica |
| `src/shared/lib/auth/password.test.ts` | `vi.setConfig({ testTimeout: 20_000 })` (archivo) |
| `src/features/auth/api/auth-service.test.ts` | `vi.setConfig({ testTimeout: 20_000 })` (archivo) |
| `src/app/api/auth/auth-routes.test.ts` | `vi.setConfig({ testTimeout: 30_000 })` (archivo) |
| `src/shared/db/index.test.ts` | `it(nombre, { timeout: 20_000 }, fn)` **sólo** en el primer `it` |

Cada tope lleva encima el comentario con **por qué ese número** y **qué lo hace lento**.
**Cero cambios en código de producción.** `BCRYPT_COST` sigue en 12, `bcryptjs` sigue siendo
`bcryptjs`, y no hay ni un `skip`, `todo` ni test borrado (`git diff --stat` sólo toca los 5
archivos de arriba, todos de test/config).

`pnpm run lint` → verde. `pnpm run typecheck` → verde.

### Paso 3c — aislados con la config nueva (máquina ociosa), tiempos por test

| archivo | resultado | tiempos |
|---|---|---|
| `password.test.ts` | ✓ 2 passed, 5.53s | 872 ms / 2146 ms |
| `auth-service.test.ts` | ✓ 5 passed, 7.32s | 1108 / 524 / 1065 / 1040 / 588 ms |
| `db/index.test.ts` | ✓ 4 passed, 2.84s | 1081 / 2 / 1 / 1 ms |
| `auth-routes.test.ts` | ✓ 9 passed, 7.48s | 675 / 3 / 541 / 1071 / 1270 / 1 / 1 / 1 / 497 ms |

**Dato que cierra el diagnóstico:** el mismo test de login de `auth-routes` cuesta **1071 ms
con la máquina ociosa y 7161 ms dentro de la pasada completa** → **factor 6.7x** entre ocioso
y cargado. Ésa es la varianza real contra la que hay que dimensionar: un tope calibrado sobre
el tiempo ocioso está garantizado a parpadear. Por eso el margen es ~4x sobre el peor
**bajo carga**, no sobre el ocioso.

## REGLA 3 — ¿los tests siguen mordiendo? (salidas reales)

### Rotura 1 — `verifyPassword` devuelve siempre `true`

```ts
export async function verifyPassword(plainPassword, passwordHash): Promise<boolean> {
  await compare(plainPassword, passwordHash);
  return true; // REGLA 3: rotura deliberada y temporal
}
```

`pnpm exec vitest run src/shared/lib/auth/password.test.ts --reporter=verbose`:

```
 ✓ … > hashes a password with the bcrypt format and never stores it in clear 491ms
 × … > verifies the right password and rejects a wrong one 1392ms
   → expected true to be false // Object.is equality
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/shared/lib/auth/password.test.ts > shared/lib/auth/password > verifies the right password and rejects a wrong one
AssertionError: expected true to be false // Object.is equality
- Expected
+ Received
- false
+ true
 ❯ src/shared/lib/auth/password.test.ts:30:64
 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
   Duration  3.44s
```

**Rojo por aserción, no por reloj** (1392 ms, muy dentro de los 20 s). El tope no tapa nada.

Con la MISMA rotura, los otros dos archivos bcrypt-bound
(`pnpm exec vitest run src/features/auth/api/auth-service.test.ts src/app/api/auth/auth-routes.test.ts`):

```
 × auth-routes.test.ts > POST /api/auth/login answers 401 with invalid credentials 1377ms
   → expected 200 to be 401 // Object.is equality
 × auth-service.test.ts > rejects a wrong password and an unknown email with the same error 1401ms
   → promise resolved "{ user: { id: 'user-1', …(4) }, …(1) }" instead of rejecting
 Test Files  2 failed (2)
      Tests  2 failed | 12 passed (14)
   Duration  11.52s
```

Los dos topes nuevos (20 s y 30 s) **también** siguen mordiendo. Restaurado
(`git status --porcelain src/shared/lib/auth/password.ts` → sin salida).

### Rotura 2 — `createDbClient` devuelve un cliente vacío

```ts
const sql = neon(url);
void sql;
return {} as NeonHttpDatabase; // REGLA 3: rotura deliberada y temporal
```

`pnpm exec vitest run src/shared/db/index.test.ts --reporter=verbose`:

```
 FAIL  src/shared/db/index.test.ts > shared/db client > exposes a configured Drizzle client when DATABASE_URL is set
AssertionError: expected 'undefined' to be 'function' // Object.is equality
Expected: "function"
Received: "undefined"
 ❯ src/shared/db/index.test.ts:26:32
     26|       expect(typeof db.select).toBe("function");

 FAIL  src/shared/db/index.test.ts > shared/db client > uses an explicit connection string when provided
AssertionError: expected 'undefined' to be 'function' // Object.is equality
 ❯ src/shared/db/index.test.ts:39:34

 Test Files  1 failed (1)
      Tests  2 failed | 2 passed (4)
   Duration  5.91s
```

El `it` cuyo tope subí (`exposes a configured Drizzle client…`) **es uno de los dos que caen**,
y cae por aserción. Restaurado (`git status --porcelain src/shared/db/index.ts` → sin salida).

## Estado

- Pasos 1-4 hechos. Paso 5 (verificación de cierre, `init.sh` x2) en curso.

## Paso 5 — Verificación de cierre

Ambas pasadas de `bash ./init.sh` **redirigidas a archivo** (no por tubería):
`C:/Users/USUARIO/AppData/Local/Temp/claude/C---dev-projects-knit-crochet/b2f7f089-bdec-4de6-befb-49d43c4da179/scratchpad/init-run1.txt` y `C:/Users/USUARIO/AppData/Local/Temp/claude/C---dev-projects-knit-crochet/b2f7f089-bdec-4de6-befb-49d43c4da179/scratchpad/init-run2.txt`.

### Pasada 1 (`bash ./init.sh > init-run1.txt 2>&1`) → **EXIT 0**, 303 s de reloj

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  77 passed | 3 skipped (80)
      Tests  1336 passed | 13 skipped (1349)
   Duration  240.96s (transform 19.70s, setup 194.16s, import 245.43s, tests 98.06s, environment 74.98s)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Pasada 2 → **EXIT 0**, 164 s de reloj

```
 Test Files  77 passed | 3 skipped (80)
      Tests  1336 passed | 13 skipped (1349)
   Duration  107.34s (transform 7.76s, setup 77.63s, import 92.73s, tests 57.01s, environment 45.26s)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**El objetivo se cumple exacto, sin residuo:** `Test Files 77 passed | 3 skipped (80)` ·
`Tests 1336 passed | 13 skipped (1349)` en **las dos** pasadas. 1333 + 3 = 1336, como decía
la aritmética del leader: los tres rojos eran el reloj, no lógica.

**Duraciones (lo que pide el punto 4):** 240.96 s vs **107.34 s** de vitest — un factor **2.2x**
entre la misma suite en frío y en caliente, con el mismo veredicto verde. Ése es exactamente
el punto de la deuda: antes esa varianza decidía el color de la puerta, ahora no.

### Pasada extra — con la máquina saturada A PROPÓSITO

Dos pasadas verdes seguidas pueden ser suerte, así que además corrí la suite con **4 procesos
Node quemando CPU en bucle** (la máquina tiene **4 núcleos**, o sea sobresuscripción del 100%):

```
 Test Files  77 passed | 3 skipped (80)
      Tests  1336 passed | 13 skipped (1349)
   Duration  104.94s
```

Verde. Los peores tiempos ahí: 2718 ms (`registers a user hashing…`), 2298 ms
(`verifies the right password…`), 1823 ms y 1700 ms (los dos logins de `auth-routes`) —
todos con muchísimo margen contra sus topes de 20/30 s.

**Matiz honesto sobre este experimento:** los 7501 ms del peor caso NO se reprodujeron aquí.
Comparando `import` entre pasadas (258 s en frío vs ~104 s en caliente), el factor dominante
de aquel pico **no era la contención de CPU sino el arranque en frío de la caché de
transformación de vite**. O sea: la carga de CPU y la caché fría son **dos** multiplicadores
distintos y pueden coincidir. Los topes están dimensionados contra el peor caso observado
(7501 ms, frío + cargado), no contra el mejor.

## Decisiones no obvias (para el reviewer)

1. **Toqué el tope global** (5000 → 10 000 ms), que la consigna permitía sólo con medición
   propia. La medición está arriba: el test genérico más lento bajo carga es 3219 ms, con 1.5x
   de margen sobre 5000. Si el reviewer prefiere dejar el global en el defecto, quitar esa
   línea **no rompe** los 4 archivos arreglados (tienen tope propio), pero devuelve el riesgo
   de parpadeo a los tests de axe/happy-dom del rango 2.5-3.3 s. Lo dejo explícito para que sea
   una decisión, no un descuido.
2. **Amplié el alcance a un cuarto archivo** (`auth-routes.test.ts`) que no estaba en la lista
   de rojos. Razón y números arriba. Sin él, la deuda quedaba saldada a medias.
3. **En `db/index.test.ts` usé tope por TEST, no por archivo.** El coste está en un solo `it`;
   los otros tres corren en milisegundos y merecen seguir fallando rápido si algún día cuelgan.
   Es la diferencia entre "este test es caro" y "este archivo es caro".
4. **No hay cambios en código de producción.** Verificado con `git status --porcelain` sobre
   `password.ts` y `db/index.ts` después de restaurar las dos roturas de la REGLA 3: sin salida.
5. `feature_list.json` **no se tocó** (esto es deuda, no feature). `progress/deudas.md` sí:
   la 145 queda **tachada con el "cómo"**, según el protocolo de la cabecera del libro mayor.

## Estado final

- Pasos 1-6 hechos. `bash ./init.sh` → **EXIT 0** en dos pasadas + una bajo carga forzada.
- Deuda 145 tachada en `progress/deudas.md` con el detalle de cómo se saldó.
- **Fuera de alcance, para el leader:** la suite tarda 105-240 s en una máquina de 4 núcleos y
  el grueso NO son los tests (57-98 s) sino `setup` + `import` + `environment` (~190 s en frío).
  No lo toco porque no es esta deuda, pero es el candidato obvio si alguien quiere la puerta
  más rápida.
