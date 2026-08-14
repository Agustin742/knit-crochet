# Explore — DEUDA 117: `data-slot="bg-3d"` ya no describe lo que hay debajo

**Fecha:** 2026-08-11 · **Modo:** solo investigación (no se tocó `src/**` ni configuración)
**Ficha:** `progress/deudas.md:1500-1509`

Convención de este informe: **[MEDIDO]** = ejecuté algo y pego la salida. **[LEÍDO]** = lectura de
código o de git. **[NO MEDIDO]** = no lo pude comprobar y lo digo.

---

## TL;DR

1. **Sí, el caparazón usa EXACTAMENTE el mismo literal `data-slot="bg-3d"`**
   (`src/shared/ui/layout/app-shell/AppShell.tsx:54`). Son **dos manijas homónimas**, no la misma
   pieza: viven en árboles de render **que nunca coexisten** (las rutas `(auth)` no montan `AppShell`).
   Renombrar el de las páginas de auth **no toca** el del caparazón, y los tests de cada uno están
   separados por archivo. **El riesgo real no es técnico, es de búsqueda**: hoy un `grep bg-3d` mezcla
   las dos cosas.
2. **No hay contrato público sobre los `data-slot`.** `src/shared/ui/public-api.test.ts` ancla
   **nombres de export**, no atributos del DOM. En `docs/` la cadena `data-slot` **no aparece ni una
   vez**. Renombrar es **barato**: cuesta 2 sitios de producción + 2 asertos de test.
3. **La ficha acierta en el `aria-hidden` y acierta hasta en el número de línea**: `AsciiYarn.tsx:59`
   es `aria-hidden="true"` **incondicional**, no depende de props.
4. **El rediseño perdió más de lo que dice la ficha**, y hay un hallazgo que la ficha no registra: el
   ovillo de login pasó de `<AsciiYarn />` (decorativo, `pointer-events-none`) a
   `<AsciiYarn interactive={true} />` (**captura el puntero**). No hay regresión de solapamiento
   —es una celda de rejilla, no una capa encima del formulario— pero **ningún test vigila eso**.
5. **Nombre recomendado: `auth-hero`.** Ver §5.

---

## 1. Radio de explosión de `bg-3d`

### 1.1 [MEDIDO] Barrido exhaustivo en todo el repo

Herramienta: Grep (ripgrep) sobre la raíz, patrón `bg-3d`, sin filtro de ruta. Clasifico las 60+
apariciones por naturaleza. **Sólo 8 son código vivo** (producción + test); el resto son el token CSS,
documentación o informes históricos de `progress/`.

#### A. Código de producción que pone el atributo (2 sitios + 1 en el caparazón = 3)

| Archivo:línea | Qué es |
|---|---|
| `src/shared/ui/layout/app-shell/AppShell.tsx:54` | **El del caparazón.** `<div aria-hidden="true" data-slot="bg-3d" className="pointer-events-none fixed inset-0 z-(--z-bg-3d)">{background}</div>` |
| `src/app/(auth)/login/page.tsx:50` | **El de login.** `<div aria-hidden="true" data-slot="bg-3d" className="">` |
| `src/app/(auth)/register/page.tsx:21` | **El de register.** Idéntico al de login. |

#### B. Tests que buscan por el selector (5 asertos en 3 archivos) — §1.3

#### C. El token CSS `--z-bg-3d` (no es el `data-slot`; no se toca al renombrar)

| Archivo:línea | Qué es |
|---|---|
| `src/app/globals.css:269` | Declaración del token: `--z-bg-3d: 0;` |
| `src/shared/ui/layout/app-shell/AppShell.tsx:55` | **Único consumidor vivo** del token en `src/` (`z-(--z-bg-3d)`) |
| `template/tokens.css:106` | Token en el template de referencia |
| `docs/harness/conventions.md:42, 83`, `docs/harness/conventions.md:119`, `docs/design/SDD-01-design-system.md:159, 209`, `docs/design/rfc/RFC-01-shell.md:34, 46` | Documentación del token / de la capa |

> **Consecuencia importante para el arreglo:** tras el rediseño, **login y register ya no consumen el
> token `--z-bg-3d`** (lo perdieron, §4). El único consumidor que queda es el caparazón. Si se
> renombra el slot de auth, el token **no** queda huérfano.

#### D. Documentación e informes históricos (no ejecutables)

`docs/design/rfc/RFC-01-shell.md`, `docs/design/SDD-01-design-system.md`, `docs/harness/conventions.md`,
`feature_list.json:223, 226`, `template/template-src.html:239`, `progress/history.md:512`,
`progress/current.md:26, 73`, `progress/deudas.md:1493, 1500`, y ~20 archivos en `progress/reports/` y
`progress/informs/`. **Ninguno se ejecuta**; si se renombra, la deuda 117 y `progress/current.md:26`
son los únicos que conviene actualizar (los reports son registro histórico, se dejan como están).

### 1.2 [LEÍDO + MEDIDO] LA PREGUNTA CRÍTICA: ¿es la misma manija o dos homónimas?

**Respuesta sin ambigüedad: DOS MANIJAS HOMÓNIMAS, en árboles que no se cruzan.**

Cadena de evidencia:

- `src/app/layout.tsx:38-47` — el layout raíz es sólo `<html><body>{children}</body></html>`.
  **No monta `AppShell`.**
- `src/app/(app)/layout.tsx:17-25` — el grupo privado monta `<AppShellClient>`, que en
  `src/features/auth/ui/AppShellClient.tsx:78-86` monta `<AppShell background={...}>`. **Aquí sí
  existe el `bg-3d` del caparazón.**
- `src/app/(auth)/layout.tsx:11-17` — el grupo de auth es un `<main className="relative flex
  min-h-dvh ...">` pelado. **No monta `AppShell`, no hay caparazón, no hay slot del shell.**

Por lo tanto: cuando se renderiza `/login` o `/register`, en el documento hay **exactamente un**
elemento con `[data-slot="bg-3d"]` (el de la página). Cuando se renderiza cualquier ruta de `(app)`,
hay **exactamente uno** (el del caparazón). **Nunca hay dos.**

- **Qué significa para el arreglo:** renombrar el de las páginas de auth es una operación **local y
  segura**. No colisiona, no hay `querySelector` que se vuelva ambiguo, no hay CSS por atributo
  (el `data-slot` no se usa como selector en ninguna hoja de estilos — sólo hay `data-slot` en TSX y
  en tests; [MEDIDO] el grep de `data-slot` no devolvió ni un `.css`).
- **Lo que sí se rompe con el rename:** el hábito. Hoy `grep bg-3d` te da las dos cosas mezcladas, y
  dos de los cinco asertos de test (§1.3) que parecen hablar de lo mismo hablan de piezas distintas.
  Renombrar **mejora** eso, no lo empeora.

### 1.3 [LEÍDO] Todos los tests que buscan por el selector

| # | Archivo:línea | A cuál de los dos agarra | Qué aserta |
|---|---|---|---|
| 1 | `src/app/(auth)/auth-pages.test.tsx:85-87` | **El de login (página)** | `slot` no es `null`; `slot` tiene `aria-hidden="true"`. Además `:84` comprueba `getByTestId("ascii-yarn")`. Es el "gate de login" que cita la ficha 117. |
| 2 | `src/app/(auth)/auth-pages.test.tsx:228-230` | **El de register (página)** | Idéntico al anterior: no `null` + `aria-hidden="true"`. Es el gate reescrito por la deuda 116; su JSDoc (`:218-222`) **ya anuncia la deuda 117 por su nombre**. |
| 3 | `src/shared/ui/layout/layout.test.tsx:42-44` | **El del caparazón** | Que el `background` inyectado se renderiza **dentro** del slot (`slot.querySelector("[data-testid='bg-scene']")` no es `null`). |
| 4 | `src/app/(app)/dashboard-page.test.tsx:125-127` | **El del caparazón** | En `/`, el slot **existe pero está VACÍO** (el hero se monta en el flujo, no ahí). Enmienda E1.2. |
| 5 | `src/app/(app)/dashboard-page.test.tsx:143-147` | **El del caparazón** | Fuera de `/`, el slot **sí** contiene el ovillo. |

Menciones en comentarios, no ejecutables: `auth-pages.test.tsx:194` y `:218`.

**Reparto limpio:** los asertos **1 y 2** son los únicos que hay que ajustar al renombrar el slot de
auth. Los **3, 4 y 5** son del caparazón y **no se tocan**. Ningún archivo de test mezcla los dos.

### 1.4 [MEDIDO] Estado verde de partida

```
$ pnpm vitest run "src/app/(auth)/auth-pages.test.tsx" "src/shared/ui/layout/layout.test.tsx" "src/app/(app)/dashboard-page.test.tsx"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  3 passed (3)
      Tests  50 passed (50)
   Start at  00:04:03
   Duration  11.14s (transform 2.51s, setup 3.61s, import 7.24s, tests 5.54s, environment 6.45s)
```

Los tres archivos que tocan `bg-3d` están en verde **hoy**. Es la línea base contra la que medir el
arreglo. **[NO MEDIDO]** la suite completa (`bash ./init.sh`) — no la ejecuté en esta exploración.

---

## 2. La convención de `data-slot` en este repo

### 2.1 [MEDIDO] Censo completo de valores en `src/**` (17 valores, 15 componentes)

| Valor | Quién lo pone (archivo:línea) |
|---|---|
| `ascii-yarn` | `src/shared/ui/three/ascii-yarn/AsciiYarn.tsx:60` |
| `toggle-group` | `src/shared/ui/primitives/toggle/ToggleGroup.tsx:30` |
| `toggle` | `src/shared/ui/primitives/toggle/Toggle.tsx:43` |
| `skeleton` | `src/shared/ui/primitives/skeleton/Skeleton.tsx:43` |
| `progress-bar` | `src/shared/ui/primitives/progress-bar/ProgressBar.tsx:66` |
| `progress-bar-fill` | `src/shared/ui/primitives/progress-bar/ProgressBar.tsx:76` |
| `dialog-scrim` | `src/shared/ui/primitives/dialog/Dialog.tsx:243` |
| `dialog` | `src/shared/ui/primitives/dialog/Dialog.tsx:250` |
| `error-state` | `src/shared/ui/feedback/error-state/ErrorState.tsx:49` |
| `empty-state` | `src/shared/ui/feedback/empty-state/EmptyState.tsx:22` |
| `leaf` | `src/shared/ui/layout/archive-nav/ArchiveNav.tsx:116` |
| `sheet` | `src/shared/ui/layout/archive-nav/ArchiveNav.tsx:129` |
| `track` | `src/shared/ui/layout/archive-nav/ArchiveNav.tsx:134` |
| `tab` | `src/shared/ui/layout/archive-nav/ArchiveNav.tsx:140` |
| `account-band` | `src/shared/ui/layout/account-band/AccountBand.tsx:49` |
| `account-name` | `src/shared/ui/layout/account-band/AccountBand.tsx:52` |
| `bg-3d` | `AppShell.tsx:54`, `login/page.tsx:50`, `register/page.tsx:21` |

**Patrón que emerge (no escrito, pero unánime en 16 de 17 casos):**

- **kebab-case**, siempre. Coherente con la fila "Componente (carpeta) → `kebab-case/`" de
  `docs/harness/conventions.md:43`.
- El valor nombra **la pieza que el elemento ES**: o el componente entero (`toggle`, `skeleton`,
  `dialog`, `account-band`) o **una parte suya con prefijo del padre** (`progress-bar-fill`,
  `dialog-scrim`, `account-name`), o una parte con nombre de dominio dentro de un componente
  concreto (`leaf`, `sheet`, `track`, `tab` en `ArchiveNav`).
- Lo pone **el componente dueño**, dentro de `src/shared/ui/**`. **`bg-3d` en las páginas de auth es
  la ÚNICA vez que un `data-slot` se escribe fuera del design system**, en `src/app/**`.
- **`bg-3d` es la única excepción semántica del censo:** no nombra una pieza, nombra **un rol de capa**
  (*"el fondo 3D"*). En el caparazón ese nombre sigue siendo cierto; en las páginas de auth, no.

### 2.2 [MEDIDO] ¿Hay convención escrita?

- `docs/harness/conventions.md` — la tabla "Nombres" (`:31-43`) **no tiene fila para `data-slot`**.
  [MEDIDO] Grep de `data-slot` sobre todo `docs/`: **`No matches found`**. La cadena `data-slot` **no
  aparece en NINGÚN documento** del repo (ni SDD-01, ni RFC, ni conventions, ni verification).
- `template/` — [MEDIDO] `grep -rn "data-slot" template/` devolvió **cero líneas**. El template
  original ni siquiera usa el mecanismo; es una invención del port.

**Conclusión:** la convención es **de facto, no escrita**. Un rename no contradice ningún documento.
**Oportunidad barata:** al cerrar la 117, añadir una fila a la tabla de `conventions.md:31-43`
(`data-slot` → `kebab-case`, nombra la pieza, lo pone el componente dueño) convierte una costumbre
tácita en una regla. Es exactamente el tipo de deuda que reaparece porque nadie la escribió.

### 2.3 [LEÍDO] ¿Son parte del contrato público del design system?

**No.** `src/shared/ui/public-api.test.ts:20-58` ancla listas literales de **nombres de export**
(`PRIMITIVES`, `FEEDBACK`, `NEW_IN_UI_PRIMITIVES_2`) comparadas con `toEqual`. Su JSDoc (`:7-19`) dice
explícitamente que lo que protege es *"quien lo consuma importa por estos nombres"* — la superficie de
**módulo**, no la del DOM. [MEDIDO] grep de `slot` en ese archivo: **`No matches found`**.

Otros posibles anclajes de superficie que revisé y **tampoco** miran `data-slot`:
`src/shared/ui/breakpoint-tokens.test.ts`, `src/shared/ui/canonical-tailwind-classes.test.ts`,
`src/shared/ui/no-hardcode.test.ts` (no aparecen en el censo del §2.1, que barrió todo `src/`).

**Veredicto de coste: RENOMBRAR ES BARATO.** No rompe ningún contrato declarado. El precio total del
rename son **2 líneas de producción** (`login/page.tsx:50`, `register/page.tsx:21`) y **2 asertos**
(`auth-pages.test.tsx:85`, `:228`), más los comentarios que lo citan.

---

## 3. El `aria-hidden` redundante — VERIFICADO

### 3.1 [LEÍDO] La afirmación de la ficha es CIERTA, y la línea no se movió

`src/shared/ui/three/ascii-yarn/AsciiYarn.tsx` (ojo: la ruta real lleva el subdirectorio
`ascii-yarn/`, la ficha la abrevia). El elemento raíz del componente, líneas **57-68**:

```tsx
  return (
    <div
      aria-hidden="true"
      data-slot="ascii-yarn"
      data-interactive={String(interactive)}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden text-accent",
        interactive ? "pointer-events-auto" : "pointer-events-none",
        glow && "text-shadow-(--shadow-glow)",
        className,
      )}
    >
```

- **`aria-hidden="true"` está en la línea 59 exacta** que cita la ficha 117.
- **Es INCONDICIONAL.** Es un literal en el JSX, no una expresión. No hay prop que lo module:
  `AsciiYarnProps` (`:19-34`) declara `interactive`, `glow`, `cols`, `rows`, `className` — **ninguna
  toca la accesibilidad**. La única prop que se compone condicionalmente en ese mismo `div` es
  `pointer-events-*` según `interactive` (`:64`).
- El JSDoc lo declara como invariante (`:45-46`): *"Es puramente decorativo: siempre `aria-hidden`. Un
  loader que lo use debe poner su propio `role="status"` con texto alrededor."*

### 3.2 Si el envoltorio quita su `aria-hidden`, ¿el ovillo sigue fuera del árbol accesible?

**Sí.** `aria-hidden` se hereda hacia abajo, así que hoy hay dos capas anidadas diciendo lo mismo. Al
quitar el del envoltorio, el `div` del propio `AsciiYarn` sigue poniendo `aria-hidden="true"` sobre sí
mismo y todo su subárbol (el `<pre>` del ASCII y el `<canvas>`). **El envoltorio de la página no aporta
nada al árbol accesible**: no tiene texto propio, no tiene rol, sólo contiene al ovillo.

Precedente en el propio repo que lo confirma: `src/features/dashboard/ui/DashboardHero.tsx:58-60` monta
el ovillo **en el flujo** y su envoltorio es un `<div>` **sin `aria-hidden` y sin `data-slot`**:

```tsx
      <div className="hidden w-full max-w-sm shrink-0 tablet:block tablet:aspect-square">
        <AsciiYarn interactive />
      </div>
```

Ese es el patrón canónico de "ovillo en el flujo" ya aprobado en este repo, y las páginas de auth
—que ahora hacen exactamente lo mismo— se apartan de él sin motivo.

### 3.3 [LEÍDO] El doble: qué ve y qué NO puede ver `auth-pages.test.tsx`

`src/app/(auth)/auth-pages.test.tsx:18-20`:

```tsx
vi.mock("@/shared/ui/three", () => ({
  AsciiYarn: () => <span data-testid="ascii-yarn" />,
}));
```

- **El doble es un `<span>` pelado con un `data-testid`.** No renderiza `aria-hidden`, no renderiza
  `data-slot="ascii-yarn"`, no renderiza `data-interactive`, no renderiza clases, y **ignora todas las
  props** (ni siquiera declara `interactive` en su firma).
- Las páginas importan `AsciiYarn` desde `@/shared/ui` (barril), no desde `@/shared/ui/three`, pero el
  mock funciona igual porque el barril reexporta ese mismo módulo resuelto — [MEDIDO] los tests pasan y
  `getByTestId("ascii-yarn")` encuentra el doble (§1.4).
- **Confirmado el límite que declara el propio test** (`:213-217`): el `aria-hidden` que comprueban los
  asertos `:87` y `:230` es **el del envoltorio de la página**, el único que existe en ese render. El
  real de `AsciiYarn` está fuera de alcance aquí y lo cubren sus propios tests
  (`src/shared/ui/three/ascii-yarn/ascii-yarn.test.tsx`, que sí busca `[data-slot='ascii-yarn']` en
  `:140, :168, :185, :194`).
- **Implicación operativa para quien arregle la 117:** si se quita el `aria-hidden` del envoltorio
  **sin tocar los tests**, los asertos `:87` y `:230` **caen en rojo** — no porque haya un problema de
  accesibilidad, sino porque el doble no reproduce el atributo real. El arreglo tiene que decidir a la
  vez **qué atributo asertan** esos dos gates. Opciones honestas: (a) mantener el `aria-hidden` en el
  envoltorio (redundante pero verificable en este test), o (b) quitarlo y que los gates asertan sólo
  la presencia del slot renombrado, delegando la accesibilidad a `ascii-yarn.test.tsx` con un
  comentario que lo diga. Recomiendo **(b)**, alineado con `DashboardHero`.

---

## 4. El `className=""` — y lo que el rediseño PERDIÓ

### 4.1 [LEÍDO] Confirmado: es literalmente la cadena vacía, en las dos páginas

`src/app/(auth)/login/page.tsx:48-54`:

```tsx
      <div
        aria-hidden="true"
        data-slot="bg-3d"
        className=""
      >
        <AsciiYarn interactive={true} />
      </div>
```

`src/app/(auth)/register/page.tsx:19-25`: **idéntico**, mismo `className=""`.

Es una prop que no hace nada: React emite `class=""` en el HTML. Rastro fósil del atributo que se
vació a mano en vez de borrarse.

### 4.2 [MEDIDO] El código viejo, textual

Commit del rediseño: `bdb11b0` (*"feat: Dashboard Page fix minor visual error login/register"*,
2026-08-07). [MEDIDO] `git log --oneline -- "src/app/(auth)/login/page.tsx"` devuelve **sólo dos
commits**: `bdb11b0` y `8ab6b99` (`feat: implement auth UI`), así que el estado previo es
inequívocamente el de `bdb11b0^`.

**LOGIN — antes** (`git show "bdb11b0^:src/app/(auth)/login/page.tsx"`):

```tsx
  return (
    <>
      <div
        aria-hidden="true"
        data-slot="bg-3d"
        className="pointer-events-none absolute inset-0 z-(--z-bg-3d)"
      >
        <AsciiYarn />
      </div>

      <LoginForm
        next={resolveNextPath(
          typeof requestedNext === "string" ? requestedNext : null,
        )}
      />
    </>
  );
```

**LOGIN — ahora** (`login/page.tsx:40-56`): fragmento `<>` → `<div className="grid grid-cols-2 px-20">`,
el orden se invierte (formulario primero, ovillo después), `className` a `""`, y `<AsciiYarn />` pasa a
`<AsciiYarn interactive={true} />`.

**REGISTER — antes** (`git show "bdb11b0^:src/app/(auth)/register/page.tsx"`), el archivo entero:

```tsx
export default function RegisterPage() {
  return <RegisterForm />;
}
```

> **Dato que la ficha 117 no distingue:** en `register` **no se perdió nada** — el envoltorio con
> `data-slot="bg-3d"` **es enteramente nuevo**, copiado y pegado del de login ya vaciado. El nombre
> mentiroso nació mentiroso ahí. La pérdida es sólo de `login`.

### 4.3 Inventario de lo que se perdió en `login`

| Clase perdida | Qué hacía | ¿Regresión hoy? |
|---|---|---|
| `absolute inset-0` | Posicionamiento absoluto a los cuatro lados, colgando del `relative` del `<main>` del layout de auth | **No es regresión, es el rediseño.** Ahora es una celda de rejilla en el flujo. Pero deja **un cabo suelto documental**: ver §4.4. |
| `z-(--z-bg-3d)` | Token de capa: el ovillo por detrás del contenido | **No es regresión funcional** (sin posicionamiento, el z-index no aplicaría igual: `z-index` sobre un elemento `static` no crea orden de apilado). Pero es la **desconexión del sistema de capas**: el ovillo de auth ya no participa del contrato de z del SDD (`SDD-01-design-system.md:159`). |
| `pointer-events-none` | El ovillo no capturaba el puntero | **Ver §4.4 — es el hallazgo importante.** |

### 4.4 Los dos hallazgos que la ficha 117 NO registra

**(a) El ovillo de auth pasó a capturar el puntero, y fue DELIBERADO — pero nada lo vigila.**

No es sólo que el envoltorio perdiera `pointer-events-none`: el componente cambió de
`<AsciiYarn />` (por defecto `interactive = false`, `AsciiYarn.tsx:49`) a
`<AsciiYarn interactive={true} />`. Con `interactive` activo, el propio host del ovillo se pone
`pointer-events-auto` (`AsciiYarn.tsx:64`) y `AsciiYarnScene` habilita el arrastre.

**¿Hay regresión de "el ovillo tapa el formulario"? NO.** [LEÍDO] La rejilla es
`grid grid-cols-2 px-20`: el formulario ocupa la columna 1 y el ovillo la columna 2. **No se solapan**,
así que el ovillo interactivo no puede robarle clics al formulario. La pérdida de
`pointer-events-none` es coherente con el cambio a `interactive`, no un descuido.

**Lo que sí es deuda:** el JSDoc de `login/page.tsx:18-21` sigue afirmando lo contrario —
*"Se sigue la receta del slot de `AppShell`: decorativo, fuera del árbol accesible, **sin capturar el
puntero** y **por detrás del contenido**"*. Dos de esas cuatro cláusulas ya son falsas. Y **ningún
test comprueba `data-interactive`, `pointer-events` ni posicionamiento en las páginas de auth**: los
gates `:85-87` y `:228-230` sólo miran existencia + `aria-hidden`. La pérdida pasó desapercibida
porque nada la medía. **[NO MEDIDO]** en navegador: no comprobé visualmente el arrastre en `/login`.

**(b) `src/app/(auth)/layout.tsx` quedó con un comentario huérfano.** Su JSDoc (`:8-9`) dice: *"Es
también quien declara el posicionamiento relativo del que se cuelga el ovillo ASCII de la página de
login."* Ese `relative` (línea 14) ya **no sostiene nada**: el `absolute` que colgaba de él se borró
en `bdb11b0`. Es la misma clase de mentira que la 117 pero en otro archivo.

**(c)** El JSDoc de `register/page.tsx:11` sigue diciendo *"**Sin ovillo de fondo**: el RFC-01 §2 lo
reserva para login"* justo encima del código que monta el ovillo. Contradicción directa.

Los tres son del mismo lote: **el rediseño movió el código y dejó atrás los comentarios y el nombre.**
Recomiendo cerrarlos junto a la 117 — es el mismo archivo abierto y el mismo tipo de mentira.

---

## 5. Nombres candidatos

Restricciones que salen del §2: kebab-case; nombra **la pieza que ES**, no su rol de capa; no debe
colisionar con `bg-3d` (que se queda en el caparazón, donde sigue siendo verdad) ni con `ascii-yarn`
(que ya lo pone el componente hijo, `AsciiYarn.tsx:60` — **un envoltorio no puede llamarse igual que
su hijo o `querySelector` devuelve el de fuera y nadie lo nota**).

| Candidato | A favor | En contra |
|---|---|---|
| **`auth-hero`** | Dice el **rol en la página** con el vocabulario que el repo ya usa para "el ovillo grande y arrastrable en el flujo" (`DashboardHero`, `HERO_PATHS` en `AppShellClient.tsx:17`, RFC-02 §2, los tests del Dashboard). Prefijo del contexto (`auth-`) como `account-name`/`progress-bar-fill`. Sirve igual en login y register. | "Hero" es jerga de diseño; hay que saberla. |
| `yarn-panel` | Descriptivo y literal: el panel donde vive el ovillo. Independiente de la jerga. | Inventa el término "panel", que no existe en el censo del §2.1. Y "yarn-" se acerca a `ascii-yarn` lo bastante para confundir en un grep. |
| `auth-visual` | Neutro; sobrevive si mañana el ovillo se cambia por otra cosa. | Vago: "visual" no describe nada concreto; es casi tan poco informativo como `bg-3d`. |

**RECOMIENDO `auth-hero`.** Razones, en orden:

1. **Es verdad hoy y describe la pieza**: media pantalla, en el flujo, junto al formulario,
   arrastrable (`interactive={true}`) — eso es exactamente un hero, no un fondo.
2. **Reutiliza vocabulario ya asentado** en el repo (`DashboardHero`, `HERO_PATHS`), así que un lector
   que venga del Dashboard lo entiende sin preguntar, y refuerza el eje conceptual que ya existe:
   *hero = ovillo en el flujo e interactivo* frente a *`bg-3d` = capa fija, decorativa, detrás*.
   Renombrar **restaura esa distinción**, que hoy está rota porque el auth usa el nombre del fondo
   para un hero.
3. **Desambigua el grep de golpe**: tras el cambio, `bg-3d` señala **sólo** el caparazón y `auth-hero`
   **sólo** las páginas de auth. Las "dos manijas homónimas" del §1.2 dejan de serlo.
4. Coste: 2 líneas de producción + 2 asertos (§2.3). **No aplicado** — esto es sólo la propuesta.

**Alcance sugerido para la ficha de arreglo** (para que no vuelva a quedarse a medias): renombrar el
slot en `login/page.tsx:50` y `register/page.tsx:21`; borrar el `className=""`; decidir el
`aria-hidden` según §3.3; ajustar `auth-pages.test.tsx:85` y `:228`; y corregir los tres comentarios
mentirosos de §4.4 (`login/page.tsx:18-21`, `register/page.tsx:11`, `(auth)/layout.tsx:8-9`).
Opcional y barato: la fila de `data-slot` en `docs/harness/conventions.md` (§2.2).

---

## Apéndice — qué NO medí

- **No ejecuté `bash ./init.sh`** (suite completa). Sólo los 3 archivos de test que tocan `bg-3d` (§1.4).
- **No abrí un navegador.** Nada de lo que digo sobre apariencia, solapamiento real, arrastre efectivo
  del ovillo en `/login` o comportamiento responsive está medido en pantalla. La afirmación de que el
  ovillo interactivo no roba clics al formulario es **lectura de la rejilla CSS**, no observación.
  Coincide con la familia de la deuda 118, que ya declara ese mismo límite.
- **No verifiqué** si `px-20` / `grid-cols-2` violan alguna regla de `no-hardcode.test.ts`; queda fuera
  del alcance de la 117 y roza la 118.
