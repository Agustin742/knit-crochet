# Smoke test contra Neon real — deuda técnica #6

**Objetivo:** saldar la deuda #6 ("la app nunca ha hablado con una DB real").
Ejercitar el **código de producción real** de los stores/servicios Drizzle contra
Neon y verificar comportamientos que hasta ahora solo se probaron contra dobles
en memoria.

## Montaje

- Archivo nuevo: `src/__smoke__/neon.smoke.test.ts`, guardado por env flag
  `SMOKE_NEON`. En la corrida hermética normal queda **SKIPPED** y NO abre ninguna
  conexión (el cliente Drizzle se construye **perezosamente dentro de `beforeAll`**
  vía `createDbClient(url)`, nunca en el top-level del módulo).
- Ejercita los stores/servicios reales inyectándoles el cliente Neon real:
  `createProjectStore(db)`, `createCraftSessionStore(db)`, `createPatternStore(db)`,
  `createYarnStore(db)`, `createAuthUserStore(db)`, y los servicios
  `createProject/deleteProject/linkProjectYarn`, `startSession/stopSession`,
  `createPattern/deletePattern`, `createBrand/createYarnType/createYarn/deleteYarn/deleteBrand`.
- Usuario de prueba con email único `smoke+<timestamp>@knit.test`.
- Migración `drizzle/0000_cold_ben_urich.sql` ya aplicada (por el líder). NO se
  migró ni se generó nada aquí.
- Comando: `SMOKE_NEON=1 pnpm vitest run src/__smoke__/neon.smoke.test.ts`
  (exportando `DATABASE_URL` desde `.env`; el test también lo lee del `.env` como
  fallback).

## Resultado: 5/6 confirmados + **1 discrepancia doble-vs-Postgres (bug real)**

| # | Comportamiento | Resultado |
|---|----------------|-----------|
| 1 | stop → `sumDuration` numeric→number | ✅ confirmado |
| 2 | `deleteProject` → cascada `project_yarns` + `craft_sessions` | ✅ confirmado |
| 3 | `deletePattern` → `projects.patternId = null` (set null) | ✅ confirmado |
| 4 | UNIQUE `(brandId, colorCode)` → `DuplicateColorCodeError` | ❌ **FALLA — bug real** |
| 5 | `deleteYarn(force)` → borra enlace + lana | ✅ confirmado |
| 6 | `deleteBrand` con hijos → `BrandReferencedError` (409, no 500) | ✅ confirmado |

### Detalle de los confirmados

1. **`sumDuration` numeric→number (el punto exacto de #6):** proyecto + sesión de
   5 s cerrada. `stopSession().time === 5` con `typeof === "number"`;
   `craftStore.sumDuration() === 5` (number); `Project.time` persistido como number.
   Confirmado: `coalesce(sum(...),0)` vuelve `numeric` (string por el driver) y el
   `Number(...)` de `sumDuration` lo normaliza correctamente contra Postgres real.
2. **Cascada al borrar proyecto:** proyecto con lana enlazada (`project_yarns`) +
   sesión abierta. Tras `deleteProject`, `count(project_yarns)` y
   `count(craft_sessions)` para ese `projectId` = **0** (sin huérfanos). La lana
   **sobrevive** (`project_yarns → yarns` es referencia). `ON DELETE cascade` real
   validado.
3. **`set null` al borrar patrón:** proyecto creado con `patternId`. Tras
   `deletePattern`, el proyecto **sigue existiendo** con `patternId = null` en la DB
   real. `ON DELETE set null` validado.
5. **`deleteYarn(?force)`:** lana enlazada a un proyecto. `deleteYarn(force=true)`
   borra el enlace `project_yarns` (`no action`) y luego la lana. En la DB real:
   `count(project_yarns)` = 0 y la lana ya no existe.
6. **Borrado de catálogo bloqueado:** marca con tipo + lana colgando. `deleteBrand`
   lanza `BrandReferencedError` **antes** del `delete` (el conteo de hijos ocurre
   primero); la marca sigue existiendo. NO explota con un 500 de FK.

### ❌ Discrepancia (#4) — bug de producción confirmado por el smoke

`createYarn` con `(brandId, colorCode)` duplicado **NO** lanza
`DuplicateColorCodeError` contra Neon real: se propaga el error crudo del driver.

**Salida real del assert:**

```
AssertionError: expected Error: Failed query: insert into "yarns" … { …(2) }
  to be an instance of DuplicateColorCodeError
 ❯ src/__smoke__/neon.smoke.test.ts:288:6
```

**Causa raíz (forma real del error del driver, capturada empíricamente):**

```json
{
  "name": "Error", "ctor": "DrizzleQueryError",
  "code": undefined, "constraint": undefined,
  "keys": ["query","params","cause"],
  "cause": {
    "ctor": "NeonDbError",
    "code": "23505",
    "constraint": "yarns_brand_color_code_unique",
    "message": "duplicate key value violates unique constraint \"yarns_brand_color_code_unique\""
  }
}
```

- El driver `drizzle-orm/neon-http` envuelve el error de Postgres en un
  **`DrizzleQueryError`** cuyo `.code` y `.constraint` son `undefined` y cuyo
  `.message` es `"Failed query: insert into \"yarns\" ..."` (el nombre de la
  constraint **no** aparece en el texto del SQL parametrizado).
- El error real de Postgres (`NeonDbError` con `code: "23505"` y
  `constraint: "yarns_brand_color_code_unique"`) viaja en **`error.cause`**.
- `isDuplicateColorCode` (`src/features/yarns/api/store.ts`) solo inspecciona el
  error de **nivel superior** (`.code`, `.constraint`, `.message`) y **no
  desenvuelve `.cause`** → devuelve `false` → el `DrizzleQueryError` crudo se
  propaga sin traducir. En producción el BFF respondería **500 en vez de 409**.
- **Por qué los tests unitarios estaban verdes:** el doble en memoria imitaba la
  forma *plana* del error (`code`/`constraint` en el nivel superior), que sí
  reconoce la heurística. Postgres real tiene la información una capa más abajo.
  Es exactamente el punto flojo señalado en el review de #8: detección defensiva
  probada solo contra el doble.

**Fix propuesto (para enrutar como cambio de producción, fuera de esta tarea de
verificación):** en `isDuplicateColorCode` (`src/features/yarns/api/store.ts`)
inspeccionar recursivamente `error.cause` (el `NeonDbError`), no solo el error de
nivel superior. Afecta también a `updateYarn` (misma heurística). Debe llevar su
propio test — idealmente uno que simule la forma **anidada** (`{ cause: { code,
constraint } }`) además del smoke real. El assert #4 del smoke queda como **guardia
viva de la regresión**: seguirá en rojo hasta que se aplique el fix.

## Hallazgo del teardown ordenado (confirmado como esperado)

No hay transacción multi-statement en `neon-http` (driver single-statement), así
que el teardown es **explícito y ordenado**, no un rollback. Orden por las FKs
`no action`:

1. `projects` (cascada borra sus `project_yarns` y `craft_sessions`).
2. `yarns` (ya sin enlaces en `project_yarns` tras el paso 1).
3. `yarn_types` (por `brandId` de las marcas del usuario).
4. `brands`.
5. `patterns`.
6. `users`.

**Confirmado el hallazgo esperado:** borrar el `users` de prueba **en un solo
statement no sirve** cuando tiene catálogos colgando. `users → brands` es
`cascade`, pero `brands → yarn_types` y `brands → yarns` son `no action`: Postgres
intentaría borrar las marcas por cascada y fallaría por la FK de los tipos/lanas.
Por eso el teardown de catálogos debe ir en orden explícito (yarns → yarn_types →
brands) **antes** de borrar el usuario.

El `afterAll` corre **aunque falle el assert #4** (vitest ejecuta el teardown pese
al fallo), así que la limpieza siempre se completa.

## DB limpia (verificado post-run)

Conteo de las 8 tablas tras el smoke (consulta directa a Neon):

```
users            0
projects         0
patterns         0
brands           0
yarn_types       0
yarns            0
project_yarns    0
craft_sessions   0
leftover smoke users: []
```

El esquema (las 8 tablas de la migración real) permanece aplicado; solo se
limpiaron las FILAS de prueba. La DB estaba vacía y quedó vacía.

## Salida real del smoke (`SMOKE_NEON=1`)

```
 ❯ src/__smoke__/neon.smoke.test.ts (6 tests | 1 failed) 20614ms
     × 4. UNIQUE (brandId, colorCode) → DuplicateColorCodeError desde el driver real 1598ms
 FAIL  src/__smoke__/neon.smoke.test.ts > ... > 4. UNIQUE (brandId, colorCode) ...
 AssertionError: expected Error: Failed query: insert into "yarns" … to be an instance of DuplicateColorCodeError
 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
```

## Suite hermética intacta (`bash ./init.sh`, sin el flag)

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  25 passed | 1 skipped (26)
      Tests  242 passed | 6 skipped (248)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

El smoke aparece **skipped** (6 tests, 0 conexiones); los 242 tests herméticos
siguen verdes.

## Conclusión

La deuda #6 queda **mayormente saldada**: 5 de 6 comportamientos de la capa de
datos (cascadas, `set null`, `numeric→number`, borrado con `force`, bloqueo de
catálogo) están **confirmados contra Postgres real** — coinciden con lo que
imitaban los dobles. Pero el smoke destapó **una discrepancia real**: la detección
de duplicado `(brandId, colorCode)` **no funciona contra el driver Neon** (no
desenvuelve `error.cause`), lo que en producción daría 500 en vez de 409. Es un
**bug de producción** que requiere un fix enrutado (con su test), no parte de esta
tarea de verificación. El smoke queda en el repo (guardado por flag) como guardia
viva de la regresión.
