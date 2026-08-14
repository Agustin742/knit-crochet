# Explore — DEUDA 118: las páginas de auth no tienen variante responsive

> **Tipo:** investigación de SOLO LECTURA. **No se tocó `src/**` ni ningún archivo de configuración.**
> El único archivo escrito es este informe.
>
> **Honestidad de la medición.** Este informe distingue en cada hallazgo entre:
> - **[MEDIDO]** — se ejecutó algo y la salida está pegada literal.
> - **[LEÍDO]** — inferencia por lectura de código (rutas y líneas sí son dato duro).
> - **[ARITMÉTICA]** — cuenta hecha a mano a partir de valores **medidos** de tokens. No es una
>   medición de navegador: es una predicción con los números reales metidos dentro.
>
> **Lo que NO se hizo:** no se levantó el servidor ni se abrió un navegador. La confirmación visual
> de la ficha 118 ("familia de la regla 4: sólo se confirma con una pantalla delante") **sigue
> pendiente** y este informe no la sustituye. Lo que sí hace es cerrar el DOM y el CSS, que son la
> mitad del problema que sí es automatizable.
>
> **Nota de seguridad Tailwind.** `src/app/globals.css:17` excluye `progress/` del escaneo de clases
> (`@source not "../../progress"`). Aun así, este informe cita nombres de utilidades sólo cuando son
> el hallazgo (no hay comodines ni ejemplos inventados).

---

## Resumen ejecutivo

1. **La ficha 118 es CORRECTA en su diagnóstico, y por un motivo peor del que dice.** El ovillo no se
   monta bajo `--bp-tablet`, pero **el hueco no desaparece**: `AsciiYarn` devuelve **siempre** su
   `<div>` host (`h-full w-full`), sólo se queda vacío por dentro. La segunda columna de la rejilla
   existe, ocupa su `1fr` y no se puede colapsar sola. **[MEDIDO]**
2. **El sistema responsive del repo es MIN-WIDTH (mobile-first), no max-width.** No hay ni un
   `@custom-variant` en todo `src/`; las variantes las genera el namespace `--breakpoint-*` de
   Tailwind v4, que compila a `@media (width >= …)`. **[MEDIDO sobre el CSS compilado]**
3. **El patrón idiomático de este repo ya existe y está escrito cuatro veces**: base móvil de una
   columna + variante `tablet:` que añade la segunda, y `hidden` + `tablet:block` para el hueco del
   ovillo. Las dos páginas de auth son las **únicas** de `src/` que no lo siguen.
4. **`px-20` es un rojo latente y está probado**: es el **único** valor de espaciado de todo `src/`
   que no sale del sistema de tokens. Los dos guardrails lo dejan pasar **por diseño de sus regex**,
   no porque sea correcto. **[MEDIDO]**
5. **La fuente de verdad de diseño está desactualizada** respecto al rediseño a mano de `bdb11b0`, y
   además **nunca especificó** una rejilla de dos columnas para auth.
6. **Ninguno de los 20 asertos que hay hoy sobre estas dos páginas se rompería** al añadir la
   variante responsive. **[MEDIDO: los 20 pasan hoy y ninguno lee `className`]**

---

## 1. El sistema responsive del repo

### 1.1 No hay `@custom-variant`. Punto.

```
Grep "@custom-variant|@variant" en src/  →  No matches found          [MEDIDO]
```

Esto es lo primero que hay que corregir de la intuición: **el repo no define variantes a mano**. Todo
sale del mecanismo estándar de Tailwind v4, que es **min-width**.

### 1.2 La sintaxis EXACTA, con líneas

`src/app/globals.css:290-300` — los tokens de LECTURA (los que consulta `matchMedia` en runtime):

```css
  /* ---- Breakpoints ----
     `--bp-archive` es el ancho en que el archivero sustituye al bottom-nav: NO
     es una preferencia, es el ancho al que las 6 pestañas entran enteras con la
     etiqueta grande (enmiendas E4 y E6 de D4). …  */
  --bp-mobile: 640px;
  --bp-tablet: 768px;
  --bp-desktop: 1180px;
  --bp-archive: 1180px;
```
(líneas 297, 298, 299, 300)

`src/app/globals.css:302-309` — los ALIAS que generan las variantes:

```css
  /* ---- Alias al namespace de breakpoints de Tailwind v4 (generan variantes
     responsive: mobile:/tablet:/desktop:/archive:). Deben ser literales: las
     media queries no resuelven var(); comparten los mismos valores que --bp-*,
     y el test de tokens verifica que cada par siga sincronizado. ---- */
  --breakpoint-mobile: 640px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1180px;
  --breakpoint-archive: 1180px;
```
(líneas 306, 307, 308, 309)

### 1.3 Son MIN-WIDTH — medido sobre el CSS compilado

Se compiló `src/app/globals.css` con `@tailwindcss/postcss` + `postcss` (misma técnica que
`src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts:4-6` y `src/app/globals-css.test.ts`), y se
listaron los preludios de `@media` únicos del resultado:

```
--- unique @media preludes ---                                        [MEDIDO]
@media (width >= 640px)
@media (width >= 768px)
@media (width >= 1180px)
@media (width >= 40rem)
@media (width >= 48rem)
@media (width >= 64rem)
@media (width >= 80rem)
@media (width >= 96rem)
@media (hover: hover)
@media (prefers-reduced-motion: reduce)
```

Y el contenido del bloque de 768px (`out.css:1101-1124`):

```css
  @media (width >= 768px) {                                        /* [MEDIDO] */
    .tablet\:block          { display: block; }
    .tablet\:aspect-square  { aspect-ratio: 1 / 1; }
    .tablet\:grid-cols-2    { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tablet\:grid-cols-3    { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .tablet\:flex-row       { flex-direction: row; }
    .tablet\:items-center   { align-items: center; }
    .tablet\:items-end      { align-items: flex-end; }
    .tablet\:justify-between{ justify-content: space-between; }
  }
```

**Conclusión dura: `tablet:` = `(width >= 768px)` = MIN-WIDTH.** El estilo base (sin prefijo) es el de
**móvil**, y las variantes **añaden** a partir del ancho. Cualquier arreglo de la 118 tiene que
escribirse mobile-first: **una columna en la base, dos en `tablet:`** — no al revés.

**Efecto colateral que conviene saber:** los cuatro breakpoints por defecto de Tailwind
(`40rem/48rem/64rem/80rem/96rem`, o sea `sm: md: lg: xl: 2xl:`) **siguen existiendo** en el compilado.
`@theme` **añade** nombres, no sustituye los de fábrica. Nadie los usa hoy en `src/` (§3), pero están
disponibles y nada impide que alguien escriba `md:` por costumbre y se salte el sistema de tokens.
Esto **no** es una deuda que la 118 tenga que arreglar; queda anotado.

### 1.4 Qué obliga `src/shared/ui/breakpoint-tokens.test.ts`

Es un guardrail de **pares**, no de valores. Su lógica:

- `breakpoint-tokens.test.ts:45-50` — `declaredSuffixes(prefix)` descubre por expresión regular todos
  los nombres declarados bajo un prefijo en `globals.css` y devuelve **el sufijo** (`mobile`,
  `tablet`, `desktop`, `archive`). **Los pares se descubren, no se enumeran** (comentario en
  líneas 28-33): una lista a mano dejaría sin vigilar el quinto breakpoint el día que exista.
- `:68` `READ_TOKENS = declaredSuffixes("bp")` — los que lee `matchMedia`.
- `:70` `VARIANT_TOKENS = declaredSuffixes("breakpoint")` — los que generan variantes.
- `:79-82` **seguro anti-descubrimiento-roto**: se escribe a mano UNA vez el inventario
  `["archive","desktop","mobile","tablet"]` en los dos namespaces. Sin esto, una regex que dejara de
  casar devolvería dos listas vacías, iguales entre sí → **verde falso**.
- `:93-95` los dos namespaces son **el mismo conjunto** (falla en las dos direcciones: alias huérfano
  o token huérfano).
- `:99-103` para cada sufijo, `--breakpoint-X` y `--bp-X` valen **el mismo número**.

**Qué obliga esto a quien arregle la 118:** nada nuevo si se usa `tablet:` (el par ya existe y está
atado). **Pero si alguien decide que auth necesita su propio ancho** (p. ej. un `--bp-auth`), este
test le obliga a declararlo **en los dos namespaces con el mismo valor** y a **añadir el sufijo al
literal de la línea 80-81**, o la suite cae. Es exactamente el diseño que se quería.

**[MEDIDO]** `pnpm vitest run "src/app/(auth)/auth-pages.test.tsx" src/shared/ui/breakpoint-tokens.test.ts`
→ `Test Files 2 passed (2) · Tests 20 passed (20)`.

---

## 2. El montaje condicional del ovillo — **el hallazgo crítico**

### 2.1 La condición

`src/shared/ui/three/ascii-yarn/useViewportSupports3d.ts` (nótese la ruta real: está bajo
`three/ascii-yarn/`, no `three/`):

- `:5` `const MIN_WIDTH_TOKEN = "--bp-tablet";`
- `:12-19` `readMinWidthQuery()` lee el token del `documentElement` computado y arma
  `(min-width: <valor>)`. Si el token está vacío devuelve `null`.
- `:34-37` `getSnapshot()` → `mediaQuery === null || window.matchMedia(mediaQuery).matches`.
  **Falla abierto**: sin token, se monta.
- `:39-41` `getServerSnapshot()` → **`false`**. En SSR la escena nunca sale en el HTML.
- `:43-50` JSDoc: *"por debajo de `--bp-tablet` la escena no se monta, así que three.js ni siquiera se
  descarga en el dispositivo más débil"*.

### 2.2 Qué devuelve exactamente `AsciiYarn` — NO devuelve `null`

`src/shared/ui/three/ascii-yarn/AsciiYarn.tsx:57-73`:

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
      {supports3d ? (
        <AsciiYarnScene interactive={interactive} cols={cols} rows={rows} />
      ) : null}
    </div>
  );
```

**El `null` está DENTRO del host, no en lugar del host.** El `<div>` con `h-full w-full` se renderiza
siempre. Y además `AsciiYarnScene` se carga con `dynamic(..., { ssr: false, loading: () => null })`
(`AsciiYarn.tsx:14-17`), así que incluso por encima del breakpoint hay un instante con el host vacío.

### 2.3 Medición directa del DOM

Se montaron **las dos páginas reales** (sin doblar `AsciiYarn`, sólo doblando `next/navigation` y
`next/link` como hace el test existente) en `happy-dom`, forzando la condición de móvil con la misma
técnica que usa el test del propio componente
(`src/shared/ui/three/ascii-yarn/ascii-yarn.test.tsx:199-207`:
`document.documentElement.style.setProperty("--bp-tablet", "99999px")`).

Sonda ejecutada desde un directorio temporal del proyecto (`.probe118/`, **borrado al terminar**;
`git status` posterior confirma que no quedó nada). Salida literal:

```
[register mobile] clases de la rejilla: grid grid-cols-2 px-20              [MEDIDO]
[register mobile] hijos directos de la rejilla: 2
[register mobile] celda bg-3d presente: true
[register mobile] host del ovillo presente: true
[register mobile] clases del host: flex h-full w-full items-center justify-center overflow-hidden text-accent pointer-events-auto
[register mobile] hijos del host (la escena): 0
[register mobile] pre del ASCII: false
[login mobile] clases de la rejilla: grid grid-cols-2 px-20
[login mobile] hijos directos de la rejilla: 2
[login mobile] celda bg-3d presente: true
[login mobile] host del ovillo presente: true
[login mobile] clases del host: flex h-full w-full items-center justify-center overflow-hidden text-accent pointer-events-auto
[login mobile] hijos del host (la escena): 0
[login mobile] pre del ASCII: false
```

**Respuesta a la pregunta crítica del encargo:** de las dos cosas que planteabas, pasa **la segunda**.
No devuelve `null`; devuelve un `<div>` vacío. Por lo tanto:

- La rejilla conserva **2 hijos directos** en móvil.
- La segunda pista de `repeat(2, minmax(0, 1fr))` **existe y reclama su mitad del ancho**: una pista
  `1fr` se dimensiona por el contenedor, no por su contenido, así que un hijo vacío **no la encoge**.
- El `data-slot="bg-3d"` y el `data-slot="ascii-yarn"` siguen ahí, ambos `aria-hidden`, así que
  **`axe` no ve nada** y ningún gate de accesibilidad puede detectar el problema.

**El agujero es invisible para todos los tests que existen.** Eso es lo que hace a esta deuda peligrosa,
no el hueco en sí.

### 2.4 Cuánto se comprime el formulario — **[ARITMÉTICA]**, con tokens medidos

Cadena de contenedores, leída:

| Capa | Archivo:línea | Qué aporta |
|---|---|---|
| `main` de auth | `src/app/(auth)/layout.tsx:14` | `relative flex min-h-dvh flex-col items-center justify-center bg-bg p-(--space-6)` → **24px** de relleno por lado (`--space-6`, `globals.css:176`) |
| rejilla | `login/page.tsx:41` y `register/page.tsx:16` | `grid grid-cols-2 px-20` → **80px** por lado |
| tarjeta | `src/features/auth/ui/AuthPanel.tsx:31` | `w-full max-w-sm` (24rem = 384px) |
| relleno de tarjeta | `src/shared/ui/primitives/card/card.variants.ts:16` | `p-(--space-5)` = **20px** por lado, más `--border-width` = **2px** por lado (`globals.css:178, 188`) |
| campos | `src/shared/ui/primitives/field/Input.tsx:9` | `box-border w-full min-h-(--touch-target)` → **no tienen anchura intrínseca propia: se dejan comprimir hasta cero** |

Valor de `px-20` **medido sobre el compilado**:

```
.px-20 { padding-inline: calc(var(--spacing) * 20); }     [MEDIDO]
--spacing: 0.25rem;                                        [MEDIDO]
```
→ 20 × 0.25rem = **5rem = 80px por lado, 160px en total**.

Cuenta a 390px de ancho (iPhone 12/13/14, el caso realista):

```
390  viewport
-48  relleno del main (24 + 24)
———
342  ancho disponible
-160 px-20 (80 + 80)
———
182  caja de contenido de la rejilla
/2   dos pistas 1fr iguales
———
 91  ancho de cada columna  →  la tarjeta (w-full) mide 91px
-44  relleno de la tarjeta (20 + 20) + bordes (2 + 2)
———
 47  ancho útil para los campos del formulario
```

**47 px de formulario, y 91 px de columna vacía al lado.** Y como `minmax(0, 1fr)` permite que la
pista baje **por debajo** de su contenido mínimo, no hay nada que frene la compresión: no habrá scroll
horizontal que avise, simplemente se aplasta. El botón de envío es `w-full`
(`LoginForm.tsx:145`, `RegisterForm.tsx:160`), así que el objetivo táctil de 44px se mantiene en alto
pero queda de 47px de ancho.

> Un matiz honesto sobre `items-center`: el `main` es `flex flex-col items-center`, así que la rejilla
> **no** se estira al ancho del `main` — se dimensiona a su contenido, acotada por el disponible. En
> desktop eso significa que la rejilla mide `2 × (ancho de la tarjeta)` y la columna del ovillo
> **espeja** el ancho de la tarjeta. En móvil, con el disponible por debajo del contenido, se satura
> al disponible y sale la cuenta de arriba. **Esto es razonamiento de la especificación CSS, no una
> medición.** Confirmarlo es literalmente lo que la ficha 118 pide con una pantalla delante.

---

## 3. Precedentes en el repo: el patrón idiomático de ESTE proyecto

Barrido completo de variantes responsive y de rejillas en `src/**/*.tsx` **[MEDIDO]**:

| Archivo:línea | Clase exacta | Patrón |
|---|---|---|
| `src/features/dashboard/ui/ActiveProjectsPanel.tsx:112` | `grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3` | **rejilla que colapsa a 1 columna** |
| `src/features/dashboard/ui/ActiveProjectsPanel.tsx:148` | `grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3` | ídem |
| `src/features/dashboard/ui/MetricsPanel.tsx:89` | `grid grid-cols-1 gap-(--space-4) tablet:grid-cols-3` | ídem |
| `src/features/dashboard/ui/DashboardHero.tsx:58` | `hidden w-full max-w-sm shrink-0 tablet:block tablet:aspect-square` | **el hueco del ovillo se APAGA** |
| `src/features/dashboard/ui/DashboardHero.tsx:44` | `flex flex-col gap-(--space-4) tablet:flex-row tablet:items-center tablet:justify-between` | eje que gira |
| `src/features/dashboard/ui/MetricsPanel.tsx:54` | `flex flex-col gap-(--space-3) tablet:flex-row tablet:items-center tablet:justify-between` | ídem |
| `src/features/dashboard/ui/ActiveProjectsPanel.tsx:62, :70` | `flex flex-col gap-(--space-3) tablet:flex-row tablet:items-end …` | ídem |
| `src/features/dashboard/ui/DashboardView.tsx:196` | `flex flex-col gap-(--space-4) desktop:flex-row desktop:items-end desktop:justify-between` | ídem, en `desktop:` |
| `src/shared/ui/layout/archive-nav/ArchiveNav.tsx:73` | `relative hidden archive:block` | **desmontaje visual por CSS** |
| `src/shared/ui/layout/bottom-nav/BottomNav.tsx:29` | `flex items-stretch archive:hidden` | **el par complementario del anterior** |
| `src/app/(auth)/login/page.tsx:41` | `grid grid-cols-2 px-20` | **← la excepción** |
| `src/app/(auth)/register/page.tsx:16` | `grid grid-cols-2 px-20` | **← la excepción** |

**Las respuestas a tus tres preguntas:**

- **¿`hidden`/`block`?** Sí, y es el patrón exacto para **este** caso. `DashboardHero.tsx:58` es el
  gemelo literal del problema: un hueco que aloja un `<AsciiYarn>` que no se monta bajo `--bp-tablet`,
  y que se apaga **con la misma condición de ancho** para no dejar el agujero. Su JSDoc
  (`DashboardHero.tsx:22-38`) explica el porqué y advierte de los dos tokens.
  **La 118 es esta misma solución, sin aplicar.**
- **¿`grid-cols-1` con variante?** Sí, tres veces, siempre mobile-first: base `grid-cols-1`, luego
  `tablet:` y `desktop:`. Nunca al revés.
- **¿Se desmonta en JS?** **No.** En ningún sitio se hace montaje/desmontaje condicional del layout
  desde React. El único condicional en JS es el del propio `AsciiYarn` (§2), y precisamente por eso el
  repo lo **acompaña** con CSS: el JS quita la escena, el CSS quita el hueco.

**Composición idiomática que sale de estos precedentes** (dos utilidades, cero conceptos nuevos):
rejilla base de una columna + `tablet:` que la pasa a dos, y la celda del ovillo con `hidden` +
`tablet:block`. Las dos piezas son necesarias: **sólo con `grid-cols-1` la celda vacía se apilaría
debajo del formulario** — dejaría de robar ancho, pero seguiría siendo una caja de altura 0/auto en el
flujo. `DashboardHero` pone las dos por eso.

**Advertencia para quien implemente:** `tablet:aspect-square` en `DashboardHero.tsx:58` existe porque
el host del ovillo es `h-full` y sin una altura de referencia colapsaría. En una celda de rejilla con
un formulario al lado la altura la da la fila, pero **no se debe copiar la clase sin comprobar cuál de
los dos casos aplica**.

**Un hueco de método, dicho sin rodeos:** ningún test del repo comprueba estas clases responsive.
**[MEDIDO]** el barrido de `tablet:|grid-cols|hidden` sobre todos los `*.test.ts(x)` de `src/` no
devuelve **ni un solo aserto** sobre ellas (los aciertos son `aria-hidden` y `overflow: hidden` de
`Dialog`). Es decir: `DashboardHero.tsx:58` **no está protegido por nada**. Si el arreglo de la 118 se
cierra sin un gate, nace con la misma fragilidad que el precedente que copia.

---

## 4. El guardrail de no-hardcode: `px-20` es un rojo latente, y aquí está la prueba

### 4.1 Qué prohíbe EXACTAMENTE

`src/shared/ui/no-hardcode.test.ts:63-65` — son **tres** regex, y nada más:

```ts
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_COLOR = /\brgba?\(/;
const PX_LITERAL = /\b\d+(?:\.\d+)?px\b/;
```

Alcance: `SRC_DIR = new URL("../../", import.meta.url)` (`:41`) → **`src/` entero** (la enmienda E2.3
que mencionas, documentada en `:21-27`). Recorre directorios (`:44-58`), excluye `*.test.*` y `*.d.ts`,
**sin allowlist** y con la negativa explícita a abrir una (`:31-33`).

### 4.2 ¿Pasan `grid-cols-2` y `px-20`?

**Sí, los dos.** **[MEDIDO]**

```
pnpm vitest run src/shared/ui/no-hardcode.test.ts src/shared/ui/canonical-tailwind-classes.test.ts
Test Files  2 passed (2)
      Tests  453 passed (453)
```

Y pasan por la razón que hay que entender antes de tocar nada: **la cadena `px-20` no contiene ninguna
de las tres formas prohibidas.** `PX_LITERAL` exige `<dígitos>px` — aquí el `px` va **delante** y
significa *padding-inline*, no *píxeles*. No es un fallo del guardrail: es que **el guardrail no puede
ver esta clase de valor**. Es el mismo agujero exacto que ya está documentado en
`src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts:30-34` para la utilidad de latido de
fábrica: *"que el guardrail de no-hardcode **no puede ver** porque no lleva ni `px` ni color"*.

El otro guardrail tampoco lo ve: `canonical-tailwind-classes.test.ts:47` sólo busca la forma larga
`utilidad-[var(--token)]`, es decir vigila **cómo** se escribe un token, no **si** hay uno.

### 4.3 ¿Existe el token que estas páginas DEBERÍAN estar usando?

Sí: la escala `--space-*` de `globals.css:170-179` (`--space-1: 4px` … `--space-12: 48px`), consumida
con la forma canónica de paréntesis.

Y aquí está la prueba de que `px-20` es una anomalía y no una elección: inventario **completo** de
utilidades de espaciado de todo `src/` **[MEDIDO]**:

```
     12 gap-(--space-4)          2 px-20                ← LAS DOS PÁGINAS DE AUTH
     10 gap-(--space-3)          2 px-(--space-4)
      9 gap-(--space-2)          2 p-(--space-6)
      5 m-0                      2 p-(--space-5)
      3 py-(--space-2)           2 gap-(--space-1)
      3 p-(--space-3)            1 py-(--space-3)
      1 py-(--nav-account-inset-block)   1 px-(--space-6)
      1 px-(--space-1)           1 px-(--nav-tab-padding-x)
      1 px-(--nav-tab-inset-start)       1 px-(--nav-account-inset-inline)
      1 pt-(--space-2)           1 pr-(--nav-tab-inset-end)
      1 pl-(--nav-tab-inset-start)       1 p-0
      1 p-(--space-8)            1 p-(--space-4)
      1 gap-(--space-8)          1 gap-(--space-5)
```

**De 55 utilidades de espaciado en todo `src/`, 53 salen de un token, 2 son `p-0`/`m-0` (cero, que no
tiene token porque no lo necesita)… y `px-20` es el ÚNICO valor numérico crudo del repo. Aparece
exactamente 2 veces: `login/page.tsx:41` y `register/page.tsx:16`.**

Dos observaciones más para quien arregle:

- **Ningún token de la escala llega a 80px.** El máximo es `--space-12: 48px`. Si el rediseño quiere
  de verdad 80px de relleno lateral, eso **no es un ajuste de clase: es un token nuevo** —y por el
  criterio del SDD §9 y de RFC-01 §3 tendría que declararse en `globals.css` con su motivo escrito
  (el precedente exacto de un token de layout con motivo propio es `--nav-tab-inset-start`,
  `globals.css:100`). Un candidato natural sería un token de relleno de página, que hoy **no existe**:
  el `main` de auth usa `p-(--space-6)` directamente (`layout.tsx:14`), igual que las demás pantallas.
- **`px-20` es además redundante con el `max-w-sm` de la tarjeta** (`AuthPanel.tsx:31`), que ya es
  quien impide que el formulario se estire en desktop —y cuyo JSDoc (`:21-22`) dice justamente eso.

**Veredicto de este punto: `px-20` es un rojo latente confirmado.** No lo detecta ningún gate, es el
único de su especie en el repo, y es **la mitad del daño numérico en móvil** (160 de los 208px que se
pierden). Su arreglo pertenece a la misma intervención que la 118, no a otra ficha.

---

## 5. Qué dice la fuente de verdad de diseño — **y en qué está desactualizada**

### 5.1 Lo único que el RFC-01 dice de auth

`docs/design/rfc/RFC-01-shell.md:21` (§2, "Decisiones que fija este RFC"):

> - **Auth = pantalla limpia, sin archivero**; ovillo ASCII de fondo **solo en login** (no en register).

`docs/design/rfc/RFC-01-shell.md:208` (§ estructura):

> - `(app)/**` privado, envuelto por `AppShell`; `(auth)/**` público (login/register), pantalla limpia sin nav.

`docs/design/rfc/RFC-01-shell.md:235`:

> - `src/app/(app)/layout.tsx` (AppShell) y `src/app/(auth)/layout.tsx` (limpio).

**Y eso es todo.** Se barrieron `login|register|auth|Entrar|Crear cuenta` sobre el RFC-01 entero
**[MEDIDO]**: las demás apariciones son de E7/E11 y hablan de los *utils* del nav, no del layout de las
pantallas.

### 5.2 Las TRES discrepancias con el código de hoy

**Discrepancia 1 — el RFC-01 §2 está DESACTUALIZADO y ya está reconocido en el repo.**
Dice *"ovillo ASCII de fondo **solo en login** (no en register)"*. `register/page.tsx:24` monta el
ovillo. El propio test lo documenta como reversión deliberada del rediseño `bdb11b0`
(`auth-pages.test.tsx:188-223`), y la deuda 116 pide anotar la reversión en la ficha #31. **Peor
todavía: el JSDoc de `register/page.tsx:11` sigue diciendo lo contrario de lo que hace el archivo**
—*"Sin ovillo de fondo: el RFC-01 §2 lo reserva para login"*— tres líneas antes de montarlo. Eso ya no
es documentación desactualizada: es un comentario que **miente sobre el código que tiene debajo**, y no
está en ninguna ficha. Recomiendo abrirle una o plegarlo al arreglo de la 117.

**Discrepancia 2 — el RFC dice "de FONDO", el código hace "de AL LADO".**
La palabra del RFC es *"ovillo ASCII **de fondo**"*, que es lo que describe el slot `bg-3d` original
del `AppShell` (`AppShell.tsx:52-58`: fijo a los cuatro lados, `--z-bg-3d`, sin captura de puntero).
Tras `bdb11b0` el ovillo es **una celda de una rejilla, en el flujo, con `pointer-events-auto`**
(medido en §2.3: el host lleva `pointer-events-auto` porque las páginas pasan `interactive={true}`).
Es un cambio de categoría, no de estilo. Es la misma observación que la deuda 117 hace sobre el
`data-slot`, un nivel más arriba.

**Discrepancia 3 — la rejilla de dos columnas NO ESTÁ ESPECIFICADA en ninguna parte.**
No hay ni una línea en RFC-01 ni en SDD-01 que describa un layout de dos columnas para auth. Es una
decisión de producto tomada a mano en `bdb11b0`, legítima, pero **sin fuente de verdad escrita**.
Consecuencia práctica para el arreglo de la 118: **no hay documento contra el que validar cuál es el
comportamiento responsive correcto**. Hay que elegirlo, y elegirlo es una decisión que debería quedar
escrita (enmienda al RFC-01 §2, que es como este repo registra estos cambios: ver el bloque de
enmiendas E1–E11).

### 5.3 Lo que el SDD sí obliga, y que aplica igual

- `docs/design/SDD-01-design-system.md:67` — *"**Dos pantallas primarias: tablet y desktop** … mobile
  existe pero es **secundario**"*. Secundario **no es inexistente**: sigue habiendo un contrato.
- `docs/design/SDD-01-design-system.md:160` — *"Breakpoints: `--bp-mobile`, `--bp-tablet` (base),
  `--bp-desktop` | **Tablet-first** (§6)"*.
- `docs/design/SDD-01-design-system.md:218-219` — *"Primarios tablet + desktop: la experiencia 3D se
  calibra para ambos; en **mobile** (secundario) degrada — menos densidad, fondo estático, o **se
  omite** — según media query + reduced-motion."* Es la frase que `useViewportSupports3d.ts:44-46`
  cita al elegir omitir. **El SDD autoriza omitir la escena; no dice nada de qué hacer con el hueco.**
  Ese silencio es exactamente donde vive la 118.
- `docs/design/SDD-01-design-system.md:254-255` — *"el layout **se adapta** también a desktop (puntero)
  y a mobile (secundario)"*. Es la obligación más directa que incumplen hoy las dos páginas.

**Nota sobre "tablet-first" vs. mobile-first:** el SDD dice *tablet-first* como **prioridad de diseño**
(qué pantalla se diseña primero). La implementación en Tailwind v4 es **mobile-first** por mecánica
(§1.3: las variantes son min-width). No se contradicen, pero es fácil leer "tablet-first" y escribir
`grid-cols-2` en la base pensando que la variante quitará la segunda columna hacia abajo. **Eso no
funciona**: no hay variante max-width en este repo. Sospecho que es justamente el error que produjo la
118, y conviene decirlo en el informe de cierre.

**Nada en `docs/harness/*.md` habla de responsive** **[MEDIDO]**: el barrido de
`mobile-first|responsive|tablet:|breakpoint` sobre `docs/harness/*.md` no devuelve nada. La convención
existe sólo como práctica en el código del Dashboard.

---

## 6. Gates que existen hoy sobre estas dos páginas

`src/app/(auth)/auth-pages.test.tsx` — 12 casos (los 4 del `it.each` cuentan como 4).
**[MEDIDO]** los 20 tests del comando de §1.4 pasan (12 de este archivo + 8 de breakpoint-tokens).

Doblado relevante: `:18-20` `vi.mock("@/shared/ui/three")` sustituye `AsciiYarn` por
`<span data-testid="ascii-yarn" />`. **Consecuencia importante para el arreglo:** en este archivo el
ovillo **no tiene host propio**, así que cualquier aserto sobre las clases del host no se puede
escribir aquí sin deshacer el doble.

| # | Línea | Qué asegura | ¿Lo rompería una variante responsive? |
|---|---|---|---|
| 1 | `:74-79` | login monta el encabezado "Entrar" y el campo Email | **No.** No mira layout. |
| 2 | `:81-88` | login: existe `[data-testid="ascii-yarn"]`, existe `[data-slot="bg-3d"]` y es `aria-hidden` | **No**, *salvo* que el arreglo **renombre** el `data-slot` (que es lo que pide la deuda 117). Si se hacen las dos fichas a la vez, este aserto **hay que ajustarlo** — está avisado en `:218-222`. |
| 3 | `:91-95` | login no renderiza su propio `main` | **No.** |
| 4 | `:115-123` | **gate de la deuda 37**: ninguna frontera de Suspense con relleno nulo | **No**, y conviene no tocarlo: recorre el árbol devuelto (`collectSuspenseBoundaries`, `:48-59`) y una envoltura `<div>` más no le afecta. |
| 5 | `:129-143` | el destino `?next=` viaja por el servidor y llega al `router.replace` | **No.** |
| 6-9 | `:150-168` | `it.each` × 4: `?next=` hostil (absoluta, protocol-relative, con barra invertida, repetida) muere y redirige a `/` | **No.** |
| 10 | `:170-174` | login sin violaciones de `axe` | **No.** Y ojo: **tampoco lo detectaría** — el hueco vacío es `aria-hidden`, invisible para `axe`. |
| 11 | `:178-185` | register monta "Crear cuenta" y el campo Nombre | **No.** |
| 12 | `:224-231` | **gate de la reversión de #31**: register **sí** monta el ovillo, decorativo | **No**, con el mismo matiz del #2 sobre el `data-slot`. |
| 13 | `:233-237` | register no renderiza su propio `main` | **No.** |
| 14 | `:239-243` | register sin violaciones de `axe` | **No.** |

**Conclusión de este punto: cero gates se rompen por añadir la variante responsive.** El único
acoplamiento es el `data-slot="bg-3d"`, y no con la 118 sino con la **117** — las dos fichas tocan la
misma línea de las mismas dos páginas.

**Y el corolario incómodo, que es el hallazgo de método del informe:** si cero gates se rompen, es
porque **cero gates miden lo que la 118 denuncia**. Hoy se puede quitar la variante responsive de
`DashboardHero.tsx:58` y de los tres paneles del Dashboard, y **la suite entera sale verde**. Es el
mismo patrón que motivó `breakpoint-tokens.test.ts` (líneas 19-26: *"medido en el review de #19,
moviendo `--breakpoint-tablet` a 900px … la suite entera salía verde con exit 0"*), un piso más
arriba: allí se ataron los **tokens**, aquí faltan las **clases que los consumen**.

---

## 7. Síntesis para quien decida el arreglo

**Confirmado (medido):**
- El hueco del ovillo **no desaparece** en móvil: el host `h-full w-full` se renderiza siempre y la
  pista `1fr` se lo queda. La ficha 118 acierta y se queda corta.
- Las variantes son **min-width**. Un arreglo escrito en clave max-width no compila a nada.
- `px-20` es el único valor de espaciado crudo del repo, aporta 160px de los ~208 que se pierden en
  móvil, y **ningún guardrail puede verlo**.
- Los 12 casos que hoy vigilan estas páginas pasan y **ninguno** se rompería.

**Confirmado (leído):**
- El patrón idiomático existe y es de dos piezas: base de una columna + `tablet:` para la segunda, y
  `hidden` + `tablet:block` en la celda del ovillo. `DashboardHero.tsx:58` es el gemelo exacto.
- El RFC-01 §2 está desactualizado en un punto (ovillo sólo en login) y **mudo** en el que importa
  (la rejilla de dos columnas nunca se especificó).
- El JSDoc de `register/page.tsx:11` contradice su propio código. **No tiene ficha.**

**No confirmado, y hay que confirmarlo:**
- La cuenta de §2.4 (47px de formulario a 390px) es **aritmética con tokens medidos**, no una captura.
  La ficha 118 lo clasifica en la familia de la regla 4 y tiene razón: **hace falta la pantalla
  delante**, y este informe no la sustituye.

**Tres cosas que recomendaría meter en el alcance:**
1. **118 y 117 juntas.** Tocan la misma línea de los mismos dos archivos y las dos arrastran el
   `data-slot`. Hacerlas por separado significa editar `auth-pages.test.tsx` dos veces.
2. **`px-20` dentro de la 118**, no aparte: es la mitad del daño medido y no tiene token que lo
   respalde. Si se quiere conservar los 80px, hay que **declarar un token con su motivo**.
3. **Un gate sobre la variante responsive** — el que hoy no existe para nadie, ni para el Dashboard.
   Sin él, el arreglo nace tan desprotegido como el precedente que copia.

---

## Apéndice — cómo se midió (reproducible)

1. **CSS compilado.** Script en el scratchpad: `postcss([tailwindcss()]).process(globals.css)`, con
   `createRequire` apuntando al `package.json` del proyecto (los módulos no resuelven desde fuera del
   repo con pnpm). Se extrajeron los preludios `@media` únicos y las reglas de `.px-20`,
   `.grid-cols-2`, `.tablet\:grid-cols-2`, `.tablet\:block`, `--spacing` y `--breakpoint-tablet`.
2. **DOM en móvil.** Sonda de vitest con `--config` apuntando a un config del scratchpad
   (`root` = proyecto, alias `@` = `src/`, `setupFiles` = el del proyecto) y el archivo de prueba en
   `.probe118/` **dentro** del repo, porque vite no resuelve `@testing-library/react` desde fuera.
   Se dobla sólo `next/navigation` y `next/link`; **`AsciiYarn` va sin doblar** (a diferencia de
   `auth-pages.test.tsx`), que es la razón de montar la sonda aparte. `--disable-console-intercept`
   para ver la salida. **`.probe118/` se borró**; `git status` posterior no lo muestra.
3. **Suites existentes.** `pnpm vitest run` sobre `auth-pages.test.tsx`, `breakpoint-tokens.test.ts`,
   `no-hardcode.test.ts` y `canonical-tailwind-classes.test.ts`.
4. **Inventarios.** `Grep`/`rg` sobre `src/` para variantes responsive, utilidades de espaciado y
   asertos de clases en tests; sobre `docs/design/` y `docs/harness/` para la fuente de verdad.
