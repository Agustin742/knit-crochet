# Review — lote de arreglo visual de `/proyectos` (enmienda E2 del RFC-03, deudas 136-144)

**Veredicto:** CHANGES_REQUESTED

> **No es una feature.** `feature_list.json` verificado intacto (`#20 projects_list_ui` = `done`,
> `in_progress` = `[]`). El bloqueo es **un solo cambio, sobre una sola pieza de texto en `src/`**:
> sobrevive literalmente el recibo de la **deuda 142** —el argumento de coste del arnés— en el módulo
> que hoy alimenta al primitivo nuevo. Todo lo demás que medí sale bien, y varias cosas salen mejor de
> lo que el informe afirmaba.

---

## Gates duros

| Gate | Resultado medido por mí |
|---|---|
| `bash ./init.sh` (redirigido a archivo) | **EXIT 0** — `Test Files 77 passed / 3 skipped (80)`, `Tests 1336 passed / 13 skipped (1349)`, 152,60 s |
| `pnpm build` | **EXIT 0** — `/proyectos` compila |
| lint / typecheck | verdes (dentro de `init.sh`) |

---

## Checkpoints

- C1: [x] — arnés completo; `init.sh` **EXIT 0** medido por mí sobre el árbol quieto.
- C2: [x] — `in_progress` vacío, `#20` sigue `done` con sus tests verdes, `feature_list.json` sin tocar.
  ⚠️ **Nota para el leader al cerrar** (no bloquea al implementer): el bloque "CORRECCIÓN DE LIBRO
  MAYOR (2026-08-14)" de `progress/current.md` afirma que "el implementer del lote E2 nunca entregó
  nada" y que "`src/shared/ui/primitives/` sigue con ocho carpetas". **Hoy es falso**: la entrega existe
  y la carpeta `segmented-control/` está. Ese bloque era correcto cuando se escribió y ahora contradice
  el árbol; hay que refrescarlo al cerrar o será la próxima "fuente autorizada" equivocada.
- C3: [ ] ← **Razón:** `src/features/projects/ui/project-filters.ts:18-30` conserva **verbatim el recibo
  de la deuda 142**, y hoy es falso en sus tres afirmaciones. Detalle en Cambios requeridos.
- C4: [x] — lint + typecheck + 1349 tests verdes; cada módulo nuevo trae su test, y **ataqué los gates
  nuevos en vez de leerlos** (ver "REGLA 3 y REGLA 7, verificadas atacando").
- C5: [x] — sin artefactos sospechosos: los untracked son los 5 informes de `progress/reports/`, el test
  nuevo del toolbar y la carpeta del primitivo. **Confirmado que el script descartable de CSS no quedó
  en el repo.** Pendiente del leader al cerrar: la entrada de esta sesión en `progress/history.md`.

---

## Las cuatro preguntas obligatorias de "el template es un SUELO, no un techo"

### 1. ¿Hay jerarquía visual, o todo pesa lo mismo?

**Hay jerarquía, y está declarada en el árbol** (lo medible; la percepción no la puedo cerrar yo):

- Encabezados escalonados de verdad: `h1` `font-display text-3xl` → `h2` de sección `text-2xl`
  (`ProjectsView.tsx:302, 334`) → `h3` de tarjeta `text-xl` (`ProjectCard.tsx:108`). Antes las tarjetas
  eran `h2` colgando de un `h1` suelto.
- Superficies distintas: el toolbar es **una** `Card` `raised` (secundario), la rejilla es contenido
  pelado (primario), "más filtros" es texto pelado con su `details` nativo (accesorio,
  `ProjectsToolbar.tsx:171-172`).
- Las cinco etiquetas del toolbar comparten tamaño y peso chico (`GROUP_LABEL_CLASSES`,
  `ProjectsToolbar.tsx:226`), que es lo que las hace leerse como una familia y no como cinco pesos.

⚠️ **Una afirmación del informe que NO se sostiene** (no bloquea, pero corrige el razonamiento):
`impl_fix20_visual.md` §2 dice "el segmentado manda (es el único con relleno de acento)". **Falso en
cuanto el usuario marca un tipo:** `toggle.variants.ts:26` lleva `aria-pressed:bg-accent
aria-pressed:text-accent-fg`, exactamente igual que la opción elegida del segmentado
(`segmented-control.variants.ts:58-59`). Sólo es cierto en el estado inicial. La jerarquía del toolbar
**no** descansa en el relleno: descansa en la geometría (carril contra fichas) y en las etiquetas.
Punto a mirar en pantalla con un tipo ya marcado.

### 2. ¿Dos controles con comportamiento distinto se siguen viendo igual?

**No, y la diferencia es estructural, no una convención.** Comparadas las dos variantes línea a línea:

| | Segmentado (excluyente) | `Toggle` (acumulable) |
|---|---|---|
| Borde / radio / sombra | **del carril**, una sola pieza | **de cada ficha**, N piezas |
| Separación | **cero** (línea compartida, `border-l`) | `gap-(--space-2)` en `toggleGroupVariants` |
| Gesto al pulsar | ninguno | `translate` + sombra encogida |
| Exclusividad | **estructural**: `value` es un escalar, no una lista | la pone el consumidor |
| Etiqueta | visible (`aria-labelledby`) | visible (`aria-labelledby`) |

Anclado en dos sitios y **los dos los ataqué**: `ProjectsToolbar.test.tsx:183-199` exige `data-slot`
distintos y cero `[data-slot="toggle"]` dentro del grupo de estado; `segmented-control.tokens.test.ts`
mide la forma **sobre el CSS compilado**.

⚠️ **Lo que queda igual, y lo digo en vez de callarlo:** tipografía, tamaño, `min-h-(--touch-target)`,
relleno interno y **el color con que se rellena la opción elegida** son idénticos entre las dos
primitivas. Cumple E2(c) a la letra (que pide carril continuo contra fichas con hueco, no colores
distintos), pero **la percepción no la puedo medir desde el árbol**. Va a la lista de pantalla.

### 3. ¿Alguna decisión visual está justificada por el coste del arnés?

**El apaño se deshizo bien, pero el recibo sobrevivió a medias.**

Lo que está **bien**, verificado:

- `SegmentedControl` vive en `src/shared/ui/primitives/` —no escondido en `features/`— y **paga el
  ancla**: `public-api.test.ts:33-36` suma `"SegmentedControl"` a la lista literal.
- La justificación de `ProjectsToolbar.tsx:51-54` que cita `conventions.md` **ya no existe**: leí el
  archivo entero, no queda rastro.
- **E1(i) NO fue "restaurada"**: `ProjectsToolbar.tsx:126-132` monta `SegmentedControl`, y el
  `ToggleGroup` (`:139`) sólo sirve al grupo de tipo, que es lo correcto.

Lo que está **mal** y bloquea: ver Cambios requeridos.

### 4. ¿Toda acción con efecto tiene feedback VISIBLE (no sólo `sr-only`)?

**Sí, y lo verifiqué rompiéndolo, no leyéndolo.**

- El aviso del quick-start es una caja con borde, relleno y tono (`--success` / `--danger`) sobre
  superficie elevada (`ProjectsView.tsx:445-453`), montada **junto a la lista** y no arriba del todo.
- **Comprobé el `empty:sr-only` en el CSS compilado**, que es la parte que un `toContain` sobre el JSX
  no vería: la regla `.empty\:sr-only:empty` se emite en el offset 26566, **después** de
  `px-(--space-4)` (18742), `py-(--space-3)` (19081) y `border-(length:--border-width)` (15745), y
  además gana por especificidad (0,2,0 contra 0,1,0). Su cuerpo declara `padding:0` y `border-width:0`.
  O sea que **vacío se repliega de verdad** y lleno se ve de verdad. No es una promesa del informe:
  está medido.
- Además la tarjeta que arrancó queda marcada (`ProjectCard.tsx:112-114`), y el fallo **no** deja marca
  (`ProjectsView.tsx:260-262`, con test).
- La región conserva `role="status"` y su `aria-label` (deuda 114): **se le quitó el `sr-only`, no el
  rol**.

---

## REGLA 3 y REGLA 7, verificadas **atacando** los gates (no leyéndolos)

Muté el árbol, corrí los tests y restauré. Verificado que el árbol volvió exactamente a su sitio
(`git diff --numstat` idéntico: 89/7, 164/111, 228/58).

| Mutación | Gate que tenía que delatarla | Resultado |
|---|---|---|
| `aspect-square` **encima** de `aspect-video`, sólo en el hueco sin foto | `ProjectCard.test.tsx` "keeps the very same frame shape" | **× ROJO** — `expected [ 'aspect-video', 'aspect-square' ] to deeply equal [ 'aspect-video' ]` |
| `shadow-hard` → `shadow-hard-lg` (**otro token real del sistema**, no una clase inventada) | `segmented-control.tokens.test.ts` "la sombra dura la lleva el carril" | **× ROJO** — `expected '--tw-shadow: 6px 6px 0 …' to contain '4px 4px 0 var(--border)'` |
| `empty:sr-only` → `sr-only` (volver el aviso a sólo-lector) | `ProjectsView.test.tsx` "el aviso del quick-start se ve" | **× ROJO** — `expected [ 'sr-only', … ] to not include 'sr-only'` |

Dos conclusiones que valen más que el informe:

1. **El endurecimiento del test de proporción es real.** El implementer declaró que ese test nació débil
   y que lo endureció; **lo comprobé atacándolo** y la segunda proporción cae. Además el bucle de
   `ProjectCard.test.tsx:144-148` cierra el flanco simétrico: todo el marco es compartido, no sólo la
   proporción.
2. **REGLA 7 se cumple de verdad en el gate de tokens.** La mutación de sombra es la prueba fuerte:
   cambié una clase por **otra clase real y existente** del sistema, así que un gate que sólo mirase
   nombres habría seguido verde. Falló comparando el **valor compilado** (`6px 6px 0` contra
   `4px 4px 0`). Ese test llega a producción, no al doble.

---

## Las dos cosas que el implementer declaró y no di por buenas

### 1. El baseline `EXIT 1` por `password.test.ts` — **la propuesta se sostiene**

Medido por mí, no leído:

- `vitest.config.ts` **no declara `testTimeout`** → rige el **default de 5000 ms**.
- Aislado con `--reporter=verbose`: `verifies the right password and rejects a wrong one` = **1217 ms**;
  el archivo entero, 2,49 s. El otro test del archivo no se acerca.
- En **mi** pasada completa de `init.sh` (152,60 s, más lenta que la del implementer) **ese test pasó**.

O sea: el mismo test, el mismo código, sale verde o rojo según la carga de la máquina. **Es fragilidad
por tope de tiempo, no un rojo real**, y no lo introdujo este lote (se midió antes de escribir código y
el archivo no tiene relación con `/proyectos`). La ficha propuesta —`testTimeout` propio para el hasheo,
no bajar el coste de CPU— es la correcta. Familia de la deuda 103. **Recomiendo abrirla.**

### 2. Los 7 fallos de la pasada intermedia — **la explicación es la correcta**

El árbol quieto sale **EXIT 0** en mi propia medición, con los totales exactos que declaró (77/80
archivos, 1336/1349 tests). Editar `ProjectsView.tsx` con `vitest` corriendo en segundo plano explica el
rojo sin residuo, y **los tres archivos que toqué yo con mis mutaciones fallaron y volvieron a verde de
forma limpia**, que es la contraprueba. No es una racionalización. Bien hecho dejarlo escrito.

---

## Aritmética, recalculada por mí — **cierra sin residuo**

Corrí los 5 archivos implicados juntos: **`Test Files 5 passed (5)`, `Tests 86 passed (86)`.**

| Archivo | Antes | Después | Δ |
|---|---|---|---|
| `segmented-control/SegmentedControl.test.tsx` | — | 9 | +9 |
| `segmented-control/segmented-control.tokens.test.ts` | — | 11 | +11 |
| `projects/ui/ProjectsToolbar.test.tsx` | — | 9 | +9 |
| `projects/ui/ProjectsView.test.tsx` | 24 | 36 | +12 |
| `projects/ui/ProjectCard.test.tsx` | 13 | 21 | +8 |
| **subtotal medido** | 37 | **86** | **+49** |
| `shared/ui/no-hardcode.test.ts` | n | n+6 | +6 |
| | | **suma** | **+55** |

9 + 11 + 9 + 36 + 21 = **86**, que es exactamente lo que midió la pasada. 1294 + 55 = **1349**.
77 + 3 = **80**. Cuadra en los tres ejes.

**Los +6 de `no-hardcode` verificados en la fuente, no aceptados de palabra:** `no-hardcode.test.ts:113`
y `:122` generan exactamente **dos** `it()` por archivo fuente barrido (`has no raw hex/rgb colors in …`
y `has no raw px sizes in …`), y `:101` excluye los `.test.*` del barrido. 2 × 3 fuentes nuevos
(`SegmentedControl.tsx`, `segmented-control.variants.ts`, `segmented-control/index.ts`) = **+6**.
**Sin residuo y sin hipótesis.**

---

## El "ALL PRESENT" de las utilidades nuevas — **reconstruido, con control positivo**

El script del implementer no está en el repo, así que **lo rehíce desde cero**: compilé `globals.css`
con `postcss` + `@tailwindcss/postcss` desde un archivo **fuera del árbol escaneado**, para que Tailwind
no generase las clases a partir de mi propio comprobador. Metí **44** utilidades: las **42 reales** del
lote **más 2 inventadas a propósito** (`text-fg-inexistente`, `border-nosuchtoken`) como control
positivo.

```
TOTAL: 44 MISSING: 2
MISSING LIST: ["text-fg-inexistente","border-nosuchtoken"]
```

**El método delata una clase rota** —que es lo que pedía el encargo— **y las 42 reales emiten regla**,
incluidas las raras: `empty:sr-only`, `tracking-label`, `border-success`, `text-success`,
`rounded-s-md`, `rounded-e-md`, `aria-pressed:bg-accent`, `border-l-(length:--border-width)`,
`transition-[background-color,color]`. La afirmación del informe **es reproducible**.

⚠️ **Pero ojo con el alcance, que el informe no acota:** ese "todas existen" lo garantiza **un gate
permanente sólo para el segmentado** (`segmented-control.tokens.test.ts` deriva los nombres de las
variantes y exige regla para cada uno). Las clases de `ProjectsView.tsx`, `ProjectCard.tsx` y
`ProjectsToolbar.tsx` **no tienen gate de CSS compilado**: hoy están bien porque lo medí yo a mano, y
mañana una clase inventada ahí se quedaría inerte con la suite en verde. **Candidato a deuda**, no a
cambio requerido en este lote.

---

## Contrato E2, decisión por decisión

| | Qué pedía | Estado |
|---|---|---|
| **E2(a)** | `section` + `h2` visible, un solo `h1` | ✅ `ProjectsView.tsx:328-337`; el test ancla las dos direcciones (título visible **y** el `h1` sigue siendo uno) |
| **E2(b)** | Todo en **una** `Card` `raised`; `summary` a `text-fg` | ✅ `ProjectsToolbar.tsx:120`; `Card` por defecto es `raised` (verificado en `card.variants.ts`); el test compara por **identidad de nodo** y deriva el localizador de `cardVariants()`, no de un `div` cualquiera |
| **E2(c)** | Primitivo real, en `shared/ui/primitives/`, pagando el ancla; etiquetas visibles; `aria-pressed`, nunca `radiogroup`/`tablist` | ✅ los cuatro puntos. Exclusividad **estructural** (`value` escalar): más fuerte de lo que pedía la enmienda |
| **E2(d)** | Aviso visible conservando rol y `aria-label`; marca de sesión; sin toasts; sin mentir sobre la recarga | ✅ y **la interfaz no miente**: `QUICK_START_NOTES` = "Lo arrancaste recién" / "Ya venía en marcha", **las dos en pasado**, sobre lo que acaba de pasar. Nada promete un estado persistente. E1(e) intacta: marcar no ofrece parar |
| **E2(e)** | Tres vacíos; el default **no** cuenta como filtrado; salida del callejón | ✅ `filtersApplied` (`ProjectsView.tsx:294-298`) excluye `DEFAULT_STATUS_FILTER` a propósito y **tiene su propio test**; `clearFilters()` limpia también el texto de buscar |
| **E2(f)** | Fuera `SEARCH_HINT`; `EMPTY_DESCRIPTION` reescrito | ✅ `SEARCH_HINT` no existe en `src/`; hay tests en negativo contra `/sin volver a pedirlos/i` y `/en dos pasos/i` |
| **E2(g)** | Placeholder con propósito, **misma proporción**, sin romper la deuda 132 | ✅ y la invariante queda **triplemente** anclada: sin `onQuickStart` → 0 controles, con ella → 1, y **con la marca puesta → sigue en 0** (`ProjectCard.test.tsx:210-222, 276-282`) |
| **E2(h)** | Fuera de alcance | ✅ respetado: la tarjeta sigue sin ser tocable (0 `link`, gateado), no hay sistema de toasts, el backend no se toca |

**Sobre la deuda 132:** el lado consumidor sigue sin gate (`DashboardView.test.tsx` pasaría con botones
en todas las tarjetas). Este lote **no lo empeora** y encima añadió el tercer caso. Sigue siendo un punto
único de fallo — deuda del leader, no de este lote.

**Sobre `axe` y el contraste:** verifiqué que **ninguna decisión de color se apoya en `axe`**. Los dos
casos de contraste tienen test propio y explícito (`ProjectCard.test.tsx:157-168` prohíbe el primer
plano apagado dentro del marco hundido; `ProjectsToolbar.test.tsx:144-152` prohíbe el inverso en el
`summary`). Correcto: `color-contrast` sale `incomplete` y `vitest-axe` sólo mira `violations`.

**Sobre los tests preexistentes (deuda 29):** `git diff --numstat` da **219 insertions, 0 deletions** en
`ProjectsView.test.tsx` y **129 insertions, 1 deletion** en `ProjectCard.test.tsx` — y esa única
supresión es la línea de `import`, sustituida por otra que añade `within`. **Ni un test recortado, ni un
`settle()` tocado, ni un `toBe` sobre el `textContent` de la región relajado.** Los 25 tests que cuelgan
de `settle()` y los 3 que comparan texto exacto siguen intactos y verdes.

---

## Cambios requeridos

1. **BLOQUEANTE — Borrar el recibo de la deuda 142 que sobrevivió en
   `src/features/projects/ui/project-filters.ts:18-30`.**

   El lote quitó la justificación de `ProjectsToolbar.tsx:51-54` (la que cita `conventions.md`) pero
   **dejó su gemela en pie**, y está en el JSDoc de `STATUS_FILTERS`, o sea **la constante que hoy
   alimenta al primitivo nuevo** (`ProjectsToolbar.tsx:37-40` → `STATUS_OPTIONS` → `SegmentedControl`).
   Dice hoy, en producción:

   > …la exclusividad la impone este consumidor. **Se descartó crear un primitivo de segmentado:
   > tocaría `public-api.test.ts`, que está anclado al literal**, y es una slice de design system, no
   > de #20.

   **Es falso en sus tres afirmaciones:**
   - La exclusividad **ya no la impone el consumidor**: es estructural en `SegmentedControl` (`value`
     escalar).
   - El primitivo **no se descartó**: existe, en `src/shared/ui/primitives/segmented-control/`.
   - El ancla **no se esquivó**: se pagó en `public-api.test.ts:33-36`.

   **Por qué bloquea y no es cosmético:** es exactamente el argumento que `conventions.md` §"El template
   es un SUELO, no un techo" declara **prohibido** (*el coste de tocar el arnés no decide una cuestión de
   experiencia de usuario*), y es **el texto concreto que la regla cita como el caso que la originó**.
   El RFC-03 avisa en rojo: *No revertir E2(c) restaurando esto* — y el próximo agente que abra
   `project-filters.ts` va a encontrar ahí, como razón vigente y sin enmendar, justo la instrucción de no
   crear el primitivo. `progress/history.md` ya registra que la raíz reincidente de este repo es *nadie
   vuelve a la fuente a comprobarlo*: dejar la fuente mintiendo es sembrar la próxima.

   **Qué hacer:** reescribir ese JSDoc para que diga lo que hoy es cierto (dos opciones, exclusividad
   **estructural** en el primitivo, enmienda E2(c)), conservando el dato de dominio que sí sigue vigente
   y que no está escrito en ningún otro sitio: *Inactivo* no es *todo menos en curso*, porque el backend
   niega el par activo, o sea `finished` + `abandoned`. **No hace falta tocar ningún test**: es un
   comentario.

---

## Recomendaciones NO bloqueantes (fichas para el leader)

1. **`password.test.ts` frágil por tiempo.** Confirmada por mí: 1217 ms aislado, sin `testTimeout` en
   `vitest.config.ts` (default 5000 ms), rebasa bajo carga. Familia de la deuda 103. El arreglo es un
   `testTimeout` propio para ese archivo, no bajar el coste del hasheo.
2. **Sin gate de CSS compilado fuera del segmentado.** `ProjectsView.tsx`, `ProjectCard.tsx` y
   `ProjectsToolbar.tsx` no tienen quien verifique que sus utilidades emiten regla. Hoy están bien (lo
   medí); mañana no hay quien avise.
3. **`current.md` desactualizado**: el bloque de corrección del 2026-08-14 afirma que la entrega no
   existe. Refrescarlo al cerrar.
4. **`DashboardView.tsx:49`** conserva *los botones de arriba lo crean en dos pasos* — el mismo andamiaje
   en la cara del usuario que E2(f) borró de `/proyectos`. Fuera del alcance de E2 (que sólo cubría la
   lista), pero es el hermano vivo de la deuda 139.
5. **La deuda 132 sigue sin gate del lado consumidor.** Este lote no la empeora, pero
   `ProjectCard.test.tsx` sigue siendo el único punto del repo que la sostiene.

---

## Lo que este review NO puede cerrar

**No tengo navegador, igual que el implementer. No apruebo ni rechazo nada por lo que creo que se ve.**
El eje visible queda **sin verificar** por este review, y ningún gate de este repo lo mide (deuda 141).
Va entero a la verificación en pantalla del leader (REGLA 4), por orden de sospecha:

1. **La fila del toolbar en angosto y en móvil.** Es la sospechosa que E2(h) declaró **obligatoria** para
   el leader y **sigue sin medirse**: `flex-wrap` con tres bloques y el buscador a `flex-1` + `min-w-0`.
2. **El segmentado y las fichas de tipo juntos, con un tipo YA marcado.** Es el objetivo entero del lote
   y es donde mi medición encontró el matiz: en ese estado **los dos grupos llevan relleno de acento y el
   mismo tamaño**, así que la única señal que queda es la geometría (carril continuo contra fichas con
   hueco) más las etiquetas. Si de un vistazo no se distinguen, la deuda 142 **no está cerrada** por
   mucho que los gates estén verdes.
3. **El aviso del quick-start** apareciendo entre el `h2` y la rejilla: comprobar que no empuje la
   rejilla de forma molesta (comprobé que **vacío no ocupa nada**; lo que no puedo ver es el salto al
   aparecer).
4. **El hueco de la foto** con tarjetas con y sin foto en la misma fila (la proporción está anclada y
   atacada, pero una rejilla dentada se ve, no se mide).

---
---

# Ronda 2 — verificación del bloqueante B1

**Veredicto de la ronda 2:** APPROVED
**Veredicto del lote E2:** **APPROVED** (queda pendiente sólo el eje visible, que no cierro yo)

## 1. ¿Se movió sólo lo que se dijo que se movería?

**Sí.** `git diff --numstat src/` contra el estado que yo mismo dejé medido en la ronda 1:

| Archivo | Ronda 1 | Ronda 2 |
|---|---|---|
| `ProjectCard.test.tsx` | 129/1 | **129/1** |
| `ProjectCard.tsx` | 89/7 | **89/7** |
| `ProjectsToolbar.tsx` | 164/111 | **164/111** |
| `ProjectsView.test.tsx` | 219/0 | **219/0** |
| `ProjectsView.tsx` | 228/58 | **228/58** |
| `types.ts` | 10/4 | **10/4** |
| `primitives/index.ts` | 1/0 | **1/0** |
| `public-api.test.ts` | 4/0 | **4/0** |
| `project-filters.ts` | — | **11/7** ← el único que se movió |

`feature_list.json` sigue sin tocar. No hay archivos nuevos ni borrados en `src/`.

## 2. El conteo, sin moverse ni un test

```
Test Files  77 passed | 3 skipped (80)
     Tests  1336 passed | 13 skipped (1349)
  Duration  158.07s
EXIT=0
```

**Idéntico al de la ronda 1**, hasta el skip. Confirma que el cambio fue exclusivamente un comentario:
ni un test nuevo, ni uno perdido, ni uno renombrado. (`init.sh` redirigido a archivo, nunca por tubería.)

## 3. El texto nuevo, contrastado contra el código

`project-filters.ts:18-33`. Las cuatro afirmaciones, verificadas una a una:

| Afirmación del comentario | Verificación | |
|---|---|---|
| El primitivo vive en `shared/ui/primitives/segmented-control/` | la carpeta existe, con sus 5 archivos | ✅ |
| Su ancla en `public-api.test.ts` se pagó a propósito | `public-api.test.ts:33-36` lista `"SegmentedControl"` | ✅ |
| E1(i) queda enmendada por E2(c) y se deja escrita en vez de borrada | así está redactado, y coincide con la nota roja del RFC-03 §7-bis | ✅ |
| "Inactivo" no es "todo menos en curso": el backend niega el par activo (`finished` + `abandoned`) | dato de dominio conservado, no vive en ningún otro sitio del repo | ✅ |

**Las tres falsedades de la ronda 1 desaparecieron**, y ninguna volvió disfrazada. El aviso de no revertir
está puesto. **B1 queda cerrado.**

## 4. La pregunta que pediste que atacara: ¿la exclusividad es DE VERDAD estructural?

**Respuesta corta: en el estado, sí. En lo que se pinta, no del todo — y el comentario nuevo promete el
absoluto.** No lo leí: lo probé, con un archivo de sondeo que **corrí y borré** (`git status` de `src/`
verificado limpio después).

| Sondeo | Resultado medido |
|---|---|
| **A)** `value` que no corresponde a ninguna opción (`value="no-existe"`) | **0 opciones con `aria-pressed="true"`** |
| **B)** dos entradas de `options` con el mismo `value` | **2 opciones con `aria-pressed="true"`** |
| **C)** `pnpm typecheck` con los dos casos anteriores presentes | **EXIT 0** — TypeScript no rechaza ninguno |

O sea que **"ninguna elegida" y "dos elegidas" sí se pueden representar**, por dos caminos que el
compilador acepta. La causa es que `value: string` y `options[].value: string` son cadenas sueltas: el
tipo no ata el valor al juego de opciones (`SegmentedControl.tsx:18-28`), y el marcado se calcula con
`option.value === value` (`:77`).

**Qué es cierto y qué está sobrevendido:**

- ✅ **Cierto, y es la mejora de fondo:** el **estado** del consumidor no puede sostener dos elegidas.
  `value` es un escalar; con `ToggleGroup` era una lista y la regla la ponía el consumidor a mano. La
  frase "su prop `value` es un escalar" es exacta, y ese cambio es real.
- ⚠️ **Sobrevendido:** "no se pueden **ni representar**" es un absoluto que el tipo no sostiene.
- ✅ **El consumidor real está a salvo**, comprobado: `ProjectsToolbar.tsx:37-40` deriva `STATUS_OPTIONS`
  de `STATUS_FILTERS` (dos valores distintos, sin duplicados), `value={status}` está tipado
  `StatusFilter`, y `handleStatus` (`:111-116`) valida con un `.find()` en vez de un cast — el propio
  implementer dejó escrito por qué. **No hay ningún camino real, hoy, que llegue a cero o a dos.**
- ⚠️ **El gate no cubre el hueco:** `SegmentedControl.test.tsx:53-63` ("marca exactamente una opción,
  nunca ninguna ni dos") sólo ejercita un `value` que **sí** está en el juego. Los dos casos del sondeo
  pasarían sin que nadie se entere.

**NO lo bloqueo, y digo por qué**, para que la decisión quede auditable: esto no es el patrón de la
deuda 142. Aquel comentario empujaba a **la decisión equivocada** (no crear la pieza) usando un coste del
arnés como argumento de diseño; éste **describe de más una decisión correcta**. Nadie que lo lea va a
construir peor por su culpa. La sustancia —exclusividad en el estado, no en la buena voluntad del
consumidor— es verdad, y es exactamente lo que E2(c) pedía.

**Ficha recomendada (deuda nueva, no cambio requerido).** Dos salidas, y la primera es la buena:

1. **Hacer el comentario literalmente cierto:** volver el primitivo genérico sobre sus opciones, de modo
   que `value` sólo admita uno de los `options[number]["value"]`. Entonces el caso A deja de compilar y
   el absoluto pasa a estar respaldado por el compilador. Es la forma de que la promesa la sostenga el
   tipo y no la disciplina.
2. Si no se hace ahora: **suavizar la frase** para que hable del estado ("el estado no puede sostener dos
   elegidas") en vez de decir que no se pueden ni representar, y añadir al gate los dos casos del sondeo.

## 5. El barrido: coincido con tu lectura, y no aparece una cuarta

Barrí `src/` por mi cuenta y con más patrones que los tuyos —`tocaría`, `anclado al literal`,
`public-api`, `esquiv`, `más barato`, `se descartó crear`, `haría falta otro gate`, `slice de design
system`, `para no romper`, `obligaría a tocar`—. **Salen exactamente tus tres, y ninguna más.**

- **`SegmentedControl.tsx:40`** — ✅ **de acuerdo.** Es la afirmación contraria y correcta: el ancla *se
  toca a propósito*. Es el recibo de que la regla se cumplió, no de que se esquivó.
- **`projects-client.ts:10-17`** — ✅ **de acuerdo, y contrastado, no aceptado.** El patrón de la 142
  necesita tres ingredientes: (1) lo que se decide es algo que **el usuario percibe**, (2) el argumento
  decisorio es **el coste de tocar el arnés**, y (3) el resultado es una **pantalla peor**. Aquí falla el
  (1) y el (3): lo que se decide es **organización interna de código** —tres copias de una costura HTTP
  contra un módulo compartido—, y el comportamiento de red es idéntico en las dos opciones, así que **no
  hay nada que el usuario pueda ver**. El (2) tampoco encaja del todo: el argumento no es *un gate se
  pondría rojo*, sino *el radio de refactor alcanza dos features ya cerradas y sus tests*, que es
  ingeniería normal. Y encima **hace lo que la propia regla exige de la vía de escape**: queda **fichado
  como deuda 129** y con disparador escrito (*"para no llegar a cinco copias en #21/#22"*).
  `conventions.md` §SUELO dice literalmente que si la pieza no se crea ahora, *se ficha como deuda*.
  **Cumple.** No es la misma trampa disfrazada.
- **`project-filters.ts:29`** — ✅ **de acuerdo**, con el matiz del punto 4.

## 6. Lo que sigue sin cerrarse en esta ronda

**El eje visible, íntegro.** No tengo navegador; la ronda 2 no tocó una sola clase ni un solo nodo, así
que **los cuatro puntos de pantalla del cierre de la ronda 1 siguen exactamente igual de abiertos** y son
tuyos (REGLA 4), con el móvil a la cabeza. Nada de lo verificado hoy los adelanta ni un milímetro.

Y siguen vivas, sin cambios, las cinco recomendaciones no bloqueantes de la ronda 1 (la fragilidad por
tiempo de `password.test.ts`, la falta de gate de CSS compilado fuera del segmentado, `current.md`
desactualizado, el copy de `DashboardView.tsx:49` y la deuda 132 sin gate del lado consumidor), más la
ficha nueva del punto 4.

## 7. Checkpoints tras la ronda 2

- C1: [x] · C2: [x] · **C3: [x]** ← se cierra: el recibo de la deuda 142 ya no está en `src/`
  (barrido completo, no un archivo) · C4: [x] · C5: [x]

Pendiente del leader al cerrar, como ya se dijo: la entrada de esta sesión en `progress/history.md` y
refrescar el bloque caducado de `progress/current.md`.

> El veredicto CHANGES_REQUESTED de la ronda 1 **se deja escrito y no se reescribe**: el bloqueante
> existió y el registro de por qué existió vale más que un documento limpio.
