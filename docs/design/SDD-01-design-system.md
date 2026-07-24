# SDD-01 — Design System / Template (portable)

> **Qué es este documento.** Un **Software Design Document** que define, a nivel de **código y
> estructura**, el *template* (design system) de Knit&Crochet como una **librería portable y
> autocontenida**. Describe principios, stack, estructura interna, contrato de tokens, inventario de
> componentes, capa 3D, accesibilidad y verificación.
>
> **Portabilidad — regla dura.** El template **no conoce ninguna aplicación concreta**. No sabe de
> carpetas de un proyecto, ni de un backend/endpoints, ni de un manejador de datos, ni de un proceso de
> equipo. Es una **caja de componentes + tokens** que cualquier app puede consumir. Todo lo de "cómo se
> integra a *tal* app" (rutas, fetch de datos, estado global, wiring a un backend, procesos y
> herramientas de ese repo) se define **fuera de este SDD**, en los **RFC de la app que lo consuma**.
>
> **Identidad visual.** Este SDD fija el **contrato** (nombres de tokens, estructura, API de
> componentes). Los **valores** de identidad (los hex de la paleta, las tipografías concretas, y qué
> referencia estética va en cada pantalla) viven en el **brief de identidad visual** (documento
> companion) y no se hardcodean aquí.

---

## 0. Referencias de inspiración

Fuentes que guían estética y técnica (analizadas para este SDD):

- **Hill House** — `http://hillhouse.neocities.org/` — **referencia estética principal.** Fusión
  **retro × moderno**: nostalgia de web personal early-2000s / Y2K (texturas de papel y encaje, pixel
  art, stickers/badges, GIFs sutiles, navegación temática como exploración) **con** estructura y
  accesibilidad actuales. De aquí viene el eje "actual + old", el sistema de **texturas de fondo** y los
  **motivos coleccionables** (pixel/sticker).
- **Byline** — `https://www.bylinebyline.com/` — **organización editorial** (grid por categorías,
  jerarquía clara, secciones tipo revista) y, sobre todo, **énfasis por cambio de tipografía**: resaltar
  algo = **cambiar la familia** (no solo peso/color). De aquí salen la regla tipográfica de énfasis y el
  gusto por las fuentes.
- **Soft Glossary** — `https://softglossary.space/` — aporta **estructura e interacción**, no su
  minimalismo B/N. **Navbar "archivero"**: pestañas como **fichas/carpetas flotantes** (esquinas
  redondeadas, sombra suave, **alturas escalonadas**) que **se deslizan hacia arriba en hover** (sacar
  la ficha del cajón); etiqueta = **lockup** de prefijo en serif itálica + palabra en sans mayúscula.
  También **elementos ASCII** y un **objeto 3D en ASCII rotable** → reformado a **ovillo de lana con
  agujas**. *(La web no respondió al fetch; se captura de las capturas y la descripción del usuario, y se
  traduce a técnica en §3/§6/§7.)*

> **Peso estético (importante).** **Hill House es la referencia dominante**: define la *piel* y el ánimo
> — cálido, texturado, retro-acogedor, decorativo. **Soft Glossary** aporta **patrones de estructura e
> interacción** (archivero, ASCII), **no** su minimalismo blanco-y-negro. **Byline** aporta el **sistema
> tipográfico** (énfasis por cambio de familia). La app **no** es un sitio minimalista frío: es la fusión
> retro×moderno de Hill House, con la mecánica de archivero y los toques ASCII encima.

---

## 1. Drivers de diseño (de la dirección creativa)

La dirección creativa **moldea la estructura** del template (no solo sus colores). Los drivers y su
consecuencia estructural:

| Driver creativo | Consecuencia estructural en el template |
|---|---|
| **Brutalismo** | Tokens de **borde grueso**, **radios chicos o 0**, **sombra dura** (offset sólido, sin blur), tipografía de alto contraste de peso. |
| **Ciber / neón** | Token de **glow**; estados con acento luminoso; motivos pixelados. |
| **Celestial / estrellas** | **Sistema de motivos** (SVG): estrellas de puntos, querubines, alas, ángel pixel-gótico, como componentes parametrizables por token. |
| **3D obligatorio** | Una **capa 3D de primera clase** (no opcional): fondo/experiencia animada, aislada y client-only (ver §7). Incluye escenas tipo "mapa/textura 3D en movimiento" y "alas con movimiento". |
| **Encuadre luminoso con marcos** | Un componente de **enfoque/encuadre** (marco de esquinas/borde de acento que resalta una zona), como patrón reutilizable. |
| **Layouts experimentales** | Primitivos de **layout no convencional** (asimétrico, superpuesto) además de los layouts de lista estándar. |
| **Navbar "archivero"** (Soft Glossary) | Navegación tipo **cajón de archivo / pestañas de ficha** como patrón de shell (`ArchiveNav`, §6). |
| **ASCII** (Soft Glossary) | **Motivos ASCII** (arte, bordes, dividers) + un **objeto 3D en ASCII rotable** = ovillo de lana con agujas (§7). |
| **Énfasis por tipografía** (Byline) | Resaltar = **cambiar familia tipográfica** (token `--font-emphasis`, componente `Emphasis`, §5/§6), no solo peso/color. |
| **Retro × moderno** (Hill House) | Sistema de **texturas de fondo** (papel/encaje) + **motivos coleccionables** (pixel, sticker/badge), fusionados con brutalismo/ciber. |
| **Dos pantallas primarias: tablet y desktop** | Se diseñan **tablet y desktop como co-primarios**; mobile existe pero es secundario. Targets táctiles ≥ 44×44 px en tablet (§6, §8). |

> El mapeo fino de "qué referencia va en qué pantalla" es decisión de los **RFC de página**, no del
> template. El template solo **provee** los motivos, las capas y los primitivos para que esos RFC los usen.

---

## 2. Principios (a nivel código)

1. **Token-first.** Ningún componente hardcodea color, tamaño, borde o sombra: todo referencia un
   **token**. Cambiar la identidad = cambiar tokens, no componentes.
2. **Presentación pura.** El template es solo **presentación**: componentes controlados por props y
   estado local de UI. **No** hace fetch, **no** decide rutas, **no** conoce un backend. Quien lo
   consuma le pasa datos y callbacks.
3. **Autocontenido y portable.** Se distribuye como una unidad con su propio barrel de entrada; no
   depende de nada específico de una app.
4. **3D y decorativo aislados** en su propia capa client-only (§7), que nunca bloquea el contenido.
5. **Accesible por defecto** (§8): HTML semántico, foco visible, `prefers-reduced-motion`, contraste,
   teclado — parte de "done", no un extra.

---

## 3. Stack

Base **React + Tailwind**. Recomendación con motivo:

| Área | Elección | Por qué |
|---|---|---|
| **Estilos** | **Tailwind CSS v4** (tokens vía `@theme` + variables CSS) | Utility-first + tokens nativos; traduce casi 1:1 desde mockups; ideal para estética muy custom. |
| **Variantes** | **`class-variance-authority` (cva) + `tailwind-merge` + `clsx`** | Variantes (`variant`, `size`) **tipadas** y componibles; `tailwind-merge` evita choques al pasar `className`. |
| **3D** | **`three` + `@react-three/fiber` + `@react-three/drei`** + **`AsciiEffect`** (three.js examples) | R3F integra three.js declarativo; `drei` trae helpers; **`AsciiEffect`** renderiza la escena como ASCII (el ovillo rotable, §7). |
| **Animación 2D** | **CSS primero**; `motion` (Framer Motion) solo donde el CSS no alcanza | Bundle chico; el movimiento pesado va por 3D. |
| **Iconos/motivos** | **SVG propios** parametrizables por token | La estética es específica; una librería genérica no encaja. Iconos utilitarios (chevrons) pueden venir de una librería liviana. |
| **Texturas/pixel-art** | **Assets de imagen** (papel, encaje) + PNG/SVG pixel para stickers/badges | Fusión retro (Hill House); optimizados y versionados con el template. |
| **ASCII** | Fuente **monospace** + render de motivos ASCII (texto) y del objeto 3D vía `AsciiEffect` | Los motivos ASCII son texto sobre `--font-mono`; el objeto ASCII sale del render 3D (§7). |
| **Tipografías** | **Self-hosted**, **múltiples familias** (display, body, mono y **emphasis**); mecanismo del framework anfitrión (p. ej. `next/font` si corre sobre Next) | Sin FOUT, sin requests externos. El énfasis por cambio de familia (Byline) exige ≥ 2 familias contrastantes. |

**Helper obligatorio:** `cn(...)` = `twMerge(clsx(...))`. Todo componente que acepte `className` lo
fusiona con `cn()` para permitir override sin choques.

---

## 4. Estructura interna del template (librería autocontenida)

Raíz del design system (nombre de raíz irrelevante para el template; la app que lo consuma decide dónde
montarlo — eso es materia de su RFC):

```
<design-system>/
├── tokens/            # tipos TS de tokens + mapa semántico (nombres, no valores crudos)
├── styles/
│   └── theme.css      # variables CSS (:root) + capa @theme de Tailwind ← rellenado con la identidad
├── lib/
│   └── cn.ts          # twMerge(clsx(...))
├── hooks/             # useMediaQuery, useReducedMotion, ...
├── primitives/        # Button, Input, Card, ... (1 carpeta por componente)
│   └── button/
│       ├── button.tsx
│       ├── button.variants.ts     # cva
│       └── button.test.tsx
├── layout/            # AppShell, ArchiveNav, PageHeader, Container, Grid, ListView, layouts experimentales
├── feedback/          # EmptyState, ErrorState, Skeleton, Spinner, Toast
├── form/              # Field (label+hint+error), Form, controles compuestos
├── motifs/            # SVGs: estrellas de puntos, querubines, alas, ángel, FocusFrame
├── three/             # capa 3D client-only (CanvasHost + escenas)
└── index.ts           # barrel de entrada del template
```

**Reglas de import internas:**
- Los componentes importan de `tokens/`, `lib/`, `hooks/` y entre capas hermanas según necesidad.
- **`three/` es la única capa que importa `three`/R3F**, siempre client-only (§7).
- **Nada** en el template importa de una app consumidora, ni de una capa de datos, ni de un backend.

---

## 5. Contrato de tokens (la identidad rellena los valores)

Los tokens se declaran **una vez** como variables CSS (`:root` en `styles/theme.css`) y se exponen a
Tailwind vía `@theme`. Este SDD fija **categorías y nombres semánticos**; los **valores** vienen del
brief de identidad.

| Categoría | Tokens semánticos (nombres, no valores) | Nota |
|---|---|---|
| **Color — rol** | `--bg`, `--surface`, `--surface-raised`, `--fg`, `--fg-muted`, `--accent`, `--accent-fg`, `--border`, `--danger`, `--success`, `--focus` | Se mapean **roles**, no colores crudos. |
| **Color — marca** | `--brand-pink`, `--brand-green`, `--brand-yellow`, `--brand-brown`, `--brand-cream` | Escala cruda de la paleta; los roles apuntan a estos. |
| **Tipografía** | `--font-display`, `--font-body`, `--font-mono`, **`--font-emphasis`** (familia para resaltar, Byline); `--text-xs … --text-3xl`; `--leading-*`, `--tracking-*` | Énfasis por **cambio de familia**, no solo peso. |
| **Espaciado** | `--space-1 … --space-12` (base 4 px) | — |
| **Radios** | `--radius-none`, `--radius-sm`, `--radius-md` | Brutalismo → chicos o 0. |
| **Bordes** | `--border-width` (grueso), `--border-color` | Firma brutalista. |
| **Sombras** | `--shadow-hard` (offset sólido), `--shadow-glow` (neón) | Brutalismo + ciber. |
| **Texturas** | `--texture-paper`, `--texture-lace` (fondos retro) | Fusión retro×moderno (Hill House). |
| **Movimiento** | `--dur-fast/base/slow`, `--ease-standard/entrance/exit` | Respetados por reduced-motion. |
| **Z-index** | `--z-bg-3d`, `--z-base`, `--z-nav`, `--z-overlay`, `--z-modal`, `--z-toast` | **Crítico**: el 3D va detrás del contenido. |
| **Breakpoints** | `--bp-mobile`, `--bp-tablet` (base), `--bp-desktop` | Tablet-first (§6). |

---

## 6. Inventario de componentes que el template DEBE entregar

Cada uno con sus variantes, estados y su test (§9):

**Primitivos** (`primitives/`)
- `Button`, `IconButton` — `variant` (primary/secondary/ghost/danger) × `size`; estados
  hover/active/**focus-visible**/disabled/loading; target táctil ≥ 44 px.
- `Input`, `Textarea`, `Select`, `Checkbox`/`Toggle` — estados focus/error/disabled.
- `Card`, `Badge`/`Tag`, `Divider`, `Avatar`.
- `ProgressBar`, `Skeleton`, `Spinner`.
- `Tabs`, `Dialog`/`Modal`, `Tooltip`, `Toast`.
- **`Emphasis`** — resalta texto **cambiando la familia tipográfica** (`--font-emphasis`), patrón de Byline; alternativa semántica a `<em>`/`<strong>`.

**Layout / shell** (`layout/`)
- `AppShell` — estructura nav + contenido + **slot para el fondo 3D**.
- **`ArchiveNav`** — navegación tipo **archivero**: pestañas como **fichas/carpetas flotantes** (esquinas redondeadas, **sombra suave**, **alturas escalonadas**) que **se deslizan hacia arriba en hover** (sacar la ficha del cajón). Etiqueta = **lockup** serif itálica + sans mayúscula (Soft Glossary + Byline). Enlaces utilitarios secundarios (tipo INFO/IMPRINT) como texto plano. Patrón principal de navegación para **tablet y desktop** co-primarios. **Piel Hill House** (cálida/texturada), no minimalista B/N.
- `PageHeader`, `Container`, `Grid`.
- `ListView` + `ListItem` con **organización editorial** por categorías/secciones (Byline).
- **Layouts experimentales** — primitivos de composición asimétrica/superpuesta (driver §1).

**Feedback** (`feedback/`)
- `EmptyState`, `ErrorState`, patrón estándar de loading.

**Form** (`form/`)
- `Field` (label + hint + error, cableado a accesibilidad) + layout de formulario.

**Motivos, texturas y encuadre** (`motifs/`)
- Motivos SVG parametrizables por token: **estrellas de puntos**, **querubines**, **alas**, **ángel**.
- **Motivos ASCII** — arte, bordes y dividers en ASCII sobre `--font-mono` (Soft Glossary).
- **`Sticker`/`Badge`** — piezas coleccionables tipo pixel-art / web-badge (Hill House).
- **`TextureLayer`** — capa de fondo de textura (papel/encaje) por token `--texture-*` (retro×moderno).
- `FocusFrame` — encuadre luminoso con marco de acento que resalta una zona (driver §1).

**Capa 3D** (`three/`)
- `CanvasHost` + la escena **signature**: un **ovillo de lana con agujas renderizado en ASCII**
  (`AsciiEffect`), **rotable** (auto-rotación + arrastre) — reemplaza al objeto ASCII genérico de
  Soft Glossary. Valida la integración R3F, el aislamiento SSR y `prefers-reduced-motion` (§7).
- Opcional/decorativa: escena de **mapa/textura 3D en movimiento** y **alas** como fondo (visual.md).

---

## 7. Capa 3D y decorativa (aislamiento estricto)

- **Client-only:** todo `three/**` es client y se monta de forma diferida sin SSR (three.js no corre en
  server ni en el build de componentes de servidor del anfitrión).
- **Detrás del contenido:** el `CanvasHost` vive en `--z-bg-3d`; el contenido y la interacción van por
  encima. Los fondos animados (alas, mapa 3D) son **decorativos** y no capturan eventos
  (`pointer-events: none`) salvo escenas explícitamente interactivas.
- **Rendimiento:** `dpr` acotado, escenas en carga diferida/`Suspense`, y **respeto de
  `prefers-reduced-motion`** (congelar o caer a estático). El 3D **no** bloquea el primer render del
  contenido.
- **Objeto ASCII signature:** el ovillo con agujas se modela en 3D (three.js) y se renderiza como ASCII
  vía `AsciiEffect`; rotable por auto-rotación + arrastre. Es un elemento interactivo de marca (excepción
  consciente al `pointer-events: none` de los fondos decorativos).
- **Primarios tablet + desktop:** la experiencia 3D se calibra para ambos; en **mobile** (secundario)
  degrada — menos densidad, fondo estático, o se omite — según media query + reduced-motion.

---

### 7.1 ASCII — fuentes y técnica (para que **no** quede "horrible")

El ASCII feo suele venir de generadores random, de fuente **proporcional**, o de `line-height ≠ 1`. El
ASCII clásico (`.:-=+*#%@`) es de baja resolución; **braille y bloques Unicode** rinden mucho más.

**Técnica por uso:**
- **Objeto 3D rotable (ovillo + agujas):** three.js **`AsciiEffect`** (`three/addons/effects/AsciiEffect.js`,
  basado en jsascii). Rotación con `mesh.rotation.y += speed` en el loop (o `OrbitControls` para arrastre)
  + `effect.render(scene, camera)`. Calidad = **rampa de caracteres** afinada + **resolución de celda** +
  malla **bien iluminada y de alto contraste**.
- **Motivos/ilustraciones estáticas (estrellas, querubines, alas, ángel):** convertir arte fuente **limpio
  y de alto contraste** con **`chafa`** o **`ascii-image-converter`** en **modo braille** (celda de 2×4 =
  8 px por carácter → alta resolución). Prerenderizar a texto y estilar con monospace.
- **Títulos/banners ASCII:** `figlet`/`toilet` (fuentes tipo "ANSI Shadow") — lettering limpio y reproducible.

**Reglas de render en navegador:** fuente **monospace**, `line-height: 1`, `white-space: pre`,
`letter-spacing` afinado, unidades `ch`. Motivos **pequeños e intencionales**, no muros de ruido.

**Inspiración curada** (escena ANSI/ASCII del BBS/demoscene — mucho más elegante que cualquier generador):
- **16colo.rs** — el mayor archivo ANSI/ASCII (packs de ACiD, iCE, Blocktronics).
- **asciiart.eu** — biblioteca curada + visor ANSI.
- **artscene.textfiles.com** — archivo histórico del artscene.

---

## 8. Accesibilidad (baseline no negociable)

- HTML semántico; roles/aria correctos en `Dialog`, `Tabs`, `Toast`, `Tooltip`.
- **Foco visible** en todo interactivo (token `--focus`); navegación por teclado completa.
- `prefers-reduced-motion` respetado por la animación 2D **y** por la capa 3D.
- Contraste suficiente (el alto contraste brutalista ayuda; validar los roles de color).
- Targets táctiles ≥ 44×44 px en tablet (co-primaria con desktop, §1); el layout se adapta también a
  desktop (puntero) y a mobile (secundario).

---

## 9. Verificación (definición de "done" por componente)

1. **Test de componente / interacción** con **React Testing Library + `user-event`** sobre un entorno
   DOM (`happy-dom`). Se prueba **comportamiento y accesibilidad** (roles, foco, estados, callbacks),
   **no píxeles**.
2. **Smoke de render:** cada componente monta sin explotar.
3. **Assertions de a11y** con `axe` en los primitivos.
4. **Typecheck + lint + build** verdes como puerta.
5. **Fidelidad visual = revisión manual** contra el mockup de referencia. *Opcional a futuro:* regresión
   visual automatizada.

> No se testea "que se vea lindo": eso lo valida el humano contra el mockup. Sí se testea comportamiento,
> a11y y que **cero valores estén hardcodeados** (todo por token).

---

## 10. Fuera del alcance de este SDD (materia de los RFC de la app consumidora)

Estas cosas dependen de **cada app** que consuma el template y **no** se definen aquí:

- Dónde se monta el design system dentro del árbol de una app, y su convención de rutas/páginas.
- **Fetch de datos y wiring a un backend** (qué endpoint alimenta cada pantalla): las páginas reciben
  datos y callbacks; de dónde salen es del RFC.
- Elección de manejador de **estado global** y de fetching de la app.
- Proceso de equipo, roles, herramientas de build/CI y comandos de verificación del repo anfitrión.
- Cualquier **deuda técnica o particularidad** del backend de una app concreta.

**Flujo:** el template se **construye** guiado por este SDD + el brief de identidad. Luego, al integrarlo
a una app, cada pantalla se especifica en su propio **RFC**, que es donde entran las cosas de esta
sección. El template permanece agnóstico y reutilizable.

---

## 11. Decisiones abiertas

1. **Stack (§3)** — confirmado por el usuario. ✅
2. **Verificación (§9)** — confirmada por el usuario. ✅
```
