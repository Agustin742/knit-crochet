# explore_fix20_design_system — Design system disponible para rehacer el toolbar de #20

Explorador de sólo lectura. **Todo dato de este informe sale de leer el archivo citado**; donde no
pude verificar algo, dice `NO VERIFICADO`. Los contrastes se calcularon con la fórmula WCAG 2.x
(relative luminance) sobre los valores hexadecimales leídos en `src/app/globals.css`, con un script
descartable en el scratchpad — no se copiaron de ninguna ficha.

---

## 1. Inventario de `src/shared/ui/`

### 1.1 El barrel raíz

`src/shared/ui/index.ts` (6 líneas, completo):

```ts
export { cn } from "./lib/cn";
export { usePrefersReducedMotion } from "./lib/usePrefersReducedMotion";
export * from "./feedback";
export * from "./layout";
export * from "./primitives";
export * from "./three";
```

Superficie pública resultante, derivada de los barrels de cada capa (todos leídos):

| Capa | Archivo | Exports de valor | Exports de tipo |
|---|---|---|---|
| lib | `src/shared/ui/index.ts:1-2` | `cn`, `usePrefersReducedMotion` | — |
| primitives/button | `primitives/button/index.ts` | `Button`, `buttonVariants` | `ButtonProps`, `ButtonVariants` |
| primitives/card | `primitives/card/index.ts` | `Card`, `cardVariants` | `CardProps`, `CardVariants` |
| primitives/dialog | `primitives/dialog/index.ts` | `DIALOG_CLOSE_LABEL`, `Dialog`, `DIALOG_SIZES` | `DialogProps`, `DialogSize` |
| primitives/field | `primitives/field/index.ts` | `Field`, `Input`, `inputClasses` | `FieldProps`, `InputProps` |
| primitives/progress-bar | `primitives/progress-bar/index.ts` | `PROGRESS_MAX`, `PROGRESS_MIN`, `ProgressBar`, `clampProgress`, `PROGRESS_TONES` | `ProgressBarProps`, `ProgressTone` |
| primitives/skeleton | `primitives/skeleton/index.ts` | `Skeleton`, `SKELETON_SHAPES` | `SkeletonProps`, `SkeletonShape` |
| primitives/toggle | `primitives/toggle/index.ts` | `Toggle`, `ToggleGroup` | `ToggleProps`, `ToggleGroupProps` |
| feedback/empty-state | `feedback/empty-state/index.ts` | `EmptyState` | `EmptyStateProps` |
| feedback/error-state | `feedback/error-state/index.ts` | `ERROR_STATE_RETRY_LABEL`, `ErrorState` | `ErrorStateProps` |
| feedback (barrel) | `feedback/index.ts:8-11` | `STATE_PANEL_HEADING_LEVELS` | `StatePanelHeadingLevel` |
| layout | `layout/index.ts` | `AccountBand`, `AppShell`, `ArchiveNav`, `BottomNav`, `NAV_ITEMS`, `isRouteActive` | `AccountBandProps`, `AccountUser`, `AppShellProps`, `ArchiveNavProps`, `BottomNavProps`, `NavItem` |
| three | `three/index.ts` → `three/ascii-yarn/index.ts` | `AsciiYarn` | `AsciiYarnProps` |

`StatePanel` (la base compartida de `EmptyState`/`ErrorState`) **no** se exporta: `feedback/index.ts:1-11`
sólo saca de él `STATE_PANEL_HEADING_LEVELS` y su tipo, con el motivo escrito en el comentario
(*"`StatePanel` es su implementación compartida y queda deliberadamente fuera de la API pública"*).

`cn` es `twMerge(clsx(...))` (`src/shared/ui/lib/cn.ts:4-6`): un `className` del llamador **gana** sobre
la clase equivalente de la variante (por eso `Card className="p-(--space-3)"` sustituye el
`p-(--space-5)` de la base, no lo suma).

### 1.2 `Card` — `primitives/card/Card.tsx`, `primitives/card/card.variants.ts`

```ts
// Card.tsx:7-22
export interface CardProps extends HTMLAttributes<HTMLDivElement>, CardVariants {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, ...props }, ref,
) {
  return <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />;
});
```

- Es un `<div>`; acepta **todos** los atributos de `HTMLDivElement`, incluido `className`, `role`,
  `aria-label`, `id`. Reenvía `ref`.
- Variantes (`card.variants.ts:13-29`), **dos**, eje único `variant`:
  - base: `"border-(length:--border-width) border-solid border-border rounded-md"` + `"p-(--space-5) text-fg"`
  - `raised`: `"bg-surface-raised shadow-hard-lg"` ← **default** (`defaultVariants: { variant: "raised" }`)
  - `flat`: `"bg-surface shadow-none"`
- **No hay variante sin padding ni sin borde.** Para quitar el relleno hay que pisar `p-*` desde
  `className` (funciona por `twMerge`).
- Comentario de cabecera (`card.variants.ts:5-12`): la tarjeta declara **primer plano junto a fondo**
  (`text-fg`) porque el `body` es oscuro y todo lo que no declare color hereda crema (deuda 32, saldada).

### 1.3 `Field` — `primitives/field/Field.tsx`

```ts
// Field.tsx:19-27
export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;
  className?: string;
  /** El control (p. ej. <Input />). Field le cablea id + aria de accesibilidad. */
  children: ReactElement<ControlProps>;
}
```

- `"use client"` en la línea 1. No tiene variantes (`cva` no interviene).
- Contenedor: `cn("flex flex-col gap-(--space-2)", className)` (línea 54).
- **Etiqueta (línea 55-60):** `<label htmlFor className="font-body font-semibold text-sm text-fg">`.
  El token de color es **`text-fg`**, es decir `--fg` = `--brand-espresso`. Es el dato central de la
  pregunta 3.
- Mensaje (hint/error, líneas 62-72): `"font-mono text-xs leading-base"` + `text-danger` si hay error,
  `text-fg-muted` si es hint. `text-fg-muted` = `--fg-muted` = `#7a6753`.
- Cablea sobre el hijo `id`, `aria-invalid` y `aria-describedby` vía `cloneElement` (líneas 45-51):
  el hijo tiene que aceptar esas props. Un `<select>` crudo las acepta (así se usa hoy en
  `ProjectsToolbar.tsx:132-149`).
- **No acepta un `className` separado para la etiqueta.** El único gancho es el `className` del
  contenedor. Cambiar el color de la etiqueta desde fuera exigiría un `[&>label]:…` o tocar el primitivo.

### 1.4 `Input` + `inputClasses` — `primitives/field/Input.tsx`

```ts
// Input.tsx:8-19
export const inputClasses = [
  "box-border w-full min-h-(--touch-target)",
  "px-(--space-4) py-(--space-2)",
  "font-body text-base leading-base",
  "border-(length:--border-width) border-solid border-border rounded-sm",
  "bg-surface-raised text-fg",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
  "aria-[invalid=true]:border-danger",
  "aria-[invalid=true]:shadow-[0_0_0_var(--border-width-heavy)_color-mix(in_srgb,var(--danger)_15%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted",
].join(" ");

export type InputProps = InputHTMLAttributes<HTMLInputElement>;
```

- Sin variantes. `w-full` **de fábrica**: dentro de una fila flexible, el `Input` se estira a lo que
  le dé su contenedor; el ancho se gobierna desde el envoltorio (hoy no hay ningún `max-w-*` puesto
  por el toolbar, `ProjectsToolbar.tsx:115-125`).
- Alto mínimo `min-h-(--touch-target)` = 44 (mismo token que `Toggle`).
- `inputClasses` se exporta para reusarlo en controles que no son `<input>` — así se estilan los dos
  `<select>` de "Más filtros" (`ProjectsToolbar.tsx:133`, `:153`).
- **Su fondo es `bg-surface-raised`**: el propio control ya es una superficie clara, independientemente
  de la superficie sobre la que se monte.

### 1.5 `Toggle` / `ToggleGroup` — `primitives/toggle/`

```ts
// Toggle.tsx:9-15
export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-pressed"> {
  pressed: boolean;                              // controlado, sin estado propio
  onPressedChange?: (pressed: boolean) => void;  // recibe el estado AL QUE SE PASA
}
```

- Renderiza `<button type="button" data-slot="toggle" aria-pressed={pressed}>` (`Toggle.tsx:40-55`).
- Sin ejes de variante: `toggleVariants` es un `cva` de lista plana (`toggle.variants.ts:17-32`).
  Clases relevantes para el layout: `"inline-flex items-center justify-center gap-(--space-2)"`,
  `"min-h-(--touch-target) px-(--space-4) py-(--space-2)"`, `"border-(length:--border-width) … rounded-md"`,
  `"bg-surface-raised text-fg shadow-hard"`, activo `"aria-pressed:bg-accent aria-pressed:text-accent-fg"`
  (+ desplazamiento y sombra dura al presionarse), foco
  `"focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width-heavy)"`.
  **`min-h-(--touch-target)` = 44px es el alto medido del segmentado.**
- `ToggleGroup` (`ToggleGroup.tsx:7-38`): `label: string` obligatorio; renderiza
  `<div data-slot="toggle-group" role="group" aria-label={label}>` con
  `toggleGroupVariants` = `"flex flex-wrap items-center gap-(--space-2)"` (`toggle.variants.ts:39-41`).
  **Ya trae `flex flex-wrap items-center gap-(--space-2)`**, así que el `className` que le pasa hoy el
  toolbar (`"flex flex-wrap gap-(--space-2)"`, `ProjectsToolbar.tsx:87` y `:102`) es **redundante**:
  repite lo que la variante ya declara.
- `Omit<…, "role">` en las props: no se le puede cambiar el rol desde fuera.

### 1.6 `EmptyState` — `feedback/empty-state/EmptyState.tsx` (+ `StatePanel`)

```ts
export interface EmptyStateProps extends Omit<StatePanelProps, "tone"> {}
// → StatePanel con tone="neutral" y data-slot="empty-state"
```

`StatePanelProps` (`feedback/state-panel/StatePanel.tsx:18-31`):

```ts
export interface StatePanelProps extends Omit<HTMLAttributes<HTMLElement>, "title">, StatePanelVariants {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;                        // slot libre
  headingLevel?: StatePanelHeadingLevel;     // 2 | 3 | 4, default 2
}
```

Marcado: `<section aria-labelledby={titleId}>` + `<hN>` + `<p>` + `children` + `action`
(`StatePanel.tsx:63-79`). Clases (`state-panel.variants.ts:32-56`):
base `"flex flex-col items-center gap-(--space-3) text-center"`, `"p-(--space-8)"`,
`"border-(length:--border-width) border-solid rounded-md"`; tono `neutral` =
`"border-border bg-surface text-fg shadow-none"`, tono `danger` = `"border-danger bg-surface text-fg shadow-hard"`.
`ErrorState` = mismo panel con `role="alert"`, `tone="danger"` y botón de reintento opcional
(`feedback/error-state/ErrorState.tsx:34-56`).

---

## 2. ¿Hay primitiva de aviso/notificación?

**NO existe** ninguna primitiva llamada `Alert`, `Notice`, `Banner`, `Toast`, `Callout`, `StatusMessage`,
`Badge`, `Chip`, `Tag` ni `Tooltip` en `src/shared/ui/`. Verificado con un `grep` de esos nueve nombres
sobre todo `src/shared/ui`: los **únicos** dos aciertos son `mainOpeningTag()` en
`primitives/dialog/dialog.portal.tokens.test.ts:85` y `:105` — una función de test, no un componente.
El inventario completo de la sección 1.1 lo confirma por la otra vía.

Lo más parecido que hay, en orden de cercanía:

1. **`ErrorState`** (`feedback/error-state/ErrorState.tsx`) — es literalmente un panel con
   `role="alert"` y marco `--danger`, pero es un **panel de página entera** (`p-(--space-8)`,
   `items-center text-center`, título + descripción + acción), pensado para sustituir al contenido, no
   para acompañarlo. Su propio JSDoc lo describe como "algo falló y hay que decirlo".
2. **`EmptyState`** — mismo panel, tono neutro, sin `role`.
3. Fuera del design system, el patrón "cajita de aviso en línea" existe **a mano** en una feature:
   `src/features/auth/ui/AuthFormError.tsx:25` →
   `"border-(length:--border-width) border-solid border-danger rounded-sm p-(--space-3) font-mono text-sm text-danger"`.
   Es un ad-hoc de `features/auth`, no una pieza compartida.
4. También existe el token `--z-toast: 400` en `globals.css:305`, es decir el sistema **reservó sitio**
   para un toast que **no está implementado**. NO VERIFICADO si algún RFC lo planifica (no lo busqué).

Consecuencia para el fix: si el toolbar nuevo quisiera un "aviso" de estado, hoy hay que componerlo a
mano o crear una primitiva nueva — y crear una primitiva nueva toca `public-api.test.ts` (ver §4).

---

## 3. La deuda 31, al detalle

### 3.1 Transcripción literal

`progress/deudas.md:332-343`, entrada íntegra y **sin tachar** (sigue abierta):

> 31. **El anillo de foco no llega al mínimo de 3:1 sobre DOS de las tres superficies claras.** `--focus`
>     (rosa de marca) mide **4.68:1** contra el fondo oscuro de la app —de ahí que la deuda 17 se cerrara sin
>     tocarlo— y, sobre las claras: **3.13:1** en `--surface-raised` (**pasa** el umbral), **2.95:1** en
>     `--surface` y **2.41:1** en `--surface-sunken` (**no pasan**). *(Alcance corregido por la review r1: la
>     primera redacción daba las tres por rotas y omitía el 3.13. Importa porque `--surface-raised` es la
>     variante **por defecto** de `Card`, o sea el caso más común, y ahí el anillo cumple.)*
>     **Escenario de fallo:** un `Input` deshabilitado —o cualquier control sobre la superficie hundida— o un
>     control sobre una tarjeta **plana** recibe el foco por teclado y el anillo apenas se distingue del
>     fondo; incumple el criterio de contraste de componentes de interfaz, que la convención lista como parte
>     de "done". Se arregla en el token (un tono de foco más oscuro, o un anillo de dos colores), no en cada
>     componente — y **sin mover el rosa a ciegas**, que sí cumple en el caso más frecuente. Verificado con la
>     misma fórmula de WCAG que usa `button.variants.test.ts`.

### 3.2 Verificación en el código: ¿sigue siendo cierta?

Tokens leídos en `src/app/globals.css:29-51`:

| Token | Valor literal | Línea |
|---|---|---|
| `--brand-espresso` | `#33241a` | 35 |
| `--brand-cream` | `#f5eddf` | 34 |
| `--brand-pink` | `#e4649b` | 30 |
| `--bg` | `var(--brand-espresso)` → `#33241a` | 38 |
| `--surface` | `#fbf6eb` | 39 |
| `--surface-raised` | `#fffdf6` | 40 |
| `--surface-sunken` | `#eadfcb` | 41 |
| `--fg` | `var(--brand-espresso)` → `#33241a` | 42 |
| `--fg-inverse` | `var(--brand-cream)` → `#f5eddf` | 44 |
| `--focus` | `var(--brand-pink)` → `#e4649b` | 51 |

`globals.css:336-345` fija el fondo de la app: `body { background-color: var(--bg); … color: var(--fg-inverse); }`.

Contrastes recalculados por mí (WCAG 2.x) sobre esos hexadecimales:

| Par | Medido ahora | Ficha de la deuda 31 |
|---|---|---|
| `--focus` sobre `--bg` | **4.68:1** | 4.68 ✅ coincide |
| `--focus` sobre `--surface-raised` | **3.13:1** | 3.13 ✅ coincide |
| `--focus` sobre `--surface` | **2.95:1** | 2.95 ✅ coincide |
| `--focus` sobre `--surface-sunken` | **2.41:1** | 2.41 ✅ coincide |

**La deuda 31 sigue siendo verdad hoy, con sus cuatro números exactos.** Y su consecuencia para el fix
es concreta: **`Card` sin `variant` (= `raised`) es la única superficie clara del sistema donde el
anillo de foco pasa 3:1**. Si el toolbar unificado usara `<Card variant="flat">`, el anillo caería a
2.95:1 y **se rompería el criterio**. Es decir: la dirección "una sola Card" es compatible con la
deuda 31 **sólo si esa Card se queda en `raised`**.

### 3.3 La OTRA mitad de la frase del toolbar (la etiqueta de `Field`)

El JSDoc de `ProjectsToolbar.tsx:61-64` mete **dos** afirmaciones bajo la etiqueta "(deuda 31)". La
segunda (el anillo de foco) es la deuda 31. La primera (la etiqueta de `Field` ilegible) **no está en
la ficha 31** — pero es verdad igualmente, y de la peor manera posible:

- `Field.tsx:57` pinta la etiqueta con `text-fg`, es decir `--fg` = `var(--brand-espresso)` = `#33241a`.
- El fondo de la app es `--bg` = `var(--brand-espresso)` = `#33241a` (`globals.css:38`, `:338`).
- **Son el mismo color.** Contraste medido: **1.00:1**. No es "poco legible": es invisible por
  construcción, no hace falta ni redondear.
- El hint (`text-fg-muted` = `#7a6753`) sobre el fondo de la app da **2.76:1** — también por debajo
  de 4.5:1 para texto normal. Y el hint del buscador es texto largo
  (`SEARCH_HINT`, `ProjectsToolbar.tsx:19-20`).
- Sobre `--surface-raised`, en cambio: etiqueta **14.65:1**, hint **5.30:1**. Sobre `--surface`:
  **13.84:1** y **5.01:1**.

**Conclusión de la pregunta 3:** sí, "`Field` sobre el espresso es ilegible" es hoy verdad y medible —
literalmente 1.00:1—, y el remedio de meterlo en una superficie clara es correcto. Lo que **no** es
correcto es la etiqueta bibliográfica: eso no es la deuda 31 (que va del anillo de foco), aunque el
mismo comentario aparece copiado en `DashboardView.tsx:199-202`, `ActiveProjectsPanel.tsx:75`,
`dialog.variants.ts:17` y `AuthPanel.tsx:19`. Nada urgente, pero conviene no propagar la confusión en
el toolbar nuevo.

**Simétrico, y es la trampa del rediseño:** si el toolbar se unifica en una Card, todo lo que hoy vive
sobre el fondo espresso y usa `text-fg-inverse` se invierte de signo. En concreto
`SUMMARY_CLASSES` (`ProjectsToolbar.tsx:181-186`) usa `text-fg-inverse` (crema) porque el `<summary>`
está fuera de la Card. Metido dentro de una Card `raised`, crema sobre `#fffdf6` da **1.14:1** —
exactamente el defecto que fue la deuda 32, ahora al revés. **Quien mueva el `<summary>` dentro de la
Card tiene que cambiar `text-fg-inverse` → `text-fg`**, y su anillo de foco propio seguiría cumpliendo
(3.13:1 sobre `raised`).

---

## 4. `src/shared/ui/public-api.test.ts` — qué ancla exactamente

Ancla **tres cosas distintas**, y sólo la primera y la segunda son literales.

**(a) Lista literal de exports de `primitives` y de `feedback`** (líneas 20-47), comparada con
`toEqual` sobre la lista ordenada:

```ts
const PRIMITIVES = [
  "Button", "Card", "DIALOG_CLOSE_LABEL", "DIALOG_SIZES", "Dialog", "Field",
  "Input", "PROGRESS_MAX", "PROGRESS_MIN", "PROGRESS_TONES", "ProgressBar",
  "SKELETON_SHAPES", "Skeleton", "Toggle", "ToggleGroup", "buttonVariants",
  "cardVariants", "clampProgress", "inputClasses",
];

const FEEDBACK = [
  "ERROR_STATE_RETRY_LABEL", "EmptyState", "ErrorState", "STATE_PANEL_HEADING_LEVELS",
];
```

```ts
// líneas 65-73
it("los primitivos exportan exactamente su contrato", () => {
  expect(exportedNames(primitives)).toEqual([...PRIMITIVES].sort());
});
it("feedback exporta exactamente su contrato", () => {
  expect(exportedNames(feedback)).toEqual([...FEEDBACK].sort());
});
```

El JSDoc lo dice explícito (líneas 15-18): *"`toEqual` sobre la lista ordenada, no `toContain`: falla
en las DOS direcciones, al añadir un export y al quitarlo"*.

**(b) Que el barrel raíz reexporte todo lo de sus capas** (líneas 75-85): **derivado, no literal** —
recorre `Object.keys(primitives)` y `Object.keys(feedback)` y exige que estén en `Object.keys(ui)`.
Este `it` no hay que tocarlo nunca.

**(c) Las siete piezas de #33** (líneas 49-58, 87-94): lista `NEW_IN_UI_PRIMITIVES_2` con
`Dialog, EmptyState, ErrorState, ProgressBar, Skeleton, Toggle, ToggleGroup`, comprobadas por
`has(name)` sobre el barrel raíz. (Nota menor: el comentario dice "las seis piezas" y la lista tiene
**siete** nombres. Cosmético.)

**Qué lo rompe:**

- Quitar o renombrar cualquier export de `primitives/` o de `feedback/` → falla (a).
- **Añadir un export nuevo a `primitives/` o a `feedback/` → falla (a).** Sí: **añadir un componente a
  `shared/ui/primitives` o a `shared/ui/feedback` OBLIGA a tocar `public-api.test.ts`**, añadiendo su
  nombre (y el de cada símbolo auxiliar que exporte: variantes, constantes, no sólo el componente) a
  la constante correspondiente. Es deliberado: *"añadir uno sin pensarlo agranda la API sin que nadie
  lo note"* (líneas 13-14).
- Exportar un tipo **no** cuenta: los tipos desaparecen en runtime y `Object.keys` no los ve. Sólo
  cuentan los exports de valor (componentes, constantes, funciones, objetos `cva`).
- **`layout/` y `three/` NO están anclados por listas literales**: el test no importa esos namespaces.
  Un export nuevo en `layout/` sólo entra por el `it` derivado (b), que no falla por añadir.
- **Nada de esto se activa si el toolbar nuevo se queda en `features/projects/ui/`** — que es donde
  vive hoy (`ProjectsToolbar.tsx`). El propio JSDoc del toolbar ya usó este test como argumento para
  no crear un primitivo de segmentado (`ProjectsToolbar.tsx:52-54`).

---

## 5. `src/shared/ui/no-hardcode.test.ts` — qué prohíbe exactamente

### 5.1 Los tres patrones (líneas 63-65, literales)

```ts
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_COLOR = /\brgba?\(/;
const PX_LITERAL = /\b\d+(?:\.\d+)?px\b/;
```

Se aplican al **texto completo del archivo** (`readFileSync` → `HEX_COLOR.test(source)`, líneas 110-127),
no sólo a los `className`. **Los comentarios y el JSDoc cuentan.**

### 5.2 Sobre qué barre hoy

- Raíz: `const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));` (línea 41) → desde
  `src/shared/ui/` sube dos → **`src/`**, la app entera, no sólo el design system (el JSDoc lo explica
  en las líneas 21-27: se amplió en #19 justo para cubrir `features/<x>/ui/`).
- Extensiones: sólo `.ts`/`.tsx` (línea 52). Se excluyen `*.test.*`/`*.spec.*` (línea 53) y `*.d.ts`
  (línea 54). **`.css` NO entra** en este guardrail (por eso `globals.css` puede tener hexadecimales).
- **No hay allowlist, y el JSDoc dice explícitamente que no se abre una** (líneas 31-33).
- Seguros anti-barrido-roto (líneas 67-106): exige >100 archivos, exige alcanzar cinco rutas del design
  system y **tres de fuera** — entre ellas `features/projects/ui/ProjectCard.tsx` (línea 94) — y exige
  que ningún `.test.` haya entrado.

### 5.3 Traducción práctica para quien escriba el toolbar nuevo

Permitido (verificado contra el uso real del repo, no deducido):

- **`items-start`, `items-center`, `items-end`, `flex-wrap`, `justify-between`, `grid-cols-*`**: sí.
  `items-start` se usa hoy en `layout/archive-nav/ArchiveNav.tsx:87`.
- **`text-lg`, `text-sm`, `text-xs`, `text-base`, `text-xl`…**: sí, son utilidades respaldadas por
  `@theme` (`--text-*` en `globals.css:170-179`). Uso real: `DashboardHero.tsx:53` (`text-lg`),
  `Field.tsx:57` (`text-sm`).
- **Variantes responsive `mobile:` / `tablet:` / `desktop:` / `archive:`**: sí, salen de
  `--breakpoint-*` (`globals.css:323-326`). Uso real: `ProjectsView.tsx:267`.
- **`max-w-*` / `w-full` / `flex-1` / `basis-*`**: NO VERIFICADO caso por caso; lo que sí es cierto es
  que ninguna de ellas contiene `px`, `#` ni `rgb(`, así que **`no-hardcode` no las ve**. Un valor
  arbitrario con unidad `px` dentro (p. ej. un ancho máximo en píxeles) **sí** rompería.

Prohibido:

- **Cualquier `#rrggbb` / `#rgb`** en clase, en cadena o **en un comentario**. `HEX_COLOR` exige de 3 a
  8 caracteres hexadecimales, así que `#20` o `#33` (referencias a features) **no** disparan; `#1180`
  o cualquier cita de un color sí.
- **`rgb(` / `rgba(`** en cualquier posición.
- **Cualquier número seguido de `px`** — y aquí está la trampa más fácil de pisar en este fix
  concreto: **el JSDoc del toolbar nuevo NO puede escribir "44px", "123px" ni "78px"** para documentar
  la medición del defecto. Hay que decirlo en palabras o por nombre de token (`--touch-target`). Es
  exactamente el mismo caso que forzó a subir `--auth-inset-inline` a `globals.css`
  (`globals.css:120-135`).
  Ojo con el falso amigo contrario: `px-(--space-4)` **no** dispara nada, porque ahí `px` es
  *padding-inline* y el regex exige dígitos delante.

Espaciado: **no hay ningún guardrail que prohíba `p-4` / `gap-4`** (las escalas numéricas por defecto
de Tailwind v4). Pero la convención sí lo prohíbe —`docs/harness/conventions.md:65-68`: *"Ningún
componente hardcodea color, tamaño, borde, radio, sombra ni z-index: **todo referencia un token**"*— y
el repo la cumple al 100%: un `grep` de `(p|px|py|pt|pb|m|mt|mb|gap|space-y|space-x)-<dígitos>` dentro
de cualquier `className` de `src/` devuelve **cero** aciertos. Traducción: se escribe
`gap-(--space-4)`, nunca `gap-4`; lo atrapará el **reviewer**, no el test.

### 5.4 El segundo guardrail que también aplica: `canonical-tailwind-classes.test.ts`

Barre **todo `src/**`** (`.ts .tsx .js .jsx .mjs .css`, líneas 49-67) y prohíbe la **forma larga** de
consumir un token: el patrón es `(?<![\w-])<utilidad>-\[<hint opcional>var(--x)\]` (líneas 41-47).

- ❌ `p-[var(--space-3)]`, `border-[length:var(--border-width)]`, `outline-[color:var(--focus)]`
- ✅ `p-(--space-3)`, `border-(length:--border-width)`, `outline-(color:--focus)`
- **Excepciones que NO marca** (líneas 155-203, verificadas por sus propios casos): valores compuestos
  (`shadow-[var(--a)_var(--a)_0_var(--b)]`), cualquier cosa envuelta en `calc()`, propiedades
  arbitrarias `[prop:var(--x)]`, y variables envueltas en una función CSS.

Y una regla de convención con dientes (`conventions.md:98-104`): **nunca escribas una clase de Tailwind
literal en un archivo que hable de clases** (tests, guardrails, informes, comentarios) — Tailwind
escanea también los `.test.ts` y una clase citada como ejemplo se vuelve CSS real; una inválida rompe
el build. En tests, las muestras se arman por concatenación.

---

## 6. Tokens disponibles en `src/app/globals.css`

### 6.1 Superficies y primer plano (roles, `globals.css:37-51`)

| Token de rol | Valor | Alias Tailwind (`:139-152`) | Utilidades que genera |
|---|---|---|---|
| `--bg` | `var(--brand-espresso)` = `#33241a` | `--color-bg` | `bg-bg`, `text-bg`, `border-bg` |
| `--surface` | `#fbf6eb` | `--color-surface` | `bg-surface`, … |
| `--surface-raised` | `#fffdf6` | `--color-surface-raised` | `bg-surface-raised`, … |
| `--surface-sunken` | `#eadfcb` | `--color-surface-sunken` | `bg-surface-sunken`, … |
| `--fg` | `var(--brand-espresso)` = `#33241a` | `--color-fg` | `text-fg`, … |
| `--fg-muted` | `#7a6753` | `--color-fg-muted` | `text-fg-muted`, … |
| `--fg-inverse` | `var(--brand-cream)` = `#f5eddf` | `--color-fg-inverse` | `text-fg-inverse`, … |
| `--fg-inverse-muted` | `#c9b49b` | `--color-fg-inverse-muted` | `text-fg-inverse-muted`, … |
| `--accent` | `var(--brand-pink)` = `#e4649b` | `--color-accent` | `bg-accent`, `text-accent`, … |
| `--accent-fg` | `#fff8ee` | `--color-accent-fg` | `text-accent-fg`, … |
| `--border` | `var(--brand-espresso)` = `#33241a` | `--color-border` | `border-border`, … |
| `--danger` | `#c6432f` | `--color-danger` | `text-danger`, `border-danger`, … |
| `--success` | `var(--brand-green)` = `#3f7d54` | `--color-success` | `text-success`, … |
| `--focus` | `var(--brand-pink)` = `#e4649b` | `--color-focus` | `outline-(color:--focus)`, … |

Escala cruda de marca (`:29-35`), también aliasada a `--color-brand-*` (`:153-158`):
`--brand-pink #e4649b`, `--brand-green #3f7d54`, `--brand-yellow #e9b23f`, `--brand-brown #5a4231`,
`--brand-cream #f5eddf`, `--brand-espresso #33241a`.

**Sólo hay TRES superficies claras** (`surface`, `surface-raised`, `surface-sunken`) y **una** oscura
(`bg`). No existe ningún `--color-surface-*` adicional: no hay "superficie intermedia" ni variante
translúcida que permita un toolbar a medio camino entre el fondo y la tarjeta.

### 6.2 Bordes (`globals.css:204-207`)

| Token | Valor |
|---|---|
| `--border-width` | `2px` |
| `--border-width-heavy` | `3px` |
| `--border-color` | `var(--border)` |

Radios (`:198-202`): `--radius-none: 0`, `--radius-sm: 2px`, `--radius-md: 6px`,
`--radius-tab: 6px 6px 0 0` → utilidades `rounded-none/sm/md/tab`.

Sombras (`:209-214`): `--shadow-hard: 4px 4px 0 var(--border)`,
`--shadow-hard-lg: 6px 6px 0 var(--border)`, `--shadow-glow`, `--shadow-glow-lg`, `--shadow-paper`.

### 6.3 Espaciado (`globals.css:187-196`) — base 4px, **con huecos**

| Token | Valor |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |

**No existen `--space-7`, `--space-9` ni `--space-11`**, y la escala **termina en 48**. Cualquier
separación mayor no tiene token (fue justamente el motivo de crear `--auth-inset-inline: 80px` como
token propio, `globals.css:120-135`).

Otros que probablemente hagan falta al maquetar: `--touch-target: 44px` (`:329`) —el alto real de
`Toggle` e `Input`—, la tipografía `--text-xs 11 / --text-sm 13 / --text-base 16 / --text-lg 18 /
--text-xl 24 / --text-2xl 32 / --text-3xl 48 / --text-hero 76` (`:172-179`), los interlineados
`--leading-tight 1.1` y `--leading-base 1.55` (`:181-182`), y los breakpoints
`mobile 640 / tablet 768 / desktop 1180 / archive 1180` (`:314-326`, duplicados a propósito en
`--bp-*` y `--breakpoint-*`, con `breakpoint-tokens.test.ts` vigilando que no se desincronicen).

---

## Apéndice — dos cosas que encontré mirando y que afectan al fix (verificadas)

1. **La fila rota tiene un gemelo idéntico en el Dashboard.** `DashboardView.tsx:196-203` es el mismo
   patrón (`<div className="flex flex-wrap items-end gap-(--space-4)">` con una `Card` dentro que
   envuelve un `Field`), con el **mismo comentario copiado** (`:199-202`). Lo que se decida para el
   toolbar de #20 es un precedente directo para esa fila.
2. **Qué ata hoy la estructura del toolbar desde los tests**, por si el rediseño la mueve
   (`ProjectsView.test.tsx`): dos `getByRole("group", { name })` para los dos `ToggleGroup`
   (líneas 191, 227, 230, 291), un `container.querySelector("details")` con `details.open === false`
   y el texto de `MORE_FILTERS_LABEL` **dentro** del `details` (líneas 396-404), y
   `getByLabelText(YARN_LABEL)` sobre el `<select>` (línea 328). O sea: **se puede reorganizar la
   maqueta libremente**, pero hay que conservar los dos `role="group"` con sus nombres, el `<details>`
   nativo cerrado por defecto y el cableado etiqueta↔control de `Field`. Ningún test asierta sobre las
   clases del toolbar ni sobre la presencia de la `Card`.
