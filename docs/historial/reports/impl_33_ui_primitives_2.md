# impl — #33 `ui_primitives_2` (segunda tanda de primitivas del design system)

> Implementer, 2026-08-06. Slice de **UI**: aplica el checklist visual del SDD §9
> (RTL + `user-event` + `axe` + `init.sh` + `build`). **No aplica smoke de ruta**: no hay página que montar.
> **No marqué la feature como `done`** (lo hace el leader tras el reviewer).

---

## 1. Qué se construyó y dónde

Seis piezas del inventario del SDD §6, cada una con sus variantes, sus estados y su test.

### Archivos NUEVOS

| Archivo | Qué es |
|---|---|
| `src/shared/ui/lib/usePrefersReducedMotion.ts` | Hook de detección de `prefers-reduced-motion` en JS, **promovido** desde la capa 3D (ver §2.1) |
| `src/shared/ui/primitives/progress-bar/ProgressBar.tsx` | Barra de progreso 0-100 con `role="progressbar"`; exporta `clampProgress`, `PROGRESS_MIN`, `PROGRESS_MAX` |
| `src/shared/ui/primitives/progress-bar/progress-bar.variants.ts` | `cva` del carril y del relleno; exporta `PROGRESS_TONES` |
| `src/shared/ui/primitives/progress-bar/index.ts` | Barrel |
| `src/shared/ui/primitives/progress-bar/ProgressBar.test.tsx` | 15 tests |
| `src/shared/ui/primitives/skeleton/Skeleton.tsx` | Bloque de carga `aria-hidden`, con la animación decidida en JS |
| `src/shared/ui/primitives/skeleton/skeleton.variants.ts` | `cva` de las 3 formas; exporta `SKELETON_SHAPES` y las dos clases de movimiento |
| `src/shared/ui/primitives/skeleton/index.ts` | Barrel |
| `src/shared/ui/primitives/skeleton/Skeleton.test.tsx` | 8 tests |
| `src/shared/ui/primitives/toggle/Toggle.tsx` | Conmutador **superponible** con `aria-pressed` |
| `src/shared/ui/primitives/toggle/ToggleGroup.tsx` | Carril `role="group"` con nombre accesible |
| `src/shared/ui/primitives/toggle/toggle.variants.ts` | `cva` del control y del grupo |
| `src/shared/ui/primitives/toggle/index.ts` | Barrel |
| `src/shared/ui/primitives/toggle/Toggle.test.tsx` | 15 tests |
| `src/shared/ui/primitives/dialog/Dialog.tsx` | Modal en portal, con los tres invariantes |
| `src/shared/ui/primitives/dialog/dialog.variants.ts` | `cva` de velo, panel, cabecera, título y descripción; exporta `DIALOG_SIZES` |
| `src/shared/ui/primitives/dialog/index.ts` | Barrel |
| `src/shared/ui/primitives/dialog/Dialog.test.tsx` | 19 tests |
| `src/shared/ui/feedback/index.ts` | **Carpeta nueva** (SDD §6): barrel de la capa `feedback/` |
| `src/shared/ui/feedback/state-panel/StatePanel.tsx` | Base compartida (título + descripción + slot de acción). **No pública** |
| `src/shared/ui/feedback/state-panel/state-panel.variants.ts` | `cva` con los dos tonos; exporta `STATE_PANEL_TONES` |
| `src/shared/ui/feedback/empty-state/EmptyState.tsx` + `index.ts` | Estado vacío |
| `src/shared/ui/feedback/error-state/ErrorState.tsx` + `index.ts` | Estado de error con reintento |
| `src/shared/ui/feedback/feedback.test.tsx` | 18 tests |
| `src/shared/ui/public-api.test.ts` | **Ancla de la superficie pública** del design system (4 tests) |

### Archivos MODIFICADOS

| Archivo | Cambio |
|---|---|
| `src/shared/ui/primitives/index.ts` | + `dialog`, `progress-bar`, `skeleton`, `toggle` |
| `src/shared/ui/index.ts` | + `feedback`, + `usePrefersReducedMotion` |
| `src/shared/ui/three/ascii-yarn/usePrefersReducedMotion.ts` | Pasa a ser **re-exportación** del hook promovido (1 línea + porqué) |
| `src/shared/ui/primitives/no-hardcode.test.ts` → **`src/shared/ui/no-hardcode.test.ts`** | Movido (`git mv`) y convertido de **lista fija de 18 archivos** a **barrido por recorrido de directorios** (§2.6) |
| `progress/current.md` | Feature en curso + plan |

**Fuera de alcance, no se tocó:** ninguna página, ninguna ruta, `src/proxy.ts`, el Dashboard, la card de proyecto de RFC-03, `globals.css`, `feature_list.json`, `progress/deudas.md`.

---

## 2. Decisiones tomadas (y por qué)

### 2.1 El hook de `prefers-reduced-motion` se PROMUEVE a `shared/ui/lib/`

`Skeleton` necesita decidir en JS si anima. La implementación existía, pero dentro de
`three/ascii-yarn/`. Tres opciones: duplicarla (dos `matchMedia` que divergen), importarla desde
un primitivo 2D hacia la capa 3D (dependencia al revés: la capa aislada no puede ser proveedora
del resto), o promoverla. **Se promovió**: la implementación vive en `shared/ui/lib/` y
`three/ascii-yarn/usePrefersReducedMotion.ts` queda como re-exportación, así que
`AsciiYarnScene.tsx` **no cambió una línea** y no hay dos copias del mismo `matchMedia`.

### 2.2 `ProgressBar` con valores fuera de rango: **acota, no lanza**

- Fuera de rango → al extremo más cercano (`-20` → 0, `140` → 100).
- **No finito (`NaN`, ±`Infinity`) → 0.** `NaN` no tiene extremo cercano; 0 es el único valor que
  no afirma un progreso que nadie midió. `Infinity` cae en la misma rama a propósito: llenar la
  barra ante un dato roto diría *"terminado"*, que es la mentira cara.
- **Se acota lo que se pinta Y lo que se anuncia.** `aria-valuenow` lleva siempre el valor acotado.
  Acotar sólo el ancho dejaría al lector de pantalla diciendo "140 por ciento" — y `axe` lo marca
  (lo comprobé: la mutación que quita el acotado tira también el test de `axe`, §4.8).

Motivo de fondo: `Project.progress` lo calcula el backend desde datos que el usuario edita a mano
(`rounds`/`targetRounds`, PRD §4.2), así que un 140% o una división por cero son entradas
**realistas**. Una barra que rompe la página por un dato feo es peor que una barra llena.

Se descartó `<progress>`: el carril y el relleno son dos superficies con borde y sombra propios del
brutalismo, y `<progress>` sólo se estila de forma portable con pseudo-elementos por motor.
`label` es **obligatorio** (una barra sin nombre es violación de `axe`, regla `aria-progressbar-name`).

### 2.3 `Toggle` suelto **+** `ToggleGroup`, y controlado

Los dos consumidores reales (RFC-02 §1) son *N* controles independientes con **varios activos a la
vez**: el selector de métrica (3, combinables) y los botones de tipo (2, combinables). Por eso:

- **`Toggle` es un `button` con `aria-pressed`**, no un `Tabs` (`aria-selected` + exactamente uno
  activo) ni un `radiogroup`. Un test asierta que **no aparece ningún `tablist`/`tab`/`radio`** en
  el árbol: si alguien "mejora" el control a selección única, se ve.
- **`ToggleGroup` existe pero es tonto**: `role="group"` + nombre accesible + carril de layout. **No**
  guarda estado ni impone exclusividad. Sin él, un lector de pantalla anuncia tres botones sueltos
  sin decir de qué conjunto son; con lógica dentro, sería un `Tabs` disfrazado.
- **Controlado (sin estado interno).** Un estado por botón obligaría a cada consumidor a espiar *N*
  `onPressedChange` para reconstruir una selección que ya es suya, y permitiría que la pantalla y el
  botón discrepen tras un reset o una carga desde la URL. Hay un test de esto: sin el prop, el
  control no se mueve.
- El estado activo **se pinta desde el propio `aria-pressed`** (variante `aria-pressed:` de Tailwind,
  misma técnica que `Input` con `aria-invalid`), así la pista visual y la semántica no se pueden
  desincronizar. **Verificado contra el CSS compilado**, no sólo contra el string de clases:
  `aria-pressed\:bg-accent[aria-pressed=true]{background-color:var(--color-accent)}`.
- `type="button"` fijo, no configurable: un toggle que envía el formulario al conmutarse es la
  trampa de las deudas 39/43 con otro disfraz.

### 2.4 `Dialog` en **portal al `body`**, justificado contra los `--z-*`

Los tokens `--z-overlay` (200) y `--z-modal` (300) sólo significan algo si el diálogo comparte
contexto de apilamiento con el resto de la página. **En el flujo no lo comparte**: el archivero
apila 6 hojas con `transform` y `z-index` propios, y cualquier ancestro transformado crea un
contexto nuevo que encierra al panel — quedaría por debajo del nav (`--z-nav` = 100) **aunque su
z-index valga 300**. El portal lo saca de esa jaula y deja que los tokens digan lo que dicen.
Un test lo fija: el diálogo **no** está dentro del contenedor de la página y **sí** dentro de `body`.

Otras decisiones del modal:
- El panel usa la **superficie elevada** (`bg-surface-raised`), la única donde el anillo de foco
  cumple contraste (**deuda 31**), y un diálogo es todo navegación por teclado.
- Al abrir, el foco va **al panel** (`tabindex="-1"` + `aria-labelledby`), no al primer control: así
  se anuncia el título del diálogo antes que un botón suelto.
- El "ya estamos en el cliente" se resuelve con `useSyncExternalStore` y no con `setState` en un
  efecto — **el lint del repo rechaza lo segundo** (`react-hooks/set-state-in-effect`), y leer
  `typeof document` en el render desincronizaría servidor y cliente.
- El clic en el velo cierra por defecto (`dismissOnScrimClick`, apagable para flujos destructivos);
  el clic **dentro** del panel no. Los dos casos están testeados.

### 2.5 `EmptyState` y `ErrorState` **comparten base**

Son la misma composición (título + descripción + slot de acción) y la misma a11y cableada; lo único
propio del error es el reintento y el rol. Dos implementaciones paralelas divergirían en el primer
arreglo. La base es `StatePanel` y **no se exporta** desde el barrel: la API pública son los dos
estados con nombre, que es lo que el SDD §6 nombra. Un test asierta que las clases de **layout** de
los dos son idénticas y que las de marco **no** lo son (es lo que justifica compartir base).

Tres diferencias deliberadas del error: `role="alert"` (un vacío no interrumpe, un error sí), marco
en `--danger` (no depende del color de una palabra) y **reintentar sólo si hay `onRetry`** — un botón
que no lleva a ninguna parte es la deuda 29 en pequeño. Un `action` propio gana sobre el reintento.

`StatePanel` es un **`section` con `aria-labelledby`**, no un `div`: sobre un `div` sin rol,
`aria-labelledby` es un atributo **prohibido** y `axe` lo marca (`aria-prohibited-attr`). El nivel
del encabezado es prop (`headingLevel`, 2-4): el panel no sabe a qué profundidad lo montan.

### 2.6 El guardrail de no-hardcode pasa de **lista fija** a **barrido de directorios**

La lista nombraba 18 archivos a mano; los 20 que añade esta slice habrían quedado sin vigilar hasta
que alguien se acordara de registrarlos. Es el patrón de las **deudas 40, 43 y 71** — la 71 ya era la
cuarta aparición. Se aplicó la misma medicina que usa `canonical-tailwind-classes.test.ts`
(recorrido de directorios) **con su mismo seguro**: tres tests aparte comprueban que el barrido
encuentra los archivos, porque un recorrido roto devuelve cero infractores, es decir **verde**.
Comprobado antes de tocar nada: el barrido completo de `src/shared/ui` estaba **limpio**, así que el
cambio no arrastra ningún arreglo ajeno a la slice. El archivo se movió a `src/shared/ui/` (`git mv`)
porque ya no vigila sólo `primitives/`. **Salda, para este guardrail, la familia 40/43/71** (los otros
dos guardrails de lista fija siguen abiertos).

### 2.7 Ancla de la superficie pública (`public-api.test.ts`)

REGLA 2a: los nombres exportados por `primitives/` y `feedback/` están escritos **al literal** con
`toEqual` sobre la lista ordenada — aquí el literal *es* el contrato (el template es portable,
SDD §2, y quien lo consuma importa por estos nombres). Y la parte **derivada**: que el barrel raíz
reexporte todo lo de sus capas se comprueba recorriendo las capas, no copiando nombres.

---

## 3. Verificación (salidas reales)

### 3.1 `bash ./init.sh` — final

```
── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (33 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  60 passed | 3 skipped (63)
      Tests  756 passed | 13 skipped (769)
   Start at  21:56:55
   Duration  56.09s (transform 5.48s, setup 43.02s, import 49.93s, tests 30.30s, environment 17.40s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Baseline al arrancar** (medida por mí, coincide con la del leader): `54 passed | 3 skipped` archivos,
`602 passed | 13 skipped` tests. **Delta: +6 archivos, +154 tests.** Los **3 smokes siguen skipped** y
siguen compilando.

### 3.2 `pnpm build`

```
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 10.9s
  Running TypeScript ...
  Finished TypeScript in 12.4s ...
  Collecting page data using 3 workers ...
✓ Generating static pages using 3 workers (15/15) in 641ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/auth/login
…
└ ○ /register

ƒ Proxy (Middleware)
```

### 3.3 Medido contra el CSS realmente compilado (no contra el string de clases)

`.next/static/chunks/44e_opkgqz28z.css`:

```
aria-pressed\:bg-accent[aria-pressed=true]{background-color:var(--color-accent)}
aria-pressed\:text-accent-fg[aria-pressed=true]{color:var(--color-accent-fg)}
bg-fg\/50{background-color:color-mix(in oklab, var(--color-fg) 50%, transparent)}
.z-\(--z-overlay\){z-index:var(--z-overlay)}   .z-\(--z-modal\){z-index:var(--z-modal)}
.animate-pulse{animation:var(--animate-pulse)}  .animate-none{animation:none}
```

O sea: el estado activo del `Toggle` y las capas del `Dialog` existen **en producción**, no sólo en
el atributo `class`.

---

## 4. Condición doble de cada gate nuevo (REGLA 3) — **las dos direcciones, números tal cual salieron**

Método: se muta el **código de producción** (o el barrido, donde el gate es el barrido), se corre el
archivo de test, se restaura y se vuelve a correr. Al final se verificó con `diff` que **los seis
archivos mutados quedaron byte a byte idénticos** a su copia previa.

Verde de partida en cada archivo: `Dialog 19/19`, `Toggle 15/15`, `Skeleton 8/8`,
`ProgressBar 15/15`, `no-hardcode 111/111`, `public-api 4/4`.

### 4.1 Dialog, invariante 1 — la trampa de foco

Mutación: el manejador ignora `Tab` (se elimina el `if (event.key !== "Tab") return;` dejando un
`return` incondicional).

```
 ❯ src/shared/ui/primitives/dialog/Dialog.test.tsx (19 tests | 3 failed) 2151ms
     × tabular en círculo nunca saca el foco del diálogo 245ms
     × tabular hacia atrás tampoco lo saca 108ms
     × el ciclo recorre TODAS las paradas del diálogo, en orden 243ms
 Test Files  1 failed (1)
      Tests  3 failed | 16 passed (19)
```

Restaurado → `Test Files 1 passed (1)` · `Tests 19 passed (19)`.

### 4.2 Dialog, invariante 2 — `Escape` cierra

Mutación: se borra la rama de `Escape`.

```
 ❯ src/shared/ui/primitives/dialog/Dialog.test.tsx (19 tests | 4 failed) 2830ms
     × cierra con Escape y avisa al llamador 118ms
     × cierra con Escape desde cualquier control de dentro 142ms
     × al cerrar con Escape, el foco vuelve a quien lo abrió 114ms
     × vuelve al disparador REAL, no a uno cualquiera de la página 128ms
 Test Files  1 failed (1)
      Tests  4 failed | 15 passed (19)
```

Restaurado → `Tests 19 passed (19)`.

### 4.3 Dialog, invariante 3 — el foco vuelve al disparador

Mutación: se borra el `return () => trigger.focus()` del efecto.

```
 ❯ src/shared/ui/primitives/dialog/Dialog.test.tsx (19 tests | 3 failed) 2963ms
     × al cerrar con Escape, el foco vuelve a quien lo abrió 118ms
     × vuelve al disparador aunque se cierre desde el control de cierre 89ms
     × vuelve al disparador REAL, no a uno cualquiera de la página 128ms
 Test Files  1 failed (1)
      Tests  3 failed | 16 passed (19)
```

Restaurado → `Tests 19 passed (19)`.

### 4.4 Toggle — `aria-pressed` presente en LOS DOS estados

Mutación (el defecto clásico): `aria-pressed={pressed || undefined}`, o sea el atributo desaparece
cuando el control está apagado y deja de anunciarse como conmutable.

```
 ❯ src/shared/ui/primitives/toggle/Toggle.test.tsx (15 tests | 5 failed) 688ms
     × ancla el atributo y sus dos valores al literal del contrato 45ms
     × no guarda estado propio: sin el prop, no se mueve 66ms
     × el selector de métrica admite las tres a la vez 7ms
     × apagar una deja a las demás encendidas 46ms
     × admite el conjunto vacío (ninguno activo) 66ms
 Test Files  1 failed (1)
      Tests  5 failed | 10 passed (15)
```

Restaurado → `Tests 15 passed (15)`.

### 4.5 Toggle — superponible (la otra dirección: que deje de apagarse)

Mutación: `onPressedChange?.(true)` en vez de `!pressed` — es decir, comportamiento de selección
tipo `Tabs`, donde una opción encendida ya no se puede apagar.

```
 ❯ src/shared/ui/primitives/toggle/Toggle.test.tsx (15 tests | 3 failed) 778ms
     × avisa del estado AL QUE PASA, no del actual 108ms
     × apagar una deja a las demás encendidas 59ms
     × admite el conjunto vacío (ninguno activo) 64ms
 Test Files  1 failed (1)
      Tests  3 failed | 12 passed (15)
```

Restaurado → `Tests 15 passed (15)`.

### 4.6 Skeleton — `prefers-reduced-motion`, dirección A (anima siempre)

```
 ❯ src/shared/ui/primitives/skeleton/Skeleton.test.tsx (8 tests | 2 failed) 141ms
     × se queda quieto cuando la preferencia es reducir 8ms
     × las dos clases son excluyentes en TODAS las formas 7ms
 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
```

### 4.7 Skeleton — dirección B (no anima nunca)

```
 ❯ src/shared/ui/primitives/skeleton/Skeleton.test.tsx (8 tests | 2 failed) 150ms
     × anima cuando NO hay preferencia de movimiento reducido 11ms
     × las dos clases son excluyentes en TODAS las formas 2ms
 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
```

Restaurado → `Tests 8 passed (8)`. (Un gate que sólo mirase "no anima con reduce" pasaría en verde
con un skeleton que no anima **nunca**: por eso están las dos direcciones y el test de exclusión.)

### 4.8 ProgressBar — el acotado

Mutación: `clampProgress` devuelve el valor crudo.

```
 ❯ src/shared/ui/primitives/progress-bar/ProgressBar.test.tsx (15 tests | 6 failed) 145ms
     × acota negativo sin romper el render 8ms
     × acota por encima del máximo sin romper el render 2ms
     × acota NaN sin romper el render 2ms
     × acota infinito positivo sin romper el render 2ms
     × acota infinito negativo sin romper el render 2ms
     × no tiene violaciones de axe en sus estados relevantes 64ms
 Test Files  1 failed (1)
      Tests  6 failed | 9 passed (15)
```

**El sexto rojo es `axe`**: sin acotar, `aria-valuenow` sale del rango y es una violación real, no
una opinión mía. Restaurado → `Tests 15 passed (15)`.

### 4.9 Ancla de pertenencia de los tonos — **añadir Y quitar**

Añadir un tono (`warning`):

```
     × ancla los nombres de los tonos públicos 9ms
AssertionError: expected [ 'accent', 'success', 'warning' ] to deeply equal [ 'accent', 'success' ]
      Tests  1 failed | 14 passed (15)
```

Quitar uno (`success`):

```
     × ancla los nombres de los tonos públicos 11ms
AssertionError: expected [ 'accent' ] to deeply equal [ 'accent', 'success' ]
      Tests  1 failed | 14 passed (15)
```

Restaurado → `Tests 15 passed (15)`. (Es el mismo mecanismo de `SKELETON_SHAPES`, `DIALOG_SIZES`,
`STATE_PANEL_TONES` y `STATE_PANEL_HEADING_LEVELS`: `toEqual` sobre la lista derivada del objeto que
alimenta la `cva`.)

### 4.10 Ancla de la superficie pública — **quitar Y añadir**

Quitar `export * from "./error-state"` del barrel de `feedback/`:

```
 ❯ src/shared/ui/public-api.test.ts (4 tests | 2 failed) 16ms
     × feedback exporta exactamente su contrato 8ms
     × las seis piezas de #33 llegan por el barrel raíz 2ms
AssertionError: expected [ 'EmptyState', …(1) ] to deeply equal [ 'ERROR_STATE_RETRY_LABEL', …(3) ]
AssertionError: ErrorState no se exporta desde @/shared/ui: expected false to be true
      Tests  2 failed | 2 passed (4)
```

Añadir un export de más (`StatePanel`, que es interno a propósito):

```
 ❯ src/shared/ui/public-api.test.ts (4 tests | 1 failed) 31ms
     × feedback exporta exactamente su contrato 18ms
AssertionError: expected [ 'ERROR_STATE_RETRY_LABEL', …(4) ] to deeply equal [ 'ERROR_STATE_RETRY_LABEL', …(3) ]
      Tests  1 failed | 3 passed (4)
```

Restaurado → `Tests 4 passed (4)`.

### 4.11 Guardrail de no-hardcode — el valor Y el barrido

Hardcodear un `px` en un componente **nuevo** (el velo del `Dialog`):

```
 ❯ src/shared/ui/no-hardcode.test.ts (111 tests | 1 failed) 47ms
     × has no raw px sizes in primitives\dialog\dialog.variants.ts 11ms
AssertionError: raw px value found in primitives\dialog\dialog.variants.ts: expected true to be false
      Tests  1 failed | 110 passed (111)
```

Romper el **barrido** (que deje de bajar a las subcarpetas), que es la forma en que un guardrail de
este tipo se queda verde sin medir nada:

```
 ❯ src/shared/ui/no-hardcode.test.ts (5 tests | 2 failed) 16ms
     × encuentra los fuentes de shared/ui 7ms
     × llega a las cuatro capas de componentes 4ms
AssertionError: expected 1 to be greater than 20
AssertionError: expected [ 'index.ts' ] to include 'primitives\button\button.variants.ts'
      Tests  2 failed | 3 passed (5)
```

Restaurado → `Tests 111 passed (111)`.

---

## 5. Accesibilidad — qué se midió

- **`axe` por componente y en sus estados relevantes**, no sólo en reposo: `ProgressBar` (vacía, a
  medias, completa **y con dato roto**), `Skeleton` (las tres formas), `Toggle` (activo, inactivo y
  deshabilitado, dentro del grupo), `EmptyState` (con y sin acción), `ErrorState` (con y sin
  reintento) y `Dialog` **abierto**.
- El `axe` del `Dialog` corre sobre **`document.body`**, no sobre el contenedor de RTL: el diálogo
  vive en el portal, así que medirlo en el contenedor no habría medido nada (REGLA 7 en pequeño).
- Teclado: `Toggle` alcanzable con `Tab` y conmutable con `Enter`/`Espacio`; `ErrorState` alcanzable
  y activable con `Enter`; `Dialog` con ciclo completo en las dos direcciones.
- Objetivo táctil `--touch-target` en `Toggle`; el `Button` del reintento ya lo trae.
- `prefers-reduced-motion` del `Skeleton` **mockeando la preferencia de happy-dom**, la misma técnica
  que `three/ascii-yarn/ascii-yarn.test.tsx` usa para la misma preferencia, ejercitando el hook real.

---

## 6. Deudas nuevas propuestas (numeradas desde la **86**; NO las escribí en `deudas.md`)

- **86 — La animación del `Skeleton` no sale de los tokens de movimiento.** `animate-pulse` es un
  valor por defecto de Tailwind: el CSS compilado dice
  `--animate-pulse: pulse 2s cubic-bezier(.4,0,.6,1) infinite`, y ni esa duración ni esa curva son
  `--dur-*` / `--ease-*`. El guardrail no lo ve porque no hay `px` ni color. Además, el template
  pedía un *shimmer* de gradiente, no un latido de opacidad: la fidelidad visual queda pendiente de
  revisión humana. **Arreglo:** declarar un `--animate-skeleton` en `globals.css` con los tokens de
  movimiento del sistema.
- **87 — El `Dialog` no bloquea el scroll del fondo ni oculta el resto del árbol.** `aria-modal`
  basta para los lectores de pantalla que lo honran, pero con el modal abierto la página de detrás
  **sigue haciendo scroll** con la rueda o con las flechas. **Arreglo:** `overflow` bloqueado en el
  elemento raíz mientras esté abierto (y su contrapartida al cerrar), o `inert` sobre el resto.
- **88 — La trampa de foco no cubre el foco robado desde fuera.** El ciclo de `Tab` está atrapado,
  pero si un script externo llama a `.focus()` sobre un elemento de la página de detrás, el foco se
  va y nadie lo devuelve. **Arreglo:** escuchar `focusin` en el documento mientras esté abierto.
  Prioridad baja: hoy nada del repo hace eso.
- **89 — `focusableWithin` no distingue lo visible de lo oculto por CSS.** Filtra `disabled` y el
  atributo `hidden`, pero un control con `display:none` desde una clase seguiría contando como
  parada del ciclo. En happy-dom no se puede medir sin hojas de estilo aplicadas. **Arreglo real:**
  medirlo con un navegador de verdad (familia de la **regla 4**, hermana de las deudas 26/51/53).
- **90 — El `Dialog` no ofrece foco inicial configurable.** Siempre enfoca el panel. Para el modal de
  creación de proyecto (#19), lo ideal sería el primer campo del formulario. **Arreglo:** un
  `initialFocusRef` opcional; el valor por defecto se queda como está.
- **91 — Quedan dos guardrails de lista fija** (deudas **40** y **43**). Esta slice convirtió el
  tercero (no-hardcode) a barrido de directorios; los otros dos siguen nombrando archivos a mano y
  su medicina es idéntica. **Arreglo:** el mismo recorrido, ~15 líneas cada uno.
- **92 — Ningún gate obliga a que un primitivo nuevo traiga su test de `axe`.** Hoy es disciplina:
  los seis lo traen, pero el séptimo puede no traerlo con los 756 tests en verde. **Arreglo:** un
  test que recorra `shared/ui/**` y exija que cada carpeta de componente tenga un archivo de test
  que mencione `axe` (mismo patrón de barrido que el guardrail de no-hardcode).
- **93 — El ancla de la superficie pública no cubre `layout/` ni `three/`.** `public-api.test.ts`
  fija al literal lo que exportan `primitives/` y `feedback/`; las otras dos capas quedan sin ancla
  y se les puede caer un export sin que nada lo note. **Arreglo:** dos listas más en el mismo test.

---

## 7. Notas para quien siga (#19 en adelante)

- Las seis piezas se importan desde **`@/shared/ui`** (o desde su capa). `StatePanel` **no** es
  pública: usá `EmptyState` / `ErrorState`.
- **`Toggle` es controlado**: el estado (qué métricas se ven, qué tipos filtran) vive en la página.
  Envolvelos en un `ToggleGroup` con `label`, o el conjunto se anuncia como botones sueltos.
- **`ProgressBar` exige `label`.** Es el nombre accesible; sin él `axe` cae.
- **`Dialog` es controlado** (`open` + `onClose`) y **se monta en portal**: para buscarlo en un test,
  usá `screen`/`document.body`, no el `container` que devuelve `render()`.
- El `Skeleton` es `aria-hidden`: si montás varios, anunciá la carga **una vez** desde el contenedor.
- **El guardrail de no-hardcode ya no tiene lista**: un componente nuevo en `shared/ui/**` queda
  vigilado solo. No hace falta registrarlo en ningún sitio.
- **`public-api.test.ts` va a caer** cuando añadas un export a `primitives/` o `feedback/`. Es lo que
  tiene que pasar: actualizá la lista **a conciencia**, es el contrato del template portable.
