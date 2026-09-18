# explore — blast radius de reescribir `ArchiveNav.tsx` + `archive-nav.variants.ts`

> **Alcance de la pregunta:** ¿qué se rompe si reescribo `ArchiveNav.tsx` + `archive-nav.variants.ts`
> al modelo D4 (stack vertical de fichero), y qué contratos hay que preservar?
> Método: lectura estática de `src/**`, `docs/harness/conventions.md`, `docs/design/SDD-01-design-system.md`
> §9, `docs/design/rfc/RFC-01-shell.md` §3/D4, `progress/reports/explore_softglossary_register.md`,
> `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`. Cero edición de `src/**`.

---

## 1. Consumidores

| símbolo | consumido por | archivo:línea | ¿se puede romper la firma? |
|---|---|---|---|
| `ArchiveNav` (componente) | `AppShell` | `src/shared/ui/layout/app-shell/AppShell.tsx:4,53` | No — se sigue invocando `<ArchiveNav items={items} user={user} onLogout={onLogout} />` |
| `ArchiveNavUser` (tipo) | `AppShell` (prop `user`) | `AppShell.tsx:4,20` | No — reexportado también por `archive-nav/index.ts:2` |
| `ArchiveNavProps` | reexportado, sin otro consumidor interno hoy | `src/shared/ui/layout/archive-nav/index.ts:2` | Libre de romper *forma interna*, pero **debe seguir aceptando** `items?`, `user?`, `onLogout?`, `className?` — es la API pública que usa `AppShell` |
| `folderVariants`, `folderSurfaceVariants`, `folderTone` | **solo** `ArchiveNav.tsx` (mismo módulo) | `ArchiveNav.tsx:10-13,73-83` | Sí, son de implementación interna del componente — no se reexportan en `index.ts` ni en el barrel `src/shared/ui/index.ts`. Renómbralos/elimínalos libremente. |
| barrel `src/shared/ui/index.ts` | re-exporta `./layout` (que re-exporta `./archive-nav`) | `src/shared/ui/index.ts:2` → `src/shared/ui/layout/index.ts:2` | Solo importa `ArchiveNav` + tipos vía `export *`; no toca variantes internas |
| `src/shared/ui/layout/archive-nav/index.ts` | barrel del componente | líneas 1-2 | Debe seguir exportando `ArchiveNav`, `ArchiveNavProps`, `ArchiveNavUser` con esos nombres exactos |

### Compartido con `BottomNav` (FUERA de alcance — no se puede romper)

`BottomNav.tsx` (`src/shared/ui/layout/bottom-nav/BottomNav.tsx`) **no** importa nada de
`archive-nav/`. Lo que comparten ambos, y por tanto es contrato transversal intocable:

| compartido | dónde vive | usado por ArchiveNav | usado por BottomNav |
|---|---|---|---|
| `NAV_ITEMS`, `NavItem` | `src/shared/ui/layout/nav-items.ts:7-23` | sí (default de `items`) | sí (`BottomNav.tsx:6,19`) |
| `isRouteActive(pathname, href)` | `nav-items.ts:29-34` | sí (`ArchiveNav.tsx:8,72`) | sí (`BottomNav.tsx:6,34`) |
| `--nav-height` | `globals.css:66` | sí (`h-(--nav-height)`, `ArchiveNav.tsx:46`) | **no** (BottomNav no lo usa — mide por `--touch-target`) |
| `--z-nav` | `globals.css:184` | sí (`ArchiveNav.tsx:49`, y `folderVariants` activo) | sí (`BottomNav.tsx:29`) — **no tocar el valor/nombre del token** |
| tokens `bg-bg` + `bg-(image:--texture-dots-dark)` | `globals.css` (`@theme`, textura) | sí (`ArchiveNav.tsx:47`) | sí (`BottomNav.tsx:28`) — mismo patrón de fondo, no cambiar el token |
| `cn()` | `src/shared/ui/lib/cn.ts` | sí | sí |

Ningún token `--folder-*` es consumido por `BottomNav`. Reescribir/eliminar `--folder-*` **no
afecta a BottomNav**, que está expresamente fuera de alcance (RFC-01 D4, penúltimo párrafo).

---

## 2. Tokens `--folder-*`, `--nav-height`, `--z-nav`, `--shadow-folder-*`

Todos en `src/app/globals.css`, bloque `@theme` (líneas exactas):

| token | línea | valor | consumidores (grep en `src/**`) |
|---|---|---|---|
| `--folder-tone-1` | 54 | `#382a1e` | solo `archive-nav.variants.ts:35` (`folderSurfaceVariants`) |
| `--folder-tone-2` | 55 | `#3a2c20` | solo `archive-nav.variants.ts:36` |
| `--folder-tone-3` | 56 | `#3c2e21` | solo `archive-nav.variants.ts:37` |
| `--folder-tone-4` | 57 | `#3e3023` | solo `archive-nav.variants.ts:38` |
| `--folder-tone-5` | 58 | `#403225` | solo `archive-nav.variants.ts:39` |
| `--folder-tone-6` | 59 | `#423427` | solo `archive-nav.variants.ts:40` |
| `--folder-emboss-light` | 60 | `rgba(245,237,223,0.12)` | solo dentro de `--shadow-folder-tab` / `--shadow-folder-body` (mismo archivo, líneas 71-75) |
| `--folder-emboss-dark` | 61 | `rgba(0,0,0,0.3)` | ídem, solo en esos dos shadows compuestos |
| `--folder-prefix` | 62 | `#a8937b` | `ArchiveNav.tsx:97` (`text-(color:--folder-prefix)`, color del prefijo `.knit`) |
| `--nav-height` | 66 | `104px` | `ArchiveNav.tsx:46` (`h-(--nav-height)`). **Compartido conceptualmente** con el presupuesto vertical del nuevo stack (D4 nota 2: 6×10px + ~41px de pestaña ≈ 100px, cabe en 104px) — **no cambiar el valor**, solo cómo se usa |
| `--folder-overlap` | 67 | `16px` | solo `archive-nav.variants.ts:10` (`[margin-left:calc(-1*var(--folder-overlap))]`) — es el solape de fila que D4 deroga |
| `--folder-lift` | 68 | `6px` | solo `archive-nav.variants.ts:13` (`hover:[transform:translateY(...)]`) — es el `translateY` que D4 prohíbe explícitamente ("No es un `translateY`") |
| `--folder-body-height` | 69 | `22px` | solo `ArchiveNav.tsx:116` |
| `--folder-body-height-active` | 70 | `34px` | solo `ArchiveNav.tsx:115` |
| `--shadow-folder-tab` | 71-72 | `inset 1px 1px 0 var(--folder-emboss-light), inset -1px 0 0 var(--folder-emboss-dark)` | solo `ArchiveNav.tsx:90` (`shadow-(--shadow-folder-tab)`) |
| `--shadow-folder-body` | 73-75 | `inset 0 2px 2px rgba(0,0,0,.25), inset 1px 1px 0 var(--folder-emboss-light), inset -1px 0 0 var(--folder-emboss-dark)` | solo `ArchiveNav.tsx:113` |
| `--shadow-folder-hover` | 76 | `6px 7px 9px rgba(0,0,0,0.5)` | solo `archive-nav.variants.ts:14` — es la sombra hacia abajo/derecha que D4 dice que hay que invertir (la referencia mide `6px -5px 7px` alpha .06, y con la lectura de profundidad opuesta) |
| `--z-nav` | 184 | `100` | **compartido**: `ArchiveNav.tsx:49`, `archive-nav.variants.ts:21` (carpeta activa), y `BottomNav.tsx:29`. **No tocar** |

### Huérfanos si desaparece el modelo de fila

Todos los `--folder-*` (líneas 54-62, 67-76) **solo** los consume `ArchiveNav.tsx` /
`archive-nav.variants.ts`. Ningún otro componente de `src/**` los referencia. Concretamente:

- `--folder-overlap` y `--folder-lift` quedan **muertos por diseño** (D4 los prohíbe: nada de
  solape horizontal, nada de `translateY`). Bórralos o resignifícalos si el nuevo modelo necesita
  un token equivalente (p. ej. un paso vertical de 10px y un delta de hover `height`/`margin-bottom`).
- `--shadow-folder-hover` queda huérfano en su forma actual (sombra hacia abajo, alpha .35):
  D4 exige sombra hacia **arriba**, alpha ~.06 (medido en §2 del informe softglossary). Hay que
  reescribir el valor o crear un token nuevo — decisión del implementer, pero **el nombre puede
  reusarse** porque nada más lo consume.
- `--folder-tone-1..6` quedan huérfanos **si** el nuevo modelo abandona el escalón tonal por
  posición (el informe softglossary dice explícitamente: *"escalón tonal: ninguno (lo da la
  sombra)"* — ver tabla comparativa final del informe). Si se elimina el escalón tonal, estos 6
  tokens + `folderTone()` se pueden borrar enteros.
- `--folder-body-height` / `--folder-body-height-active` son geometría de la carpeta-fila (cuerpo
  visible bajo la pestaña); el modelo ficha usa una geometría distinta (hoja de 10px + pestaña que
  desborda), así que probablemente se reemplazan por tokens nuevos de paso/alto de hoja.
- `--folder-prefix` y `--shadow-folder-tab`/`--shadow-folder-body` (los embosses) **no** son
  necesariamente huérfanos: el lockup (`.knit` prefijo + label) y el estilo de pestaña individual
  sobreviven conceptualmente al cambio de modelo (D4 punto 6 y "Lo que NO cambia": paleta, texturas,
  tipografías, lockup). Revisar caso a caso si el nuevo diseño de pestaña reusa esos shadows.

`--nav-height` y `--z-nav` **no quedan huérfanos**: siguen siendo el presupuesto vertical del nav
y la capa de apilamiento respectivamente, y `--z-nav` es compartido con `BottomNav`.

---

## 3. Tests que van a fallar (y cuáles hay que preservar)

### `src/shared/ui/layout/layout.test.tsx` — **mayormente COMPORTAMIENTO/a11y, hay que preservarlo**

| bloque | qué asegura | tipo | ¿sobrevive a la reescritura? |
|---|---|---|---|
| `"mounts ArchiveNav as a landmark with the 6 pages"` (líneas 46-54) | `role="navigation"` con `name` "Navegación principal", 6 `link`, contiene "Dashboard" y "Stash" | comportamiento/a11y | **preservar tal cual** — no depende del modelo visual |
| `describe("active by route...")` (líneas 63-114), 4 tests | `aria-current="page"` solo en el item cuya ruta coincide (incluye subrutas) vía `usePathname` mockeado | comportamiento | **preservar tal cual** — invariante D4 punto 10 (`aria-current="page"` en la activa) |
| `"shows the user name in the archive utils"` (118-121) | `screen.getByText("Ada")` | comportamiento | preservar — pero **si el markup deja de tener el nombre visible como texto plano** (p. ej. lo mueve a un `title`/`aria-label`), este assert se rompe y hay que decidir si el nuevo diseño sigue mostrando el nombre igual. RFC-01 §3 exige "utils (usuario + logout)" arriba a la derecha, así que el contrato de fondo se mantiene. |
| `"calls onLogout when 'Salir' is clicked"` (123-130) | click en `role="button", name: "Salir"` dispara el callback | comportamiento | preservar |
| `describe("motion degrades...")` (133-139) | `folder.className` (el link "Dashboard") **contiene la substring `"transition-"`** | **mixto**: es un assert de clase literal (busca la substring `"transition-"` en el `className`), pero verifica una propiedad de comportamiento (que la transición sea CSS declarativa vía Tailwind, no JS) | Sobrevive **si** el nuevo componente sigue usando alguna utilidad Tailwind `transition-*`/`transition-[...]` en el elemento con `role="link"` — cosa casi segura porque D4 pide degradar la transición del hover vía `prefers-reduced-motion` global. Pero el test usa `getByRole("link", { name: "Dashboard" })` **dentro de `nav`**: si el hover deja de vivir en el `<a>` raíz (p. ej. pasa al contenedor `<li>`/hoja), hay que mover el `transition-` a donde el test lo busca, o el test necesita reescritura. |
| `describe("a11y (axe)")` (142-160), 3 tests | `axe(container)` sin violaciones en `ArchiveNav`, `BottomNav`, `AppShell` | a11y | **preservar** — el de `BottomNav` no debería verse afectado; el de `ArchiveNav`/`AppShell` hay que re-verificar tras el cambio de markup (nuevo landmark/estructura no debe introducir violaciones nuevas) |

**Resumen:** de los 12 tests de este archivo que tocan `ArchiveNav`/`AppShell`, **ninguno asume la
fila horizontal ni el solape**; todos son comportamiento/a11y por `role`/`aria-current`/texto. El
único con roce estructural es el de `transition-` por substring de clase, y es tolerante siempre
que el elemento raíz del link siga llevando una utilidad `transition-*`.

### `src/shared/ui/primitives/no-hardcode.test.ts` — **estructural, pero agnóstico al modelo**

Lista `ArchiveNav.tsx` y `archive-nav.variants.ts` en `COMPONENT_FILES` (líneas 25-26) y corre 2
asserts por archivo: sin hex/`rgb()` (líneas 45-52) y sin `px` crudo (líneas 54-58) vía regex sobre
el código fuente. **No** asume nada del modelo de fila — solo exige que el nuevo código, sea el que
sea, siga siendo 100% token-first. **Se mantiene intacto**, no hay que tocar el test, solo cumplirlo
en el código nuevo.

### `src/shared/ui/canonical-tailwind-classes.test.ts` — **estructural, agnóstico al modelo**

- Test "el barrido cubre los fuentes de src/\*\*" (líneas 80-90): asegura que
  `shared/ui/layout/archive-nav/ArchiveNav.tsx` sigue apareciendo en el barrido de archivos
  (`SOURCE_FILES`). Como el barrido es por recorrido de directorios y no por lista fija, **sobrevive
  automáticamente** mientras el archivo se siga llamando `ArchiveNav.tsx` en esa ruta.
- Test de sintaxis no-canónica (líneas 92-111): corre sobre **todo `src/**`**, así que el código
  nuevo de `ArchiveNav.tsx`/`archive-nav.variants.ts` cae bajo el mismo escaneo. **No hace falta
  tocar el test**; hay que escribir el componente nuevo con la forma corta `(--x)` desde el día uno
  (ver §4 más abajo).

### `src/app/globals-css.test.ts` — **no toca `ArchiveNav` directamente, pero sí los tokens que le pertenecen**

No menciona `ArchiveNav` ni `folder` por nombre. Verifica que `globals.css` compile, que
`--accent` y `.bg-surface` sigan presentes, que no haya `var(--…*)` inválido, y que `progress/`,
`docs/`, `template/` sigan fuera del escaneo (`@source not`, líneas 47-50 de `globals.css`).
**Riesgo indirecto:** si al reescribir `archive-nav.variants.ts` se borran tokens `--folder-*` de
`globals.css` que quedaron huérfanos (§2), este test **no los verifica por nombre**, así que
borrarlos no lo rompe. Pero **si se edita `globals.css` a mano y se deja una sintaxis inválida**
(p. ej. un valor con comodín, el bug real documentado en el informe 6), este test sí lo va a agarrar
— es exactamente su propósito. **Ejecutarlo es obligatorio tras tocar tokens.**

### Otros hits de "ArchiveNav"/"folder" en tests

Grep de `folder`/`Folder` en `src/**` da 6 archivos; de ellos `src/shared/lib/cloudinary/upload.ts`
y su test **no tienen relación** — es el parámetro `folder` de la API de Cloudinary (subida de
imágenes), coincidencia de nombre nada más. Los otros 4 (`ArchiveNav.tsx`,
`archive-nav.variants.ts`, `globals.css`, `layout.test.tsx`) ya están cubiertos arriba. No hay
tests adicionales de `canonical-tailwind-classes.test.ts` ni `no-hardcode.test.ts` que mencionen
"folder" en prosa (ambos son genéricos/mecánicos, sin nombrar el dominio).

---

## 4. Reglas del arnés aplicables (citadas literalmente)

De `docs/harness/conventions.md`, sección "UI / Design system (fase 12+)":

- **Token-first (regla dura).** *"Ningún componente hardcodea color, tamaño, borde, radio, sombra
  ni z-index: todo referencia un token. […] Cambiar la identidad = cambiar tokens, no
  componentes."* (líneas 65-68)
- **Sintaxis canónica de variables en Tailwind v4 (regla dura).** Tabla exacta (líneas 73-77):

  | ❌ No canónico | ✅ Canónico |
  |---|---|
  | `p-[var(--space-6)]` | `p-(--space-6)` |
  | `border-[length:var(--border-width)]` | `border-(length:--border-width)` |
  | `outline-[color:var(--focus)]` | `outline-(color:--focus)` |
  | `[z-index:var(--z-nav)]` | `z-(--z-nav)` |

  *"Excepciones legítimas (no son convertibles, dejalas como están): valores compuestos […],
  cualquier cosa envuelta en calc() […], y las propiedades arbitrarias para las que no existe
  utilidad en el core de Tailwind."* (líneas 85-88). Vigilado por
  `canonical-tailwind-classes.test.ts` (línea 95).
- **Nunca escribas una clase de Tailwind literal en un archivo que hable de clases** (tests,
  guardrails, informes, comentarios) — *"una clase citada como ejemplo se convierte en una utilidad
  real en el CSS de producción, y una clase con comodines o inválida rompe el build entero. Ya
  pasó dos veces."* (líneas 98-104). **Aplica directo a este mismo informe y a cualquier informe que
  el implementer escriba después**: describir clases en prosa, nunca citarlas literales.
- **Presentación pura.** *"El design system (shared/ui/) es solo presentación: props + estado local
  de UI. No hace fetch, no decide rutas, no conoce el backend."* (líneas 105-107) — el `ArchiveNav`
  nuevo debe seguir recibiendo `items`/`user`/`onLogout` por props, sin fetch propio (ya lo cumple
  hoy).
- **`cn()` obligatorio.** *"Todo componente que acepte className lo fusiona con cn(...) =
  twMerge(clsx(...))."* (líneas 108-110)
- **Variantes con `cva`.** *"variant/size tipadas en un archivo `<name>.variants.ts` aparte del
  componente; nada de concatenar strings de clases a mano."* (líneas 111-112)
- **Énfasis por tipografía.** *"Resaltar = cambiar familia (--font-emphasis, componente
  Emphasis), no solo peso/color."* (líneas 113-114) — aplica al prefijo `.knit` en serif itálica
  que D4 punto 6 exige conservar.

Accesibilidad (sección "Accesibilidad (baseline no negociable, parte de 'done')", líneas 126-134):

- *"HTML semántico + roles/aria correctos […] aria-current en el nav activo […]."*
- *"Foco visible en todo interactivo (token --focus); navegación por teclado completa."*
- *"prefers-reduced-motion respetado por animación 2D y por la capa 3D."*
- *"Targets táctiles ≥ 44×44 px (token --touch-target)."* — D4 no dice explícitamente que la pestaña
  del stack deba cumplir 44px, pero esta regla del arnés es "no negociable" y aplica igual sobre
  cualquier elemento interactivo del nuevo `ArchiveNav`.

De `docs/design/SDD-01-design-system.md` §9 ("Verificación — definición de 'done' por componente",
líneas 259-271), citado literal:

1. *"Test de componente / interacción con React Testing Library + user-event sobre un entorno DOM
   (happy-dom). Se prueba comportamiento y accesibilidad (roles, foco, estados, callbacks), no
   píxeles."*
2. *"Smoke de render: cada componente monta sin explotar."*
3. *"Assertions de a11y con axe en los primitivos."*
4. *"Typecheck + lint + build verdes como puerta."*
5. *"Fidelidad visual = revisión manual contra el mockup de referencia. Opcional a futuro: regresión
   visual automatizada."*
   > *"No se testea 'que se vea lindo': eso lo valida el humano contra el mockup. Sí se testea
   > comportamiento, a11y y que cero valores estén hardcodeados (todo por token)."*

---

## 5. Riesgo de escaneo de Tailwind (resumen en 3 líneas)

`globals.css` acota el escaneo de Tailwind a `src/` vía `@import "tailwindcss" source("../")` +
tres `@source not` explícitos para `progress/`, `docs/` y `template/` (líneas 47-50 de
`globals.css`), verificado por `src/app/globals-css.test.ts` con carnadas sembradas en cada carpeta.
El bug real fue un informe en `progress/` que citaba `duration-[var(--dur-*)]` como prosa — Tailwind
lo tomó por clase real, generó `var(--dur-*)` (CSS inválido) y tumbó `pnpm dev`/`pnpm build` enteros.
**No cites clases Tailwind literales** (con o sin comodín) en este informe ni en ningún `.md` de
`progress/`/`docs/`: describilas en prosa o, si hace falta el literal exacto en un test, armalo por
concatenación en runtime (técnica ya usada en `canonical-tailwind-classes.test.ts:121-127`).

---

## 6. Síntesis — contratos a preservar vs. libre de romper

**Preservar (contrato duro):**
- Firma pública: `ArchiveNav({ items?, user?, onLogout?, className? })`, tipos `ArchiveNavProps`/`ArchiveNavUser`, exports del `index.ts` del componente.
- Landmark `nav` con `aria-label="Navegación principal"` conteniendo exactamente 6 `link`.
- `aria-current="page"` en el item activo, determinado por `isRouteActive(pathname, item.href)` de `nav-items.ts` (compartido con `BottomNav`) — **no** scroll-spy.
- Nombre de usuario visible como texto y botón "Salir" que dispara `onLogout`.
- Todos los invariantes D4 (1-10) del RFC, en particular: contenedor en columna, hojas full-bleed, escalonado por apilamiento (no a mano), activa abajo con mayor z-index, hover sin reflow (`height`+`margin-bottom` compensados, no `translateY`), sombra hacia arriba, activa fundida con `--bg`.
- `--nav-height: 104px` y `--z-nav: 100` (compartidos con `BottomNav`, valores intocables).
- Cero hardcode (hex/rgb/px), sintaxis canónica `-(--x)`, `cva` + `cn()`.
- No citar clases Tailwind literales en el propio informe/PR.

**Libre de romper (interno, sin consumidores externos):**
- `folderVariants`, `folderSurfaceVariants`, `folderTone` — nombres, firmas e implementación.
- Tokens `--folder-overlap`, `--folder-lift`, `--shadow-folder-hover` (contradicen D4 directamente) y, si se abandona el escalón tonal, `--folder-tone-1..6` + `--folder-body-height*`.
- El test de `layout.test.tsx` que busca `"transition-"` por substring en el `className` del link raíz sobrevive solo si el elemento con `role="link"` sigue llevando alguna utilidad `transition-*`; si el hover se mueve a otro nodo del markup, ese assert necesita ajuste (es el único punto de fricción estructural detectado).
