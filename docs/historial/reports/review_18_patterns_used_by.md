# Review — feature #18 `patterns_used_by`

**Veredicto:** APPROVED
**Bloqueantes:** 0
**Reviewer:** ejecutó `bash ./init.sh`, `pnpm build`, y **9 mutaciones** propias
(las 6 del implementer + 3 mías) reproducidas sin tocar el árbol.
`git status --porcelain` es **idéntico** antes y después de esta revisión.

> Backend puro: **no** se aplica el checklist visual del SDD §9 (no hay UI, RTL ni axe).
> Su ausencia no se penaliza.

---

## Checkpoints

- **C1:** [x] — `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`,
  los 3 docs de `docs/harness/`. `bash ./init.sh` **exit 0** (ejecutado por mí).
- **C2:** [x] — **1 sola** feature en `in_progress` (#18; 19 done, 12 pending, verificado
  parseando `feature_list.json`). `progress/current.md` describe la sesión activa, sin basura.
- **C3:** [x] — ver §3. Acceso a datos sólo por `ProjectStore`; Route Handler **sin tocar**;
  zod en el borde; feature-first; §S1 intacta; sin deps nuevas; sin console.log ni TODO.
- **C4:** [x] — lint verde, typecheck verde, **602 passed | 13 skipped (615)** en
  **54 passed | 3 skipped (57)** archivos. Cada línea de producción nueva tiene test que la mata.
- **C5:** [x] — el único no trackeado es `progress/reports/impl_18_patterns_used_by.md`
  (informe, no artefacto). Sin temporales ni salidas de build. `history.md` tiene entrada de la
  última sesión cerrada; #18 sigue `in_progress`, que es su estado correcto hasta que **el leader**
  la cierre.

---

## 1. Verificación de números (ejecutada, no leída)

| Declarado por el implementer | Medido por mí | ¿Cuadra? |
|---|---|---|
| `init.sh`: 54 passed / 3 skipped archivos | 54 passed / 3 skipped (57) | **sí** |
| `init.sh`: 602 passed / 13 skipped tests | 602 passed / 13 skipped (615) | **sí** |
| Baseline 590 → +12 tests, 0 archivos nuevos | +12, 0 archivos nuevos | **sí** |
| `pnpm build` OK | OK, 15/15 páginas, TS 16s | **sí** |
| `src/features/patterns/` sin tocar | ausente de `git status` | **sí** |

**Cero discrepancias.** Nada del precedente de #31 (informe que declaró 9 rojos donde salían 12).

---

## 2. EL HALLAZGO: la deuda 6 reproducida en vivo — **CONFIRMADO, y más fuerte de lo que dice**

El implementer afirma, autoinculpándose:

> *"Borrando el filtro de producción, los 32 tests de ruta siguieron verdes (corren sobre el doble)
> y sólo cayeron los 2 de SQL emitido."*

**Lo reproduje.** Copié `store.ts` fuera del repo, sustituí
`if (filters.patternId !== undefined) {` por `if (false as boolean) {`, y redirigí el módulo con un
config alternativo de Vitest (alias + hook `transform` con `enforce: "pre"`), corriendo **los tests
reales del repo**.

Sobre los 2 archivos que él midió:

```
Test Files  1 failed | 1 passed (2)
     Tests  2 failed | 38 passed (40)
```

Los 2 rojos son los suyos, con su texto exacto:
`expected 'projects.user_id = $1' to be '(projects.user_id = $1 and projects.pattern_id = $2)'`.
Los **32 de `projects-routes.test.ts` en verde, todos**. Confirmado literalmente.

**Y fui más lejos que él: corrí la SUITE ENTERA con el filtro de producción borrado.**

```
Test Files  1 failed | 53 passed | 3 skipped (57)
     Tests  2 failed | 600 passed | 13 skipped (615)
```

**600 de 602 tests del proyecto pasan con el filtro muerto.** Los únicos 2 que se enteran son los de
`store.test.ts`. O sea: **sin el patrón de #17, esta slice se habría cerrado con `init.sh` verde y el
filtro sin existir contra Neon.** Es el argumento más fuerte que tiene el proyecto para asertar el SQL
realmente emitido por Drizzle, y ahora está medido con números exactos, no afirmado.

### ¿Por qué el doble no lo vio? — sí, es lo que sospechabas

Porque **el doble implementa el filtro por su cuenta**. `projects-routes.test.ts` inyecta
`createInMemoryProjectStore()`; ese doble tiene su **propia** copia de la condición en
`src/features/projects/api/testing/in-memory-store.ts:138-143`, escrita a mano en JavaScript. Los tests
de ruta miden **la traducción**, no la implementación: siguen acotando aunque producción no acote.

**Es un problema del método de testing, no de esta feature.** Es la **deuda 6** exacta —
"el doble puede divergir de Drizzle y ningún test hermético se entera"— y esta slice hace dos cosas
bien: (a) **no la agrava**, porque añade el ancla de SQL que la detecta; (b) **la nombra y la mide** en
lugar de esconderla. La ficha **81** que propone (extender el ancla de SQL a `needle`, `yarnId` y el
rango de fechas, que son los tres que el doble traduce peor) es la continuación correcta.

---

## 3. Foco de la revisión, punto por punto

### 3.1 El corolario duro del §9.2 — **CUMPLIDO**

- `git status` no lista **ni un archivo** de `src/features/patterns/`.
- `grep -rn "features/projects" src/features/patterns/` devuelve una sola línea:
  `src/features/patterns/api/testing/in-memory-store.ts:11`, import **preexistente y no modificado**,
  entre dobles de test.
- `PatternStore` **no consulta `projects`** en ninguna forma.
- La única arista `projects → patterns` sigue siendo `src/features/projects/schema.ts:13`
  (`import { patterns } from "@/features/patterns/schema"`): la **dirección legal** del DAG y la
  excepción explícita de `conventions.md` (schema importa schema directo, nunca el barrel).
- **`schema.ts` no se tocó en absoluto.** §S1 intacta, sin inversión del grafo de FKs.

### 3.2 Scoping en las dos direcciones — **SIN FUGA**

El `WHERE` emitido está **anclado literalmente** en `src/features/projects/api/store.test.ts:115`:

```
(projects.user_id = $1 and projects.pattern_id = $2)
```

El `userId` viaja **dentro del mismo literal** que la condición nueva: no se puede tocar uno sin que el
test del otro se entere. Lo verifiqué con la **mutación 4** (quitar el scoping en producción **y** en el
doble a la vez): caen **6** tests, exactamente los que él declara, y entre ellos los dos sentidos del
cruce:

- `never lists another user's project that uses the same pattern` — (b) con el `patternId` **propio**, un
  proyecto de otro usuario que usa ese mismo patrón **no sale**.
- `cannot discover anything through a pattern used only by another user` — (a) con el `patternId` de un
  patrón **ajeno**, la respuesta es 200 + lista vacía: **no se descubre nada**.

Los dos tests **siembran filas de un segundo usuario** (`seed("user-2", …)`), no pasan por vacío. El
smoke de Neon repite el sentido (a) **contra Postgres real**
(`projectStore.list(crypto.randomUUID(), { patternId })` → vacío).

### 3.3 `patternId` NULLABLE — **la trampa está cubierta de verdad**

- **En SQL**: `pattern_id = $n` descarta los NULL por definición del motor. Correcto sin escribir nada.
- **En el doble**: la traducción es `row.patternId !== filters.patternId`, que en JS descarta `null`
  frente a un string. Correcto.
- **¿Hay test con proyectos sin patrón sembrados en la misma corrida?** **Sí, en los dos tests de
  listado**: `seed("user-1", { name: "Sin patrón", patternId: null })` y
  `seed("user-1", { patternId: null })`. No pasan por ausencia de filas.
- **Mutación 3** (hacer que el filtro arrastre los NULL): **2 rojos**, los dos tests de listado.
  Reproducida por mí, cuadra. **El caso no es decorativo.**

### 3.4 `eq(...)` y no `exists(...)` — **CORRECTO Y ANCLADO EN EL SQL**

`store.ts:100-102` usa `eq(projects.patternId, filters.patternId)`. `?yarnId=` sigue con su
`exists(...)` sobre `project_yarns` (`store.ts:82-96`) porque es N:N. No se copió por inercia.
Está **anclado**: `store.test.ts` comprueba sobre el SQL emitido que **no contiene** `exists` **ni**
`project_yarns`. Si alguien "unifica" ambos filtros copiando la forma de lanas, el test lo para.

### 3.5 Composición de filtros — **VERIFICADA EN LAS TRES DIRECCIONES (esto lo añadí yo)**

Tu sospecha era la correcta: un test de composición mal escrito pasa aunque el filtro nuevo no haga
nada. **No es el caso, y no me fié de la lectura: lo medí.**

El test siembra 4 proyectos donde cada uno falla **un criterio distinto** (A/crochet/paused es el
objetivo; los otros tres fallan por `type`, por `patternId` y por `active` respectivamente — `paused`
**sí** es activo: `ACTIVE_PROJECT_STATUSES = ["in_progress","paused"]` en `src/shared/config/index.ts:18`).
Rompí **cada uno de los tres filtros por separado** en el doble:

| Mutación (mía) | ¿Cae `composes with the other filters…`? |
|---|---|
| ignorar `patternId` (m2 / m5) | **sí** |
| ignorar `active` (m7) | **sí** (junto a `filters by active status` y `combines filters`) |
| ignorar `type` (m8) | **sí** (junto a `filters by type`) |

**Los tres acotan de verdad. Ninguno se pisa ni se ignora.** Además la composición está anclada
**también a nivel de SQL**:
`(projects.user_id = $1 and projects.type = $2 and projects.pattern_id = $3)`, con los parámetros en orden.

### 3.6 Coherencia con `?yarnId=` en los casos raros — **EXACTA, verificada contra el código real**

No me fié del informe: fui a `store.ts`.

- **uuid válido sin filas** → el filtro de lanas **no consulta la tabla `yarns`** en ningún punto
  (`store.ts:82-96` sólo toca `project_yarns`), y `list-projects.ts` no tiene rama de error. Una lana
  inexistente devuelve hoy **200 + lista vacía**. El de patrones **tampoco consulta `patterns`**: mismo
  resultado. **Idéntico.** Y ese "no oráculo de existencia" es lo que hace indistinguibles un patrón
  ajeno y uno inexistente — la mitad **buena** de la propiedad de seguridad.
- **no-uuid** → `z.uuid()` en `projectFiltersSchema` y `validationErrorResponse` con el primer issue.
  El test existente `answers 400 on an invalid filter instead of ignoring it` ya cubría `?yarnId=123`
  y ahora incluye `?patternId=123` **en el mismo bucle**. **400 los dos.** Idéntico.
- **`?patternId=` vacío** → `readFilters` (`src/app/api/projects/route.ts:16-21`) descarta los valores
  vacíos, así que es "sin filtro". El test de ignorar vacíos se amplió con `patternId=` en la misma
  query. Idéntico.

**No se inventó ningún status ni ningún comportamiento nuevo.**

### 3.7 Orden — **INTACTO**

`orderBy(desc(projects.startDate))` sin tocar, y ahora **doblemente anclado**: en el SQL
(`section(query, " order by ")` → `projects.start_date desc`) y en comportamiento (el test de listado
siembra marzo y febrero y exige el orden `[newest, oldest]`).

### 3.8 REGLA 2 — **las dos piezas, y la dirección difícil está**

**(a) Ancla al literal que ES contrato.** En `projects-routes.test.ts`:

```ts
expect(Object.keys(projectFiltersSchema.shape).sort()).toEqual([
  "active", "from", "needle", "patternId", "to", "type", "yarnId",
]);
```

La premisa es correcta y la verifiqué en `route.ts:16-21`: `readFilters` vuelca los `searchParams` tal
cual en el esquema, así que **las claves del esquema SON los nombres públicos**. Coinciden con la línea
de PRD §9. Un segundo ancla fija el mensaje `"El patrón no es válido."`, que es texto de usuario.

**Las dos direcciones, reproducidas por mí:**

| | Mutación | Resultado |
|---|---|---|
| **falta** un nombre | borrar `patternId` del esquema | **8 rojos**, el ancla entre ellos |
| **sobra** un nombre | añadir `inLibrary` al esquema | **1 rojo: sólo el ancla** |

**La dirección de "sobra" —la que suele faltar— está cubierta.** Con `toContain` en vez de `toEqual`,
la segunda habría pasado en verde con un parámetro público inventado colado en el contrato.

**(b) Derivación.** `answers 400 with the schema message for a malformed patternId` **no repite** el
mensaje: lo saca del propio esquema para el mismo input y lo compara contra el body. Los tests de
listado asertan sobre **ids devueltos por los seeds**, nunca sobre literales escritos a mano.

### 3.9 REGLA 3 — **las 6 mutaciones, reproducidas una a una. Los números cuadran.**

| # | Mutación | Declarado | **Medido por mí** | ¿Cuadra? |
|---|---|---|---|---|
| 1 | quitar el filtro del store REAL | 2 failed / 38 passed (40) | 2 / 38 (40), mismos nombres y mismo texto de assert | **sí** |
| 2 | quitar el filtro del DOBLE | 4 failed / 36 passed (40) | 4 / 36 (40), **mismos 4 nombres** | **sí** |
| 3 | el filtro arrastra los NULL | 2 failed / 30 passed (32)* | 2 rojos, **mismos 2 nombres** | **sí** |
| 4 | quitar el scoping por `userId` | 6 failed / 34 passed (40) | 6 / 34 (40), **mismos 6 nombres** | **sí** |
| 5 | early return (reemplaza en vez de componer) | 1 failed / 31 passed (32)* | 1 rojo, **el de composición y sólo ese** | **sí** |
| 6a | falta un nombre en el contrato | 8 failed / 24 passed (32)* | 8 rojos, **mismos 8 nombres** | **sí** |
| 6b | sobra un nombre en el contrato | 1 failed / 31 passed (32)* | 1 rojo, **sólo el ancla** | **sí** |

\* él corrió sólo `projects-routes.test.ts` (32 tests); yo corrí los 2 archivos (40). Los conjuntos de
rojos son **idénticos**; el total mayor es sólo por el archivo extra. **Ninguna cifra inflada ni
recortada.**

### 3.10 Deuda 76 — **ni saldada ni agravada**

La 76 es sobre `listYarnIds(projectId)`, que sigue **sin dueño**. El método tocado es `list`, que
**ya** recibía y aplicaba `userId` (`store.ts:66`). Ni una línea de `listYarnIds` en el diff.
**No se agravó.**

### 3.11 El smoke de Neon — **las tres condiciones se cumplen**

- **(a) ¿sigue skipped por defecto?** **Sí.** `describe.skipIf(!RUN_SMOKE)` sin tocar; `init.sh` da
  **13 skipped** en **3 archivos skipped**, exactamente la baseline. Se añadieron aserciones **dentro**
  del caso 3 existente, no un caso nuevo.
- **(b) ¿sigue compilando en el typecheck?** **Sí.** `tsconfig.json` incluye `**/*.ts` (los tests
  entran) y `pnpm typecheck` está verde en el `init.sh` que ejecuté.
- **(c) ¿se vende como saldada la deuda 73?** **No.** El comentario en el código dice literalmente
  *"Adelanto parcial sobre la deuda 73, que sigue abierta para el resto"*, y la ficha **82** que propone
  existe precisamente para que nadie lea "el smoke ya cubre `list`". **La honestidad es correcta.**

---

## 4. La deuda 83 que propone — **juzgada leyendo el código, no el informe**

**Afirmación 1: "es preexistente de #5/#10, no de #18". → CIERTA.**

- `src/features/projects/api/create-project.ts:19-25` hace `store.create({ ...input, userId, … })`:
  el `patternId` del body entra **sin ninguna comprobación**.
- `src/features/projects/api/update-project.ts:24` hace `const patch = { ...input, updatedAt }`:
  igual, `patternId` pasa directo a `store.update`.
- Contraste real: `src/features/projects/api/project-yarns.ts:31` **sí** hace
  `store.findYarn(userId, yarnId)` antes de enlazar. La asimetría existe.
- **Ninguno de esos dos archivos aparece en `git status`.** #18 no los tocó, no los empeoró y no los
  hizo alcanzables de una forma nueva: el camino de escritura es **exactamente el mismo** que antes.
  (Su referencia a `assert-yarn-refs.ts` también es real: `src/features/yarns/api/assert-yarn-refs.ts`.)

**Afirmación 2: "el filtro nunca devuelve filas ajenas". → CIERTA. Escenario concreto:**

> B graba en su proyecto el `patternId` de un patrón de A (hoy nada se lo impide).
> - **A consulta con su propio patrón:** el WHERE es `user_id = A AND pattern_id = X`. El proyecto de B
>   tiene `user_id = B` → **no sale**. A no ve nada de B.
> - **B consulta con el patrón de A:** obtiene **sus propios** proyectos, que ya eran suyos y cuyo
>   `patternId` él mismo escribió. **Cero información nueva.**
> - **Un tercero C consulta ese patternId:** 200 + lista vacía, igual que para un uuid inexistente.
>   **Sin oráculo.**

**No hay camino de fuga de lectura.** El único oráculo de existencia que queda vive en la **escritura**
(crear un proyecto con un `patternId` inventado viola la FK; con uno ajeno real, no) — y eso es
**preexistente e intacto**: #18 no toca POST ni PATCH.

**Veredicto sobre la 83: la ficha es correcta, honesta y bien clasificada.** Es un agujero **del modelo**
(un proyecto puede referenciar un patrón que su dueño no puede leer, y mutará solo por el `set null`
cuando el ajeno se borre), no del filtro. **No bloquea #18.** Recomiendo al leader ficharla tal cual,
hermanada con la 78.

---

## 5. Arquitectura e higiene

- **Acceso a datos sólo por `ProjectStore`:** sí. La única línea de Drizzle nueva está en
  `store.ts:100-102`.
- **Route Handler fino:** `src/app/api/projects/route.ts` **no se tocó ni una línea**. Sigue parseando,
  validando con zod y delegando en `listProjects`. Es la prueba de que la decisión del §9.2 era la
  barata: el parámetro nuevo entra solo. `list-projects.ts`: 0 cambios.
- **Validación zod en el borde:** `projectFiltersSchema` en `validation.ts`, un `z.uuid()` con mensaje
  en español (UI y prosa en español, código en inglés — `conventions.md` cumplido).
- **Feature-first:** los 4 archivos de producción viven en `src/features/projects/`.
- **¿Se extendió también el doble?** **Sí**, `in-memory-store.ts:135-143`, con la condición réplica y un
  comentario que explica el porqué del NULL. La mutación 2 demuestra que el doble está vivo.
- **Comentarios:** los 3 añadidos explican un *por qué* no obvio (semántica del NULL en SQL, `eq` vs
  `exists`). Es exactamente el caso que `conventions.md` permite.
- **Sin dependencias nuevas** (`package.json` y `pnpm-lock.yaml` no aparecen en el diff).
- **Sin console.log/console.debug, sin TODO/FIXME/XXX** en las líneas añadidas (verificado con
  `git diff -U0` + grep).
- **Sin temporales ni artefactos.** `next-env.d.ts` no quedó tocado tras el build.
- **`git status --porcelain` idéntico** antes y después de mis 9 mutaciones (todas fuera del repo, vía
  alias + hook `transform` de un config alternativo de Vitest).

---

## 6. Acceptance de la ficha #18

| # | Criterio | Estado |
|---|---|---|
| 1 | Obtener los proyectos con `patternId = :id` | **[x]** `?patternId=` con `eq(projects.patternId, …)`, anclado en SQL y en comportamiento |
| 2 | Scoping por `userId` | **[x]** mismo WHERE, anclado literalmente; **dos** tests con filas de un segundo usuario; medido contra Postgres en el smoke; mutación 4 lo demuestra |
| 3 | Tests: patrón en N proyectos los lista / sin uso devuelve vacío | **[x]** los dos, más el caso `null`, el inexistente, el ajeno, la composición, el orden y el 400 |

Cumple además **PRD §9.2** al pie: filtro y no `usedBy`; `GET /api/patterns/:id` sin cambios; scoping;
patrón sin uso → lista vacía, nunca error.

---

## 7. Observaciones **no bloqueantes** (para el leader, no son cambios exigidos)

1. **La línea del PRD §9 no está anclada por ningún test.** El ancla de contrato fija las claves del
   **esquema**; si mañana alguien añade un filtro al esquema y actualiza el ancla pero **no** la línea
   del PRD, nada lo detecta. Aplica por igual a los 7 filtros y es **preexistente**, pero el ancla nueva
   la deja a un paso: un test que lea la línea del PRD y la compare con las claves del esquema cerraría
   el círculo. Candidata a ficha de deuda menor.
2. **Un parámetro de query desconocido se ignora en silencio.** `projectFiltersSchema` es un `z.object`
   no estricto, así que un parámetro inventado responde 200 en vez de 400. Preexistente, fuera del
   alcance de #18, y no contradice el ancla (que fija los nombres **aceptados**). Se menciona porque la
   mutación 6b es justo la vecina de ese hueco.
3. **Las fichas 80, 81, 82 y 83 que propone son las correctas** y están bien argumentadas, con escenario
   de fallo y coste de arreglo. La **81** es la que más valor tiene tras lo medido en §2: el ancla de SQL
   cubre hoy 2 de 7 filtros, y los 3 que faltan (`needle` con el operador de contención jsonb, `yarnId`
   con el subquery correlacionado, y el rango de fechas) son **justo los que el doble traduce peor**.

---

## 8. Cambios requeridos

**Ninguno.**

Slice pequeña, correcta, honesta y con la verificación más fuerte que se ha visto en el proyecto: es la
primera vez que se **mide** —con la suite entera, 600 verdes sobre 602— que los tests de ruta no ven un
filtro de producción muerto. El implementer se autoinculpó con un dato exacto en vez de esconderlo, y
los 9 experimentos que hice confirman **todas** sus cifras sin una sola discrepancia.

**APPROVED.** Que la cierre el leader.
