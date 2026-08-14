# Explore #20 `projects_list_ui` — el molde de página de `(app)`, qué se hereda de #19 y qué GATES debe traer

> **Solo lectura.** No se modificó ningún archivo de `src/**`. Único archivo escrito: éste.
> Fecha: 2026-08-12. Rama `main`, `HEAD = bdb11b0`.
> **Convención de este informe:** toda clase de Tailwind citada es una copia literal del archivo
> indicado. No hay comodines ni abreviaturas. Donde no pude medir, dice **no medido**.

---

## 0. Resumen ejecutable (lo que el implementer de #20 tiene que saber sí o sí)

1. **La página es fina**: `src/app/(app)/proyectos/page.tsx` debe rutear y componer, nada más. Toda la
   UI va a `src/features/projects/ui/` (que ya existe, creada por #19).
2. **El caparazón ya está puesto** por `src/app/(app)/layout.tsx`; #20 no toca layout ni sesión.
3. **`/proyectos` recibe el ovillo global de fondo automáticamente** (no interactivo, en el slot fijo).
   Es lo correcto y no hay que hacer nada — pero **hay que probarlo**, porque nada lo obliga (deuda 111).
4. **`/proyectos` ya es privada** sin tocar `src/proxy.ts` (fail-closed por allowlist).
5. Existen `EmptyState`, `ErrorState` y `Skeleton` reutilizables: los tres estados de la ficha #20 no se
   escriben desde cero.
6. **No existe** primitivo de segmentado, ni de campo de búsqueda, ni de desplegable ("más filtros"),
   ni de enlace, ni de select. Hay que componerlos con lo que hay o crearlos.
7. **No hay cliente HTTP compartido de navegador.** `src/shared/lib/http.ts` es **exclusivamente de
   servidor** (importa `next/server`). #20 escribe su propio `projects-client.ts`, tercer clon del mismo
   patrón.

---

## 1. El molde de página: cómo se monta una ruta de `src/app/(app)/`

### 1.1 Las tres capas, con archivo y línea

| Capa | Archivo | Tipo | Qué hace |
|---|---|---|---|
| Layout del grupo | `src/app/(app)/layout.tsx:17-25` | **Server Component** (`async`) | `getSessionUser()` en el servidor y baja **sólo `{ name }`** a cliente (línea 21) |
| Costura shell | `src/features/auth/ui/AppShellClient.tsx:64-87` | **Client** (`"use client"`, línea 1) | monta `AppShell`, cablea logout, **decide el fondo 3D por ruta** |
| Caparazón puro | `src/shared/ui/layout/app-shell/AppShell.tsx:38-72` | Presentación pura (sin `"use client"`) | banda de cuenta + `ArchiveNav` + `main` + `BottomNav` + slot de fondo |
| Página `/` | `src/app/(app)/page.tsx:12-14` | **Server Component** (sin `"use client"`) | 3 líneas: `return <DashboardView />` |
| Vista | `src/features/dashboard/ui/DashboardView.tsx:76-303` | **Client** (`"use client"`, línea 1) | estado, fetch, filtros, los tres estados |

**El molde en una frase:** la página en `app/` es un Server Component de ~3 líneas que importa **una**
vista del barrel de UI de la feature; la vista es el Client Component que hace todo.

### 1.2 Dónde se hace el fetch, y por qué NO en el servidor

`DashboardView.tsx:63-75` (JSDoc) lo justifica textualmente: **los datos se piden desde el navegador**,
con `useEffect` (`DashboardView.tsx:112-141`), porque los filtros cambian sin navegar y el estado de
carga sólo existe si hay una carga que mostrar. Además deja constancia de que **Zustand NO está
instalado** en el repo (línea 70-71) pese a que el stack lo nombre: el estado es `useState` local.

Para #20 esto aplica igual o más: toolbar con segmentado + tipo + "más filtros" + buscar son todos
filtros que cambian sin navegar.

Patrón de estado que #19 dejó y que conviene copiar (`DashboardView.tsx:99-110`):
- `requestKey` derivado de los filtros (`` `${year}|${type ?? ""}|${reloadToken}` ``, línea 105);
- `loading` se **deriva** comparando la clave pedida con la que llegó (línea 106), no es un booleano
  propio — el JSDoc de las líneas 99-104 explica por qué un booleano se desincroniza;
- los datos viejos sobreviven al cambio de filtro (línea 107-109), para no parpadear a vacío;
- `reloadToken` numérico (línea 93) porque un booleano no permite dos reintentos seguidos.

### 1.3 El ovillo: qué le pasa a `/proyectos` por defecto

`AppShellClient.tsx:17`:

```ts
const HERO_PATHS = ["/"];
```

y `AppShellClient.tsx:76-83`:

```tsx
const ownsItsYarn = HERO_PATHS.includes(pathname ?? "");
…
background={ownsItsYarn ? undefined : <AsciiYarn />}
```

**Consecuencia medida para `/proyectos`:** `usePathname()` devuelve `/proyectos`, que **no** está en
`HERO_PATHS`, así que `ownsItsYarn` es `false` y el caparazón **monta su ovillo global de fondo**, no
interactivo (`<AsciiYarn />` sin la prop `interactive`), dentro del slot de
`AppShell.tsx:52-58`, que es el `div` con `aria-hidden="true"`, `data-slot="bg-3d"` y las clases
`pointer-events-none fixed inset-0 z-(--z-bg-3d)`.

Esto es exactamente lo que #20 quiere: **la lista de proyectos NO debe montar su propio ovillo.** Si lo
montara habría dos ovillos vivos, que es justo lo que la enmienda E1.2 prohíbe, y además dispararía el
inventario literal del gate responsive (ver §4.3).

Detalle importante: **el `AppShellClient` de la app se monta desde el layout, no desde la página.** El
test de #19 lo monta a mano para poder observar la composición (ver §4.1).

### 1.4 Contrato de datos que #20 va a consumir

- `GET /api/projects` → `src/app/api/projects/route.ts:23-33`. Responde **envuelto**: `{ projects }`
  (línea 31), status 200. Tipo del payload ya declarado en
  `src/features/projects/ui/types.ts` (`ProjectListPayload`).
- Filtros aceptados (`src/features/projects/validation.ts:39-50`): `active` (**sólo las cadenas
  `"true"`/`"false"`**, línea 35-37), `type` (`knitting`/`crochet`), `needle` (número positivo),
  `yarnId` (uuid), `patternId` (uuid), `from`, `to` (fechas).
  **No hay parámetro de búsqueda por texto** en el contrato: el "buscar" de la toolbar (RFC-03 §2)
  **tiene que ser filtrado de cliente**, o se necesita un cambio de backend que #20 no tiene fichado.
  → **decisión que el leader debe cerrar antes de lanzar al implementer.**
- Un parámetro vacío (`?active=`) se trata como "sin filtro" (`route.ts:15-21`), no como error.
- Quick-start del cronómetro: los endpoints ya existen —
  `src/app/api/projects/[id]/sessions/start/` y `.../sessions/stop/`. Su cableado es trabajo de #20
  (así lo dice la ficha).
- **`SerializedProject`** (`src/features/projects/ui/types.ts`) ya está resuelto: las 4 fechas viajan
  como **cadenas ISO**, no como `Date`. El JSDoc avisa de que usar `ProjectRecord` compila y explota en
  runtime. **Usar `SerializedProject`, no `ProjectRecord`.**

---

## 2. Lo que #20 hereda gratis

### 2.1 Cliente HTTP de navegador — **no existe uno compartido**

`src/shared/lib/http.ts` importa `next/server` (línea 1) y es de **Route Handlers**: `withSession`,
`errorResponse`, `validationErrorResponse`. **No sirve en el navegador.**

Lo que sí hay son **dos clones** del mismo patrón, y el segundo lo dice explícitamente en su JSDoc
(`src/features/dashboard/ui/dashboard-client.ts:8-16`): *"No hay cliente compartido para el navegador en
el repo … así que esto copia la forma del único precedente, `features/auth/ui/auth-client.ts`"*.

La forma, para replicar:
- endpoints y mensajes como **constantes exportadas** (`dashboard-client.ts:17-23`), para que los tests
  las importen en vez de reescribirlas;
- `fetch` pelado con `credentials: "same-origin"` (línea 63);
- resultado como **unión discriminada**, no excepciones (`DashboardRequestResult<T>`, líneas 26-28);
- `status: 0` significa "la petición no llegó a salir" (línea 25);
- lector de error defensivo porque un 500 puede responder HTML (`readErrorMessage`, líneas 40-55);
- un 200 con cuerpo ilegible se trata como error (líneas 76-81).

⚠️ **Aviso para el leader:** #20 sería el **tercer** clon. Extraerlo a `shared/lib/` es tentador pero
es una decisión de arquitectura fuera de la ficha de #20; si no se extrae, conviene ficharlo como deuda
para no llegar a cinco copias en #21/#22.

### 2.2 `src/shared/lib/format.ts` — exportaciones exactas (las 4, medidas)

| Export | Línea | Qué hace |
|---|---|---|
| `formatDecimal(value: number): string` | 47 | máximo 1 decimal, **ninguno si no aporta** (`2` → `"2"`, no `"2,0"`) |
| `formatInteger(value: number): string` | 51 | entero redondeado, agrupación de miles de `Intl` |
| `secondsToHours(seconds: number): number` | 56 | segundos → horas (deriva de `SECONDS_PER_HOUR` de config) |
| `formatDuration(seconds: number): string` | 73 | segundos → `"45 min"` / `"2 h"` / `"2 h 15 min"` |

Locale `es-AR` (línea 16) → separador decimal **coma**. `safe()` (líneas 43-45) convierte no-finitos a
0 para no pintar `NaN`. `formatDuration` trunca hacia abajo y trata negativos como 0.

Para #20: `formatDuration` es el tiempo de la card (ya lo usa `ProjectCard.tsx:70`) y `formatInteger` el
porcentaje (`ProjectCard.tsx:67`). Si el quick-start muestra tiempo en vivo, `formatDuration` sirve tal
cual — **pero no hay formateador de cronómetro `mm:ss`**, y `formatDuration` descarta los segundos a
propósito (JSDoc líneas 65-68). Si el cronómetro necesita segundos visibles, es una función nueva.

### 2.3 Primitivas disponibles en `src/shared/ui/` para una toolbar

Superficie pública (barrel `src/shared/ui/index.ts`, anclada al literal por
`src/shared/ui/public-api.test.ts`):

**SÍ existen y sirven:**

| Pieza | Ruta | Nota para la toolbar de #20 |
|---|---|---|
| `Toggle` | `primitives/toggle/Toggle.tsx` | `button` con `aria-pressed`, **controlado** (`pressed` + `onPressedChange`). Es lo más cercano a un segmentado, y es lo que RFC-03 §5 pide (`aria-pressed`). |
| `ToggleGroup` | `primitives/toggle/ToggleGroup.tsx` | `role="group"` con `aria-label` obligatorio. **NO impone exclusividad** (JSDoc líneas 17-25): para activo/inactivo, que sí es exclusivo, la exclusividad la impone el consumidor. |
| `Button` | `primitives/button/Button.tsx` | variantes `primary` / `secondary` / `danger` / `ghost`; tamaños `md` / `icon` (`button.variants.ts:52-58`). El **`size="icon"` es el del quick-start** (RFC-03 §2 lo pide como botón de icono). |
| `Field` + `Input` | `primitives/field/Field.tsx`, `Input.tsx` | `Field` cablea `id` + aria + mensaje; props `label`, `hint`, `error`, `id`, `children`. `Input` es un `input` con `inputClasses`. |
| `inputClasses` | `primitives/field/Input.tsx:8` | export suelto: se puede pegar a un `select` nativo, y es lo que hace `ActiveProjectsPanel.tsx:79`. |
| `Skeleton` | `primitives/skeleton/Skeleton.tsx` | `aria-hidden`, respeta `prefers-reduced-motion` **en JS**. Formas en `SKELETON_SHAPES`. |
| `Card` | `primitives/card/Card.tsx` | superficie elevada. Ver la trampa de contraste en §3.3. |
| `ProgressBar` | `primitives/progress-bar/` | ya lo usa `ProjectCard`. |
| `Dialog` | `primitives/dialog/Dialog.tsx` | modal en portal, foco atrapado, `initialFocusRef`. |
| `EmptyState` / `ErrorState` | `feedback/` | ver §3. |

**NO existen (hay que componerlos o crearlos):**

- ❌ **Segmentado / `Tabs` / `tablist`** — RFC-03 §2 escribe "`kc-tabs`/toggle"; en el repo **sólo está
  la mitad `toggle`**. `ToggleGroup` es `role="group"`, y su JSDoc dice explícitamente que **no** es
  `radiogroup` ni `tablist` porque esos prometen exactamente una opción activa. Para activo/inactivo
  (que **sí** es exclusivo, default activos) hay dos caminos: (a) dos `Toggle` con exclusividad
  impuesta desde el consumidor, o (b) un primitivo nuevo. **Decisión de scope pendiente.**
- ❌ **Campo de búsqueda** — no hay `SearchField` ni `type="search"` en ningún sitio del design system.
  Se compone con `Field` + `Input`.
- ❌ **Desplegable / disclosure / popover** para "más filtros" — no existe. Lo más cercano es `Dialog`
  (modal, portal) o un `<details>` nativo. **Decisión de scope pendiente.**
- ❌ **Select** — no hay primitivo. `ActiveProjectsPanel.tsx:78-90` usa un `<select>` nativo con
  `className={inputClasses}`.
- ❌ **Enlace** — no hay primitivo. `ActiveProjectsPanel.tsx:131-137` lo dice en un comentario ("no hay
  primitivo de enlace en el design system todavía") y arma sus clases a mano en la constante
  `SEE_ALL_CLASSES`. **#20 va a necesitar enlaces (tap → drawer, o navegación).**
- ❌ **Iconos** — no medido: no encontré una capa de iconos; el Dashboard usa los caracteres `−` y `+`
  como texto dentro de `Button size="icon"` (`DashboardView.tsx:209`, `230`).
- ❌ **Drawer** — es de #21, no de #20 (la ficha dice "tap abre el drawer (feature 21)").

---

## 3. Los tres estados de la ficha #20

Ficha #20: *"loading (skeleton), vacío ('Tu cesto está vacío'), error ('Se soltó un punto')"*.
RFC-03 §4 añade: vacío → `"Tu cesto está vacío — empezá un proyecto"` + los 2 botones de crear;
error → `"Se soltó un punto"` + reintentar.

### 3.1 SÍ hay componentes reutilizables, y son compartidos

`src/shared/ui/feedback/`:

- **`StatePanel`** (`feedback/state-panel/StatePanel.tsx:46-81`) — base común, **deliberadamente fuera
  del barrel público** (`feedback/index.ts` sólo exporta `STATE_PANEL_HEADING_LEVELS` y su tipo). Es un
  `section` con `aria-labelledby`, con slots `title`, `description`, `action`, `children` y prop
  `headingLevel` (2 | 3 | 4, default 2).
- **`EmptyState`** (`feedback/empty-state/EmptyState.tsx`) — tono neutro, `data-slot="empty-state"`, sin
  rol vivo. El `action` es un slot libre: **ahí van los dos botones de crear** que pide RFC-03 §4.
- **`ErrorState`** (`feedback/error-state/ErrorState.tsx`) — `role="alert"`, tono `danger`, y monta el
  botón "Reintentar" **sólo si se le pasa `onRetry`** (`ERROR_STATE_RETRY_LABEL = "Reintentar"`).

O sea: **cada página NO se escribe su propio panel**; escribe sus **textos** y los pasa por props.

### 3.2 Cómo lo resolvió #19 exactamente

En `DashboardView.tsx:263-289`, cascada de tres ramas en este orden:

1. `errorMessage !== null` → `<ErrorState title={ERROR_TITLE} description={errorMessage} onRetry={reload} />`
   con `ERROR_TITLE = "Se enredó la madeja"` (línea 42). **#20 usa "Se soltó un punto".**
2. `isEmpty` → `<EmptyState title={emptyStateTitle(year)} description={EMPTY_STATE_DESCRIPTION} />`
   (líneas 44-49). **Sin `action`** — #20 sí debería pasarlo (los 2 botones de crear).
3. si no → los paneles, con `loading` bajando por props.

**El skeleton NO es un tercer panel**: vive dentro del panel de lista.
`ActiveProjectsPanel.tsx:100-101` → `visible === null ? <ProjectListSkeleton /> : …`, y
`ProjectListSkeleton` (líneas 144-161) es una `ul` con `aria-busy="true"` y tres `li`, cada uno con un
`Card` que contiene tres `Skeleton`. **Ése es el molde literal para la grilla de #20.**

Textos y constantes exportadas del panel (`ActiveProjectsPanel.tsx:16-22`) para que los tests los
importen: `ACTIVE_SECTION_TITLE`, `SORT_LABEL`, `SEE_ALL_LABEL`, `PROJECTS_ROUTE = "/proyectos"`,
`NO_ACTIVE_PROJECTS_TITLE`, `NO_ACTIVE_PROJECTS_DESCRIPTION`.

> Nota: `ActiveProjectsPanel.tsx:19` ya declara `PROJECTS_ROUTE = "/proyectos"` y `:94-96` enlaza ahí.
> **El "Ver todos" del Dashboard ya apunta a la página que #20 va a crear** — hoy es un enlace a un 404.

### 3.3 La región viva y el anuncio de carga (patrón a copiar, con su deuda)

`DashboardView.tsx:190-192`: **una sola** región `role="status"` con `className="sr-only"` que dice
`LOADING_MESSAGE` mientras carga y `""` cuando termina. Los `Skeleton` son `aria-hidden` y no anuncian
nada solos.

⚠️ **Deuda 114 registrada:** ese `role="status"` es **anónimo**, y el helper `settle()` de **tres**
archivos de test depende de que sea **único** en la pantalla. Si #20 monta el suyo y algún test monta a
la vez una pieza del Dashboard, los selectores se vuelven ambiguos — y *"la ambigüedad de un selector no
falla limpio: falla raro"*. **#20 debería darle nombre a su región viva** (`aria-label`) o usar un
selector no ambiguo en sus tests.

⚠️ **Trampa de contraste (deuda 31), medida y documentada dos veces:** `Field` pinta su etiqueta con el
primer plano oscuro, **ilegible sobre el fondo de la app**, y la variante elevada de `Card` es la única
superficie donde el anillo de foco llega al contraste mínimo. Por eso tanto
`DashboardView.tsx:203` como `ActiveProjectsPanel.tsx:76` **envuelven sus `Field` en un `Card`**.
**La toolbar de #20 tiene campos (buscar, más filtros): le aplica igual.**

También: los textos que van directamente sobre el fondo de la app usan tokens `inverse`
(`ActiveProjectsPanel.tsx:65` usa `text-fg-inverse`; `:121` usa `text-fg-inverse-muted`), mientras que
los que van dentro de un `Card` usan `text-fg` / `text-fg-muted` (`ProjectCard.tsx:54`, `:66`).

---

## 4. Los GATES que #20 debe traer de nacimiento

### 4.1 Deuda 111 — el gate de composición dentro del caparazón: **hay que replicarlo a mano**

Texto de la deuda (`progress/deudas.md:1442-1447`):

> **Ningún gate obliga a que una ruta de `(app)` traiga su test de composición dentro del caparazón.**
> El gate de "un solo ovillo" existe para `/` **porque el implementer lo escribió**; `/proyectos` (#20)
> puede nacer sin él. **Hermana de la 92** (nada obliga a traer el test de `axe`) y de la **101**: las
> tres son la misma enfermedad —invariantes que dependen de que el siguiente agente se acuerde—.
> **Conviene taparlas juntas.**

**Dónde está escrito el gate de #19:** `src/app/(app)/dashboard-page.test.tsx`, líneas 94-149.

Su forma, para replicar (esto es lo que hay que copiar, punto por punto):

- Cabecera `// @vitest-environment happy-dom` (línea 1) — el default de `vitest.config.ts` es `node`.
- **Monta la página real DENTRO del `AppShellClient` real** (líneas 98-102), importándolo por ruta
  directa: `import { AppShellClient } from "@/features/auth/ui/AppShellClient";` (línea 7). No prueba
  las dos mitades por separado — ése es el punto entero del gate.
- Dobla **sólo el borde**: `next/navigation` (`usePathname` controlable, líneas 24-36), `next/link`
  (38-44) y `@/shared/ui/three` (47-51). El doble del ovillo **conserva `data-interactive`**, que es lo
  que distingue hero de fondo.
- **Cuenta con `queryAllByTestId`, no `getByTestId`** (línea 105). El JSDoc de las líneas 11-23 explica
  por qué: *"los cinco tests del repo que mencionaban el ovillo usaban `getByTestId` en singular, y el
  singular **no falla con dos instancias**"*.
- Comprueba además el **slot de fondo por `data-slot`**: `container.querySelector('[data-slot="bg-3d"]')`
  (línea 125) y que dentro no haya ovillo (línea 127).

**Qué debe escribir #20** (p. ej. `src/app/(app)/proyectos/projects-page.test.tsx`), como espejo:

1. con `usePathname()` devolviendo `"/proyectos"`, montar `<AppShellClient><ProyectosPage /></AppShellClient>`
   y aseverar `queryAllByTestId("ascii-yarn")` de longitud **1**, con `data-interactive` en `"false"`;
2. aseverar que ese ovillo **está dentro** del `[data-slot="bg-3d"]` (la otra mitad del par: en `/` está
   fuera, en `/proyectos` está dentro);
3. smoke de composición: la página monta y aporta **un único** encabezado de nivel 1
   (`dashboard-page.test.tsx:162-171` hace exactamente ese aserto para `/`).
   → **Ojo de coherencia:** hoy el único `h1` de la app lo pone `DashboardHero` (`DashboardHero.tsx:47`).
   El `AppShell` no aporta `h1`. #20 tiene que decidir si `/proyectos` trae su propio `h1` — y si lo
   trae, ese aserto es el que lo fija.

⚠️ **Lo que HOY parece cubrir `/proyectos` y NO lo cubre:** `dashboard-page.test.tsx:131-148` sí usa
`routerState.pathname.mockReturnValue("/proyectos")` — **pero renderiza un `<p>Otra página</p>` de
mentira**, no la página real. Prueba la regla del `AppShellClient`, no la página de #20. Cuando exista
`src/app/(app)/proyectos/page.tsx`, ese test **seguirá verde aunque la página monte tres ovillos**.

⚠️ **Deuda 101 (hermana), aplicable a #20:** nada obliga a que un test que monte un `Dialog` compruebe
que soltó el bloqueo del scroll; el aserto vive en el `afterEach` de `Dialog.test.tsx`. #19 se lo
escribió a mano — `DashboardView.test.tsx:185` (`expect(leftover, "un diálogo se fue sin soltar el
bloqueo").toBe("")`). **Si #20 monta un modal para "más filtros", tiene que replicar ese aserto.**

⚠️ **Deuda 92 (hermana):** nada obliga a traer el test de `axe`. La ficha #20 lo pide explícitamente en
su acceptance, así que aquí es contrato, no disciplina — pero nada lo hace fallar si se olvida.

### 4.2 `src/shared/ui/no-hardcode.test.ts` — **confirmado: la carpeta de #20 nace vigilada**

**Confirmado.** La raíz del barrido es `src/`, no `src/shared/ui/`:

```ts
const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));   // línea 41
```

(el archivo vive en `src/shared/ui/`, así que dos niveles arriba es `src/`). El JSDoc de las líneas
21-27 documenta la enmienda **E2.3** y su motivo: *"`features/<x>/ui/` —donde viven las páginas— nacía
sin vigilancia … y taparlo cuesta lo mismo que dejarlo abierto para las once páginas de #19 a #30"*.

**Cuántos archivos barre hoy: 216.** Medición real, no estimación:

```
pnpm exec vitest run src/shared/ui/no-hardcode.test.ts
→ Test Files 1 passed (1) | Tests 436 passed (436)
```

436 = 4 tests del seguro de barrido + **216 archivos × 2** asertos cada uno (`has no raw hex/rgb colors
in …` y `has no raw px sizes in …`, líneas 113 y 122). Recuento por recorrido de directorios con los
mismos filtros del test (`.ts`/`.tsx`, sin `.test.`/`.spec.`, sin `.d.ts`) da también **216**.

**Qué prohíbe** (líneas 63-65): `#` + 3-8 hex, `rgb(`/`rgba(`, y **cualquier literal `NNpx`**.
**No hay allowlist y el JSDoc dice que no se abra ninguna** (líneas 31-33).

**Consecuencia para #20:** todo archivo nuevo bajo `src/features/projects/ui/` y
`src/app/(app)/proyectos/` entra en el barrido **el día que se crea**, sin registrar nada. Los valores
salen de tokens (`globals.css`) o de la escala de Tailwind.

**Además hay un seguro que #20 puede tocar sin querer** (líneas 91-99): el test ancla tres rutas al
literal para que la raíz no se pueda re-estrechar —
`features/dashboard/ui/DashboardView.tsx`, `features/projects/ui/ProjectCard.tsx` y `app/(app)/page.tsx`.
**Si #20 renombrase o moviera `ProjectCard.tsx`, este gate cae.** (Y la ficha #20 dice explícitamente
que **no** se reescribe la card: se reusa y se le añade el quick-start de forma aditiva — enmienda E2.1,
reforzada por el JSDoc de `ProjectCard.tsx:32-36`.)

**Guardrail hermano, mismo alcance:** `src/shared/ui/canonical-tailwind-classes.test.ts` barre también
`src/**` (su `SRC_DIR` es `../../` desde `src/shared/ui/`, línea 47) y exige la forma corta de
paréntesis para consumir un token dentro de una utilidad. #20 nace igual de vigilado ahí.

### 4.3 `src/app/yarn-host-responsive.test.ts` — **alcanza a `/proyectos` solo, con un matiz**

**Estado medido hoy:** `pnpm exec vitest run src/app/yarn-host-responsive.test.ts` → **20 passed**, verde.

Cómo descubre: recorre **todos los `.tsx` de `src/` que no sean tests** (35 archivos hoy, medidos con el
mismo filtro del test: `/\.tsx$/` menos `/\.(test|spec)\.tsx$/`), busca cada línea que renderiza
`<AsciiYarn`, y resuelve su elemento anfitrión — incluso cuando el ovillo se **entrega por prop** a otro
componente, abriendo el archivo de ese componente y buscando dónde pinta la prop (`resolveHost`, líneas
245-282).

**Respuesta a la pregunta:** `/proyectos` queda cubierta **sin hacer nada**, pero por una vía indirecta:
el ovillo que le toca es el del caparazón, y ese ya está descubierto y **clasificado como exento**. El
inventario literal (líneas 409-418) lo dice:

```
"features/auth/ui/AppShellClient.tsx → shared/ui/layout/app-shell/AppShell.tsx <div>"
```

y la clasificación (líneas 425-434) lo pone del lado **fuera de flujo**, porque el `div` del slot lleva
la clase `fixed` (lista `OUT_OF_FLOW = ["fixed", "absolute"]`, línea 83). Un anfitrión fuera de flujo no
reserva espacio, así que no puede dejar hueco: no es una allowlist de nombres, se **deriva de las clases
reales** (JSDoc líneas 61-67).

**El matiz, y es el que importa:** si #20 escribiera un `<AsciiYarn` propio en cualquier `.tsx` bajo
`src/`, el descubrimiento lo encontraría **automáticamente** y el `it` del inventario
(*"encuentra los cuatro ovillos que hay hoy y a quién los aloja"*) **caería en rojo**, porque ese
inventario está escrito al literal a propósito (líneas 394-408 explican por qué: sin él, un recorrido
roto devolvería cero anfitriones y verde con el guardrail apagado). En ese caso habría que:
1. hacer que el anfitrión cumpla el invariante (`hidden` + `tablet:block` en su `className` literal, y
   que su contenedor no reparta el ancho ya en la base), como hace
   `DashboardHero.tsx:58` con `"hidden w-full max-w-sm shrink-0 tablet:block tablet:aspect-square"`;
2. **y después** añadirlo a los dos literales del inventario.

**Recomendación:** #20 **no** monta ovillo propio (RFC-03 no lo pide). Si el gate cae, es señal de que
alguien metió uno — leerlo como aviso, no como estorbo.

⚠️ Un detalle que puede sorprender: el gate exige `className` **literal** en el anfitrión (líneas
303-310) y lanza un error explícito si no lo es. Si #20 hiciera pasar clases por `cn()` o por una
constante en un anfitrión de ovillo, el gate **no falla silenciosamente: explota con mensaje**.

### 4.4 `src/proxy.ts` — **`/proyectos` es privada automáticamente**

**No hay que tocar nada.** La línea que lo decide es `src/proxy.ts:46`, dentro de `isPublicPath`:

```ts
return PUBLIC_PAGES.includes(pathname);
```

con `PUBLIC_PAGES = ["/login", "/register"]` (línea 22). Es **igualdad exacta** y **fail-closed**: todo
lo que no esté en esa lista es privado (lo dice el JSDoc de la línea 14 y el comentario del `matcher`,
líneas 100-103). `/proyectos` no está → cae en `if (!authenticated) return unauthorized(...)`
(líneas 92-94) → redirect 307 a `/login?next=/proyectos` (`unauthorized`, líneas 62-69).

El `matcher` (líneas 104-106) es un literal inline que sólo excluye assets, así que cubre cualquier ruta
nueva sin registrarla. El comentario avisa de que **una constante importada se ignoraría en silencio**.

Esto ya está probado de forma genérica: `src/proxy.test.ts:38-45` usa `/projects` (una ruta que ni
siquiera existe) como sonda de "página privada cualquiera" y verifica 307 + `pathname` `/login` +
`next=/projects`. **Ese test seguirá cubriendo el invariante para `/proyectos` sin cambios.**

---

## 5. El checklist visual del SDD §9 — qué exige, literal, y cómo lo cumplió #19

### 5.1 Lo que exige (`docs/design/SDD-01-design-system.md:259-273`, copiado tal cual)

> ## 9. Verificación (definición de "done" por componente)
>
> 1. **Test de componente / interacción** con **React Testing Library + `user-event`** sobre un entorno
>    DOM (`happy-dom`). Se prueba **comportamiento y accesibilidad** (roles, foco, estados, callbacks),
>    **no píxeles**.
> 2. **Smoke de render:** cada componente monta sin explotar.
> 3. **Assertions de a11y** con `axe` en los primitivos.
> 4. **Typecheck + lint + build** verdes como puerta.
> 5. **Fidelidad visual = revisión manual** contra el mockup de referencia. *Opcional a futuro:*
>    regresión visual automatizada.
>
> > No se testea "que se vea lindo": eso lo valida el humano contra el mockup. Sí se testea
> > comportamiento, a11y y que **cero valores estén hardcodeados** (todo por token).

La ficha #20 lo traduce a: *"Verificación SDD §9: RTL (filtros, quick-start) + axe + smoke + init.sh +
build"*.

### 5.2 Cómo lo cumplió #19, con nombres de archivo

| Punto SDD §9 | Archivo de #19 | Detalle medido |
|---|---|---|
| 1. RTL + `user-event` | `src/features/dashboard/ui/DashboardView.test.tsx` | importa `@testing-library/react` y `@testing-library/user-event` (líneas 4-5); cabecera `// @vitest-environment happy-dom` (línea 1). Bloques: selector de métrica, comparativas, filtros de año y tipo, lista de activos, modal de alta |
| 1. RTL unidades | `src/features/dashboard/ui/filters.test.ts`, `metrics-display.test.ts` | lógica pura de filtros y de presentación de métricas, en `node` |
| 2. Smoke de ruta | `src/app/(app)/dashboard-page.test.tsx:151-172` | `describe("página del Dashboard (smoke de ruta)")` |
| 2. Smoke de layout | `src/app/(app)/app-layout.test.tsx` | el layout es Server Component: `render(await AppLayout({...}))` (línea 61); además asevera `expect(fetchSpy).not.toHaveBeenCalled()` (línea 68) |
| 3. `axe` | `DashboardView.test.tsx:7` (`import { axe } from "vitest-axe"`) y `ProjectCard.test.tsx` | el JSDoc (línea ~26) subraya que **el design system corre de verdad**, sólo se dobla el ovillo, *"así que `axe` mide el marcado real"* |
| 3. `axe` en la card | `src/features/projects/ui/ProjectCard.test.tsx` | la card nueva de #19 trajo el suyo |
| 4. Token-first | `src/shared/ui/no-hardcode.test.ts` | #19 amplió su raíz a `src/` (enmienda E2.3) |
| 4. Breakpoints | `src/shared/ui/breakpoint-tokens.test.ts` | escrito en #19: ata los pares `--bp-…` / `--breakpoint-…` (hoy: `mobile` 640px, `tablet` 768px, `desktop` 1180px, `archive` 1180px — `globals.css:314-326`) |
| 4. Puerta | `bash ./init.sh` | ejecuta **lint** (`eslint .`), **typecheck** (`tsc --noEmit`) y **`pnpm test`** (`vitest run`) — pasos 4 de `init.sh` |
| 4. Build | **`pnpm build`, aparte** | ⚠️ **`init.sh` NO ejecuta `next build`.** El SDD lo exige y la ficha lo lista como ítem separado ("init.sh + build"). **Hay que correrlo a mano.** |
| 5. Fidelidad visual | revisión humana | no automatizado. Ver deuda 102: *"El `@keyframes` está en el bundle, pero nadie ha visto moverse el shimmer"* |

Notas de infraestructura de test relevantes:
- `vitest.config.ts`: `environment: "node"` por defecto; **los tests de UI declaran
  `// @vitest-environment happy-dom` por archivo**. Olvidarlo es el fallo más barato de cometer.
- Alias `@` → `./src` está configurado en `vitest.config.ts`.
- `vitest.setup.ts` es el setup global (ahí es donde las deudas 92/101 proponen subir los asertos).

---

## 6. Checklist accionable para la ficha de #20 (para el leader)

**Debe traer sí o sí:**
- [ ] `src/app/(app)/proyectos/page.tsx` fina (Server Component, rutea y compone).
- [ ] UI en `src/features/projects/ui/` reusando `ProjectCard` **sin reescribirla** (E2.1); el
      quick-start se añade de forma **aditiva**.
- [ ] **Gate de composición dentro del caparazón** (deuda 111), espejo de
      `src/app/(app)/dashboard-page.test.tsx:94-149`: exactamente **un** ovillo en `/proyectos`, **no
      interactivo**, y **dentro** del `[data-slot="bg-3d"]`. Con `queryAllByTestId`, nunca `getByTestId`.
- [ ] `axe` sobre la vista real (deuda 92: nada lo obliga).
- [ ] Si monta `Dialog` para "más filtros": aserto de que soltó el bloqueo (deuda 101, molde en
      `DashboardView.test.tsx:185`).
- [ ] Región viva de carga **con nombre** o selector no ambiguo (deuda 114).
- [ ] `Field` siempre dentro de `Card` sobre el fondo de la app (deuda 31).
- [ ] `bash ./init.sh` **y** `pnpm build` por separado.

**Nace vigilado sin hacer nada:** `no-hardcode.test.ts` (216 archivos), `canonical-tailwind-classes.test.ts`,
`yarn-host-responsive.test.ts` (por herencia del slot `fixed` del shell), `src/proxy.ts` (fail-closed).

**Decisiones de scope abiertas que el leader debería cerrar antes de lanzar al implementer:**
1. **"Buscar"**: el contrato de `GET /api/projects` **no acepta texto libre** → ¿filtrado de cliente o
   cambio de backend? (backend no está fichado en #20).
2. **Segmentado activo/inactivo**: no hay primitivo. ¿Dos `Toggle` con exclusividad impuesta desde el
   consumidor, o primitivo nuevo en `shared/ui/`? (si es nuevo, toca `public-api.test.ts`, que está
   anclado al literal).
3. **"Más filtros"**: no hay disclosure/popover. ¿`Dialog`, `<details>` nativo, o primitivo nuevo?
4. **Enlace**: sigue sin haber primitivo; #19 lo resolvió con una constante de clases ad-hoc. ¿#20 repite
   el ad-hoc o se extrae?
5. **Tercer clon del cliente HTTP de navegador**: ¿se extrae a `shared/lib/` o se ficha como deuda?
6. **Formateo de cronómetro en vivo**: `formatDuration` descarta segundos a propósito. Si el quick-start
   muestra tiempo corriendo, hace falta un formateador nuevo.

---

## 7. Qué NO pude medir

- **No medido:** si existe alguna capa de iconos en el repo. Busqué en `src/shared/ui/` y no encontré
  carpeta de iconos; el Dashboard usa caracteres de texto dentro de `Button size="icon"`. No barrí
  `package.json` en busca de una librería de iconos.
- **No medido:** el comportamiento en navegador real de nada de lo anterior. Todo lo de este informe sale
  de leer los fuentes y de ejecutar dos archivos de test (`no-hardcode.test.ts` → 436 passed;
  `yarn-host-responsive.test.ts` → 20 passed). **No ejecuté la suite completa ni `pnpm build`.**
- **No medido:** si el árbol está globalmente verde hoy. El `git status` de arranque muestra archivos
  modificados sin commitear (incluidos `src/app/(auth)/*` y `src/app/globals.css`) de las deudas
  117/118/119; su estado es trabajo de otra tanda.
