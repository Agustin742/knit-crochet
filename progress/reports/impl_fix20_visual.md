# impl — Lote de arreglo visual de `/proyectos` (enmienda E2 del RFC-03, deudas 136-144)

> **No es una feature.** `feature_list.json` NO se toca; #20 `projects_list_ui` sigue `done`.
> **`progress/deudas.md` NO se toca**: tachar fichas es del leader al cerrar.
>
> Este informe se escribe **de forma incremental**: se creó antes de tocar código y se actualiza al
> terminar cada una de las cinco tandas. Si la sesión se corta, lo escrito es lo que se salva.

## Estado de las tandas

| # | Tanda | Estado |
|---|---|---|
| 0 | Baseline medido | ✅ hecho (con una salvedad, ver §0) |
| 1 | E2(c) — primitivo `SegmentedControl` | ✅ hecho |
| 2 | E2(b) + E2(a) — toolbar en una `Card`, etiquetas visibles, `<section>` + `<h2>` | ✅ hecho |
| 3 | E2(e) + E2(f) — tres vacíos + quitar filtros; copy | ✅ hecho |
| 4 | E2(d) — aviso visible del quick-start + marca "en marcha" | ✅ hecho |
| 5 | E2(g) — placeholder de foto | ✅ hecho |

---

## 0. Baseline

Medido con `bash ./init.sh > baseline.txt 2>&1` (redirigido a archivo, nunca por tubería: la tubería
corrompe el código de salida en este repo). **Antes de tocar una sola línea.**

```
[OK]    lint verde
[OK]    typecheck verde
 ❯ src/shared/lib/auth/password.test.ts (2 tests | 1 failed) 5818ms
     × verifies the right password and rejects a wrong one 5064ms
 FAIL  src/shared/lib/auth/password.test.ts > shared/lib/auth/password > verifies the right password…
 Error: Test timed out in 5000ms.

 Test Files  1 failed | 73 passed | 3 skipped (77)
      Tests  1 failed | 1280 passed | 13 skipped (1294)
   Duration  137.71s
[FAIL]  hay tests rotos
EXIT=1
```

### ⚠️ NO coincide con el baseline del leader — y lo digo en vez de taparlo

El leader midió **EXIT 0** con `74 passed | 3 skipped (77)` y `1281 passed | 13 skipped (1294)`.
Mi medición da **EXIT 1**, con `73 passed | 1 failed` y `1280 passed | 1 failed`.

**Los totales cuadran exactamente** (77 archivos, 1294 tests, 13 skipped): no falta ni sobra nada.
La única diferencia es **un test que falla por tiempo**, no por lógica:
`src/shared/lib/auth/password.test.ts` agotó los 5000 ms por defecto de vitest **por 64 ms** (5064 ms)
bajo la carga de la pasada completa. Es hasheo de contraseña (coste de CPU deliberado), en un archivo
que **no tiene ninguna relación** con `/proyectos` ni con nada de este lote.

**Comprobado, no supuesto** — el mismo archivo aislado:

```
$ pnpm vitest run src/shared/lib/auth/password.test.ts
 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  4.30s (… tests 2.54s …)
EXIT=0
```

2,54 s de test real contra un tope de 5 s: en aislamiento sobra el doble de margen. Es una **fragilidad
preexistente por timeout**, no una regresión ni algo que yo haya introducido (mido esto **antes** de
escribir código). Decisión tomada y escrita: **sigo con el lote y lo dejo fichado aquí**, en vez de
bloquear todo el encargo por 64 ms de un archivo ajeno. **Candidato a deuda nueva para el leader:** ese
test necesita un `testTimeout` propio, porque hoy el verde/rojo del arnés entero depende de la carga de
la máquina.

---

## 1. Tanda 1 — E2(c): el primitivo `SegmentedControl`

### Archivos

| Archivo | Qué |
|---|---|
| `src/shared/ui/primitives/segmented-control/SegmentedControl.tsx` | **nuevo** — el componente |
| `src/shared/ui/primitives/segmented-control/segmented-control.variants.ts` | **nuevo** — las clases, por `cva` |
| `src/shared/ui/primitives/segmented-control/index.ts` | **nuevo** — barrel de la pieza |
| `src/shared/ui/primitives/segmented-control/SegmentedControl.test.tsx` | **nuevo** — 9 tests de comportamiento + `axe` |
| `src/shared/ui/primitives/segmented-control/segmented-control.tokens.test.ts` | **nuevo** — 11 tests sobre el **CSS compilado** |
| `src/shared/ui/primitives/index.ts` | modificado — reexporta la pieza |
| `src/shared/ui/public-api.test.ts` | modificado — **el ancla se paga**: `"SegmentedControl"` entra en la lista literal |

### Decisiones

- **Vive en `shared/ui/primitives/` y toca `public-api.test.ts` a propósito.** Es un control genérico,
  no algo de proyectos. Esconderlo en `features/projects/ui/` habría esquivado el ancla — y es
  exactamente el antipatrón que la regla *"el template es un SUELO, no un techo"* prohíbe. **Un solo
  nombre nuevo** en la superficie pública (`SegmentedControl`): las variantes **no** se exportan por el
  barrel, así que el gate de tokens las importa del archivo de variantes directamente (misma técnica que
  `skeleton.tokens.test.ts`).
- **La exclusividad es estructural.** `value` es un **escalar**, no una lista: no existe forma de
  representar "ninguna elegida" ni "dos elegidas". Un `ToggleGroup` no podía garantizar eso — la
  exclusividad la ponía el consumidor a mano.
- **Forma:** un solo carril con **borde, radio y sombra propios**; las opciones **pegadas**, separadas
  por una **línea compartida** (borde izquierdo de la de la derecha, o sea N-1 líneas y **cero huecos**);
  la elegida **rellena** de acento. Las fichas de tipo se quedan como están (sueltas, con hueco y sombra
  cada una): la diferencia de comportamiento ahora **se ve sin probar los botones**.
- **La elegida NO se hunde.** El `Toggle` se desplaza y encoge su sombra al presionarse; ese gesto aquí
  rompería la continuidad del carril, así que no está — y hay un test en negativo que lo impide, porque
  copiar las clases del `Toggle` es la regresión natural.
- **El anillo de foco va POR FUERA de la opción** (desplazamiento positivo, sin recorte del carril):
  `--focus` y `--accent` son **el mismo rosa**, así que un anillo por dentro de la opción elegida sería
  rosa sobre rosa. Por fuera cae sobre la `Card` `raised` del toolbar → 3,13:1 (deuda 31).
- **`role="group"` + `aria-pressed`**, nunca `radiogroup` ni `tablist` (RFC-03 §5 y el motivo del JSDoc
  de `ToggleGroup`). Se conserva el nombre accesible del grupo, así que los selectores existentes de
  `ProjectsView.test.tsx` siguen valiendo palabra por palabra.

### Por qué un test sobre el CSS compilado y no sólo de comportamiento

Porque **la decisión de E2(c) es de forma, y la forma no la mide ningún gate de este repo**: `happy-dom`
no maqueta, `axe` no ve píxeles y su regla de contraste sale siempre `incomplete` (medido en
`explore_fix20_red_de_tests.md` §5). Sin este archivo, alguien puede devolver el segmentado a cuatro
fichas sueltas **con la suite entera en verde** — que es literalmente lo que pasó en #20. El gate mide
la salida real del compilador (misma técnica que `skeleton.tokens.test.ts`) y **ningún nombre de clase
se copia a mano**: todos se derivan de las variantes.

### REGLA 3 — condición doble, ejecutada

**(a) Romper el contrato de forma: meter un hueco entre opciones.** Añadí `gap-(--space-2)` al carril.

```
 ❯ segmented-control.tokens.test.ts (11 tests | 1 failed)
     × no hay ni una utilidad de separación en todo el control
AssertionError: gap-(--space-2) mete separación en un control que no la admite: expected true to be false
 Test Files  1 failed (1) | Tests  1 failed | 10 passed (11)      EXIT=1
```

**(b) Romper el ancla del arnés: quitar el nombre de `public-api.test.ts`.**

```
 ❯ src/shared/ui/public-api.test.ts (4 tests | 1 failed)
     × los primitivos exportan exactamente su contrato
AssertionError: expected [ 'Button', 'Card', …(18) ] to deeply equal [ 'Button', 'Card', …(17) ]
+   "SegmentedControl"
 EXIT=1
```

**Restaurado y verificado en verde** (incluidos los dos guardrails globales, que también se mueven
porque hay tres archivos fuente nuevos):

```
$ pnpm vitest run src/shared/ui/primitives/segmented-control src/shared/ui/public-api.test.ts \
    src/shared/ui/no-hardcode.test.ts src/shared/ui/canonical-tailwind-classes.test.ts
 Test Files  5 passed (5)
      Tests  493 passed (493)
EXIT=0
```

### Aritmética de esta tanda

- `SegmentedControl.test.tsx` → **+9**
- `segmented-control.tokens.test.ts` → **+11**
- `no-hardcode.test.ts` → **+6** (2 casos × 3 archivos fuente nuevos: componente, variantes, barrel)
- `public-api.test.ts`, `canonical-tailwind-classes.test.ts` → **+0** (cambian de contenido, no de número)
- **Total tanda 1: +26 tests, +2 archivos de test.**

---

## 2. Tanda 2 — E2(b) + E2(a): una sola superficie, etiquetas visibles, sección con título

### Archivos

| Archivo | Qué |
|---|---|
| `src/features/projects/ui/ProjectsToolbar.tsx` | reescrito — todo dentro de **una** `Card` `raised`, etiquetas visibles, `SegmentedControl` para el estado, `summary` con primer plano normal, fuera `SEARCH_HINT` |
| `src/features/projects/ui/ProjectsView.tsx` | la lista pasa a `<section aria-labelledby>` con `<h2>` **visible**; las tarjetas bajan a `h3` y los paneles de vacío/error también |
| `src/features/projects/ui/ProjectsToolbar.test.tsx` | **nuevo** — 9 tests: el gate visual que no existía |
| `src/features/projects/ui/ProjectsView.test.tsx` | modificado — **+1**: la sección con título visible y el `h1` sigue siendo uno |

### Decisiones

- **Jerarquía, decidida antes de elegir piezas.** Primario: la **rejilla de proyectos** (es el contenido).
  Secundario: el **toolbar**, una sola tarjeta elevada, con las cinco etiquetas en el mismo tamaño y peso
  chico. Dentro del toolbar: el **segmentado** manda (es el único con relleno de acento), las **fichas de
  tipo** van después, **buscar** es utilitario —ancho pero visualmente callado, sin relleno— y
  **"más filtros"** es accesorio (texto pelado con su triángulo nativo, en su propia línea).
- **El buscador ocupa lo que sobra de la fila** (`flex-1` + `min-w-0`) en vez de flotar a la derecha. Eso
  es lo que mata el hueco muerto medido: sin la pista, los tres bloques de la fila miden
  etiqueta + control y comparten línea de base, así que `items-end` ya no descuadra nada.
  **No se inventó ningún ancho en píxeles** para acotarlo: no hay token de ancho en el sistema y meter
  uno crudo habría sido justo lo que el guardrail impide.
- **Etiqueta visible = nombre accesible**, vía `aria-labelledby` sobre el `<span>` visible. Gana sobre
  `aria-label`, así que un lector de pantalla **no oye el nombre dos veces**.
- **La tarjeta se queda `raised`** (deuda 31) y el `<summary>` cambia de `text-fg-inverse` a `text-fg`
  al entrar en ella. Los dos extremos están gateados, ver abajo.
- **La lista baja un nivel de encabezado**: `h1` (página) → `h2` (sección de la lista) → `h3` (cada
  tarjeta, y los paneles de vacío/error). Antes las tarjetas eran `h2` colgando de un `h1` suelto.
  `heading-order` de `axe` sigue verde y el gate de composición sigue contando **un solo `h1`**.
- **`SEARCH_HINT` eliminado** (es E2(f), pero va aquí porque era la causa física del defecto de altura:
  la pista de dos líneas es lo que hacía la tarjeta casi tres veces más alta que los botones).

### REGLA 3 — condición doble, ejecutada

**Romper: `Card` a `flat` + `summary` de vuelta a primer plano inverso.**

```
 ❯ src/features/projects/ui/ProjectsToolbar.test.tsx (9 tests | 4 failed)
     × los cuatro controles viven dentro de la MISMA tarjeta
     × hay exactamente una tarjeta en todo el toolbar
     × esa tarjeta es la variante elevada, no la plana
     × el desplegable no se queda con el primer plano de fuera de la tarjeta
AssertionError: un control quedó fuera de la tarjeta: expected null not to be null
AssertionError: expected [] to have a length of 1 but got +0
EXIT=1
```

*(Detalle que vale la pena: pasar la tarjeta a `flat` no rompe **una** aserción sino **cuatro**, porque el
localizador de tarjeta se deriva de `cardVariants()` — o sea que el gate reconoce "la superficie del
sistema", no "un div cualquiera".)*

**Restaurado y verde:**

```
$ pnpm vitest run src/features/projects/ui
 Test Files  4 passed (4)
      Tests  60 passed (60)
EXIT=0

$ pnpm vitest run "src/features/projects/ui" "src/app/(app)/proyectos" src/features/dashboard/ui
 Test Files  8 passed (8)
      Tests  118 passed (118)
EXIT=0
```

El Dashboard entra en la comprobación **a propósito**: comparte `ProjectCard` y su suite ata los nombres
de los encabezados de nivel 3 de las tarjetas.

### Aritmética de esta tanda

- `ProjectsToolbar.test.tsx` → **+9** (archivo nuevo)
- `ProjectsView.test.tsx` → **+1** (24 → 25)
- `no-hardcode.test.ts` → **+0** (no hay archivos **fuente** nuevos; los `.test.*` están excluidos del barrido)
- **Total tanda 2: +10 tests, +1 archivo de test.**

---

## 3. Tanda 3 — E2(e) + E2(f): tres vacíos distinguidos y copy sin andamiaje

### Archivos

| Archivo | Qué |
|---|---|
| `src/features/projects/ui/ProjectsView.tsx` | tercer estado vacío + `clearFilters()` + `filtersApplied` + `EMPTY_DESCRIPTION` reescrito |
| `src/features/projects/ui/ProjectsView.test.tsx` | modificado — **+5** |

### Decisiones

- **`filtersApplied` excluye el default a propósito.** Es
  `status !== DEFAULT_STATUS_FILTER || types.length > 0 || needle !== null || yarnId !== null`. La
  primera carga manda `?active=true` porque el backend **no tiene default** (E1(i)), y contarlo como
  "filtraste" haría que un cesto de verdad vacío dijera *"ningún proyecto pasa esos filtros"* **y
  escondiera los dos botones de crear**. Es la regresión que el explore de tests daba por *"rojo casi
  seguro"*, y está anclada con su propio test.
- **Tres ramas, en este orden:** filtros sin resultados → cesto vacío → búsqueda sin coincidencias
  (esta última **intacta**, era la única que ya distinguía bien).
- **La salida del callejón es un `<button>`, no un enlace.** Dos motivos: no lleva a ninguna parte (es
  un reset de estado) y `ProjectsView.test.tsx` ancla que la lista **no monta ningún `link`**.
- **`clearFilters()` limpia también el texto de buscar.** El control promete "la vista por defecto";
  dejar puesto un filtro de cliente sería prometer de más.
- **Copy nuevo:** `"Empezá el primero y va a aparecer acá con su foto, su progreso y las horas que le
  dedicaste."` Sigue el precedente medido de la app (voseo, "tu/tus", una frase, punto final) y **no
  nombra rutas, ni pasos, ni features que no existen**. El *"que es donde hoy se crea en dos pasos"*
  —una excusa de andamiaje escrita en la cara del usuario— desaparece.

### REGLA 3 — condición doble, ejecutada

**Romper: hacer que el estado por defecto cuente como "filtrado"** (añadí `isActiveFilter(status) ||` al
frente de `filtersApplied`, que es exactamente la regla ingenua que el explore avisaba).

```
 ❯ src/features/projects/ui/ProjectsView.test.tsx (30 tests | 3 failed)
     × ofrece los dos botones de crear cuando el cesto está vacío
     × el vacío de arranque es el cesto vacío, no un vacío de filtros
     × no le explica el andamiaje del proyecto a quien no tiene ninguno
TestingLibraryElementError: Unable to find an element with the text: Tu cesto está vacío
EXIT=1
```

**Restaurado y verde:**

```
$ pnpm vitest run src/features/projects/ui "src/app/(app)/proyectos"
 Test Files  5 passed (5)
      Tests  70 passed (70)
EXIT=0
```

### Aritmética de esta tanda

- `ProjectsView.test.tsx` → **+5** (25 → 30)
- **Total tanda 3: +5 tests, 0 archivos de test nuevos.**

---

## 4. Tanda 4 — E2(d): el feedback del quick-start se ve

### Archivos

| Archivo | Qué |
|---|---|
| `src/features/projects/ui/ProjectsView.tsx` | la región viva del cronómetro deja de ser sólo para lector de pantalla; `QUICK_START_NOTES`; estado de marcas por proyecto |
| `src/features/projects/ui/ProjectCard.tsx` | prop nueva `quickStartNote` + la marca, con el color de acierto del sistema |
| `src/features/projects/ui/ProjectsView.test.tsx` | modificado — **+6** |
| `src/features/projects/ui/ProjectCard.test.tsx` | modificado — **+4** |

### Decisiones

- **Se le quita el "sólo lector de pantalla", NO el rol.** El nodo conserva
  `role="status"` y su `aria-label` `"Cronómetro"` (deuda 114). Eso no es cosmético: **25 tests cuelgan
  del helper `settle()`** y **3 comparan el `textContent` exacto** de esa región. Por lo mismo, **dentro
  del nodo va el mensaje y nada más**: ni icono, ni prefijo, ni botón de cerrar. Todo el adorno es la
  caja del propio nodo.
- **Vacía se repliega**, con la variante `:empty`, a la presentación de sólo-lector. Alternativa
  descartada: un recuadro vacío permanente reservando sitio, o desmontar la región — que es justo el
  agujero que señaló el explore (*"si C la convierte en un render condicional, la suite sigue verde y la
  región deja de anunciar"*). Hay un test nuevo que exige que **esté montada antes de tocar nada**.
- **Se monta sobre la superficie elevada.** Es lo que hace legible el tono: acierto 4,83:1 y peligro
  4,86:1 **sobre esa superficie**; sobre el espresso de la app ninguno de los dos llega.
- **Primer uso de `--success` en toda la app.** El token estaba declarado y sin un solo consumidor
  (deuda 144): la aplicación sabía decir "esto falló" y no sabía decir "esto salió bien".
  **No se construye sistema de avisos flotantes** — fuera de alcance, la deuda 144 sigue viva.
- **La marca de la tarjeta es honesta sobre su alcance, y por eso son DOS textos:**
  `"Lo arrancaste recién"` (201: la creaste vos) y `"Ya venía en marcha"` (200: el servidor reutilizó una
  sesión abierta). **Las dos hablan de lo que acaba de pasar, no de un estado**, porque
  **no hay forma de saber desde la lista si el cronómetro corre** —ni columna, ni filtro, ni endpoint— y
  la marca **se pierde al recargar**. Un `"En marcha"` a secas prometería un estado persistente que la
  app no puede sostener, y tras un F5 estaría mintiendo. **E1(e) intacta: marcar no es ofrecer parar.**
- **La marca no rompe la invariante de la deuda 132.** Es un `<span>`: sin `onQuickStart` la tarjeta
  sigue montando **cero** controles, y con la prop **exactamente uno**. Va **fuera del encabezado**,
  porque el Dashboard compara los nombres de sus encabezados de nivel 3 contra una lista exacta.
- **Un fallo no deja marca.** El error se dice en el aviso, con el tono de peligro, y la tarjeta se queda
  como estaba.
- **El aviso se movió de sitio** (después de esta tanda, antes del cierre): estaba entre el `h1` y el
  toolbar, o sea arriba del todo, lejos de los botones que lo disparan. Ahora vive **dentro de la sección
  de la lista, justo debajo de su `h2`**. Ninguna aserción depende de su posición —se localiza por rol y
  nombre—, pero el usuario sí: un aviso al principio de la página sobre una tarjeta que está a mitad de
  la rejilla es feedback que se pierde.

### REGLA 3 — condición doble, ejecutada

**Romper: volver la región a "sólo lector de pantalla" y dejar de pasarle la marca a la tarjeta.**

```
 ❯ src/features/projects/ui/ProjectsView.test.tsx (36 tests | 3 failed)
     × el aviso del quick-start se ve, no sólo se anuncia
     × marca la tarjeta que arrancó, y sólo esa
     × dice con otras palabras que el cronómetro ya venía en marcha
AssertionError: expected [ 'sr-only', 'self-start', …(11) ] to not include 'sr-only'
TestingLibraryElementError: Unable to find an element with the text: Lo arrancaste recién
EXIT=1
```

**Restaurado y verde** (con el Dashboard dentro, que monta la misma tarjeta):

```
$ pnpm vitest run src/features/projects/ui src/features/dashboard/ui "src/app/(app)"
 Test Files  10 passed (10)
      Tests  141 passed (141)
EXIT=0
```

### Aritmética de esta tanda

- `ProjectsView.test.tsx` → **+6** (30 → 36)
- `ProjectCard.test.tsx` → **+4** (13 → 17)
- **Total tanda 4: +10 tests, 0 archivos de test nuevos.**

---

## 5. Tanda 5 — E2(g): el hueco de la foto deja de ser un vacío

### Archivos

| Archivo | Qué |
|---|---|
| `src/features/projects/ui/ProjectCard.tsx` | el hueco pinta la inicial en tamaño de titular + la clase de tejido |
| `src/features/projects/ui/types.ts` | `ProjectCardData` gana `type` |
| `src/features/projects/ui/ProjectCard.test.tsx` | modificado — **+4** |

### Decisiones

- **La proporción NO cambia**, y ahora está anclada: el marco es **el mismo objeto de clases** con foto
  y sin ella, y hay un test que exige que el hueco tenga **una sola** utilidad de proporción. Sin esa
  segunda mitad, añadir una proporción distinta encima habría pasado en verde — lo descubrí rompiéndolo
  a propósito, y por eso el test es más fuerte de lo que era hace diez minutos.
- **Jerarquía por tipografía, no por contraste.** La inicial va en la familia de titular y un tamaño de
  titular; la clase de tejido en monoespaciada, tamaño chico, mayúsculas y con el interletraje de
  etiqueta. **Los dos usan el primer plano normal.**
  **Motivo medido, no gusto:** sobre la superficie hundida del marco, el primer plano apagado da
  **4,09:1**, que vale para texto grande y **no** para texto chico — y la clase de tejido es texto chico.
  Bajar el contraste para "hacer jerarquía" habría roto el criterio. Está anclado en un test.
- **`ProjectCardData` gana `type`.** Es un dato **del proyecto**, así que el `Pick` puede crecer sin
  contradecir la deuda 109 (que prohíbe meter ahí cosas que **no** son del proyecto, como "hay una
  petición en vuelo"). Todos los consumidores le pasan un `SerializedProject` entero, así que no hubo
  que adaptar nada.
- **Los dos textos siguen siendo decorativos** (`aria-hidden`). Es deliberado y discutible, así que lo
  escribo: con foto no se anuncia nada, y sin foto tampoco, de modo que **lo que oye un lector de
  pantalla no depende de quién subió imagen**. La alternativa —exponer la clase de tejido sólo en las
  tarjetas sin foto— daba información inconsistente entre tarjetas de la misma rejilla.
- **Mejora las dos páginas a la vez** (la lista y el Dashboard, cuyas fixtures tienen todas `image:
  null`) y **no toca la invariante de E1(f)/deuda 132**: el hueco no es pulsable, no es un `<img>`, no
  es un `role="img"` sin nombre y no monta ningún control.

### REGLA 3 — condición doble, ejecutada

**Romper: cambiar la proporción del hueco y pintar la clase de tejido con el primer plano apagado.**

```
 ❯ src/features/projects/ui/ProjectCard.test.tsx (21 tests | 2 failed)
     × keeps the very same frame shape with and without a photo
     × does not lean on the muted foreground inside the sunken slot
AssertionError: expected [ 'aspect-video', 'aspect-square' ] to deeply equal [ 'aspect-video' ]
AssertionError: Dos agujas: expected [ 'font-mono', 'text-xs', …(3) ] to not include 'text-fg-muted'
EXIT=1
```

**Restaurado y verde**, con el design system entero dentro:

```
$ pnpm vitest run src/features/projects/ui src/features/dashboard/ui "src/app/(app)" src/shared/ui
 Test Files  31 passed (31)
      Tests  857 passed (857)
EXIT=0
```

### Aritmética de esta tanda

- `ProjectCard.test.tsx` → **+4** (17 → 21)
- **Total tanda 5: +4 tests, 0 archivos de test nuevos.**

---

## 6. Cierre — verificación final

### `bash ./init.sh` (redirigido a archivo, nunca por tubería)

```
[OK]    lint verde
[OK]    typecheck verde

 Test Files  77 passed | 3 skipped (80)
      Tests  1336 passed | 13 skipped (1349)
   Duration  96.75s

[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**Nota honesta sobre una pasada intermedia.** Una ejecución anterior de `init.sh` salió en rojo con
7 fallos, y **no fue el código: fue mío**. La lancé en segundo plano y **edité `ProjectsView.tsx`
mientras corría** (moví la región viva del cronómetro), así que `vitest` importó el archivo a medio
escribir. Lo escribo en vez de borrarlo porque el rojo existió y quien mire los ficheros del scratchpad
lo va a ver. La pasada de arriba es sobre el árbol quieto, y los mismos 7 tests salen verdes.

### `pnpm build`

```
✓ Compiled successfully
… ƒ /proyectos …
EXIT=0
```

### Aritmética de tests, cerrada al número

Baseline: `1294` tests en `77` archivos → final: `1349` tests en `80` archivos. **+55 tests, +3 archivos.**

| Archivo | Antes | Después | Δ |
|---|---|---|---|
| `segmented-control/SegmentedControl.test.tsx` | — | 9 | **+9** |
| `segmented-control/segmented-control.tokens.test.ts` | — | 11 | **+11** |
| `projects/ui/ProjectsToolbar.test.tsx` | — | 9 | **+9** |
| `projects/ui/ProjectsView.test.tsx` | 24 | 36 | **+12** |
| `projects/ui/ProjectCard.test.tsx` | 13 | 21 | **+8** |
| `shared/ui/no-hardcode.test.ts` | n | n+6 | **+6** |
| `shared/ui/public-api.test.ts` | 4 | 4 | 0 |
| `shared/ui/canonical-tailwind-classes.test.ts` | 1 | 1 | 0 |
| | | **suma** | **+55** ✅ |

Los **+6** de `no-hardcode` son sus **2 casos por archivo fuente nuevo** × los **3** archivos fuente
nuevos (`SegmentedControl.tsx`, `segmented-control.variants.ts`, `segmented-control/index.ts`). Los
`.test.*` están excluidos de ese barrido, por eso los 3 archivos de test nuevos no suman ahí.
**Sin residuo.**

### Comprobación extra: que las clases nuevas EXISTEN en el CSS

Los guardrails del repo comprueban que no haya valores crudos y que la forma de token sea la canónica,
pero **ninguno comprueba que la utilidad exista**. Compilé `globals.css` y verifiqué que el compilador
emite una regla para **cada una de las 30 utilidades** que estrena este lote (`empty:sr-only`,
`tracking-label`, `rounded-s-md`, `border-success`, `text-success`, `self-start`, `min-w-0`, `flex-1`…):
**ALL PRESENT**. Sin esto, una clase inventada se quedaría inerte en el atributo y todo saldría verde.
El script era descartable y vivió en el scratchpad; **no quedó nada en el repo** (`git status` limpio de
temporales).

---

## 7. Lo que NO puedo dar por bueno — límites de esta sesión

**No tengo herramientas de navegador en esta sesión.** No pude abrir `/proyectos`, no pude medir un solo
`getBoundingClientRect` y **no puedo afirmar que la pantalla se vea bien**. Los tests verdes no son
evidencia de eso: este repo ya cerró dos pantallas visiblemente rotas con la suite entera en verde
(deudas 118 y 141), y este lote existe justamente por la tercera.

Lo más cerca que llegué es lo de arriba: **verificar que cada utilidad compila a una regla real**, que es
un eje distinto —y más débil— que mirar la pantalla.

**Queda para la verificación en navegador del leader (REGLA 4), por orden de sospecha:**

1. **La fila del toolbar en angosto.** Es la primera sospechosa que ya señalaba E2(h) y **sigue sin
   medirse**. Ahora la fila es `flex-wrap` con tres bloques y el buscador con `flex-1`: al envolver, el
   buscador se va a una línea propia a todo el ancho. Creo que está bien, **pero no lo vi**.
2. **El segmentado y las fichas juntos.** Que la diferencia se vea de un vistazo es el objetivo entero
   del lote; el gate mide la forma en el CSS, no la percepción.
3. **El aviso del quick-start**, que ahora aparece entre el título de la lista y la rejilla. Conviene
   comprobar que no empuje la rejilla de forma molesta al aparecer.
4. **El hueco de la foto** con tarjetas mezcladas (con foto y sin foto) en la misma fila, que es donde se
   vería una rejilla dentada si me hubiera equivocado con la proporción.

---

## 8. Deuda: lo que este lote NO cierra, y una ficha nueva

**Sigue vivo, escrito en la propia enmienda (E2(h)):** la tarjeta **no es tocable** (el detalle es #21);
**no se construye sistema de avisos flotantes** (deuda **144** sigue abierta — este lote sólo estrena el
color de acierto, no el sistema); **no se toca el backend** ni se añaden filtros.

**Candidato a ficha nueva (decide el leader, yo no toco `deudas.md`):**

> **`src/shared/lib/auth/password.test.ts` es frágil por tiempo.** Tarda 2,54 s aislado contra un tope
> por defecto de 5 s, y bajo la carga de la pasada completa lo rebasa (medido: 5064 ms, EXIT 1 en mi
> baseline). Es hasheo de contraseña, o sea coste de CPU **deliberado**, así que el arreglo es un
> `testTimeout` propio para ese archivo, no bajar el coste. Mientras tanto, **el verde o rojo de
> `init.sh` depende de lo cargada que esté la máquina**, que es la peor propiedad que puede tener una
> puerta de calidad: enseña a desconfiar del rojo.

**Y una observación sobre mis propios gates, por honestidad:** el test *"keeps the very same frame
shape"* nació **más débil de lo que parecía** — comprobaba que la clase de proporción **estuviera**, y
una segunda proporción añadida encima habría ganado en el CSS con el test en verde. Lo descubrí porque
REGLA 3 me obligó a romperlo de verdad, y lo endurecí a "**una sola** utilidad de proporción". Es el
argumento entero de la condición doble: un test que nunca se vio fallar no prueba nada.

---

## Ronda 2 (2026-08-15) — el recibo de la deuda 142 que quedó vivo en `project-filters.ts`

**Un solo bloqueante y es un comentario.** Archivo único tocado:
`src/features/projects/ui/project-filters.ts`, el JSDoc de `STATUS_FILTERS`. **Cero cambios de
comportamiento, cero tests tocados.**

### Por qué era bloqueante

El lote E2 borró el recibo de la deuda 142 de `ProjectsToolbar.tsx` pero lo dejó **verbatim** aquí. Sus
tres afirmaciones son falsas hoy, y las tres se comprobaron contra la fuente antes de reescribir nada:

| Lo que decía el comentario | Lo medido en el árbol |
|---|---|
| *"la exclusividad la impone este consumidor"* | Es **estructural**: `SegmentedControlProps.value` es un **escalar** (`SegmentedControl.tsx:25`), no una lista. "Ninguna" y "dos" no se pueden ni representar. |
| *"se descartó crear un primitivo de segmentado"* | **Existe**: `src/shared/ui/primitives/segmented-control/` (componente + variantes + test de comportamiento + test de tokens). |
| *"tocaría `public-api.test.ts`, que está anclado al literal"* | **El ancla se pagó**: `public-api.test.ts:33-36` lista `"SegmentedControl"` con el motivo escrito al lado. |

Es exactamente el argumento que `docs/harness/conventions.md` §*"El template es un SUELO, no un techo"*
declara prohibido —el coste del arnés decidiendo una cuestión de experiencia de usuario— y es **el texto
concreto que esa regla cita como el caso que la originó**. Dejarlo vivo es dejar, en el primer archivo
que abre quien toque los filtros, **la instrucción de no crear el primitivo redactada como razón
vigente**: la próxima reincidencia con recibo propio.

### Antes (líneas 18-30)

```ts
/**
 * El segmentado activo/inactivo (RFC-03 §1, enmienda **E1(i)**).
 *
 * Son **dos** opciones y **siempre hay exactamente una** elegida: el `Toggle` es
 * un control superponible y `ToggleGroup` es un `role="group"` que **no impone
 * exclusividad** —lo dice su propio JSDoc—, así que la exclusividad la impone
 * este consumidor. Se descartó crear un primitivo de segmentado: tocaría
 * `public-api.test.ts`, que está anclado al literal, y es una slice de design
 * system, no de #20.
 *
 * "Inactivo" **no** es "todo menos en curso": el backend niega el par activo, o
 * sea `finished` + `abandoned`.
 */
```

### Después

```ts
/**
 * El segmentado activo/inactivo (RFC-03 §1, enmienda **E2(c)**).
 *
 * Son **dos** opciones y **siempre hay exactamente una** elegida. Esa
 * exclusividad es **estructural del primitivo `SegmentedControl`**, no una
 * convención que imponga este consumidor: su prop `value` es un escalar, así
 * que "ninguna elegida" y "dos elegidas" no se pueden ni representar.
 *
 * **E1(i)** —dos `Toggle` con la exclusividad impuesta desde el consumidor—
 * quedó **enmendada por E2(c)**, y se deja escrita en vez de borrada: el
 * primitivo vive en `shared/ui/primitives/segmented-control/` y su ancla en
 * `public-api.test.ts` **se pagó a propósito**. No revertir E2(c) "restaurando"
 * el par de `Toggle`.
 *
 * "Inactivo" **no** es "todo menos en curso": el backend niega el par activo, o
 * sea `finished` + `abandoned`.
 */
```

### Las tres cosas que el texto nuevo tenía que conservar, y dónde quedaron

1. **Dos opciones, siempre exactamente una elegida** → párrafo primero, ahora con **el motivo mecánico**
   (`value` escalar) en vez de con una convención.
2. **La exclusividad es del primitivo, citando E2(c)** → encabezado (`enmienda **E2(c)**`) y párrafo
   primero. La referencia a `RFC-03 §1` se conserva: la decisión de producto sigue siendo suya.
3. **El dato de dominio que no está escrito en ningún otro sitio** → *"Inactivo" no es "todo menos en
   curso": el backend niega el par activo, `finished` + `abandoned`*. **Copiado tal cual, sin retocar
   ni una palabra.** Es la única frase del bloque viejo que seguía siendo verdad, y si desaparecía de
   aquí no quedaba en ninguna parte.

**E1(i) no se borró: se dejó marcada como enmendada por E2(c)**, que es como está escrita en
`RFC-03` §7-bis (*"🔴 ENMENDADA POR E2(c)… No revertir E2(c) 'restaurando' esto"*). En este repo las
correcciones se escriben, no se borran, y además el aviso de no-revertir sólo sirve si el lector sabe
qué es lo que no debe restaurar.

### Comprobaciones previas al cambio

- **Ningún test lee ese comentario.** Barrido de `src/` por las cuatro frases del recibo
  (`descartó crear un primitivo`, `anclado al literal`, `slice de design`, `no es de #20`): el único
  golpe fuera del propio archivo es `SegmentedControl.tsx:40`, que dice **lo contrario** (*"se toca a
  propósito"*) y no se tocó.
- **`no-hardcode.test.ts` prohíbe medidas en píxeles incluso en comentarios**: el texto nuevo **no
  contiene ninguna magnitud**, ni en cifra ni en unidad.

### Verificación — `bash ./init.sh` redirigido a archivo, nunca por tubería

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  77 passed | 3 skipped (80)
      Tests  1336 passed | 13 skipped (1349)
   Start at  15:32:47
   Duration  121.86s (transform 8.79s, setup 83.83s, import 108.28s, tests 75.92s, environment 40.03s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**EXIT 0.** `Test Files 77 passed | 3 skipped (80)` · `Tests 1336 passed | 13 skipped (1349)`:
**idéntico al dígito** con la ronda 1, que era la condición pedida. **El conteo no se movió ni un test**,
que es lo que confirma que el cambio es sólo el comentario.

**El flaky por tiempo de `src/shared/lib/auth/password.test.ts` NO apareció en esta pasada** (duración
total 121,86 s, contra los ~440 s de las corridas cargadas). No es prueba de que esté arreglado —sigue
sin `testTimeout` propio— sino de que la máquina estaba descargada. La ficha propuesta sigue en pie.

### Lo que NO se tocó, por si el reviewer lo quiere descartar rápido

`ProjectsToolbar.tsx`, `ProjectsView.tsx`, `ProjectCard.tsx`, ningún test, `feature_list.json` y
`progress/deudas.md`. `git status -- src/` sigue listando exactamente los mismos archivos que al cerrar
la ronda 1; el único con contenido nuevo en esta ronda es `project-filters.ts`.

**Lo que esta ronda no puede cerrar y no pretende:** el eje visible. No toqué una línea de render, así
que la pantalla es la misma que la ronda 1 — pero **sigo sin herramientas de navegador**, y la
verificación visual (incluido móvil) continúa siendo del leader, como estaba anotado.
