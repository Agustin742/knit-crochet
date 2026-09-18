# Review (2a pasada) — corrección de #13 `ui_shell_nav`: `ArchiveNav` modelo fichero

**Veredicto: APROBADO**

Los **6 cambios** que exigí en `review_archive_nav_fichero.md` seccion 4 están hechos. Los verifiqué
contra el **código**, no contra el informe. Nada de lo que aprobé en la primera ronda se degradó.
`bash ./init.sh` y `pnpm build` verdes, corridos por mí. Sin hedging: se cierra.

---

## 1. Verificación propia (salida literal)

`bash ./init.sh` — **exit code 0**:

```
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (31 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  40 passed | 1 skipped (41)
      Tests  408 passed | 6 skipped (414)
   Start at  20:21:12
   Duration  64.30s (transform 4.47s, setup 51.58s, import 62.42s, tests 23.68s, environment 12.94s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

`pnpm build` — **exit code 0**:

```
  Creating an optimized production build ...
✓ Compiled successfully in 13.3s
  Running TypeScript ...
  Finished TypeScript in 16.2s ...
  Collecting page data using 3 workers ...
✓ Generating static pages using 3 workers (12/12) in 700ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/login
…  (23 rutas emitidas, 12/12 páginas generadas)
ƒ  Proxy (Middleware)
```

No maté el `next dev` del puerto 3000 ni levanté otro.

**Aviso operativo:** ese `next dev` **pisa `.next/static/chunks/*.css`** mientras recompila, así que
las inspecciones del CSS emitido que siguen las hice **en la misma invocación** que el `pnpm build`,
no después. Quien inspeccione el CSS emitido en una llamada posterior puede estar leyendo el chunk
de dev y sacar conclusiones falsas.

### Regresión de tests (verificada sobre el diff, no sobre el informe)

Baseline de esta ronda **399 passed | 6 skipped** → **408 passed | 6 skipped**. **+9, ninguno
eliminado**, confirmado con `git diff -U0` sobre los archivos de test: el diff contra `HEAD` no tiene
**ni una sola línea de borrado de un caso de test**. 13 casos en `HEAD` → 19 ahora en
`layout.test.tsx`, y en `archive-nav.tokens.test.ts` 12 → 18. El reparto coincide con lo declarado:
3 de comportamiento (activa marcada en su pestaña, ítems de más, ítems de menos) + 6 de tokens
(3 del presupuesto horizontal de E2, 3 del criterio de contraste de E1).

---

## 2. Los 6 cambios exigidos, uno por uno

### 2.1 — Invariante 7 en 768-950px (E2). **CERRADO**

**Implementado y garantizado por derivación de tokens, no por un número afinado a ojo.**

Rehice la aritmética yo mismo, leyendo los tokens de `globals.css` (no el informe):

| ancho | tokens que aplican | carril útil | columna | texto por pestaña | necesita CALCULADORAS (12 car.) | holgura |
|---|---|---|---|---|---|---|
| **768px** | utils 72 + inset 24 = 96; padding 4; 10px / 0.5px | 768-24-96 = **648** | 648/6 = **108.0** | 108-8 = **100.0** | 12 x (0.72x10 + 0.5) = **92.4** | **+7.6** |
| **1180px** | utils 168 + inset 24 = 192; padding 12; 11px / 1px | 1180-24-192 = **964** | **160.67** | 160.67-24 = **136.67** | 12 x (0.72x11 + 1) = **107.04** | **+29.6** |

Mis números coinciden con los del informe hasta el decimal. Tres cosas que valido y que el informe no
argumenta explícitamente:

- **La garantía cubre todo el rango, no sólo los dos anchos medidos.** El carril útil es
  `viewport - 24 - reserva`, **monótono creciente** en el viewport, y la reserva sólo cambia en un
  punto (1180px). Basta entonces comprobar el **mínimo de cada tramo** —768 y 1180—, que es
  exactamente lo que hace `archive-nav.tokens.test.ts:199-219`. La cobertura es completa **por
  monotonía**, no por muestreo afortunado de dos viewports.
- **La cota de 0.72 em es superior**, está documentada como tal (`:177-183`) y el test compara contra
  el texto real de `NAV_ITEMS`, no contra una constante copiada. Si alguien ensancha los utils,
  agranda la etiqueta o añade una página de nombre más largo, **el test cae**. Eso es cerrar por
  construcción.
- **Declara el ancho mínimo garantizado:** `--bp-tablet` (768px), que es donde nace el archivero, o
  sea todo el rango en el que el componente existe.

**Las utilidades tipográficas nuevas existen en el CSS emitido** —el riesgo real de esta solución:
una clase que no compila dejaría la garantía en una mentira—. Verificado por mí en el build de
producción:

```
.text-nav-tab{font-size:var(--text-nav-tab)}      /  --text-nav-tab:10px;
.tracking-nav-tab{--tw-tracking:var(--tracking-nav-tab);letter-spacing:var(--tracking-nav-tab)}
                                                  /  --tracking-nav-tab:.5px;
```

Y la **cascada está en el orden correcto**: comprobé el offset en bytes de cada par base/override
dentro del archivo, no sólo su presencia.

| base (tablet, sin media) | offset | override (desktop) | offset | at-rule que lo envuelve |
|---|---|---|---|---|
| `font-size:var(--text-nav-tab)` | 22013 | `font-size:var(--text-xs)` | 30745 | `@media (min-width:1180px)` |
| `letter-spacing:var(--tracking-nav-tab)` | 22619 | `letter-spacing:var(--tracking-label)` | 30889 | `@media (min-width:1180px)` |
| `padding-right:var(--nav-tab-inset-end-tablet)` | 21100 | `padding-right:var(--nav-tab-inset-end)` | 30688 | `@media (min-width:1180px)` |
| `width:var(--nav-utils-width-tablet)` | 18033 | `width:var(--nav-utils-width)` | 30472 | `@media (min-width:1180px)` |
| `padding-inline:var(--nav-tab-padding-x)` | 20649 | `padding-inline:var(--nav-tab-padding-x-desktop)` | 30546 | `@media (min-width:1180px)` |

Todos los overrides van **después** y **dentro** de la media del breakpoint de desktop: misma
especificidad, gana el último. La solución no depende del orden de las clases dentro del `cva`.

**El reparto del carril entre los dos márgenes sigue cerrado por construcción, ahora en los dos
tramos.** La banda usa `px-(--nav-tab-inset-start)` y la caja de utils `w-(--nav-utils-width-tablet)`
con `desktop:w-(--nav-utils-width)`; el carril termina en `--nav-tab-inset-end-tablet`, que es
`utils-tablet + inset-start`. Borde derecho del carril = borde izquierdo de los utils **a cualquier
ancho**, en las dos variantes. Lo que aprobé en la ronda 1 no se degradó: se duplicó bien.

### 2.2 — E1: la activa se marca en su sitio. **IMPLEMENTADO DE VERDAD**

- **Ninguna hoja lleva el tono de página.** `leafVariants` no declara fondo, y `leafSheetVariants`
  (`archive-nav.variants.ts:53-60`) es **una sola cadena sin variantes**, con `bg-(--nav-leaf-face)`
  fijo. No existe ninguna rama de "activa" en la hoja: las 6 caras son literalmente la misma clase.
- **El tono de página vive sólo en la pestaña:** `tabVariants:116` declara
  `active: { true: bg-bg, false: bg-(--nav-leaf-face) }`, y el acento sólo en la etiqueta
  (`tabLabelVariants:133`, `active: { true: text-accent }`).
- **Orden del DOM = orden de la lista, sin reordenamiento por ruta.** `ArchiveNav.tsx:127` mapea
  `leaves` tal cual; no hay `sort`, `filter` ni partición por `active` en todo el archivo. La
  inversión visual la hace `flex-col-reverse` (`:125`), que no toca el DOM. El orden está clavado por
  `layout.test.tsx:56-71`.
- **El test de E1 es honesto** (`layout.test.tsx:153-179`): renderiza la misma ruta dos veces
  (inactiva / activa) y afirma que la **pestaña** del índice 2 cambia de clase, que la **hoja** no
  cambia, y que el conjunto de clases de las 6 hojas tiene tamaño 1 —o sea, idénticas entre sí—.
  No cita ni una clase: compara renders. Es exactamente el guardrail que hacía falta.

**Contraste, recalculado por mí con la misma fórmula de la primera ronda (luminancia relativa WCAG +
composición alfa):**

| medición | mi cálculo | mínimo aplicable | veredicto |
|---|---|---|---|
| etiqueta en acento (`#e4649b`) sobre pestaña activa (tono de página) | **4.683** | 4.5 (texto normal) | **pasa** |
| etiqueta en acento sobre la cara de la hoja (alternativa descartada) | **2.920** | 4.5 | **no pasaba**: la decisión está bien tomada |
| pestaña activa (tono de página) vs. cara de la hoja | **1.604** | — | se distingue de las otras cinco |
| filo de la pestaña (cream 42%) compuesto sobre el tono de página | **3.494** | 3.0 (WCAG 1.4.11) | **pasa** |

Mis tres primeros números coinciden con los del informe hasta el tercer decimal, y con los asserts de
`archive-nav.tokens.test.ts:273-287`.

**Respondo a la pregunta concreta del encargo: la pestaña activa NO queda invisible contra la banda.**
Es cierto que su relleno es el mismo tono que la banda (ambos el tono de página), así que ahí el
contraste de *relleno* es 1.0. Pero la pestaña queda delimitada por tres cosas: (a) su **filo
superior de 1px** a **3.49:1** contra ese mismo tono, por encima del 3:1 que pide WCAG 1.4.11 para
componentes no textuales; (b) la **sombra proyectada** —el `filter: drop-shadow` vive en la
superficie de la hoja y no hay `overflow` que recorte, así que la pestaña que desborda hacia arriba
**también la recibe**—; y (c) la etiqueta en acento a 4.68 dentro. Es la parte más delgada del
diseño, pero cumple, y tu medición en navegador lo confirma. No es motivo de rechazo.

### 2.3 — Rejilla vs. `items.length` (mi hallazgo 3.4). **CORREGIDO**

- `tabTrackVariants` ya **no** fija 6 columnas: tiene variante `columns` de 1 a 6
  (`archive-nav.variants.ts:68-87`), alimentada por `navTrackColumns(leaves.length)`.
- `navLeafPosition` ya **no** usa módulo (`:144-146`) y `ArchiveNav.tsx:56` recorta con
  `items.slice(0, ARCHIVE_SLOTS)`. **Con más de 6 ítems es imposible que dos pestañas compartan
  columna o que dos hojas compartan profundidad**: sólo se montan 6 y las posiciones son 1..6.
- Con menos de 6, el carril declara tantas columnas como hojas: el reparto es el prometido.
- `ARCHIVE_SLOTS` está exportado y **documentado con el porqué** (`:3-10`): el presupuesto vertical,
  la rampa `--z-nav-leaf-1..6` y el ancho de columna están derivados para ese número. La firma
  pública no cambió y el contrato quedó observable desde fuera vía `data-position` y `data-columns`.
- **Tests que lo cubren** (`layout.test.tsx:88-111`): con 9 ítems las posiciones son 1..6 y todas
  distintas; con 3 ítems el carril declara 3 columnas.
- **La sección 3.2 del informe ya no miente:** lleva una errata explícita (`impl_...:143-148`) que
  reconoce que en la primera ronda la frase era falsa y remite a 8.3.
- Verificado además en el CSS emitido: las 6 utilidades de columnas del carril y las 6 de columna de
  arranque de la pestaña **están todas presentes**, una ocurrencia cada una, junto con las 6
  declaraciones de profundidad `z-index:var(--z-nav-leaf-N)`.

### 2.4 — El comentario de `archive-nav.variants.ts` (mi hallazgo 3.5). **CORREGIDO**

La frase falsa ("cada hoja crea su propio contexto de apilamiento por llevar un filtro")
**desapareció**. El comentario que queda (`:18-20`) conserva sólo el motivo real y suficiente: ese
orden es también el de lectura y el de tabulación, y el nav tiene que recorrerse en el orden de la
lista de páginas. El `filter` se documenta ahora donde de verdad está, en `leafSheetVariants`
(`:41-52`), sin atribuirle la creación del contexto de apilamiento de la hoja.

### 2.5 — Deudas de mi hallazgo 3.6 registradas. **HECHO**

`progress/current.md:162` (token de sombra de papel sin consumidor) y `:166` (variante fantasma de
`Button` ilegible sobre superficies oscuras, marcada como DEFECTO REAL). Fuera del informe del
implementer, en la lista que sobrevive a la sesión, como pedí.

### 2.6 — E3 (el filo de 1px). **SIN CAMBIOS, y ahora conforme**

`--shadow-nav-leaf-edge` se queda tal cual. Con el invariante 9 enmendado —la profundidad la reparten
sombra hacia arriba + filo, y lo prohibido es el escalón tonal entre hojas— el código **cumple el
texto vigente**: una sola cara para las 6 (cero escalón tonal) + sombra con la `y` negativa + filo.
No re-litigo la enmienda.

---

## 3. Que no se rompió nada de lo aprobado en la ronda 1

Verificado sobre el código y el CSS emitido, no sobre el informe:

- **Calibración del contraste de las hojas:** intacta. La cara sigue saliendo de la paleta, el filo
  sigue al 42% y la sombra al 55% con la `y` negativa. Los 4 asserts de
  `archive-nav.tokens.test.ts:247-264` siguen ahí **sin relajarse** (mayor o igual que 1.5, 2.5 y
  1.5, y menor que 1.5 para la sombra negra sola).
- **Aritmética del hover:** 2 + 8 = 10 = alto del canto, con su test (`:139-143`). En el CSS emitido
  las dos variantes de hover salen dentro de la media de puntero fino, como debe.
- **Rampa de z-index:** `--z-nav-leaf-1..6` = 6..1 y la banda en 7, sin tocar; los tests de
  decrecimiento estricto y de banda por delante siguen vivos.
- **Reparto del carril entre los dos márgenes:** conservado y **extendido** al tramo de tablet
  (ver 2.1). Sigue siendo derivado, no numérico.
- **Presupuesto vertical de 104px:** el alto del nav y el del canto **no se modificaron** (diff de
  `globals.css` revisado línea a línea); su test sigue vivo.
- **Tests nuevos de la ronda 1:** los 12 de `archive-nav.tokens.test.ts` siguen ahí (18 ahora) y
  `layout.test.tsx` no perdió ninguno.

## 4. Contratos y guardrails

- **Firma pública idéntica:** `ArchiveNav({ items?, user?, onLogout?, className? })`
  (`ArchiveNav.tsx:24-36`). El JSDoc de `items` documenta el recorte por ranuras.
- **Barrels sin cambios en lo que exportan del nav:** `archive-nav/index.ts` (mtime 24/07) y
  `layout/index.ts` intactos. El único cambio en `shared/ui/index.ts` es la reexportación de
  `./three`, de la sesión del ovillo.
- **Landmark, `aria-current` y axe:** `nav` con nombre accesible, `aria-current="page"` por ruta y
  subruta vía `isRouteActive`, raíz sólo con coincidencia exacta, nombre de usuario visible, "Salir"
  dispara `onLogout`, y los **3 tests de axe** intactos (`layout.test.tsx:224-243`). Todos verdes.
- **Intactos en esta ronda** (mtime 24-25/07 frente al 27/07 19:47-20:03 de esta): `BottomNav`,
  `bottom-nav.variants.ts`, `nav-items.ts`, `isRouteActive`, `AppShell`, `archive-nav/index.ts`,
  `template/**` (git no muestra ninguna modificación del prototipo HTML), el alto del nav y el
  z-index del nav.
- **Guardrails verdes SIN haber sido tocados:** `no-hardcode.test.ts` (mtime **25/07 20:08**),
  `canonical-tailwind-classes.test.ts` (**25/07 21:15**) y `globals-css.test.ts` (**25/07 18:37**).
  El único diff de `no-hardcode.test.ts` contra `HEAD` es de la sesión del ovillo y **amplía** la
  lista de archivos vigilados: endurece, no relaja. `ArchiveNav.tsx` y `archive-nav.variants.ts`
  **siguen dentro de su alcance** (`:25-26`), así que el cero-hardcode del nav está guardado. Que el
  guardrail cazara al implementer en caliente durante la ronda (informe 8.6) es evidencia de que
  estaba activo.
- **Higiene anti-bug:** sin `console.*`, `TODO` ni `FIXME` en `archive-nav/`; el bloqueo del escaneo
  de Tailwind sobre `progress/`, `docs/` y `template/` sigue intacto y el build lo confirma.

---

## 5. Observaciones menores (NO bloquean; para la lista de deuda)

1. **Los dos juegos de tokens de breakpoint no están sincronizados por ningún test.** La garantía de
   E2 se calcula leyendo `--bp-tablet` / `--bp-desktop`, pero la media query real la genera
   `--breakpoint-tablet` / `--breakpoint-desktop`. Hoy coinciden (768 y 1180) y el comentario de
   `globals.css:230-235` lo advierte, pero si alguien toca uno solo **el test de E2 seguiría verde
   con el layout roto**. Es la única grieta que le veo a "cerrado por construcción". Un assert de
   igualdad en `globals-css.test.ts` lo tapa en dos líneas. La duplicación es preexistente, pero
   ahora sostiene una garantía que antes no existía.
2. **El test de E2 divide el carril entre la cantidad de páginas de la app**, no entre el número de
   ítems realmente montados. La garantía es para las 6 páginas de la app, no para un consumidor con
   `items` propios; para ése la red de seguridad es el recorte con elipsis, no el test. Correcto para
   el invariante de D4, pero conviene saberlo.
3. **`navLeafPosition` tiene una rama muerta:** el acotado por mínimo es inalcanzable porque la lista
   ya viene recortada con `slice` antes de llamarlo. Defensa redundante, inofensiva.
4. **Cosmético:** la errata de la sección 3.2 del informe rompe el markdown —la cita se traga la
   continuación de la frase original y queda un párrafo cosido a medias (`impl_...:143-148`)—. El
   contenido es correcto; sólo se lee mal.
5. Ya anotado por el implementer y digno de sobrevivir a la sesión: **en tablet el nombre de usuario
   no se muestra** (consecuencia de la palanca elegida para E2). Quien diseñe el menú de cuenta tiene
   que saberlo.

---

## 6. Checkpoints (`CHECKPOINTS.md`)

- **C1 — El arnés está completo:** [x] — `AGENTS.md`, `init.sh`, `feature_list.json`,
  `progress/current.md` y los 3 docs de `docs/harness/` presentes; `bash ./init.sh` exit code 0.
- **C2 — El estado es coherente:** [x] — ninguna feature en `in_progress` (el único match de esa
  cadena en `feature_list.json` es el enum `valid_status`); #13 sigue `done` y con tests que pasan;
  `progress/current.md` describe la sesión activa, incluidas las deudas 16 y 17.
- **C3 — El código respeta la arquitectura:** [x] — es UI pura en `shared/ui/layout/`: sin DB, sin
  fetch, sin conocimiento del backend (recibe `user` y `onLogout` por props). Feature-first
  respetado. Sin dependencias nuevas, sin `console.log`, sin secretos, sin TODOs huérfanos.
  Token-first cumplido y guardado por el guardrail de no-hardcode.
- **C4 — La verificación es real:** [x] — lint, typecheck y **408 tests** verdes; el módulo tiene su
  propio archivo de tokens (18 tests) que mide contraste y presupuesto horizontal de verdad, y cada
  invariante nuevo (E1, E2, ranuras finitas) tiene su test.
- **C5 — La sesión se cerró bien:** [ ] — **falta la entrada en `progress/history.md` para la sesión
  del 27/07** (la última es del 25/07). No hay artefactos sospechosos sin trackear y #13 está en su
  estado correcto. Es tarea de cierre del leader, **no un defecto del implementer** ni motivo del
  veredicto.

---

## 7. Conclusión

Los 6 cambios exigidos están hechos. El contrato **enmendado** de D4 se cumple invariante por
invariante: ninguna hoja lleva el tono de página y sólo la pestaña activa lo lleva (E1), el orden del
cajón es estable y está clavado por test, las 6 etiquetas entran enteras desde 768px con la garantía
cerrada **por derivación de tokens y por monotonía del carril** —no por casualidad de un viewport—,
las utilidades tipográficas nuevas **compilan y ganan la cascada** en el CSS emitido, la rejilla ya
no miente sobre `items`, y ni un solo test se perdió por el camino.

**APROBADO.**
