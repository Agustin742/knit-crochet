# Review — feature #17 `projects_detail_yarns`

**Veredicto:** APPROVED · **0 bloqueantes**

> Slice de **backend puro**: no se aplica el checklist visual del SDD §9 (no hay UI, ni RTL, ni axe).
> Su ausencia **no** se penaliza.
> Revisado contra: PRD §9 y **§9.1** (manda), ficha #17 de `feature_list.json`, RFC-03 §1/§2/§3/§8,
> `docs/harness/architecture.md`, `conventions.md`, `verification.md`, `CHECKPOINTS.md`.

---

## 0. Resumen

La feature hace lo que la ficha pide y lo hace bien. **Las cuatro decisiones cerradas por el usuario se
cumplen las cuatro**, verificadas una a una contra el código, no contra el informe. **No encontré ninguna
fuga de scoping.** El orden **es total**. El doble en memoria **no le está mintiendo a los tests** en nada
que esta feature pueda romper, y el punto donde sí es ciego (los catálogos) está tapado por una invariante
de escritura que **comprobé en el código**, no supuesta.

Lo que eleva esta slice por encima de la media: el implementer no se conformó con el doble en memoria.
Añadió `src/features/projects/api/store.test.ts`, que asierta el **SQL realmente emitido** por Drizzle. Es
la respuesta directa al precedente de la deuda 6 (el doble imitando una forma que Postgres no tenía) y es
lo que permite que el ancla de las cinco columnas, el `WHERE` del scoping, el `ORDER BY` y el tipo de JOIN
estén fijados **sobre producción**, no sobre la réplica.

**Verificación reproducida por mí, no aceptada del informe:** `bash ./init.sh` verde, `pnpm build` OK, los
denominadores por archivo contados, y **7 mutaciones deliberadas** ejecutadas con mi propio arnés.

---

## 1. Checkpoints

- **C1:** [x] Existen `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md` y los 3 docs de
  `docs/harness/`. `bash ./init.sh` termina en **exit code 0**.
- **C2:** [x] Exactamente **una** feature en `in_progress` (#17, correcto: la cierra el leader).
  `progress/current.md` describe la sesión activa, sin basura de sesiones anteriores.
- **C3:** [x] Capas respetadas (detalle en §5). Feature-first. **Cero dependencias nuevas**
  (`package.json` y `pnpm-lock.yaml` sin tocar). Sin `console.log` de debug ni TODOs sin contexto.
  Sin secretos.
- **C4:** [x] `pnpm lint` y typecheck verdes; **590 passed | 13 skipped**, todos verdes.
- **C5:** [x] `git status --porcelain` **idéntico** al inicio de mi revisión: sin temporales, sin
  artefactos de build, sin mutaciones olvidadas. #17 sigue en `in_progress`, que es su estado correcto
  mientras espera veredicto. *(La entrada de `progress/history.md` de **esta** sesión la escribe el leader
  al cerrar; la de la sesión anterior —deuda 59 y #16— está puesta.)*

---

## 2. Las cuatro decisiones del usuario — cumplimiento verificado

### D1 — Clave HERMANA, y `project` byte a byte

**CUMPLE.** `src/app/api/projects/[id]/route.ts:38-39` desestructura y responde `{ project, yarns }`.
`project` sale de `store.findById`, que es un `select()` sin proyección (`store.ts:112-118`): es la fila
entera, exactamente un `ProjectRecord`. **No se le coló ningún campo**, y lo comprobé de dos maneras:

- `types.ts:26-29`: `ProjectDetail = { project: ProjectRecord; yarns: LinkedYarn[] }`. El tipo no miente.
- `projects-routes.test.ts:398-400`: `expect(body.project).toEqual(JSON.parse(JSON.stringify(project)))`
  — igualdad **exacta** contra la fila sembrada, no `toMatchObject`. Un campo de más o de menos rompe.
- `projects-routes.test.ts:388`: `Object.keys(body).sort()` es exactamente `["project","yarns"]`. Una
  tercera clave de nivel superior tampoco pasaría.

### D2 — Exactamente CINCO campos planos, ni uno más

**CUMPLE.** `colorCode` e `image` **no se colaron** en ninguna capa: lo verifiqué en el tipo
(`types.ts:18-24`), en la proyección real (`store.ts:173-179`), en el doble
(`in-memory-store.ts:204-224`) y en el JSON de salida. Las **dos** anclas exigen igualdad exacta, así que
detectan **lo que sobra**, no solo lo que falta — es la mitad que el encargo pedía comprobar, y está:

- **Claves del JSON** (`projects-routes.test.ts:390-396`): `Object.keys(yarns[0]).sort()` `toEqual` la
  lista literal de cinco. Reproducido: **añadir** `colorCode` al doble -> **5 rojos**; **quitar**
  `typeName` -> **5 rojos**.
- **Columnas del SQL** (`store.test.ts:93-103`): la lista proyectada, extraída del SQL emitido,
  `toEqual` `["yarns.id","yarns.color_name","yarns.color_family","brands.name","yarn_types.name"]`.
  Reproducido: añadir `colorCode: yarns.colorCode` a la proyección real -> rojo, con
  `+ "yarns.color_code"` en el diff.

> **Detalle fino que conviene saber:** el ancla del JSON corre contra el **doble**, así que fija la
> proyección del doble y la serialización, no los **alias** del store real. Esos los fija el tipo de
> retorno `Promise<LinkedYarn[]>` de `createProjectStore` (renombrar `brandName` -> `brand` da error de
> tipos), y la **columna** sobrante la caza el ancla del SQL. La cobertura es completa, pero está
> repartida entre tres mecanismos (ancla JSON + ancla SQL + TypeScript). No es un defecto; es algo que el
> siguiente que toque esto tiene que saber para no romperlo a medias.

### D3 — Sin lanas, `yarns` es `[]`

**CUMPLE**, y está testeado en las dos capas con `toEqual([])` (nunca `null`, nunca ausente):
`project-service.test.ts:248-255` y `projects-routes.test.ts:403-410`.

### D4 — `GET /api/projects` (la lista) NO las lleva

**CUMPLE.** El `git diff` no toca `src/app/api/projects/route.ts` ni `list-projects.ts` ni el método
`list` del store. Verificado por ausencia en `git status --porcelain`.

---

## 3. El foco de riesgo, punto por punto

### 3.1 Scoping — **no hay fuga**

Es el riesgo nº 1 del encargo y es donde más miré. **No encontré ningún agujero.**

La defensa es doble y las dos mitades existen de verdad:

1. **El servicio sigue guardando la puerta.** `get-project.ts:20-23` llama a `store.findById(userId, id)`
   y lanza `ProjectNotFoundError` **antes** de tocar el JOIN. Un proyecto ajeno no llega nunca a la
   consulta de lanas.
2. **La consulta se defiende sola.** `store.ts:184-186`:
   `and(eq(projectYarns.projectId, projectId), eq(yarns.userId, userId))`. Esto es lo que faltaba y es lo
   correcto: `project_yarns` **no tiene `userId`**, y un scoping que depende de que el llamador haya
   comprobado algo antes se rompe el día que alguien reutilice el método.

**Las dos preguntas concretas del encargo:**

- **¿Y si un proyecto de A tiene enlazada una lana que dejó de ser de A?** El `INNER JOIN` con
  `eq(yarns.userId, userId)` **la descarta**: desaparece de la lista. Falla **cerrado**, que es la
  dirección segura. Nunca se devuelve inventario de otro.
- **¿Y si el `projectId` es de otro usuario?** El servicio ya lanzó 404 y la consulta no se ejecuta. Y si
  alguien llamara al método del store directamente con un `projectId` ajeno, sólo podría obtener lanas
  **propias** enlazadas a ese proyecto — filas que la API no permite crear (`linkYarn` comprueba los dos
  extremos). Sin ruta de fuga.

**Hay test con filas de un segundo usuario, y en las dos capas:**
`project-service.test.ts:259-275` siembra una lana de `user-2` (`brandName: "Marca Ajena"`), la enlaza al
proyecto de `user-1` **y la pone primera** en el orden de enlace, y exige que el resultado sea sólo la
propia. `store.test.ts:105-112` fija el `WHERE` y los parámetros del SQL real.

**Lo verifiqué rompiéndolo, no leyéndolo:**

| Mutación | Resultado |
|---|---|
| Quitar `eq(yarns.userId, userId)` del `WHERE` real | `× scopes the join by yarns.user_id, not only by the project id` -> **1 failed \| 3 passed (4)** |
| Quitar `row.userId === userId` del doble | `× never leaks a yarn owned by another user through the link table` -> **1 failed \| 67 passed (68)** |

**Invariante viejo intacto:** un proyecto ajeno sigue siendo **indistinguible de uno inexistente**.
`projects-routes.test.ts:153-169` (404 + `{ error: "El proyecto no existe." }`) sigue verde, y se añade
`project-service.test.ts:277-287`, que lo comprueba **con lanas enlazadas** — que era justo el caso nuevo
que podía haber abierto una diferencia observable. **Acceptance 3c completo**, con el 401 de
`projects-routes.test.ts:135-151` cubriendo `GET /:id` explícitamente (línea 142).

**Observación no bloqueante (defensa en profundidad):** el JOIN a `brands` y `yarn_types` **no** lleva
`eq(brands.userId, userId)`. Hoy **no es explotable**, y esto lo verifiqué en el código, no lo supuse:
`src/features/yarns/api/assert-yarn-refs.ts:18-25` obliga, en cada `create`/`update` de lana, a que
`brandId` sea una marca **del usuario** y `typeId` un tipo **de esa marca**. Es decir, `brandName` y
`typeName` sólo pueden salir del catálogo propio. Pero el scoping de los catálogos es una **invariante de
escritura**, no un filtro de lectura, y un `AND` más lo haría independiente de esa invariante. Cuesta una
línea. **No bloquea.**

### 3.2 Orden determinista — **sí es total, y está testeado**

`store.ts:187-192`: `brands.name` -> `yarn_types.name` -> `yarns.color_name` -> `yarns.id`.

**Es total**: `yarns.id` es la **PK** (`yarns` schema: `uuid("id").primaryKey()`), luego es único y **no
puede haber empates**. El cuarto criterio no es decorativo: la unicidad de `yarns` es
`(brandId, colorCode)` (constraint `yarns_brand_color_code_unique`), así que dos lanas con la misma
marca, tipo y `colorName` son **perfectamente legales** — sin desempate el test sería *flaky*. El
razonamiento del implementer es correcto y lo confirmé contra el schema.

Además el criterio elegido no es arbitrario: es el texto *"marca·tipo·colorName"* que pinta el tab Lanas
(RFC-03 §2), o sea el único orden que un usuario puede predecir mirando la pantalla.

**Verificado rompiéndolo:**

| Mutación | Resultado |
|---|---|
| Quitar `asc(yarns.id)` (orden **no total**) | `× orders deterministically by brand, type, color name and id` -> **1 failed \| 19 passed (20)** |
| Quitar el `.orderBy(...)` **entero** | **2 failed \| 2 passed (4)** — cae también el test de scoping, porque el `WHERE` deja de tener frontera. No hay falso verde por aritmética de `indexOf`, que era mi sospecha al leer el helper `section()`. |

**¿El doble ordena igual que el SQL?** Con los datos de los tests, **sí**, y lo comprobé pareja a pareja:
`"Alpaca Sur"`/`"Bergamota"`, `"Doble"`/`"Fina"`, `"Azul"`/`"Rojo"` — todas ASCII con iniciales distintas,
donde el orden por *code point* del doble y la colación de Postgres **coinciden**. El desempate por `id`
usa UUIDs en minúscula, cuyo orden lexicográfico como texto **es** el orden de bytes del tipo `uuid`.
El test **no miente sobre lo que hará Postgres** con estos datos.

Donde podrían divergir es fuera del alcance de los datos sembrados (acentos, mayúsculas mezcladas: en
`en_US.UTF-8` `"álamo"` y `"ZARA"` no caen donde el *code point* los pone). **El implementer lo fichó él
mismo como deuda propuesta 72**, con el arreglo escrito. Es la actitud correcta: no lo vendió como
probado. **No bloquea** — el orden es determinista en las dos implementaciones; lo indeterminado es su
*coincidencia* en un caso que hoy ningún test ejerce.

### 3.3 El doble en memoria — dónde es ciego, y si importa

Fui a buscar exactamente lo que el encargo pedía: qué diferencia entre el doble y el SQL real podría dejar
esto **verde y roto**. Lo que encontré:

| Riesgo | Veredicto |
|---|---|
| **Orden** | Cubierto por los dos lados: el doble por `compareLinkedYarns`, el SQL por el ancla del `ORDER BY`. Divergencia sólo por colación -> deuda 72. |
| **Nulos** | **Imposible que mienta.** Las cinco columnas son `notNull` en el schema (`color_name`, `color_family`, `brands.name`, `yarn_types.name`, `id`). El tipo `LinkedYarn` con cinco `string` **no miente**. |
| **INNER JOIN a `brands`/`yarn_types`** | **El punto ciego real** (ver 3.5): el doble guarda `brandName`/`typeName` **aplanados** en la fila, no tablas. Nunca podrá ejercer ese JOIN. Tapado por construcción, no por el doble. |
| **Tipos que el driver devuelve como string (deuda 7)** | **No aplica, y está comprobado, no supuesto.** Las cinco columnas son `uuid`, `text` y un `pgEnum`; **no hay ningún agregado**, que es de donde nacía la deuda 7. Además el smoke añade `expect(typeof value).toBe("string")` sobre los cinco. |
| **INNER JOIN `project_yarns -> yarns`** | El doble lo replica fielmente (`find` + `flatMap` que descarta si no hay lana) y la PK compuesta garantiza una fila por enlace en los dos lados. |

**Qué mide exactamente `store.test.ts`, que era la pregunta directa del encargo:** **no ejecuta SQL contra
una base de datos.** Construye un Drizzle real con `createDbClient(...)` (el driver `neon-http` es
perezoso: sin `await` no abre conexión), envuelve el query builder en un `Proxy` que intercepta `then`,
guarda `toSQL()` y **resuelve con cero filas**. O sea: **asierta la cadena SQL que se emitiría**, con sus
parámetros. **No** inspecciona el objeto que construye Drizzle — asierta su `toSQL()`, que es el texto que
viajaría a Postgres.

Eso es **mucho más** que el doble (fija columnas, `WHERE`, parámetros, `ORDER BY` y tipo de JOIN sobre
**producción**), y es **menos** que ejecutar: un SQL sintácticamente perfecto puede fallar en la DB real —
que es literalmente lo que pasó en la deuda 6. **El implementer lo fichó como deuda propuesta 73 con ese
mismo argumento**, y no lo presentó como equivalente a correr contra Neon. Correcto.

**Mitigación efectiva:** el smoke `src/__smoke__/neon.smoke.test.ts:189-207` ya trae la aserción contra
**Neon real** — las cinco claves exactas, los cinco valores `string`, y la lista vacía tras el borrado en
cascada. Sigue `skipped` (init.sh: **3 skipped**) y **compila** (typecheck verde). Es el caso 2, el que ya
crea marca, tipo, lana, proyecto y enlace, así que la aserción cae donde tenía que caer. El día que alguien
corra `SMOKE_NEON=1`, la deuda 73 se salda sola.

### 3.4 N+1 — es **una sola** consulta

`store.ts:171-193`: un único `SELECT` con tres `innerJoin`. No hay `listYarnIds` + búsqueda por lana.
Y no es una afirmación: `store.test.ts:80` hace `expect(queries).toHaveLength(1)` dentro del helper
`recordLinkedYarnsQuery()`, que usan **los cuatro** tests del archivo. Si mañana alguien lo convierte en
N+1, caen los cuatro.

(`getProject` hace 2 viajes en total: `findById` + el JOIN. Eso es lo correcto — el 404 tiene que decidirse
antes —, y no es N+1: no crece con el número de lanas.)

### 3.5 INNER vs LEFT JOIN — **correcto por construcción, y lo verifiqué**

El encargo pedía distinguir "correcto por construcción" de "suposición sin red". **Es por construcción, y
fui a mirar el schema en vez de fiarme del comentario:** en `src/features/yarns/schema.ts`,
`yarns.brandId` (líneas 41-43) y `yarns.typeId` (44-46) son `.notNull().references(...)`, y
`project_yarns.yarnId` también es `notNull`. Una lana enlazada **no puede** carecer de marca o de tipo, así
que el `INNER JOIN` **no puede** hacerla desaparecer en silencio. Y a cambio garantiza que
`brandName`/`typeName` nunca son `null`, que es lo que permite que `LinkedYarn` los declare `string` sin
mentir. Con `LEFT JOIN` el tipo del contrato sería falso.

**La red que no hay:** si algún día una de esas FKs pasara a nullable, la desaparición silenciosa volvería
y **el doble no se enteraría**, porque no modela `brands` ni `yarn_types` (guarda los nombres aplanados).
El único guardián sería `store.test.ts:122-134`, que fija `inner join` y exige
`expect(text).not.toContain("left join")`. Es una red fina pero real y está puesta. El implementer fichó
el aplanamiento del doble como deuda propuesta 75. **No bloquea.**

### 3.6 Regla 2 — las dos piezas

**(a) Ancla que fija las CINCO claves exactas: sí, y detecta lo que SOBRA.** Es exactamente el matiz que
el encargo señalaba: un `toContain` habría pasado con `colorCode` de más. Aquí son
`Object.keys(...).sort()` con `toEqual` contra una lista literal, y una segunda ancla equivalente al nivel
del SQL. **Comprobado en las dos direcciones por mí** (añadir -> rojo; quitar -> rojo).

**(b) Los tests de comportamiento DERIVAN, no copian.** `swatchOf(yarn)` construye el esperado desde la
fila sembrada (`project-service.test.ts:190-198`); el contrato del `project` se deriva con
`JSON.parse(JSON.stringify(project))`; los ids esperados en los tests de orden salen de las variables de
siembra, no de literales. Los **únicos** literales son las dos anclas — que es **donde tienen que estar**,
porque ahí el literal *es* el contrato.

Detalle que me gustó: `linkAll(...)` enlaza en orden **deliberadamente contrario** al esperado
(`project-service.test.ts:317`: `bergamota, alpacaFinaRojo, alpacaDoble, alpacaFinaAzul`), así que el test
de orden no puede pasar por accidente por coincidir con el orden de inserción.

### 3.7 Regla 3 — condición doble: los números **cuadran**

Precedente de #31 presente (un informe declaró 9 rojos donde salían 12). **Aquí no hay discrepancia.**
Conté los denominadores yo mismo:

| Archivo(s) | Declarado | **Medido por mí** |
|---|---|---|
| `store.test.ts` | 4 | **4 passed** OK |
| `project-service.test.ts` | 16 | **16 passed** OK |
| `project-service` + `projects-routes` | 40 | **40 passed** OK |
| Los tres archivos | — | **44 passed** OK |

Y **7 mutaciones reproducidas** con arnés propio (copia al scratchpad + config de Vitest alternativo con
`alias`, sin tocar producción — `git status --porcelain` idéntico antes y después):

| Gate | Mutación | Declarado | **Medido** |
|---|---|---|---|
| A1 | `colorCode: "MUTANT"` en el doble | 5 rojos | **5 rojos** OK |
| A2 | quitar `typeName` del doble | 5 rojos | **5 rojos** OK |
| B1 | `colorCode` en la proyección real | `× selects exactly the five contract columns` | **idéntico**, con `+ "yarns.color_code"` OK |
| C1' | quitar `asc(yarns.id)` (mutación **mía**, no declarada) | — | **1 rojo**: el orden no total se caza |
| C1'' | quitar el `.orderBy` entero (mutación **mía**) | — | **2 rojos** |
| D1 | quitar `eq(yarns.userId, userId)` del SQL real | 1 rojo | **1 rojo** OK |
| D2 | quitar `row.userId === userId` del doble | 1 rojo | **1 rojo** OK |

**Sobre el gate E** (`getProject` devolviendo `{ project, yarns: [] }` fijo): el informe declara **6
rojos**; mi reproducción dio **4**. **No es una discrepancia del informe, es un límite de mi arnés**, y lo
digo para que nadie lo lea como un rojo del implementer: el Route Handler importa `getProject` por el
**barrel** `@/features/projects`, no por `@/features/projects/api/get-project`, así que mi `alias` no
intercepta la ruta y los 2 tests de nivel HTTP siguieron usando el servicio real. Los **4 rojos de nivel
servicio coinciden exactamente** con los declarados, y los 2 de ruta fallan por inspección directa
(`projects-routes.test.ts:391` exige `toHaveLength(1)` sobre `body.yarns`). El implementer mutó producción
y revirtió, por eso vio los 6. Consistente.

Nota metodológica: el gate E es el que demuestra que el servicio **consulta de verdad** el store. El
implementer señala que el caso "lista vacía" **no** lo detecta y que está bien que no lo detecte. Es
correcto y es un buen síntoma: sabe qué mide cada test.

### 3.8 Cambio de firma de `getProject` — todos los llamadores, sin pérdida de cobertura

Busqué `getProject` en **todo** `src/`. Llamadores reales: **uno**,
`src/app/api/projects/[id]/route.ts:38`. Más `project-service.test.ts`. **Los dos actualizados**, ninguno
huérfano (y el typecheck lo confirma en global).

**¿Se adaptaron o se debilitaron los tests?** **Adaptados.** El único preexistente que cambió es
`project-service.test.ts:135`: `toMatchObject({ id })` -> `toMatchObject({ project: { id } })`. Misma
fuerza, mismo matcher, sólo un nivel más de anidamiento — que es exactamente lo que cambió en el contrato.
**No se borró ni un test**, y la aritmética lo prueba de forma independiente del informe: 577 + 13 = **590**,
con +1 archivo. Los 13 nuevos son 4 (SQL) + 6 (servicio) + 3 (ruta), y los conté en los archivos.
`project-actions.test.ts` y `project-actions-routes.test.ts` sólo cambian la **siembra** (helper
`yarnRow(id, userId)` por los campos nuevos obligatorios del doble); **ninguna aserción se tocó**.

### 3.9 Acceptance de la ficha — los 3 puntos

| Punto | Estado | Dónde |
|---|---|---|
| 1. `GET /:id` incluye las lanas con datos suficientes para el swatch | **[x]** | `projects-routes.test.ts:381-401`; los cinco campos = swatch (`colorFamily`) + etiqueta (`brandName`·`typeName`·`colorName`) + `id` para desenlazar |
| 2. Scoping por `userId` sin romper el resto del payload | **[x]** | `project-service.test.ts:259-275` + `store.test.ts:105-112`; contrato intacto por `toEqual` exacto sobre `project` |
| 3a. con lanas -> las devuelve | **[x]** | `project-service.test.ts:236-246`, `projects-routes.test.ts:381-401` |
| 3b. sin lanas -> **lista vacía** | **[x]** | `project-service.test.ts:248-255`, `projects-routes.test.ts:403-410` (`toEqual([])`) |
| 3c. acceso ajeno -> **404/401** | **[x]** | 401: `projects-routes.test.ts:135-151` (incluye `GET /:id`, línea 142). 404: `:153-169` + el nuevo `project-service.test.ts:277-287` **con lanas enlazadas** |

---

## 4. Verificación ejecutada por mí

**`bash ./init.sh` -> exit code 0**, lint verde, typecheck verde:

```
 Test Files  54 passed | 3 skipped (57)
      Tests  590 passed | 13 skipped (603)
```

**Coincide exactamente con lo declarado** (54/3 archivos, 590/13 tests). Contra la baseline del leader
(53/3 archivos, 577/13 tests): **+1 archivo, +13 tests, 0 borrados**. Los **3 smokes siguen skipped** y
siguen compilando.

**`pnpm build` -> OK.** `/api/projects/[id]` sigue publicada como ruta dinámica.

**`git status --porcelain`: idéntico antes y después de mi revisión.** Mis 7 mutaciones corrieron sobre
copias en el scratchpad con un config de Vitest alternativo; **no toqué el código del implementer**.

---

## 5. Arquitectura y convenciones

- **Regla de capas 2 (lógica en `features/<x>/api`)** — [x] El Route Handler sigue **fino**: valida el id
  con `projectIdSchema` (zod), delega en `getProject` y serializa. La decisión D1 del informe (un solo
  servicio en vez de dos llamadas orquestadas desde el `route.ts`) es la correcta y por el motivo
  correcto: dos llamadas habrían metido en el handler la decisión de qué hacer si la segunda no encuentra
  nada, que es lógica de negocio. Con un servicio hay **un solo camino de 404**.
- **Regla de capas 3 (acceso a datos)** — [x] Todo el Drizzle nuevo vive en `ProjectStore`. `get-project.ts`
  depende de la **interfaz**, no de Drizzle. Ningún servicio importa `drizzle-orm`.
- **Regla de capas 4 (scoping por `userId`)** — [x] Ver §3.1. `listLinkedYarns` recibe `userId` y lo
  aplica en el `WHERE`, coherente con `findById`, `update`, `remove` y `findYarn`.
- **Regla de capas 5 (zod en el borde)** — [x] `projectIdSchema` sin cambios; un id malformado sigue
  dando 404, no 400.
- **Regla de capas 6 (tipos)** — [x] Cero `any` en el código nuevo de producción. `LinkedYarn` es explícito.
- **Regla S1 (schema nunca por el barrel)** — [x] **No se tocó ningún `schema.ts`.** `store.ts` importa
  `{ brands, yarns, yarnTypes }` de `@/features/yarns` (el barrel), que es lo que S1 y `conventions.md`
  **mandan** para un servicio: S1 sólo restringe `schema.ts -> schema.ts`, y aquí no hay ciclo posible.
  Además es continuidad exacta del import de `yarns` que ya estaba.
- **El store se extendió Y el doble también** — [x] Y con el criterio correcto: `InMemoryYarnRow` hace los
  campos nuevos **obligatorios** en vez de opcionales con valor por defecto. Un doble que **fabrica** datos
  deja pasar tests que la consulta real no aprobaría; el precio (5 siembras en 2 archivos) es el correcto
  a pagar. Es justo la lección de la deuda 6, aplicada.
- **Feature-first** — [x] Nada fuera de `src/{app,features,shared}`; el doble vive en
  `features/projects/api/testing/`, junto a su feature.
- **Idioma / nombres / strings / async** — [x] Código en inglés, prosa y comentarios en español, comillas
  dobles, `async/await`. Comentarios sólo donde explican un *por qué* no obvio (`store.ts:165-170`,
  `in-memory-store.ts:13-18`), que es la regla.
- **Higiene** — [x] Sin dependencias nuevas, sin `console.log` de debug (los únicos del repo están en los
  smokes y son preexistentes), sin TODOs, sin temporales, sin secretos.

---

## 6. Observaciones no bloqueantes

Ninguna de estas impide aprobar. Se dejan escritas para que no se pierdan.

1. **`src/features/projects/api/testing/in-memory-store.ts:68-73` — comentario JSDoc huérfano.**
   El bloque `/** Doble en memoria de ProjectStore para tests: ... */` documentaba
   `createInMemoryProjectStore`, pero `compareLinkedYarns` se insertó **entre el bloque y su función**.
   Ahora hay dos comentarios apilados y **el primero describe una función que no es la que sigue**.
   Cosmético, cero impacto funcional: mover `compareLinkedYarns` por encima del bloque, o el bloque de
   vuelta a su sitio.
2. **Defensa en profundidad en los catálogos** (§3.1): añadir `eq(brands.userId, userId)` al `WHERE`
   convertiría el scoping de `brands`/`yarn_types` en un filtro de **lectura** en vez de depender de la
   invariante de **escritura** de `assert-yarn-refs.ts`. Un `AND`. Hoy no hay nada explotable.
3. **`PATCH /api/projects/:id` sigue respondiendo `{ project }` sin `yarns`.** Es correcto respecto al PRD
   (§9.1 habla sólo del `GET`), pero significa que tras editar un proyecto la UI se queda sin las lanas y
   tiene que re-fetchear. Emparenta con la deuda propuesta 74; conviene decidirlo **antes** de #21, no
   durante.
4. **Las seis deudas propuestas (72-77) son pertinentes y honestas**, y ninguna tapa un fallo que
   debiera haberse arreglado en esta slice. Destaco la **73** (la corrida hermética nunca ejecuta el JOIN
   contra Postgres) como la que más merece atención del leader: es el mismo patrón que destapó la deuda 6.
   Correcto no haber tocado `deudas.md` — lo hace el leader.

---

## 7. Cambios requeridos

**Ninguno.** No hay bloqueantes.

No hay fuga de scoping, el orden es total y está verificado en el SQL real, y el doble en memoria no le
está mintiendo a los tests en nada que esta feature pueda romper. Los tres puntos del `acceptance` están
cubiertos, las cuatro decisiones del usuario se cumplen literalmente, `bash ./init.sh` y `pnpm build`
están verdes, y los números del informe los reproduje uno a uno sin encontrar una sola discrepancia.

La ficha #17 queda lista para que **el leader** la cierre (marcar `done` y saldar la **deuda 5**).
