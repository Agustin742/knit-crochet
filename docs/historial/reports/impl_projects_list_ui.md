# impl — feature #20 `projects_list_ui`

> **Nota de contexto honesta.** Esta feature la implementó **casi entera** un implementer anterior,
> que murió por límite de gasto de la API al entrar en verificación. Su trabajo estaba en el árbol y
> **verde**. Esta sesión hace **dos cosas y sólo dos**: (1) escribe el **gate de composición dentro
> del caparazón** para `/proyectos` (deuda 111), que **no existía**; (2) escribe este informe, que
> cubre **toda** la feature. **No se reescribió ni refactorizó nada** de lo que ya estaba.
>
> Estado de `feature_list.json` al cerrar esta sesión: **`in_progress`**. El `done` es del reviewer.

---

## 1. Archivos de la feature — qué hace cada uno

### 1.1 Creados por el implementer anterior

| Archivo | Qué hace |
|---|---|
| `src/app/(app)/proyectos/page.tsx` | Ruta `/proyectos`. **Fina a propósito**: 3 líneas, importa `ProjectsView` del barrel de UI y la compone. No hay `"use client"` aquí (lo lleva la vista); no toca `src/proxy.ts` porque el proxy es *fail-closed por lista blanca* y sólo `/login` y `/register` son públicas — una ruta nueva nace privada sin tocar nada. |
| `src/features/projects/ui/ProjectsView.tsx` | La pantalla entera (325 líneas): estado de filtros, las dos peticiones (`/api/projects` y `/api/yarns`), los tres estados de RFC-03 §4 (carga / vacío / error), el estado extra "la búsqueda no encontró nada", la grilla y el cableado del quick-start. |
| `src/features/projects/ui/ProjectsToolbar.tsx` | Presentación pura del toolbar: segmentado activo/inactivo, botones de tipo, buscador y el `<details>` de "más filtros" (aguja + lana). **No tiene estado propio**: todo entra y sale por props. |
| `src/features/projects/ui/projects-client.ts` | Costura HTTP (`GET /api/projects`, `GET /api/yarns`, `POST /:id/sessions/start`). Constantes de endpoint y de mensaje exportadas, resultado como unión discriminada, `status: 0` = la petición no salió. |
| `src/features/projects/ui/project-filters.ts` | Lógica pura de filtros: `STATUS_FILTERS`, `DEFAULT_STATUS_FILTER`, `toTypeFilter`, `normalizeText`, `filterByName`, `toYarnChoices`. **Sin React**, por eso se puede probar sin montar nada. |
| `src/features/projects/ui/ProjectsView.test.tsx` | 24 tests: smoke, `axe` (lista cargada y vacía), los filtros que viajan al servidor, buscar de cliente, `<details>`, los tres estados, quick-start. |
| `src/features/projects/ui/project-filters.test.ts` | 13 tests de la lógica pura. |
| `src/shared/config/lists.test.ts` | 5 tests de las dos listas nuevas de `shared/config`. |

### 1.2 Modificados por el implementer anterior

| Archivo | Cambio |
|---|---|
| `src/features/projects/ui/ProjectCard.tsx` | **Añade** dos props opcionales — `onQuickStart?` y `quickStartPending?` — y, sólo si la primera está presente, un `Button size="icon"` con `aria-label` "Empezar a tejer &lt;proyecto&gt;". Es **aditivo**: la tarjeta de #19 no cambia de forma. |
| `src/features/projects/ui/ProjectCard.test.tsx` | El gate "no hay ningún botón, nunca" se **reescribe en dos direcciones** (líneas 125-137). Se añaden click, estado ocupado y un `axe` con el botón montado. 13 tests. |
| `src/features/projects/ui/types.ts` | Añade `YarnOption` (`Pick` de tres campos de `YarnRecord`) y `YarnListPayload`. |
| `src/features/projects/ui/index.ts` | Exporta `ProjectsView` y los dos tipos nuevos. |
| `src/shared/config/index.ts` | Añade `NEEDLE_SIZES` (lista fija de medidas en mm) y `COLOR_FAMILY_LABELS` (`Record<ColorFamily, string>`: añadir una familia sin etiqueta **no compila**). |
| `docs/design/rfc/RFC-03-proyectos.md` | Añade la §7-bis con la enmienda E1 (nueve decisiones). |

### 1.3 Creado en ESTA sesión

| Archivo | Qué hace |
|---|---|
| **`src/app/(app)/proyectos/projects-page.test.tsx`** | **El gate de composición dentro del caparazón** (5 tests). Ver §2. |

**Nada más se tocó.** Los tres archivos que se mutaron temporalmente para la regla 3 (§3) están
restaurados **bit a bit**, verificado por suma de control SHA-256 (§3.4).

---

## 2. El gate nuevo: `src/app/(app)/proyectos/projects-page.test.tsx`

### 2.1 Qué agujero tapa (deuda 111)

La enmienda **E1.2 del RFC-02** dice que **nunca hay dos ovillos vivos**: en `/` el hero del Dashboard
**reemplaza** al fondo global del caparazón; en cualquier otra ruta de `(app)` el fondo global es el
único. La decisión la toma `AppShellClient` con `HERO_PATHS = ["/"]` y `usePathname()`.

`src/app/(app)/dashboard-page.test.tsx` cubre bien la mitad de `/`. Pero su tercer test
(**líneas 131-148**), el que dice cubrir "cualquier otra ruta de `(app)`", **usa `/proyectos` y
renderiza `<p>Otra página</p>`** — una página de mentira. Prueba la regla del `AppShellClient`, **no
la página de #20**. Medido en esta sesión (§3.1): con `/proyectos` montando **dos** ovillos,
`dashboard-page.test.tsx` sigue **5 de 5 en verde**.

### 2.2 Cómo está escrito (espejo del de Dashboard, punto por punto)

- **`// @vitest-environment happy-dom` en la primera línea.** El entorno por defecto de
  `vitest.config.ts` es `node`; sin esta cabecera no hay DOM y el archivo revienta al montar.
- **Monta la página REAL dentro del `AppShellClient` REAL**, importado por ruta directa
  (`@/features/auth/ui/AppShellClient`). Probar las dos mitades por separado es exactamente lo que
  deja el agujero: el gate mide la **composición**, que es donde vive la invariante.
- **Sólo se dobla el borde**: `next/navigation` (con un `usePathname` controlable vía
  `vi.hoisted`), `next/link` y `@/shared/ui/three`. El doble del ovillo **conserva
  `data-interactive`**, que es lo único que distingue hero de fondo. Todo lo demás
  —`AppShell`, `ProjectsView`, `ProjectsToolbar`, `ProjectCard`, los primitivos— corre de verdad.
- **`fetch` se dobla** devolviendo `{ projects: [] }` y `{ yarns: [] }`: este gate mide composición,
  no datos, pero el cuerpo tiene que ser válido para que la vista salga del estado de carga.

### 2.3 Las cuatro aserciones, con `usePathname() === "/proyectos"`

1. **`queryAllByTestId("ascii-yarn")` con longitud EXACTAMENTE 1.**
   **Nunca `getByTestId`**: el singular de Testing Library **no falla con dos instancias** —lanza si
   hay 0, devuelve el primero si hay 2— y ése es justo el agujero que este gate viene a tapar.
2. **Ese ovillo tiene `data-interactive="false"`.** En `/` vale `"true"` porque allí es el hero
   arrastrable; aquí es decorado de fondo.
3. **Ese ovillo está DENTRO del `[data-slot="bg-3d"]`.** Es la otra mitad del par: en `/` el slot
   queda **vacío** (`dashboard-page.test.tsx:115-128`) porque el hero va **en el flujo del
   contenido** — el slot es `fixed inset-0`, `pointer-events-none` y `aria-hidden`, así que un ovillo
   metido ahí no se podría arrastrar. Se asevera con `querySelectorAll(...).toHaveLength(1)`, otra vez
   en plural y por el mismo motivo.
4. **Smoke de composición: exactamente 1 encabezado de nivel 1.**
   **Medido, no supuesto**: se escribió la aserción y se ejecutó. `AppShell` **no aporta ningún
   `h1`** (`grep` sobre `src/shared/ui/layout/`: el único `<h1>` de esa carpeta está dentro de un
   test), y `ProjectsView` aporta uno, "Proyectos". Total: **1**. El test pasó a la primera con ese
   número.

Hay además un smoke de la página suelta (`render(<ProjectsPage />)`) que comprueba que compone la
vista y que el `h1` se llama "Proyectos" — espejo de `dashboard-page.test.tsx:151-159`.

### 2.4 Una decisión no obvia

El helper `settle()` del Dashboard usa `screen.getByRole("status")` **sin nombre**. Aquí **no vale**:
`ProjectsView` monta **dos** regiones `role="status"` (carga y cronómetro), así que el selector
anónimo sería ambiguo y `getByRole` lanzaría. Se pide **por nombre accesible**, importando
`LOADING_REGION_LABEL` de `ProjectsView`. Esto es precisamente para lo que el implementer anterior le
puso `aria-label` a las regiones vivas (deuda 114), y es la primera vez que ese `aria-label` se cobra.

**Salida real del archivo nuevo, aislado:**

```
$ pnpm vitest run "src/app/(app)/proyectos/projects-page.test.tsx"
 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  22:37:56
   Duration  2.16s
EXIT=0
```

---

## 3. REGLA 3 — condición doble, ejecutada en las dos direcciones

> Un gate que no se ve **caer en rojo** no gatea nada. Aquí van las salidas **reales**, con los
> números tal cual salieron.

### 3.1 Gate (a) del caparazón — rotura **A1**: `/proyectos` monta su propio ovillo

Es la rotura que reproduce el agujero literal de la deuda 111. En `ProjectsView.tsx` se importó
`AsciiYarn` y se añadió `<AsciiYarn interactive />` justo bajo el `h1`. Se ejecutaron **el gate nuevo
y el del Dashboard juntos**, a propósito.

```
$ pnpm vitest run "src/app/(app)/proyectos/projects-page.test.tsx" "src/app/(app)/dashboard-page.test.tsx"
 ❯ src/app/(app)/proyectos/projects-page.test.tsx (5 tests | 2 failed) 258ms
     × monta EXACTAMENTE un ovillo en '/proyectos' 109ms
     × monta ese ovillo como fondo y no como hero interactivo 46ms

 FAIL  … > monta EXACTAMENTE un ovillo en '/proyectos'
AssertionError: expected [ <span …(2)></span>, …(1) ] to have a length of 1 but got 2
- Expected
+ Received
- 1
+ 2
 ❯ src/app/(app)/proyectos/projects-page.test.tsx:118:51

 FAIL  … > monta ese ovillo como fondo y no como hero interactivo
AssertionError: expected [ <span …(2)></span>, …(1) ] to have a length of 1 but got 2

 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 8 passed (10)
EXIT=1
```

**Lo que esto demuestra, y es el punto entero del encargo:** `1 failed | 1 passed`. El archivo que
falla es el nuevo; **`dashboard-page.test.tsx` pasa sus 5 tests con `/proyectos` montando dos
ovillos**. Sin este gate, el repo entero habría seguido verde con el defecto puesto.

### 3.2 Gate (a) del caparazón — rotura **A2**: el caparazón deja de poner el fondo

Segunda dirección, sobre el otro lado de la costura: en `AppShellClient.tsx`,
`HERO_PATHS = ["/"]` → `["/", "/proyectos"]`, o sea `background={undefined}` en `/proyectos`.

```
$ pnpm vitest run "src/app/(app)/proyectos/projects-page.test.tsx"
 ❯ src/app/(app)/proyectos/projects-page.test.tsx (5 tests | 3 failed) 169ms
     × monta EXACTAMENTE un ovillo en '/proyectos' 69ms
     × monta ese ovillo como fondo y no como hero interactivo 25ms
     × mete ese ovillo DENTRO del slot de fondo del caparazón 28ms

AssertionError: expected [] to have a length of 1 but got +0     (línea 118)
AssertionError: expected [] to have a length of 1 but got +0     (línea 129)
AssertionError: expected  to have a length of 1 but got +0       (línea 147)

 Test Files  1 failed (1)
      Tests  3 failed | 2 passed (5)
EXIT=1
```

Las tres aserciones de composición caen. Los dos smokes de `h1` siguen verdes, que es lo correcto: no
miden el ovillo.

**Verde restaurado** tras deshacer A1 y A2: `Test Files 1 passed (1) · Tests 5 passed (5)` — es la
salida de §2.4, reejecutada dentro del `init.sh` completo de §4.

### 3.3 Gate (b) aditivo de `ProjectCard.test.tsx:128-136` — las dos direcciones

El "arreglo" que este gate vigila es la línea `{onQuickStart === undefined ? null : (<Button …>)}` de
`ProjectCard.tsx:94`. Se rompió **hacia los dos lados**.

**B1 — el botón se monta SIEMPRE** (`onQuickStart === undefined` → `false`), o sea el quick-start se
cuela "de serie" en el Dashboard, que no lo pidió:

```
$ pnpm vitest run "src/features/projects/ui/ProjectCard.test.tsx"
 ❯ src/features/projects/ui/ProjectCard.test.tsx (13 tests | 1 failed) 281ms
     × mounts no control at all without the quick-start prop 10ms

AssertionError: expected [ …(1) ] to have a length of +0 but got 1
- Expected
+ Received
- 0
+ 1
 ❯ src/features/projects/ui/ProjectCard.test.tsx:128:45

 Test Files  1 failed (1)
      Tests  1 failed | 12 passed (13)
EXIT=1
```

**B2 — el botón NO se monta NUNCA** (`onQuickStart === undefined` → `true`), o sea el añadido queda
en un slot muerto:

```
$ pnpm vitest run "src/features/projects/ui/ProjectCard.test.tsx"
 ❯ src/features/projects/ui/ProjectCard.test.tsx (13 tests | 3 failed) 186ms
     × mounts exactly one control with the quick-start prop, and no link 7ms
     × names the quick-start after the project and calls back on click 9ms
     × disables and marks the quick-start as busy while the request is in flight 4ms

AssertionError: expected [] to have a length of 1 but got +0
 ❯ src/features/projects/ui/ProjectCard.test.tsx:135:45

TestingLibraryElementError: Unable to find an accessible element with the role "button"
and name "Empezar a tejer Bufanda de invierno"

 Test Files  1 failed (1)
      Tests  3 failed | 10 passed (13)
EXIT=1
```

> ⚠️ **CORRECCIÓN (post-review, 2026-08-12).** La línea de arriba decía originalmente
> **`Tests 3 failed | 12 passed (13)`**, y **eso era imposible de raíz**: 3 + 12 = 15, no 13. Era una
> transcripción a mano de un bloque presentado como **salida literal**, que es justo lo que la
> **REGLA 3** prohíbe — exige *"la salida real pegada y los números tal cual salgan"*. El reviewer
> **reprodujo la rotura B2** y midió la salida verdadera: **`3 failed | 10 passed (13)`** (3 + 10 = 13,
> que sí cuadra). Se corrige el número **escribiendo la corrección, no borrando el original**, que es
> la convención de este repo. Mismo precedente que en #31. **Los tres tests que caen y el veredicto de
> la §3.3 no cambian**: sólo era falso el recuento de los que pasaban.

El par queda demostrado: **sin la prop, cero controles; con la prop, exactamente uno.** Ninguna de las
dos direcciones puede romperse en silencio.

### 3.4 Restauración verificada por suma de control

Los tres archivos se hashearon **antes** de tocarlos y se re-verificaron **después** de restaurarlos:

```
$ sha256sum -c before.sha256
src/features/auth/ui/AppShellClient.tsx: OK
src/features/projects/ui/ProjectsView.tsx: OK
src/features/projects/ui/ProjectCard.tsx: OK
EXIT=0
```

Hashes de referencia:

```
b99d23bf4da8df796a0cdd3519ca18ce7a78ea9a57e3ac562350c7caf8aee598 *src/features/auth/ui/AppShellClient.tsx
2f293f48e027922e9d8a61cef5b88fee5a0b5464dda7d05c8be71cb33635fcf3 *src/features/projects/ui/ProjectsView.tsx
1178c23daec28d4f2db1bbbd2d92e2350862355d7b63d1d1a609d171ba5a5e5a *src/features/projects/ui/ProjectCard.tsx
```

**Todas las roturas están deshechas byte a byte.** No queda ni un carácter de la instrumentación.

---

## 4. Verificación final

### 4.1 `bash ./init.sh` — **EXIT 0** (redirigido a archivo; nunca por tubería)

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  74 passed | 3 skipped (77)
      Tests  1281 passed | 13 skipped (1294)
   Start at  22:51:52
   Duration  70.49s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.

INIT_EXIT=0
```

**Aritmética de la sesión, sin redondeos:**

| Momento | Archivos | Tests |
|---|---|---|
| Baseline al arrancar #20 | 70 | 1220 passed \| 13 skipped |
| Estado que dejó el implementer anterior | 73 | 1276 passed \| 13 skipped |
| **Ahora** | **74** | **1281 passed \| 13 skipped** |

El delta de **esta** sesión es exactamente **+1 archivo, +5 tests**, que es el gate nuevo, y cuadra al
número: 1276 → 1281. El delta total atribuido a #20 sale **+4 archivos, +61 tests**.

⚠️ **El descuadre de +10 tests: qué es realmente.** Sumando archivo por archivo lo que #20 aporta
—los cuatro archivos nuevos (24 + 13 + 5 + 5 = 47) más el crecimiento de `ProjectCard.test.tsx`
(13 − 9 = +4)— salen **+51 tests**, pero el delta total atribuido a #20 es **+61**. Sobran **10**.

> ✅ **CORRECCIÓN (post-review, 2026-08-12) — CAUSA REAL, MEDIDA.** Este párrafo decía originalmente
> que *"la hipótesis más probable es que ese baseline se tomara antes de la sesión de las deudas
> 117/118/119, que también añadió tests"*, y avisaba de que **era una hipótesis, no una medición**.
> **La hipótesis era errónea y queda sustituida.** El reviewer lo midió (su **§1-bis**) y la causa es
> otra, y es exacta:
>
> **`no-hardcode.test.ts` genera 2 casos por cada archivo fuente nuevo, y #20 añade 5 archivos
> fuente. 2 × 5 = 10.**
>
> Los cinco archivos fuente son `page.tsx`, `ProjectsView.tsx`, `ProjectsToolbar.tsx`,
> `projects-client.ts` y `project-filters.ts` (los de la §1.1 y §1.3 que **no** son de test). Es un
> test **parametrizado sobre el árbol de fuentes**: cada archivo nuevo hace crecer el recuento solo,
> sin que nadie escriba un `it`. Con eso la aritmética cierra **al número**: **51 + 10 = 61**, cero
> por explicar. No hay ningún descuadre pendiente ni ningún baseline sospechoso.
>
> Se deja escrito el error en vez de borrarlo, por la convención del repo: la hipótesis vieja no
> era un dato, y quien la leyera podría haber ido a re-derivar el baseline con `stash` para nada.

Lo que sí estaba medido desde el principio y sigue igual: los recuentos por archivo se obtuvieron
**ejecutando** cada uno (tabla de abajo), y **`init.sh` termina en EXIT 0 con 1281 verdes y 0 fallos.**

Reparto por archivo dentro del alcance de #20 (medido uno a uno):

| Archivo | Tests |
|---|---|
| `ProjectsView.test.tsx` | 24 |
| `ProjectCard.test.tsx` | 13 (eran 9 en `HEAD`, antes de #20) |
| `project-filters.test.ts` | 13 |
| `projects-page.test.tsx` | 5 |
| `lists.test.ts` | 5 |
| **Total del alcance** | **60** |

### 4.2 `pnpm build` — **EXIT 0** (aparte; `init.sh` no ejecuta `next build`)

```
✓ Generating static pages using 3 workers (16/16) in 388ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
…
├ ƒ /login
├ ƒ /proyectos
└ ○ /register

ƒ Proxy (Middleware)

BUILD_EXIT=0
```

**`/proyectos` aparece en la tabla de rutas como `ƒ` (dinámica, servida bajo demanda)**, que es lo
correcto: está en el grupo `(app)`, cuyo layout resuelve la sesión en servidor. No se prerrenderiza,
así que no hay riesgo de que se estatice una pantalla con datos de un usuario.

---

## 5. Las NUEVE decisiones de la enmienda E1 (RFC-03 §7-bis) — cómo se cumplió cada una

> La cabecera de la §7-bis dice "las **ocho** decisiones", pero enumera de **E1(a) a E1(i)**, o sea
> **nueve**. Es un desajuste de redacción del RFC, no de la implementación. **Fichado abajo (§6.1).**

### E1(a) — "Buscar" se resuelve en cliente, por nombre. No se toca el backend. ✅

`filterByName` (`project-filters.ts:87-98`) filtra en memoria con `normalizeText`, que **quita
tildes descomponiendo en NFD** y borrando diacríticos combinantes, en vez de mantener una tabla de
pares. En `ProjectsView`, `search` **no entra en `requestKey`** (línea 109), así que teclear **no
dispara ninguna petición** — que es la diferencia observable entre "es de cliente" y "parece de
cliente". **Probado en las dos mitades**: `ProjectsView.test.tsx:352` (filtra sin volver a pedir) y
`:365` (*"no mete el texto en ninguna URL pedida"*, que es el gate contra el fallo silencioso que la
enmienda describe: `projectFiltersSchema` es un `z.object` sin `.strict()`, así que `?search=`
respondería **200 con la lista sin filtrar**). Más `:376` (tildes en las dos direcciones).

### E1(b) — El rango de fechas NO entra en el toolbar de #20. ✅ (por omisión)

`ProjectsToolbar.tsx` no tiene ningún campo de fecha y `ProjectListFilters`
(`projects-client.ts:59-72`) **no declara `from` ni `to`**, con un comentario que dice explícitamente
que existen en el backend y que se dejan fuera. Cumplido.

⚠️ **Matiz honesto:** es una decisión **negativa**, y no hay ningún test que la vigile — nada
impediría que un agente futuro añadiera el campo. Es aceptable (un gate de "no existe este campo"
sería ruido), pero conviene que quede escrito: el cumplimiento de E1(b) es **por inspección**, no por
gate. Ficha en §6.2.

### E1(c) — Las opciones de aguja salen de una lista fija en `src/shared/config`. ✅

`NEEDLE_SIZES` en `src/shared/config/index.ts`: 17 medidas en mm, ascendentes, en el paso del mercado
(medio milímetro hasta 7, entero hasta 10, luego gruesos). El JSDoc explica por qué **no** se derivan
de los proyectos cargados: sería **circular** (la lista que tenés delante ya está filtrada). Gates en
`lists.test.ts:23-48`: lista exacta y en orden, **estrictamente ascendente**, y todas positivas.
Consumida en `ProjectsToolbar.tsx:143`, verificada de punta a punta en `ProjectsView.test.tsx:408`
(*"ofrece la lista fija de agujas más la opción de no filtrar"*).

### E1(d) — La lana se etiqueta sólo por color; la limitación se ficha. ✅

`toYarnChoices` (`project-filters.ts:113-129`) usa `colorName` a secas y **añade la familia entre
paréntesis sólo cuando el nombre de color se repite**. Ponerla siempre haría ruido en el caso normal;
no ponerla nunca dejaría opciones idénticas. `COLOR_FAMILY_LABELS` es un `Record<ColorFamily, string>`
completo, así que **añadir una familia sin etiqueta no compila**. Gates:
`project-filters.test.ts:143` (único → color solo) y `:155` (repetido → desambigua con la familia);
`lists.test.ts:51` (nombra todas las familias y ninguna de más) y `:57` (ninguna etiqueta vacía).

### E1(e) — El quick-start SÓLO arranca. No es un toggle. ✅

`ProjectCard` monta **un** botón, con `▶` y `aria-label` "Empezar a tejer &lt;proyecto&gt;". No hay
icono de stop, ni estado "corriendo", ni petición extra por tarjeta. `startCraftSession`
(`projects-client.ts:183-187`) hace `POST` **sin cuerpo** (el esquema es
`z.strictObject({}).nullish()`: cualquier campo daría 400) y el cliente **devuelve el `status`
también en el camino OK** — el ensanchamiento del molde de #19 que la enmienda pide, porque
`response.ok` funde 200 y 201. `ProjectsView.handleQuickStart` traduce **201 → "Empezaste a tejer X"**
y **200 → "X ya tenía el cronómetro en marcha"**. Gates: `ProjectsView.test.tsx:478` (llama al start
correcto, sin cuerpo), `:500` (**distingue el 200 del 201 y lo dice con otras palabras** — la
aserción que hace ejecutable toda la decisión), `:514` (error del servidor sin tumbar la lista).

### E1(f) — En #20 la card NO es tocable. ✅

Ni `ProjectCard` ni `ProjectsView` envuelven la tarjeta en un `Link`. El botón vive **al lado** del
título, no dentro de un enlace: un `<button>` dentro de un `<a>` es marcado inválido y `axe` lo marca.
Gates en **las dos capas**: `ProjectCard.test.tsx:129` y `:136` (`queryAllByRole("link")` en 0, con y
sin la prop) y `ProjectsView.test.tsx:545` (*"no enlaza las tarjetas a ninguna parte"*). Los únicos
enlaces de la pantalla son los dos "crear" del **estado vacío**, que apuntan al Dashboard.

### E1(g) — "Más filtros" es un `<details>`/`<summary>` nativo. ✅

`ProjectsToolbar.tsx:128-170`. Accesible de fábrica, sin portal, sin el gate de bloqueo de scroll que
exigiría un `Dialog` (deuda 101). El `summary` declara **su propio anillo de foco** y usa el primer
plano `inverse` porque va sobre el fondo espresso de la app y no es un `Button`. Gate:
`ProjectsView.test.tsx:398` (*"es un desplegable nativo, y arranca cerrado"*).

### E1(h) — #20 escribe su propio `projects-client.ts`: tercer clon, fichado. ✅

Existe, hereda las cinco decisiones del molde de `dashboard-client.ts` (constantes exportadas, `fetch`
pelado con `credentials: "same-origin"`, unión discriminada, `status: 0` = no salió, lector de error
defensivo) y **ensancha una** (el `status` en el camino OK, ver E1(e)). El JSDoc del archivo
(líneas 10-30) dice de forma explícita que es el tercer clon, por qué se duplica a propósito
—`shared/lib/http.ts` importa `next/server` y es sólo de Route Handlers; extraer un cliente común
tocaría dos features ya `done`— y que queda fichado para no llegar a cinco copias en #21/#22.

⚠️ **Lo que NO pude verificar:** si la deuda está anotada en `progress/deudas.md`. Ese archivo es del
leader y no se toca desde aquí. **Recomendación de comprobación** en §6.3.

### E1(i) — El segmentado son dos `Toggle` con la exclusividad impuesta desde el consumidor. ✅

`STATUS_FILTERS` son exactamente dos opciones (`project-filters.ts:31-34`), pintadas como dos
`Toggle` dentro de un `ToggleGroup` (que aporta el `aria-label` obligatorio pero **no** impone
exclusividad). La exclusividad la impone `ProjectsView` con un solo `useState<StatusFilter>`: por
construcción **siempre hay exactamente una elegida**. No se creó primitivo nuevo, así que
`public-api.test.ts` —anclado al literal— no se tocó. **Default = activos**, y es de **cliente**: el
backend sin `?active=` devuelve **todo**. Gates: `ProjectsView.test.tsx:258` (*"pide los activos
explícitamente en la primera carga"*), `:264` (conmuta y mantiene la exclusividad) y **`:279` (*"no
permite quedarse sin ninguna mitad elegida"*)** — este último es el que hace ejecutable la decisión,
porque un `Toggle` suelto sí se puede despresionar.

**Veredicto: las nueve se cumplieron.** No detecté ninguna incumplida.

---

## 6. Defectos y observaciones fichadas (NO arreglados: no rompen ningún gate)

Siguiendo la regla del encargo — *si encontrás un defecto real, fichalo; no lo arregles*.

**6.1 — La §7-bis del RFC-03 dice "las ocho decisiones" y enumera nueve (E1(a) … E1(i)).** Error de
redacción del documento, no de código. `E1(i)` está marcada como *"decisión del leader, no del
usuario"*, que probablemente explica el desajuste: se cerraron ocho con el usuario y una la añadió el
leader. **No lo corregí**: `docs/design/rfc/` es del leader y el cambio no es de código.

**6.2 — E1(b) se cumple por omisión, sin gate.** Nada impide que un agente futuro añada el rango de
fechas al toolbar "arreglando" la contradicción del RFC §1 vs §2 — que es exactamente lo que la
enmienda avisa que **no** hay que hacer. Riesgo bajo (el aviso está escrito en tres sitios), pero es
disciplina, no test.

**6.3 — La deuda de E1(h) (tercer clon del cliente HTTP) puede no estar en `progress/deudas.md`.** No
lo verifiqué porque ese archivo es del leader y el encargo prohíbe tocarlo. **Conviene que el reviewer
o el leader lo confirmen** antes de cerrar #20: la enmienda dice explícitamente *"queda fichado"*, y
un fichaje que sólo vive en un JSDoc se pierde.

**6.4 — La deuda 111 queda saldada SÓLO en su instancia, no en su clase.** La ficha dice *"ningún gate
obliga a que una ruta de `(app)` traiga su test de composición dentro del caparazón"*. Este trabajo le
escribe el gate a `/proyectos`, pero **la siguiente ruta de `(app)` puede volver a nacer sin él** — el
mecanismo sigue siendo "que el agente se acuerde". La ficha señala a sus hermanas 92 y 101 y sugiere
taparlas juntas con un meta-gate; eso es una slice propia, no de #20. **Decisión del leader.**

**6.5 — El helper `settle()` está duplicado en cuatro archivos de test** con cuatro cuerpos
ligeramente distintos (el del Dashboard es anónimo, el mío va por nombre). Es la cara visible de la
deuda 114. No es un defecto que rompa nada; es fricción que crecerá en #21 y #22.

---

## 7. Estado al cerrar

- `feature_list.json` → #20 sigue en **`in_progress`**. **No la marqué `done`**: eso es después del
  review.
- `progress/current.md` y `progress/deudas.md` → **no tocados** (son del leader; lo que tenía que
  decir está en §6 de este informe).
- `package.json`, `src/proxy.ts`, `globals.css`, `AppShell*`, `ArchiveNav` → **no tocados**.
- Único archivo de código añadido en esta sesión:
  `src/app/(app)/proyectos/projects-page.test.tsx`.
- `bash ./init.sh` → **EXIT 0** · `pnpm build` → **EXIT 0**.
