# impl — feature #17 `projects_detail_yarns`

> Slice de **backend puro** (no aplica el checklist visual del SDD §9). Salda la **deuda técnica 5**:
> `GET /api/projects/:id` no devolvía las lanas enlazadas.
> Fuentes: **PRD §9.1** (manda), PRD §9 (línea de `GET /api/projects/:id`), RFC-03 §1/§2/§3/§8,
> `docs/harness/architecture.md` (reglas de capas + S1/S2) y `conventions.md`.

---

## 1. Qué se construyó y dónde

| Archivo | Estado | Qué hace |
|---|---|---|
| `src/features/projects/types.ts` | modificado | Añade `LinkedYarn` (los **cinco** campos planos del contrato) y `ProjectDetail = { project, yarns }`. |
| `src/features/projects/api/store.ts` | modificado | Añade `listLinkedYarns(userId, projectId)` al tipo `ProjectStore` y su implementación Drizzle: **un solo** `SELECT` con tres `INNER JOIN` (`project_yarns → yarns → brands`/`yarn_types`), `WHERE` por `projectId` **y** `yarns.userId`, y `ORDER BY` total. |
| `src/features/projects/api/testing/in-memory-store.ts` | modificado | Extiende el doble: nuevo tipo exportado `InMemoryYarnRow = LinkedYarn & { userId }` (las filas de `store.yarns` ahora traen los campos del swatch, **obligatorios**), `listLinkedYarns` replicando filtro por dueño + orden, y `compareLinkedYarns` con el mismo criterio que el `ORDER BY`. |
| `src/features/projects/api/get-project.ts` | modificado | `getProject` pasa a devolver `ProjectDetail` (`{ project, yarns }`). El 404 por proyecto ajeno/inexistente **no se toca**. |
| `src/app/api/projects/[id]/route.ts` | modificado | El `GET` responde `NextResponse.json({ project, yarns }, { status: 200 })`. Sigue siendo fino: valida el id, delega y serializa. |
| `src/features/projects/api/store.test.ts` | **nuevo** | 4 tests sobre el **SQL real** emitido por `listLinkedYarns` (ver §3). |
| `src/features/projects/api/project-service.test.ts` | modificado | Actualiza la aserción de `getProject` (ahora `{ project: { id } }`) y añade 6 tests de comportamiento del detalle. |
| `src/app/api/projects/projects-routes.test.ts` | modificado | Añade el **ancla del contrato** (claves exactas) + 2 tests de payload; helper `seedLinkedYarn`. |
| `src/features/projects/api/project-actions.test.ts` | modificado | Las 3 filas de lana que sembraba ahora se construyen con un helper `yarnRow(id, userId)` (el doble exige los campos del swatch). |
| `src/app/api/projects/project-actions-routes.test.ts` | modificado | Íd. (2 filas). |
| `src/__smoke__/neon.smoke.test.ts` | modificado | El caso 2 (que ya crea marca, tipo, lana, proyecto y enlace) ahora comprueba **contra Neon real** que el JOIN devuelve las cinco claves, que **todos los valores son `string`** (deuda 7) y que tras el borrado en cascada la lista queda vacía. Sigue `skipped` sin `SMOKE_NEON=1`, y compila en el typecheck. |

**No se tocó** `GET /api/projects` (la lista), ni `feature_list.json`, ni `progress/deudas.md`.

Forma final de la respuesta (PRD §9.1):

```jsonc
{
  "project": { /* ProjectRecord, byte a byte como antes de #17 */ },
  "yarns": [ { "id": "…", "colorName": "…", "colorFamily": "blue",
               "brandName": "…", "typeName": "…" } ]
}
```

---

## 2. Decisiones no obvias (y por qué)

**D1 — `getProject` cambia de forma de retorno; no se añade un segundo servicio.**
Se comprobó **antes** quién lo llama: sólo `src/app/api/projects/[id]/route.ts` y
`project-service.test.ts` (búsqueda por `getProject` en todo el repo). La alternativa —dejar
`getProject` devolviendo `ProjectRecord` y añadir `listProjectYarns`— obligaba al Route Handler a
orquestar dos llamadas y a decidir qué hacer si la segunda no encuentra nada: eso es lógica de
negocio en el `route.ts`, prohibida por la regla de capas 2. Con un solo servicio hay **un solo
camino de 404** y el handler sigue siendo fino.

**D2 — El scoping se hace DOS veces, a propósito.** El servicio ya llamaba a `findById(userId, id)`
(que devuelve 404 para un proyecto ajeno), así que el JOIN sólo se ejecuta sobre un proyecto propio.
Aun así la consulta lleva `eq(yarns.userId, userId)`: `project_yarns` **no tiene dueño**, y un
scoping que depende de que el llamador haya comprobado algo antes se rompe el día que alguien
reutilice el método del store desde otro sitio. Cuesta un `AND` y lo cubre un test en las dos capas
(SQL y comportamiento).

**D3 — Orden `brands.name → yarn_types.name → yarns.color_name → yarns.id`.** Sin `ORDER BY`,
Postgres puede devolver las filas en cualquier orden (depende del plan) y el test sería *flaky*.
Se eligió el orden de **la etiqueta que pinta el tab Lanas** ("marca·tipo·colorName", RFC-03 §2):
es el único orden que un usuario puede predecir mirando la pantalla. El cuarto criterio, `id`, hace
el orden **total**: la unicidad de `yarns` es `(brandId, colorCode)`, así que dos lanas de la misma
marca, tipo y `colorName` son perfectamente legales y sin desempate alternarían de posición.
`project_yarns` no tiene `createdAt`, de modo que "orden de enlace" no era una opción.

**D4 — Los tres JOIN son `inner`.** `project_yarns.yarn_id`, `yarns.brand_id` y `yarns.type_id` son
FKs **NOT NULL**: un `inner join` no puede perder una lana enlazada, y a cambio garantiza que
`brandName`/`typeName` nunca son `null` (con `left join` el tipo del contrato mentiría).

**D5 — Una sola consulta (nada de N+1).** No se reutiliza `listYarnIds` + una búsqueda por lana:
las cinco columnas salen del mismo `SELECT`. Verificado en el test: el recorder registra
**exactamente 1** consulta.

**D6 — El doble en memoria exige los campos del swatch (no los inventa).**
`store.yarns` pasa de `{ id, userId }` a `InMemoryYarnRow`. Se descartó hacer los campos nuevos
opcionales con valores por defecto: un doble que fabrica datos deja pasar tests que la consulta real
no aprobaría. El precio son 5 siembras actualizadas en 2 archivos de test, resueltas con un helper
local `yarnRow(id, userId)` en cada uno.

**D7 — Deuda 7 (`numeric` → string) verificada, no supuesta.** Las cinco columnas son `uuid`, `text`
y un `pgEnum`; **no hay ningún agregado**, así que no hay `Number(...)` que hacer. Además el smoke
contra Neon comprueba `typeof === "string"` en los cinco valores, para que deje de ser una suposición
en cuanto alguien corra `SMOKE_NEON=1`.

**D8 — Cómo se testea el SQL real sin base de datos.** `store.test.ts` construye un Drizzle de
verdad con `createDbClient("postgresql://user:pass@localhost/neondb")` (el driver neon-http es
perezoso: sin `await` no abre conexión) y envuelve el query builder en un `Proxy` que intercepta
`then`, guarda `toSQL()` y resuelve con cero filas. Así se asertan **columnas, `WHERE`, parámetros,
`ORDER BY` y tipo de JOIN** sobre el SQL que se emitiría de verdad. Es el complemento necesario del
doble en memoria: el doble dice qué *devuelve* el store, este archivo dice qué *consulta*.

---

## 3. Los gates nuevos (y la regla 2)

**Regla 2 (a) — el ancla al literal, por duplicado:**

- **Claves del JSON** (`projects-routes.test.ts` → *"serializes the payload with exactly
  {project, yarns} and five keys per yarn"*): `Object.keys(body).sort()` es exactamente
  `["project","yarns"]` y `Object.keys(yarn).sort()` exactamente
  `["brandName","colorFamily","colorName","id","typeName"]`. Un `toContain` habría pasado con
  `colorCode` de más; un `toEqual` sobre las claves ordenadas **no**.
- **Columnas del SQL** (`store.test.ts` → *"selects exactly the five contract columns"*): la lista de
  columnas proyectadas es exactamente `yarns.id, yarns.color_name, yarns.color_family, brands.name,
  yarn_types.name`, en ese orden.

**Regla 2 (b) — todo lo demás deriva.** Los tests de comportamiento construyen el esperado desde la
fila sembrada (`swatchOf(yarn)`, `JSON.parse(JSON.stringify(project))`), no con literales copiados;
los ids esperados en los tests de orden salen de las variables de siembra.

---

## 4. Condición doble (regla 3) — salida real, en las dos direcciones

Cada mutación se aplicó al árbol de trabajo, se ejecutó el test, y se revirtió (el `git diff` final
está limpio de mutaciones; ver §5).

### Gate A — ancla de las cinco claves del JSON

**A1. Añadir un campo** (`colorCode: "MUTANT"` en la proyección del doble):

```
     × returns the linked yarns next to the project, not inside it 12ms
     × never leaks a yarn owned by another user through the link table 2ms
     × orders the yarns by brand, then type, then color name 4ms
       × serializes the payload with exactly {project, yarns} and five keys per yarn 11ms
       × returns the linked yarns without changing the project payload 9ms
 Test Files  2 failed (2)
      Tests  5 failed | 35 passed (40)
```

con el diff del ancla mostrando el sobrante:

```
      "brandName": "Alpaca Sur",
+     "colorCode": "MUTANT",
      "colorFamily": "blue",
```

**A2. Quitar un campo** (`typeName` fuera de la proyección del doble):

```
     × returns the linked yarns next to the project, not inside it 12ms
     × never leaks a yarn owned by another user through the link table 2ms
     × orders the yarns by brand, then type, then color name 3ms
       × serializes the payload with exactly {project, yarns} and five keys per yarn 14ms
       × returns the linked yarns without changing the project payload 6ms
 Test Files  2 failed (2)
      Tests  5 failed | 35 passed (40)
```

**A3. Restaurado → verde:**

```
 Test Files  2 passed (2)
      Tests  40 passed (40)
```

### Gate B — ancla de las cinco columnas del SQL

**B1. Añadir `colorCode: yarns.colorCode` a la proyección del store real:**

```
     × selects exactly the five contract columns 19ms
- Expected
+ Received
+   "yarns.color_code",
 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

**B2. Quitar `brandName: brands.name`:**

```
     × selects exactly the five contract columns 21ms
- Expected
+ Received
-   "brands.name",
 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

(Restaurado; el archivo vuelve a 4/4 verde en la corrida final de §6.)

### Gate C — orden determinista

**C1. Cambiar el `ORDER BY` real** (`.orderBy(asc(yarns.id))` en vez del orden del contrato):

```
     × orders deterministically by brand, type, color name and id 5ms
 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

**C2. Quitar el `.sort(compareLinkedYarns)` del doble** (los otros tests siguen verdes: sólo cae el
orden):

```
     × orders the yarns by brand, then type, then color name 10ms
     × breaks a tie between identical labels with the yarn id 1ms
 Test Files  1 failed (1)
      Tests  2 failed | 14 passed (16)
```

### Gate D — scoping cruzado

**D1. Quitar `eq(yarns.userId, userId)` del `WHERE` real:**

```
     × scopes the join by yarns.user_id, not only by the project id 8ms
 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

**D2. Quitar `row.userId === userId` del doble:**

```
     × never leaks a yarn owned by another user through the link table 8ms
+     "brandName": "Marca Ajena",
 Test Files  1 failed (1)
      Tests  1 failed | 15 passed (16)
```

La lana ajena aparece en el payload: es exactamente el agujero que el gate vigila.

### Gate E — el servicio consulta de verdad el store

`getProject` devolviendo `{ project, yarns: [] }` fijo (el caso "lista vacía" **no** lo detecta, y
está bien que no lo detecte; lo detectan los otros seis):

```
     × returns the linked yarns next to the project, not inside it 13ms
     × never leaks a yarn owned by another user through the link table 2ms
     × orders the yarns by brand, then type, then color name 3ms
     × breaks a tie between identical labels with the yarn id 1ms
       × serializes the payload with exactly {project, yarns} and five keys per yarn 14ms
       × returns the linked yarns without changing the project payload 6ms
 Test Files  2 failed (2)
      Tests  6 failed | 34 passed (40)
```

---

## 5. Cobertura del `acceptance` de la ficha

| Punto del acceptance | Dónde |
|---|---|
| 1. `GET /:id` incluye las lanas con datos suficientes para el swatch | `projects-routes.test.ts`: *"returns the linked yarns without changing the project payload"* (color, familia, marca, tipo) |
| 2. Scoping por `userId` **sin romper el resto del payload** | `project-service.test.ts`: *"never leaks a yarn owned by another user…"* + `store.test.ts`: *"scopes the join by yarns.user_id…"*; contrato intacto: `expect(body.project).toEqual(JSON.parse(JSON.stringify(project)))` |
| 3a. `:id` con lanas enlazadas las devuelve | `project-service.test.ts` + `projects-routes.test.ts` (ver arriba) |
| 3b. sin lanas devuelve **lista vacía** | *"returns an empty yarn list when the project has no linked yarns"* (`toEqual([])`, nunca `null` ni ausente) |
| 3c. acceso ajeno **404/401** | Ya existían: *"answers 401 on every endpoint without a session"* y *"answers 404 for a project owned by another user"*; se añade *"hides another user's project even when it has linked yarns"* (el 404 se mantiene **con** lanas enlazadas) |

---

## 6. Verificación

### `bash ./init.sh` (corrida final, completa)

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


 Test Files  54 passed | 3 skipped (57)
      Tests  590 passed | 13 skipped (603)
   Start at  15:15:51
   Duration  59.69s (transform 4.27s, setup 49.36s, import 50.95s, tests 30.14s, environment 16.10s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Contra la baseline del leader (53 archivos / 577 passed | 13 skipped):** +1 archivo
(`store.test.ts`) y **+13 tests** (4 de SQL + 6 de servicio + 3 de ruta). Los **3 smokes siguen
skipped** y siguen compilando (typecheck verde con el bloque nuevo dentro de `neon.smoke.test.ts`).

### `pnpm build`

```
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 13.0s
  Running TypeScript ...
  Finished TypeScript in 12.9s ...
  Collecting page data using 3 workers ...
  Generating static pages using 3 workers (0/15) ...
✓ Generating static pages using 3 workers (15/15) in 363ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
…
├ ƒ /api/projects/[id]
├ ƒ /api/projects/[id]/rounds
…
```

`git status` final: 13 archivos modificados + 1 nuevo (`src/features/projects/api/store.test.ts`).
Todas las mutaciones de la §4 están revertidas (comprobado con `git diff` sobre `store.ts`,
`in-memory-store.ts` y `get-project.ts`).

---

## 7. Deudas nuevas propuestas (el libro mayor tiene 71 fichas; **no** se tocó `deudas.md`)

**72 — El orden determinista se apoya en dos criterios de comparación distintos, y nadie los ha
enfrentado.** Postgres ordena `text` con la colación de la base (en Neon, típicamente `en_US.UTF-8`:
insensible a mayúsculas y a signos), mientras el doble en memoria compara por *code point*
(`"Z" < "a"`, `"a" < "á"`). Con los datos de prueba (ASCII, iniciales distintas) los dos coinciden,
así que **el test verde no prueba que coincidan siempre**: una marca "álamo" o "ZARA" puede salir en
un orden en producción y en otro en los tests. Se cierra midiéndolo con `SMOKE_NEON=1` sobre nombres
con acento y mayúsculas mezcladas, o forzando `COLLATE "C"` en el `ORDER BY`.

**73 — La corrida hermética nunca ejecuta el JOIN contra Postgres.** `store.test.ts` asierta el SQL
*emitido* (resuelve con cero filas) y el doble asierta el comportamiento; que ese SQL **devuelva
filas** sólo se comprueba en el smoke de Neon, que está `skipped` por defecto. Es el mismo patrón que
destapó la deuda 6: un SQL sintácticamente perfecto puede fallar en la DB real. Mitigado hoy porque
el smoke ya trae la aserción (§1), pero nadie la ejecuta en CI.

**74 — Dos formas distintas de "las lanas de un proyecto" en el mismo recurso.**
`GET /api/projects/:id` devuelve `yarns` (objetos de cinco campos) y `POST`/`DELETE
/api/projects/:id/yarns[/:yarnId]` devuelven `{ yarnIds }` (sólo ids). La UI de la tab Lanas va a
enlazar y necesitar los nombres al instante: o re-fetchea el detalle en cada enlace, o mantiene dos
representaciones en el estado. Decidirlo **antes** de #21, no durante.

**75 — El doble en memoria aplana los catálogos.** `InMemoryYarnRow` guarda `brandName`/`typeName`
copiados en cada lana, no tablas `brands`/`yarn_types`. Dos lanas de la misma marca pueden quedar con
nombres distintos en un test, y no hay forma de escribir un test tipo "renombro la marca y las dos
lanas cambian". El día que el detalle necesite `brandId` (p. ej. para filtrar el selector) el doble
se queda corto.

**76 — Asimetría de scoping dentro del mismo store.** `listLinkedYarns` recibe `userId` y lo aplica;
`listYarnIds(projectId)` sigue sin dueño y confía en que el servicio llamó antes a
`findById`/`findYarn`. Hoy es inofensivo (los dos llamadores lo hacen), pero es exactamente la
asimetría que abre un agujero cuando alguien reutiliza el método más barato. Unificar el criterio.

**77 — El *recording database* de `store.test.ts` depende de internos de Drizzle.** Intercepta
`then` y usa `toSQL()`, y asume que los métodos del query builder devuelven un objeto encadenable.
Es la técnica que hace posible testear el SQL real sin DB, pero una versión mayor de `drizzle-orm`
puede romperla de forma poco legible. Fichado para que quien vea ese fallo sepa que es
infraestructura de test, no producción.

---

## 8. Estado

Implementación terminada y verificada. **La feature #17 sigue en `in_progress`**: el implementer no
la marca `done` — queda a la espera del veredicto del reviewer.
