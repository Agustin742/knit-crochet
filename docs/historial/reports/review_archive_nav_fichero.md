# Review — corrección de #13 `ui_shell_nav`: `ArchiveNav` al modelo fichero (RFC-01 §3 D4)

**Veredicto: RECHAZADO**

> El rechazo **no** es por calidad de ejecución ni por verificación: `bash ./init.sh` y `pnpm build`
> están verdes, corridos por mí, y el trabajo técnico es sólido (el punto que más riesgo tenía —la
> calibración del contraste— está resuelto y **medido**, no portado tal cual). El rechazo es por
> **contrato**: de los 10 invariantes de D4, **3 no se cumplen a la letra** (5, 7 y 10) y un cuarto
> se cumple con una desviación (9). Dos de esas desviaciones el propio implementer las declara y
> pide confirmar; la tercera (**invariante 7 en tablet**) es un fallo funcional medible en el
> breakpoint donde el `ArchiveNav` nace, y no era una decisión delegada.
>
> Se puede desbloquear rápido: ver la sección 4. Nada de lo hecho hay que tirarlo.

---

## 1. Verificación propia (salida literal, no la del informe)

`bash ./init.sh` — **exit code 0**:

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  40 passed | 1 skipped (41)
      Tests  399 passed | 6 skipped (405)
   Start at  17:13:02
   Duration  113.63s (transform 7.74s, setup 94.49s, import 110.77s, tests 35.30s, environment 22.34s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

`pnpm build` — **exit code 0**, 12/12 páginas generadas, 23 rutas emitidas. Sin warnings de CSS.

Baseline 385 passed | 6 skipped → **399 passed | 6 skipped**. **Ningún test eliminado** (verificado
sobre el diff de `layout.test.tsx`, no sobre el informe): +2 de comportamiento, +12 del archivo nuevo
`archive-nav.tokens.test.ts`. El único test reescrito es el de la transición declarativa, y sólo
cambia el nodo que inspecciona (el slot de superficie en vez del enlace), no la intención ni el
literal que busca. **No se llevó puesto ningún assert de comportamiento.**

---

## 2. Lo que verifiqué contra el código, uno por uno

### 2.1 Los 10 invariantes de D4

| # | Invariante | Estado | Evidencia (código real) |
|---|---|---|---|
| 1 | contenedor en columna | OK | `ArchiveNav.tsx:107-110` — el `nav` es una columna invertida. |
| 2 | hojas full-bleed | OK | `nav` anclado a ambos lados del shell; la hoja ocupa el ancho completo (`archive-nav.variants.ts:15`). |
| 3 | canto de altura fija por token; el presupuesto entra en 104px | OK | `--nav-leaf-height: 10px` (`globals.css:72`). Cuenta rehecha por mí: stack 6x10 = 60px anclado al fondo, la hoja más alta ocupa y=44..54 y su pestaña (44px, objetivo táctil) cuelga hasta **y=10**, y hasta **y=2** en hover. Entra en `--nav-height: 104px` con 10px de holgura. `--nav-height` **no se tocó** (diff de `globals.css:71`). |
| 4 | escalonado por apilamiento, no dibujado | OK | No hay ningún desplazamiento por índice; el escalón **es** la suma de cantos. |
| 5 | hoja activa/primera abajo y al frente, profundidad decreciente hacia arriba | **PARCIAL** | "Primera abajo" OK (columna invertida + `--z-nav-leaf-1..6` = 6..1). "**Activa** abajo" NO en 5 de 6 rutas: el orden es estable, no se reordena por ruta (desviación declarada, informe 5.2). |
| 6 | la pestaña cuelga del canto, con el lockup | OK | La superficie alinea al final y la pestaña desborda hacia arriba; prefijo en serif itálica + etiqueta en sans mayúscula (`ArchiveNav.tsx:138-153`, `nav-items.ts:17-22`). |
| 7 | pestañas a x creciente, sin tocarse, las 6 etiquetas legibles enteras, rampa derivada | **NO (en tablet)** | Rampa derivada OK y sin solape OK (rejilla de 6 columnas; la pestaña no puede desbordar su columna). Pero "se leen enteras a la vez" **no se cumple entre 768px y ~950px** — ver 3.1. |
| 8 | hover sin reflow, compensado, degradando solo | OK | Ver 2.2 (aritmética rehecha). |
| 9 | la profundidad la da la sombra hacia arriba, no un escalón tonal ni un borde | **PARCIAL** | Sombra hacia arriba OK (`--shadow-nav-leaf: 6px -5px 7px …`, y negativa) y escalón tonal retirado OK (una sola cara para las 6). Pero se añade un filo de 1px (`--shadow-nav-leaf-edge`), que es literalmente la línea que el invariante excluye. Desviación declarada y supuestamente autorizada: **requiere confirmación explícita y enmienda del texto de D4**. |
| 10 | la activa se funde con la página, `aria-current="page"` | **PARCIAL** | `aria-current` OK y tono `--bg` OK. Pero "se funde con la página" sólo es cierto cuando la activa es la de más abajo, o sea en `/`: en las otras 5 rutas la hoja `--bg` queda **en medio del cajón**, sin tocar el contenido. Consecuencia directa de la desviación del invariante 5. |

### 2.2 Lo que estaba en riesgo y sí está bien resuelto

**Contraste sobre fondo oscuro (el punto crítico del encargo): APROBADO.** No se portó el 0.06 de la
referencia. Recalculé los valores yo mismo con luminancia relativa WCAG y composición alfa, y
coinciden con lo que declara el informe:

| medición | mi cálculo | veredicto |
|---|---|---|
| luminancia relativa de `--bg` (espresso) | 0.02040 | el techo teórico es real |
| negro **opaco** sobre `--bg` | **1.408** | confirma que ninguna sombra negra sola pasa de ~1.41 |
| sombra de la referencia (negro 6%) sobre la cara | 1.069 | portarla tal cual habría sido invisible, o sea rechazo |
| cara de la hoja (`--brand-brown`) vs. página | **1.604** | el cajón se lee como material sobre la página |
| filo (cream 42%) compuesto sobre la cara | **2.791** | es la pista que de verdad separa hoja de hoja |
| núcleo de la sombra (negro 55%) sobre la cara | **1.755** | alfa recalibrada de 0.06 a 0.55 |

Los tres ratios están clavados en `archive-nav.tokens.test.ts:180-197` con la misma fórmula, así que
no se pueden bajar sin que caiga un test. **Cero colores nuevos**: la cara reusa `--brand-brown` de la
paleta. Cumple el SDD sección 0 (mecánica de la referencia, piel Hill House).

**Hover sin reflow (invariante 8): APROBADO, con un margen extra que el informe no destaca.**
Aritmética verificada: `--nav-leaf-height-hover` (2px) + `--nav-leaf-gap-hover` (8px) = 10px =
`--nav-leaf-height`. Pero además la caja del enlace tiene **altura fija** `--nav-leaf-height`
(`archive-nav.variants.ts:15`), así que el alto del stack es 6x10 = 60px **por construcción**,
independientemente de lo que haga la superficie interior: no hay forma de que el stack cambie de alto.
El borde superior de la hoja no se mueve; lo que sube 8px es la pestaña. Correcto.
El argumento anti-parpadeo del informe (5.1) también se sostiene: al encoger la superficie, el hueco
de 8px que aparece **sigue dentro de la caja del enlace**, así que el puntero nunca sale de él.

**Degradación con `prefers-reduced-motion`: APROBADO sin código extra.** La transición se declara con
una lista de propiedades y duración por token, y la regla global de `globals.css:239-248` aplasta
`transition-duration` con `!important` para todo el documento. No hay ni una línea de JS ni una media
query duplicada en el componente. Verificado en el CSS emitido: `transition-property:height,margin-bottom`
presente una sola vez.

**Profundidad (invariante 5, parte técnica): APROBADO y correctamente comentado.** Eligió la vía B
(rampa explícita de tokens), no el DOM invertido, y el porqué está **en el código**, no sólo en el
informe (`archive-nav.variants.ts:9-13`): el orden del DOM es el orden de lectura y de tabulación, así
que no se invierte; la profundidad se declara aparte. Hay además un test que fija el orden del DOM
(`layout.test.tsx:56-71`), así que si alguien vuelve a la opción A el guardrail salta. El mecanismo
funciona: las hojas son **flex items**, y el z-index aplica a un flex item aunque su `position` sea
`static`; el `nav` es `absolute` con `z-index: auto`, por lo que **no** crea contexto de apilamiento y
las 6 hojas compiten directamente con la banda (`--z-nav-band: 7`) dentro del contexto del `header`.
La cuenta cierra.

**Colisión con los utils y con el wordmark: APROBADO (en desktop).** La rampa **sí** se reparte entre
los dos márgenes: el carril lleva relleno izquierdo `--space-6` y derecho `--nav-tab-inset-end`, con
`--nav-tab-inset-end = calc(--nav-utils-width + --space-6)`; la caja de utils usa `--nav-utils-width`
dentro de una banda con relleno horizontal `--space-6`. Resultado: **el borde derecho de la columna 6
coincide exactamente con el borde izquierdo de los utils a cualquier ancho de ventana**, por
construcción y no por un número afinado a ojo. Y la pestaña no puede desbordar su columna. Contra el
wordmark: la pestaña 1 vive en y=60..104 y el wordmark en y=12..~56, así que no se cruzan; a 1180px la
columna 2 arranca en x≈185 y el wordmark termina en ~175. Justo, pero sin solape.

**Contratos preservados: APROBADO.**

- Firma pública `ArchiveNav({ items?, user?, onLogout?, className? })` idéntica (`ArchiveNav.tsx:22-30`).
- Barrels (`archive-nav/index.ts`, `layout/index.ts`, `shared/ui/index.ts`) sin cambios en lo que exportan del nav.
- Landmark `nav` con nombre + 6 links, `aria-current` por ruta y subruta vía `isRouteActive`, raíz sólo
  con coincidencia exacta, nombre de usuario visible, "Salir" dispara `onLogout`, y los **3 tests de axe**
  intactos (`layout.test.tsx:88-190`).
- `BottomNav`, `nav-items.ts`, `isRouteActive`, `AppShell` (salvo el slot 3D de la sesión anterior),
  `template/**`, `--nav-height` y `--z-nav`: **sin tocar en esta sesión** (verificado por mtime: los
  cambios que git muestra en `BottomNav`/`AppShell` son del 25/07, de la migración canónica; los de esta
  sesión son del 27/07 16:xx).

**Guardrails: APROBADO, intactos y verdes.** `no-hardcode.test.ts` (mtime 25/07 20:08),
`canonical-tailwind-classes.test.ts` (25/07 21:15) y `globals-css.test.ts` (25/07 18:37) **no se
tocaron** en esta sesión (27/07 16:xx). No se relajó ningún guardrail para que pasara el código nuevo;
al contrario, el código nuevo se escribió para pasarlos (cero px/hex/rgb en `ArchiveNav.tsx` y
`archive-nav.variants.ts`, que están ambos en la lista de `no-hardcode`).

**CSS emitido: verificado por mí en `.next/static/chunks/*.css`**, no por el informe:

- Tokens del modelo de fila (tonos de carpeta, solape, elevación, alturas de cuerpo, sombras de
  carpeta): **0 ocurrencias**.
- `z-index:var(--z-nav-leaf-1..6)`, `height:var(--nav-leaf-height)` y su variante de hover,
  `margin-bottom:var(--nav-leaf-gap-hover)`, `grid-column-start:1..6`,
  `padding-right:var(--nav-tab-inset-end)`, `width:var(--nav-utils-width)`: **todas presentes**.
- `filter:drop-shadow(var(--shadow-nav-leaf))` emitido como **propiedad arbitraria**, no como la
  utilidad de sombra proyectada — correcto, y coherente con `explore_archivenav_tailwind_expresion.md`
  sección 2 (no son equivalentes).
- `--tw-shadow:var(--shadow-nav-leaf-edge)` emitido; el token empieza por `inset`, así que rinde como
  filo interior.
- La variante de hover por grupo sale envuelta en la media query de puntero fino, como debe.

**Higiene anti-bug: sin hallazgos.** Ni `ArchiveNav.tsx`, ni `archive-nav.variants.ts`, ni
`archive-nav.tokens.test.ts`, ni el informe `impl_archive_nav_fichero.md` citan una sola clase de
Tailwind literal en prosa ni en comentarios. `progress/` sigue excluido del escaneo por `@source not` y
el build lo confirma. El único literal que queda en un test es un prefijo de utilidad que ya estaba
antes y no es candidato válido.

---

## 3. Los hallazgos que motivan el rechazo

### 3.1 GRAVE — Invariante 7 no se cumple en tablet, que es un breakpoint co-primario

El invariante dice, textual: *"Las 6 etiquetas se leen enteras a la vez."* El implementer lo declara
como deuda abierta (informe 7.2: *"entre 768 y ~1000px de ancho, la etiqueta más larga se recorta"*).
Rehice la cuenta y es peor que "la más larga":

- Ancho útil del carril a 768px: 768 − 24 (izquierda) − 192 (derecha = 168 + 24) = **552px**.
- Columna: 552 / 6 = **92px**. Menos el relleno horizontal de la pestaña (12 + 12) → **68px de texto**.
- Anchos aproximados de etiqueta a 11px, Archivo bold, mayúsculas, con 1px de tracking:
  "CALCULADORAS" ≈ 98px, "DASHBOARD" ≈ 73px, "PROYECTOS" ≈ 73px, "PATRONES" ≈ 65px.
- Es decir: a 768px **se recortan 3 de las 6 etiquetas**, no una. El recorte desaparece recién a partir
  de ~950px de viewport.

RFC-01 sección 2 fija **tablet y desktop como co-primarios**, y `--bp-tablet: 768px` es exactamente el
ancho donde el `ArchiveNav` se enciende. O sea: el componente arranca su vida incumpliendo su propio
invariante. Degrada limpio (elipsis, nunca solape), pero "degrada limpio" no es lo que pide el contrato.

La palanca que propone el informe (monograma en vez de wordmark por debajo de desktop, ~110px) **no
alcanza**: con 662px de carril la columna sube a 110px → 86px de texto, y "CALCULADORAS" sigue sin
entrar. Hace falta una decisión de diseño real (ver 4.1).

### 3.2 CONTRATO — Invariantes 5 y 10: el cajón no se reordena por ruta

Declarado por el implementer (informe 5.2) con un argumento que **comparto técnicamente** —reordenar
las 6 pestañas en cada navegación destruye la memoria espacial del nav, que es justo lo que un nav no
debe hacer— pero que **no es del implementer decidir**: D4 dice "la hoja activa/primera va abajo" y el
párrafo de wordmark/utils razona explícitamente sobre "la pestaña de la hoja activa es la **más baja y
más a la izquierda**". Con orden estable:

- Invariante 5 se cumple sólo en `/` (Dashboard).
- Invariante 10 ("se funde con la página, sin costura") se cumple sólo en `/`: en las otras 5 rutas la
  hoja `--bg` queda flotando en medio del cajón, con hojas marrones por debajo. Ya no es "fundirse con
  la página", es "una hoja de otro color en medio del stack".

No lo apruebo por mi cuenta: es una enmienda al RFC, y el propio implementer pide confirmación
explícita. Requiere decisión del leader **y** actualización del texto de D4 antes de cerrar.

### 3.3 CONTRATO — Invariante 9: el filo de 1px es el borde que el invariante excluye

`--shadow-nav-leaf-edge: inset 0 1px 0 var(--nav-leaf-edge)` es, visualmente, una línea de 1px. El
invariante 9 dice *"no un escalón tonal ni un borde"*. El implementer sostiene que el encargo lo
autorizaba por escrito y la justificación numérica es impecable (ver 2.2: sin el filo, el techo de
contraste con sombra negra sola es 1.41:1). **Estoy de acuerdo con la solución**, pero el texto de D4
hoy la prohíbe. Si se confirma, hay que enmendar el invariante 9 en `RFC-01-shell.md`, porque tal como
está el próximo agente que lea D4 va a "corregir" esto y va a dejar el nav ilegible.

### 3.4 CÓDIGO — La rejilla asume 6 ítems, pero `items` es prop pública

`tabTrackVariants` fija 6 columnas literales y `navLeafPosition` hace `index % 6`
(`archive-nav.variants.ts:54` y `:99`). El informe (3.2) dice *"el carril reparte el ancho disponible
en tantas columnas como páginas"* — **eso no es lo que hace el código**. Con `items` de longitud
distinta de 6 (y `items` es parte de la firma pública, que `AppShell` reenvía):

- con menos de 6 ítems quedan columnas vacías a la derecha (inocuo, pero el reparto ya no es el prometido);
- con más de 6, el ítem 7 vuelve a la columna 1 y a `--z-nav-leaf-1`: **dos pestañas en la misma
  columna** (invariante 7 roto de verdad, con solape) y dos hojas con la misma profundidad.

No hay ningún test que cubra `items.length` distinto de 6. Hoy no rompe nada porque `NAV_ITEMS` son 6,
pero es un contrato público que miente.

### 3.5 CÓDIGO — El comentario que justifica la decisión de profundidad describe mal el mecanismo

`archive-nav.variants.ts:9-13` dice: *"cada hoja crea su propio contexto de apilamiento por llevar un
filtro"*. **La hoja (el enlace) no lleva filtro**: el `filter` con la sombra proyectada está en la
superficie interior (`leafSheetVariants`, línea 42). La conclusión de la decisión es correcta (usar
z-index explícito y no invertir el DOM, por a11y), pero el mecanismo que se cita como motivo es falso.
Un comentario que explica un porqué sutil y lo explica mal es peor que no tenerlo: es exactamente la
bomba de tiempo que se quería evitar.

### 3.6 DEUDA — Cosas correctas que hay que dejar registradas fuera del informe

- `--shadow-paper` queda **sin ningún consumidor** en todo `src/**` (grep: su única aparición es la
  propia declaración en `globals.css:151`) y con el signo de sombra del modelo viejo.
- El arreglo del botón "Salir" (color inverso pasado desde el nav, `ArchiveNav.tsx:96`) tapa un
  **defecto real del primitivo**: la variante fantasma pinta con el color de primer plano claro y es
  ilegible sobre cualquier superficie oscura. El parche es correcto y de alcance mínimo, pero el
  defecto sigue vivo para el próximo consumidor y **no está en la lista de deuda** de `current.md`.

---

## 4. Cambios requeridos, por gravedad

1. **Resolver el invariante 7 en el rango 768–950px**, o conseguir que el leader enmiende D4 acotando
   "las 6 etiquetas enteras" a desktop. Opciones que veo, sin entrar en píxeles:
   (a) reducir la reserva de utils por debajo de desktop (el nombre de usuario podría no mostrarse en
   tablet, dejando sólo "Salir": libera ~100px además de los ~110 del wordmark);
   (b) reducir tamaño o tracking de la etiqueta sólo en tablet, por token;
   (c) permitir que el lockup parta la palabra en dos líneas en tablet.
   Sea cual sea, **la solución tiene que quedar cerrada por un test o por derivación de tokens**, no
   por un número afinado a ojo, y hay que declarar con qué ancho mínimo se garantiza el invariante.
2. **Obtener del leader la confirmación explícita de la desviación de 3.2 (orden estable del cajón) y
   enmendar D4** —invariantes 5 y 10— en `docs/design/rfc/RFC-01-shell.md`. Si el leader decide que la
   activa **sí** debe bajar al fondo, esto es una reescritura del `nav` y hay que replantear. Mientras
   D4 diga lo que dice, el código no cumple el contrato.
3. **Ídem para el filo de 1px del invariante 9**: confirmarlo y **enmendar el texto de D4** para que
   diga que la profundidad se reparte entre sombra hacia arriba + filo, con los ratios mínimos que ya
   están en `archive-nav.tokens.test.ts`. Si no se enmienda, el próximo agente lo borra.
4. **Alinear la rejilla con `items.length`** (3.4): o el carril y la profundidad se derivan de la
   cantidad real de ítems, o la firma pública deja de aceptar longitudes distintas de 6 (por tipo o por
   validación explícita). Añadir un test con `items` de longitud distinta de 6. Y corregir la
   afirmación de la sección 3.2 del informe, que hoy describe algo que el código no hace.
5. **Corregir el comentario de `archive-nav.variants.ts:9-13`** (3.5): el filtro está en la superficie,
   no en la hoja. El motivo real para no invertir el DOM es sólo el de a11y (orden de lectura y de
   tabulación), que ya está bien dicho — sobra la parte del contexto de apilamiento, o hay que decirla
   bien.
6. **Registrar en `current.md` las dos deudas de 3.6** (`--shadow-paper` huérfano; variante fantasma
   del `Button` ilegible sobre superficies oscuras). No van en el informe del implementer, van en la
   lista de deuda que sobrevive a la sesión.

**Lo que NO hay que tocar:** la calibración del contraste, la aritmética del hover, la rampa de
z-index, el reparto del carril entre los dos márgenes, el presupuesto vertical y los tests nuevos.
Todo eso está bien y verificado.

---

## 5. Checkpoints (`CHECKPOINTS.md`)

- **C1 — El arnés está completo:** [x] — archivos base y los 3 docs presentes; `bash ./init.sh` exit 0.
- **C2 — El estado es coherente:** [x] — ninguna feature en `in_progress`; #13 sigue `done` y
  `feature_list.json` no se tocó en esta sesión; `progress/current.md` describe la sesión activa.
- **C3 — El código respeta la arquitectura:** [x] — es UI pura en `shared/ui/layout/`: sin DB, sin
  fetch, sin conocimiento del backend (recibe `user`/`onLogout` por props). Feature-first respetado.
  Sin dependencias nuevas, sin `console.log`, sin secretos, sin TODOs huérfanos. Token-first cumplido
  (cero hex/rgb/px en los dos archivos del nav, guardrail verde).
- **C4 — La verificación es real:** [x] — lint, typecheck y 399 tests verdes; el módulo nuevo tiene su
  propio archivo de tests (12) que además mide el contraste de verdad, no lo estima.
- **C5 — La sesión se cerró bien:** [ ] — la sesión **no está cerrada**: falta la entrada en
  `progress/history.md` y las deudas de 3.6 sin registrar. Es tarea del leader al cerrar, no un defecto
  del implementer.

**El rechazo no proviene de ningún checkpoint** (C1-C4 están verdes): proviene del contrato D4, que es
la vara específica de este encargo.
