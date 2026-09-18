# impl — feature #18 `patterns_used_by`

> Slice de **backend puro**. No aplica el checklist visual del SDD §9 (no hay UI, ni RTL, ni axe).
> Fuente de verdad: **PRD §9.2** (decisión ya cerrada por el usuario) + PRD §9 (línea de `GET /api/projects`)
> + RFC-05 §3.

---

## 1. Qué se construyó y dónde

**Una sola cosa: un filtro más en la lista de proyectos.** `GET /api/projects?patternId=<id>` responde los
proyectos del usuario cuyo `pattern_id` es ese. Es literalmente el mismo mecanismo que `?yarnId=`, con **una
diferencia deliberada** que se explica abajo.

`GET /api/patterns/:id` **no se tocó** y sigue respondiendo `{ pattern }`. **`src/features/patterns/` no
tiene ni una línea modificada** (verificable en el `git diff --stat` de abajo): el corolario del §9.2 es que
el `PatternStore` no consulta `projects`, y no hizo falta ni acercarse.

### Producción (4 archivos, 22 líneas netas contando comentarios)

| Archivo | Qué se hizo |
|---|---|
| `src/features/projects/validation.ts` | `projectFiltersSchema` acepta `patternId: z.uuid("El patrón no es válido.").optional()`, **justo debajo de `yarnId`** y con la misma forma. |
| `src/features/projects/types.ts` | `ProjectFilters.patternId?: string`, con docstring que dice que es **columna directa (FK 1→N)** y que **es NULLABLE**. |
| `src/features/projects/api/store.ts` | En `list()`, una condición más: `eq(projects.patternId, filters.patternId)`. |
| `src/features/projects/api/testing/in-memory-store.ts` | El doble replica exactamente esa condición. |

**El Route Handler (`src/app/api/projects/route.ts`) NO se tocó, y eso es la prueba de que la decisión del
§9.2 era la barata.** Ya valida con `projectFiltersSchema` y delega en `listProjects`; el parámetro nuevo
entra solo. Lo mismo con `list-projects.ts`: cero cambios. La opción `usedBy` habría exigido un endpoint
nuevo, un servicio nuevo, un método nuevo en `PatternStore` y una dependencia invertida.

### Tests (3 archivos)

| Archivo | Qué se añadió |
|---|---|
| `src/features/projects/api/store.test.ts` | **4 tests nuevos** sobre el **SQL realmente emitido** por Drizzle para `list()`. Es el patrón que introdujo #17 y que el leader pidió copiar. |
| `src/app/api/projects/projects-routes.test.ts` | **8 tests nuevos** (2 anclas de contrato + 6 de comportamiento) y **2 tests existentes ampliados**. |
| `src/__smoke__/neon.smoke.test.ts` | El caso 3 ejercita el filtro **contra Postgres real** (sigue `skipped` por defecto). |

**+12 tests: 590 → 602.** Los archivos de test siguen siendo 54 (+3 skipped): no se creó ninguno nuevo, se
extendieron los que ya existían.

---

## 2. Decisiones que tomé (y por qué)

### 2.1 `eq(...)`, no `exists(...)` — la trampa que el leader marcó y que era real

`?yarnId=` usa un subquery `exists(...)` **porque la relación es N:N**: la pertenencia vive en la tabla de
enlace `project_yarns`, así que hay que preguntar "¿existe una fila de enlace…?". **`patternId` no es eso.**
Es la columna `projects.pattern_id`, una FK 1→N declarada en el propio `schema.ts` de projects. La condición
correcta es una comparación de columna:

```ts
if (filters.patternId !== undefined) {
  conditions.push(eq(projects.patternId, filters.patternId));
}
```

**Y esto no es una preferencia de estilo: está anclado por un test.** `store.test.ts` comprueba que el SQL
emitido **no contiene** `exists` **ni** `project_yarns`. Si alguien "unifica" los dos filtros copiando la
forma del de lanas, el test lo para. Copiar el `exists` habría funcionado (un subquery correlacionado sobre
la propia fila daría el mismo resultado), pero es un plan de ejecución peor y una mentira sobre la forma de
los datos.

### 2.2 El NULL se resuelve solo en SQL, pero **no** en el doble — y ahí es donde había riesgo

`pattern_id` es nullable. En Postgres, `pattern_id = $1` **descarta los NULL por definición** (`NULL = 'x'`
no es `true`, es `NULL`, y el `WHERE` sólo deja pasar `true`). Así que el store real es correcto **sin
escribir nada**.

**El peligro está en el doble**, donde un `!==` de JavaScript **sí** compara `null` con un string y podría
haberse escrito de una forma que los arrastrara. Lo dejé como la traducción literal del SQL
(`row.patternId !== filters.patternId` → descarta el `null`) y **lo anclé sembrando un proyecto sin patrón
en la misma corrida** de los dos tests de listado. La condición doble de abajo (mutación 3) demuestra que
ese caso **no es decorativo**: la variante que deja pasar los NULL tumba 2 tests.

### 2.3 "Patrón sin uso" y "patrón que no existe" son **indistinguibles a propósito**

Antes de decidir nada fui a mirar **qué hace hoy `?yarnId=`**, como pedía el encargo. Verificado en
`store.ts`: el filtro de lanas **no consulta la tabla `yarns`** en ningún momento, sólo el enlace. Es decir,
**una lana inexistente devuelve `200` con lista vacía**, no un `404`. Hice exactamente lo mismo: el filtro de
patrones **no consulta la tabla `patterns`**, así que un `patternId` sin uso, uno inexistente y uno ajeno son
**el mismo caso**: `200` + `[]`. Nunca un error.

Esto es coherente **y** es lo que salva la propiedad de seguridad: como el `WHERE` sólo mira
`projects.user_id`, **es imposible distinguir desde fuera un patrón ajeno de uno inexistente**, que es
justo lo que uno quiere de un filtro (no hay oráculo de existencia). El precio está fichado como
**deuda 80**.

### 2.4 `patternId` mal formado → **400**, igual que `yarnId`

También verificado antes de escribir nada: `?yarnId=123` responde **400** hoy (hay un test que lo cubre en
`projects-routes.test.ts`). Un uuid inválido es un error del cliente, no una lista vacía. `z.uuid()` en el
esquema de filtros lo produce solo, y `validationErrorResponse` devuelve el mensaje del primer issue como
`{ error }`. **No inventé ningún status nuevo.**

### 2.5 Las dos piezas de la REGLA 2

- **(a) Ancla.** Un test escribe a mano **la lista completa de nombres de parámetro** de la query string,
  porque **ahí el literal ES el contrato** (`readFilters` vuelca los `searchParams` tal cual en el esquema,
  así que las claves del esquema *son* los nombres públicos). Es un `toEqual` sobre las claves ordenadas, no
  un `toContain`: **falla en las dos direcciones**, si falta un filtro y si sobra uno (demostrado abajo con
  las dos mutaciones). Un segundo test ancla el **mensaje** `"El patrón no es válido."`, que es texto que ve
  el usuario.
- **(b) Derivación.** El test de comportamiento del 400 **no repite el mensaje**: lo saca del propio esquema
  para el mismo input y compara contra el body de la respuesta. Y los tests de listado asertan sobre **ids
  devueltos por los seeds**, nunca sobre nombres escritos a mano.

### 2.6 El smoke de Neon (adelanto parcial sobre la deuda 73, **que NO queda saldada**)

El caso 3 del smoke ya creaba un proyecto con `patternId` y comprobaba el `set null` al borrar el patrón.
Añadir el filtro ahí costó ~20 líneas y **cero infraestructura nueva**, así que se hizo:

- crea un segundo proyecto **sin patrón** y comprueba que `list(userId, { patternId })` devuelve **sólo** el
  que lo usa (el `NULL` medido contra Postgres de verdad, no contra mi traducción del `NULL` a JavaScript);
- comprueba que **con otro `userId` la misma consulta devuelve `[]`** — el scoping medido contra el motor;
- comprueba que **tras el `set null` el patrón borrado ya no lista nada**, encadenando el filtro nuevo con el
  comportamiento que el caso 3 ya probaba.

**Esto NO salda la deuda 73** y no lo vendo como tal: sigue apagado por defecto (`SMOKE_NEON`) y sólo cubre
`list` con `patternId`. El `@>` de jsonb de `needle`, el `exists` de `yarnId` y el rango de fechas **siguen
sin ejecutarse jamás contra Postgres** (deuda 82).

---

## 3. Condición doble — REGLA 3

Seis mutaciones, cada una aplicada al árbol real, ejecutada, y **restaurada** (la restauración está
verificada al final con `git diff`, no supuesta). **Los números son los que salieron, pegados tal cual.**

### Mutación 1 — se quita la condición del `WHERE` del store REAL

`store.ts`: `if (filters.patternId !== undefined)` → `if (false as boolean)`.

```
 ❯ src/features/projects/api/store.test.ts (8 tests | 2 failed) 31ms
     × adds the pattern condition next to the user scoping in the same WHERE 16ms
     × composes with the other filters and keeps the existing order 3ms

 FAIL  src/features/projects/api/store.test.ts > createProjectStore list SQL (filtro patternId, PRD §9.2) > adds the pattern condition next to the user scoping in the same WHERE
AssertionError: expected 'projects.user_id = $1' to be '(projects.user_id = $1 and projects.p…' // Object.is equality

Expected: "(projects.user_id = $1 and projects.pattern_id = $2)"
Received: "projects.user_id = $1"

 FAIL  src/features/projects/api/store.test.ts > createProjectStore list SQL (filtro patternId, PRD §9.2) > composes with the other filters and keeps the existing order
AssertionError: expected '(projects.user_id = $1 and projects.t…' to be '(projects.user_id = $1 and projects.t…' // Object.is equality

Expected: "(projects.user_id = $1 and projects.type = $2 and projects.pattern_id = $3)"
Received: "(projects.user_id = $1 and projects.type = $2)"

 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 38 passed (40)
```

> **⚠️ Lo importante de esta mutación no son los 2 rojos, son los 38 verdes.** Con el filtro **borrado de
> producción**, los 32 tests de ruta **siguieron pasando enteros**, porque corren sobre el doble en memoria.
> Es exactamente la **deuda 6** reproducida en vivo: sin `store.test.ts` esta slice se habría cerrado con
> todo verde y **el filtro roto contra Neon**. La lección de #17 no era retórica.

### Mutación 2 — se quita la condición del DOBLE en memoria

`in-memory-store.ts`: el `if` del filtro → `if (false as boolean)`.

```
       × lists the N projects that use the pattern, without those of another pattern or without pattern 9ms
       × answers an empty list, never an error, for a pattern with no projects 6ms
       × cannot discover anything through a pattern used only by another user 2ms
       × composes with the other filters, narrowing instead of replacing them 2ms
 Test Files  1 failed | 1 passed (2)
      Tests  4 failed | 36 passed (40)
```

### Mutación 3 — el filtro arrastra los `NULL` (la trampa de §2.2)

`in-memory-store.ts`: se añade `row.patternId !== null &&` a la condición, para que un proyecto **sin
patrón** se cuele.

```
       × lists the N projects that use the pattern, without those of another pattern or without pattern 7ms
       × answers an empty list, never an error, for a pattern with no projects 3ms
 Test Files  1 failed (1)
      Tests  2 failed | 30 passed (32)
```

### Mutación 4 — se quita el scoping por `userId` (en producción **y** en el doble)

`store.ts`: `eq(projects.userId, userId)` → una condición tautológica. `in-memory-store.ts`:
`row.userId === userId` → `row.userId === userId || true`.

```
     × adds the pattern condition next to the user scoping in the same WHERE 15ms
     × does not touch the query when there is no patternId filter 2ms
     × composes with the other filters and keeps the existing order 2ms
       × never lists projects of other users 9ms
       × never lists another user's project that uses the same pattern 2ms
       × cannot discover anything through a pattern used only by another user 2ms
 Test Files  2 failed (2)
      Tests  6 failed | 34 passed (40)
```

Caen **las dos direcciones del scoping cruzado** que pedía el encargo: *"con el `patternId` propio no salen
proyectos de otro usuario"* y *"con el `patternId` de un patrón ajeno no se descubre ningún proyecto"*. Y
caen también los 3 tests de SQL, porque el `userId` está anclado **dentro del mismo literal de `WHERE`** que
la condición nueva: no se puede tocar uno sin que el otro se entere.

### Mutación 5 — el filtro **reemplaza** los demás en vez de componerse

`in-memory-store.ts`: `if (filters.patternId !== undefined) return row.patternId === filters.patternId;` como
primera línea del predicado (el bug clásico de "early return").

```
       × composes with the other filters, narrowing instead of replacing them 6ms
 Test Files  1 failed (1)
      Tests  1 failed | 31 passed (32)
```

Cae **sólo** ese test, que es lo correcto: el resto de filtros siguen funcionando aislados, y lo único roto
es la composición. El test siembra 4 proyectos donde cada uno falla **un** criterio distinto
(`patternId` + `type` + `active`), así que ninguno de los tres puede ignorarse sin que se cuele una fila.

### Mutación 6 — el ancla del contrato, **en las dos direcciones**

**6a — falta un nombre:** se borra `patternId` de `projectFiltersSchema`.

```
       × accepts exactly the filter names of the documented query string 6ms
       × rejects a malformed patternId with the message of the contract 2ms
       × answers 400 on an invalid filter instead of ignoring it 4ms
       × lists the N projects that use the pattern, without those of another pattern or without pattern 2ms
       × answers an empty list, never an error, for a pattern with no projects 3ms
       × cannot discover anything through a pattern used only by another user 1ms
       × composes with the other filters, narrowing instead of replacing them 1ms
       × answers 400 with the schema message for a malformed patternId 1ms
 Test Files  1 failed (1)
      Tests  8 failed | 24 passed (32)
```

**6b — sobra un nombre:** se restaura `patternId` y se añade un filtro que **no** está en el contrato
(`inLibrary`, robado del esquema de patrones).

```
       × accepts exactly the filter names of the documented query string 8ms
- Expected
+ Received
+   "inLibrary",
 Test Files  1 failed (1)
      Tests  1 failed | 31 passed (32)
```

**Esta es la mitad que un `toContain` no habría visto** (nota de la regla 3 en `current.md`): con
`toContain` el 6b habría pasado en verde con un parámetro público inventado colado en el contrato.

---

## 4. Verificación

### `bash ./init.sh`

```
── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (32 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  54 passed | 3 skipped (57)
      Tests  602 passed | 13 skipped (615)
   Start at  16:55:55
   Duration  70.06s (transform 5.39s, setup 54.53s, import 68.53s, tests 33.94s, environment 17.10s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Baseline del leader: 54 archivos + 3 skipped, 590 passed | 13 skipped.**
**Ahora: 54 archivos + 3 skipped, 602 passed | 13 skipped.** → **+12 tests, 0 archivos nuevos, 0
regresiones, los 3 smokes siguen skipped** (y siguen compilando: el typecheck está verde y el `pnpm build`
corre TypeScript sobre todo `src/**`).

### `pnpm build`

```
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 16.2s
  Running TypeScript ...
  Finished TypeScript in 16.1s ...
  Collecting page data using 3 workers ...
✓ Generating static pages using 3 workers (15/15) in 831ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
...
├ ƒ /api/projects
├ ƒ /api/projects/[id]
...
└ ○ /register

ƒ Proxy (Middleware)
```

### Árbol de trabajo (prueba de que las 6 mutaciones están revertidas y de que patterns no se tocó)

```
$ git diff --stat
 docs/design/rfc/RFC-05-patrones.md                 |   2 +-
 docs/product/PRD-01-estructura-funcional.md        |  24 ++-
 feature_list.json                                  |   2 +-
 progress/current.md                                |  13 +-
 src/__smoke__/neon.smoke.test.ts                   |  27 ++++
 src/app/api/projects/projects-routes.test.ts       | 170 ++++++++++++++++++++-
 src/features/projects/api/store.test.ts            |  66 ++++++++
 src/features/projects/api/store.ts                 |   6 +
 .../projects/api/testing/in-memory-store.ts        |   9 ++
 src/features/projects/types.ts                     |   6 +
 src/features/projects/validation.ts                |   1 +
 11 files changed, 321 insertions(+), 5 deletions(-)
```

Los 4 primeros son del leader (PRD §9.2, RFC-05, `feature_list.json` en `in_progress`) más mi nota de plan en
`current.md`. **`src/features/patterns/` no aparece.** `next-env.d.ts` tampoco quedó tocado tras el build.

---

## 5. Acceptance de la ficha, punto por punto

| # | Criterio | Dónde queda cubierto |
|---|---|---|
| 1 | Se puede obtener los proyectos con `patternId = :id`, **vía filtro `?patternId=`** | `store.ts` (`eq`), anclado en SQL por `store.test.ts` y en comportamiento por *"lists the N projects that use the pattern…"* |
| 2 | Scoping por `userId` | `eq(projects.userId, userId)` sigue en el mismo `WHERE` (anclado literalmente en el SQL). Dos tests de ruta cubren **las dos direcciones**; el smoke lo mide contra Postgres. Mutación 4 lo demuestra. |
| 3 | Tests: patrón usado en **N** proyectos los lista | *"lists the N projects that use the pattern, without those of another pattern or without pattern"* — 2 proyectos con el patrón, 1 con otro, 1 **sin patrón**; comprueba además que **se conserva el orden `startDate` descendente**. |
| 3 | Tests: patrón **sin uso** devuelve vacío | *"answers an empty list, never an error, for a pattern with no projects"* — cubre el patrón sin uso **y** uno inexistente, y comprueba que la fila sembrada sigue en el store (la lista vacía es del filtro, no de un store vacío). |

**Fuera de scope y no tocado:** `GET /api/patterns/:id`, todo `src/features/patterns/`, el Route Handler de
projects, `list-projects.ts` y la deuda 76 (la asimetría de scoping del store) — **ni saldada ni agravada**:
el método que toqué es `list`, que ya recibía y aplicaba `userId`.

---

## 6. Deudas nuevas propuestas (desde la **80**; hoy `deudas.md` tiene 79)

> No las escribí en `progress/deudas.md` (no me corresponde). Van aquí para que el leader las vuelque.

**80. El filtro `?patternId=` no puede distinguir "sin uso" de "no existe" ni de "ajeno", y por tanto la UI
tampoco.** Los tres casos responden `200` + `[]`. Es **coherente a propósito** con `?yarnId=` (verificado: el
filtro de lanas tampoco consulta la tabla `yarns`) y es lo que impide que el endpoint funcione como oráculo
de existencia de patrones ajenos — o sea, la ambigüedad es **la mitad buena de la propiedad de seguridad**.
**Escenario de fallo concreto:** el drawer de patrón de RFC-05 §2 pinta "usado en"; si el patrón fue borrado
en otra pestaña, el drawer dirá *"no se usa en ningún proyecto"* en vez de *"ese patrón ya no existe"*. El
usuario leerá un dato falso, no un error. **Arreglo posible sin romper S1:** el servicio `listProjects`
podría comprobar el patrón antes (projects **puede** depender de patterns, la dirección legal del DAG) y
devolver `404`. **Es una decisión de producto, no un bug**: decidirla cuando se implemente el drawer (#26).

**81. El ancla de SQL emitido sólo cubre 2 de los 7 filtros de `list`.** `store.test.ts` fija ahora el `WHERE`
para `patternId` (y, de rebote, para `type` y el scoping). **Siguen sin ancla de SQL** los dos filtros con la
forma **más frágil**: el `@>` de jsonb de `needle` y el `exists(...)` correlacionado de `yarnId`, más el
rango `gte`/`lte` de fechas. **Escenario de fallo concreto:** son justo los que el doble en memoria traduce a
JavaScript de forma menos literal (`Array.includes` no es `@>`; un `some()` no es un subquery correlacionado)
y por tanto los que más se parecen a la **deuda 6**. **Arreglo: ~30 líneas**, reutilizando el
`recordListQuery` que esta slice acaba de dejar escrito.

**82. La deuda 73 queda ADELANTADA sólo para `list` con `patternId`, y sigue abierta para el resto.** El
smoke de Neon ahora ejecuta el filtro nuevo contra Postgres real (filas de verdad, no SQL bien formado) e
incluye el scoping cruzado. Pero **sigue `skipped` por defecto** y **el resto de `list` nunca se ejecuta
contra el motor**. Se ficha aparte para que nadie lea "el smoke ya cubre `list`" y dé por saldada la 73.
**Arreglo:** ampliar el caso 3 del smoke con `needle`, `yarnId` y el rango de fechas, en una sola corrida.

**83. Nada impide que un proyecto apunte al `patternId` de OTRO usuario, porque la escritura no lo
comprueba.** Verificado leyendo el código, no supuesto: `createProject`/`updateProject` pasan `patternId` al
store **sin validarlo**, mientras que enlazar una lana **sí** exige `findYarn(userId, yarnId)` antes. Sólo lo
tapa hoy que la FK obliga a que el patrón **exista** — no a que sea del usuario. **Esto NO es un agujero del
filtro** (la lectura sólo devuelve proyectos propios, jamás filas ajenas), pero **sí un agujero del modelo**:
un cliente puede grabar en su proyecto una referencia a un patrón que no puede ni leer, y cuando el patrón
ajeno se borre, su proyecto cambiará solo (`set null`). **Es hermana de la 78** (invariante de escritura
ausente en vez de invariante de escritura no replicada en lectura) y **es deuda preexistente de #5/#10, no
introducida por #18**. **Arreglo: un `assert-pattern-ref.ts` calcado de `assert-yarn-refs.ts`.** Lo levanto
aquí porque esta slice es la primera que hace de `projects.pattern_id` una **superficie pública de consulta**.
