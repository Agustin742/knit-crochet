# impl — E13 de RFC-01 (+ E3 de RFC-02): el ancho del contenido (deuda 154)

> **Informe INCREMENTAL** (regla anti-congelación). Se escribe antes de tocar
> código y se actualiza al cerrar cada decisión, no al final.
>
> **RONDA 3 — leer la [§16](#16-ronda-3--b2-los-gates-vigilaban-el-nombre-del-token-y-nada-de-su-valor).**
> Estado y verificación vigentes: **§16.5** (`bash ./init.sh` EXIT 0 · `81 / 1404`).
> **⏱️ La ventana de mutaciones está CERRADA**: `globals.css` volvió a su md5
> `eed29f5373e3748adb94497902633b0a` y el árbol está quieto — se puede medir la pantalla.
>
> Historia de las rondas, que **se conserva entera** porque el valor está en cómo se fue rompiendo:
>
> | ronda | veredicto | qué falló |
> |---|---|---|
> | **1** (§§0-14) | CHANGES_REQUESTED | **B1**: el gate verificaba que la clase existiera, y el nombre del token lo comparaba **por subcadena** → verde con el tope apuntando a un token inexistente. Los **dos** cinturones tenían el mismo agujero. |
> | **2** (§15) | CHANGES_REQUESTED | B1 cerrado y aprobado. **B2**: se verificaba el nombre del token hasta el último carácter y **nada de su valor** → la **suite entera** verde con el tope sin unidad, o sea sin tope. |
> | **3** (§16) | pendiente de re-review | B2 cerrado: se valida la **unidad**, en dos capas, con control positivo en **cuatro** direcciones. |
>
> Donde una afirmación resultó falsa lleva su desmentido **en el sitio** y no se borra (§8/C3).

## 0. Baseline (medido antes de tocar nada)

`bash ./init.sh` → **EXIT 0**

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  78 passed | 3 skipped (81)
      Tests  1349 passed | 13 skipped (1362)
   Duration  192.72s
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Coincide con el baseline que da el encargo. Se sigue adelante.

**`feature_list.json` NO se toca** (esto no es una feature).

## 1. Plan

- **E13(a)** — token de tope + columna centrada declarada UNA vez en `AppShell`.
- **E13(b)** — rejilla de métricas con tantas columnas como métricas elegidas.
- **E13(c)** — fuera la `Card` del stepper de año y del selector de orden,
  manteniendo legibilidad y accesibilidad sobre el fondo espresso.
- **E13(d)** — gate hasta el **CSS compilado**, reusando la técnica de
  `src/features/projects/ui/projects-ui.classes.test.ts` (deuda 146).
- **REGLA 3** — control positivo de cada gate nuevo, con la salida real del rojo.

## 2. Estado por decisión

| decisión | estado |
|---|---|
| E13(a) contenedor | CERRADA |
| E13(b) rejilla de métricas | CERRADA |
| E13(c) `Card` fuera de los controles | CERRADA |
| E13(d) gate + control positivo | CERRADA |

## 3. Bitácora

- **inicio** — baseline medido y coincidente. Documentos leídos: RFC-01 §3 (E13
  completa), RFC-02 §7-quater (E3), `docs/harness/conventions.md`,
  `docs/harness/architecture.md`, `AGENTS.md`, `CHECKPOINTS.md`, y el gate
  precedente `projects-ui.classes.test.ts`.

---

## 4. E13(a) — el contenedor · CERRADA

**Token nuevo:** `--content-max-inline: 1040px` en `src/app/globals.css`, con su
motivo y su derivación escritos al lado (precedente exacto: `--nav-tab-inset-start`
en `globals.css:100` y `--auth-inset-inline` de E12 c).

**La derivación (medición, no ojo).** La composición más ancha que el contenido
sirve es una rejilla de **tres** columnas de tarjeta (métricas y proyectos
activos). Se le pide a esa columna no crecer más allá de **320px**, que es el
ancho de ventana más estrecho en el que la app se dibuja entera — no es un número
inventado: lo fija la enmienda **E11(b)** del propio RFC-01 (*"la banda propia
rige en TODOS los anchos, **de 320px** a desktop"*). O sea: una tarjeta nunca se
dibuja más ancha que la pantalla más chica que la app soporta, porque a ese ancho
ya se sabe dibujar y por encima no gana nada.

```
3 x 320  (columnas)
+ 2 x --space-4 (16)  (huecos de la rejilla)
+ 2 x --space-6 (24)  (relleno lateral de la página)
= 960 + 32 + 48 = 1040
```

- Cae **exacto** en la rejilla de espaciado: 1040 = 260 x `--space-1` (4px).
- Efecto medido sobre el defecto reportado: una fila que reparte sus dos mitades
  a los extremos pasa de **1488px** de separación a 1536px de ventana, a
  **992px** — por debajo de los *"más de mil píxeles"* con los que E13 describe
  el defecto.

**Dónde se aplica:** `src/shared/ui/layout/app-shell/AppShell.tsx`, dentro del
`main` y **una sola vez**. Constante `CONTENT_COLUMN_CLASSES` (centrado +
crecimiento + tope). El `main` sigue full-bleed: el caparazón **no cambia de
geometría**, sólo gana un contenedor para su contenido. Ninguna página declara
ancho propio.

## 5. E13(b) — la rejilla de métricas · CERRADA

`src/features/dashboard/ui/MetricsPanel.tsx`: la rejilla fija de tres columnas se
sustituye por `metricGridColumns(visible.length)` (exportada, para que el gate la
recorra). 1 → ancho completo, 2 → mitades, 3 → tercios.

**La trampa de E12(b), respetada:** las variantes son **min-width**, así que la
base es **una** columna y las demás se añaden **hacia arriba**. El caso de una
métrica no lleva ninguna variante — ya es ancho completo en la base. El gate lo
comprueba **en el compilado**: exige que la condición de las columnas extra sea de
ancho mínimo.

## 6. E13(c) — `Card` fuera de los controles · CERRADA

Se quitó la `Card` de los **dos** controles del encargo: el stepper de año
(`DashboardView.tsx`) y el selector de orden (`ActiveProjectsPanel.tsx`). **No se
tocó** la `Card` de `ProjectsToolbar.tsx` (fuera de alcance por contrato).

**No fue "borrar la Card y ya".** La `Card` era, con su motivo escrito, la
medicina de dos cosas:

1. **Legibilidad.** `Field` pintaba su etiqueta con el primer plano **oscuro**
   (`--fg`), pensado para superficie clara; sobre el espresso de la app es
   invisible. El design system **no sabía dibujar un campo sobre el fondo de la
   app**. Se extendió: `Field` gana `tone` (`default` | `inverse`) con su
   `field.variants.ts` (`cva`, como pide la convención). Es el "el template es un
   SUELO": la pieza que faltaba se crea, no se encoge la pantalla.
2. **Contraste del anillo de foco (deuda 31).** Acá el cambio **mejora**:
   `--focus` mide **4.68:1** sobre el fondo oscuro y sólo **2.95:1** sobre
   `--surface`. El anillo sale por fuera del control, así que al perder la
   tarjeta cae en el caso bueno.

**Token nuevo `--danger-inverse: #e8735a`.** Al salir de la tarjeta, el mensaje de
error del campo de año se lee sobre el espresso, y ahí `--danger` (#c6432f) mide
**3.02:1** — por debajo del 4.5:1 que pide un texto. `--danger-inverse` mide
**5.00:1**. Es el mismo patrón de pareja que ya existe (`--fg` / `--fg-inverse`,
`--fg-muted` / `--fg-inverse-muted`).

## 7. E13(d) — el gate · CERRADA

Dos gates nuevos + la técnica de la deuda 146 subida a pieza compartida.

### 7.1 Archivos del gate

| archivo | qué es |
|---|---|
| `src/shared/ui/testing/class-names-from-source.ts` | **NUEVO.** La técnica de la deuda 146 subida a pieza compartida: barrido de clases por **AST** + compilación real de `globals.css` + `emitsRule` con **frontera de fin de nombre** + `rulesFor`, que es capacidad **nueva** (devuelve las declaraciones de la regla y las condiciones que la envuelven). |
| `src/features/projects/ui/projects-ui.classes.test.ts` | **REESCRITO para consumir la pieza compartida.** Mismos 9 tests, mismo comportamiento. No se copió la técnica: se movió. Copiarla habría significado arreglar el próximo agujero en un sitio y dejarlo abierto en los otros dos. |
| `src/shared/ui/layout/app-shell/app-shell.classes.test.ts` | **NUEVO (12 tests).** El token derivado, el barrido del caparazón y —el corazón— que **alguna clase real del caparazón aplique el tope con ESE token y sin condición**, más el centrado por separado. |
| `src/features/dashboard/ui/dashboard-ui.classes.test.ts` | **NUEVO (18 tests).** Barrido de los tres componentes del Dashboard, columnas leídas de la declaración de plantilla de rejilla **ya compilada** por cada cantidad de métricas, el aviso de E12(b) comprobado (las columnas extra tienen que vivir en una condición de ancho **mínimo**) y el recuento exacto de `Card` por archivo. |
| `src/shared/ui/primitives/field/field.variants.test.ts` | **NUEVO (10 tests).** Contraste WCAG de los tres textos del tono inverso contra el fondo, más el aserto que justifica `--danger-inverse`. |

### 7.2 Y los tests de DOM, que miden la otra mitad

El gate de CSS mira el **fuente** y el **compilado**; no sabe si el atributo llega al elemento
correcto. Por eso van aparte:

- `src/shared/ui/layout/layout.test.tsx` (+1): el contenido **cuelga de verdad** del contenedor
  acotado. Una columna declarada *al lado* de los hijos en vez de *alrededor* no acota nada y el
  compilado se ve idéntico.
- `src/features/dashboard/ui/DashboardView.test.tsx` (+4): el paso a paso del año y el selector de
  orden **no** cuelgan de una superficie de tarjeta (se detecta con las clases reales de
  `cardVariants()`, no con literales), la tarjeta de métrica **sí** sigue siéndolo, y la rejilla
  monta las columnas de la cantidad elegida.
- `src/shared/ui/primitives/field/Field.test.tsx` (+2): el `prop` `tone` llega al marcado.

---

## 8. REGLA 3 — control positivo de cada gate (salida REAL del rojo)

Nueve roturas deliberadas. En todas se comprobó después que **vuelve el verde de antes**.

### C1 — se borra el contenedor entero del `AppShell` (lo que hasta hoy salía verde)

```
 FAIL  src/shared/ui/layout/layout.test.tsx > layout shell (smoke) > mete el contenido en la columna acotada del caparazón
AssertionError: el contenido no cuelga de ningún contenedor con el tope de ancho: la columna de E13(a) no existe o no lo envuelve: expected null not to be null

 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > la columna de contenido llega al CSS compilado > una clase del caparazón acota el ancho con el token, y sin condición
AssertionError: ninguna clase del caparazón aplica el tope de ancho del contenido: la columna no existe o no llegó al CSS: expected 0 to be greater than 0

 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > la columna de contenido llega al CSS compilado > una clase del caparazón centra esa columna
AssertionError: el caparazón no centra su columna de contenido: sin esto el tope deja todo el aire de un solo lado: expected [] to not deeply equal []
```

> Verde restaurado: `Test Files 2 passed (2)` · `Tests 44 passed (44)`.

### C2 — el tope se mueve a un número sin derivación (1040 → 1200)

```
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > el tope de ancho del contenido es un token derivado, no un número a ojo > cuadra con las tres columnas de tarjeta a su ancho máximo
AssertionError: expected 1200 to be 1040 // Object.is equality
```

### C3 — el control que más importa: la clase del tope se escribe mal

> **⚠️ CORRECCIÓN DE LA RONDA 2 — esta afirmación era FALSA en la mitad de los casos, y no se borra
> para que quede el registro de cómo se coló.** Abajo se decía que el aserto *"caza"* el token
> equivocado *"leyendo el valor de la declaración compilada"*. **Lo leía, pero no lo comparaba
> entero**: la comparación era por SUBCADENA. Con el token **recortado** (que es la dirección en la
> que se corrió este control) cae; con el token **alargado** —una letra de más— salía **VERDE**, y con
> él la suite completa, teniendo el tope apuntando a una variable que no existe. Lo midió el reviewer
> en las dos direcciones. **El control se corrió sólo en la dirección que ya fallaba, y por eso dio
> por bueno un gate roto.** Arreglado y demostrado en las dos direcciones en la **§15 (RONDA 2)**.

Se rompe el nombre de la utilidad de centrado y se le mete una errata al token del tope.
**Esto es lo que E13(d) exige medir:** la utilidad con el token equivocado **SÍ emite regla**
—Tailwind genera cualquier utilidad con variable, exista o no la variable—, así que un gate que sólo
comprobara "la clase existe en el CSS" saldría verde con el tope apuntando a la nada. Lo que la
ronda 1 no midió es que **su propio aserto tenía la misma clase de agujero**, un nivel más abajo.

```
 FAIL  ... > Tailwind genera todas las utilidades del caparazón
AssertionError: estas clases del caparazón no generan ninguna regla: se quedan inertes en el atributo: expected [ 'mx-autoo' ] to deeply equal []

 FAIL  ... > una clase del caparazón acota el ancho con el token, y sin condición
AssertionError: ninguna clase del caparazón aplica el tope de ancho del contenido: la columna no existe o no llegó al CSS: expected 0 to be greater than 0

 FAIL  ... > una clase del caparazón centra esa columna
AssertionError: el caparazón no centra su columna de contenido: sin esto el tope deja todo el aire de un solo lado: expected [] to not deeply equal []
```

### C4 — la rejilla de métricas vuelve a ser fija de tres columnas

```
 FAIL  ... > cubre todas las cantidades que la app puede pintar
AssertionError: expected 1 to be 3 // Object.is equality
 FAIL  ... > con 1 métrica(s), el CSS compilado declara 1 columna(s)
AssertionError: tablet:grid-cols-3: expected 3 to be 1 // Object.is equality
 FAIL  ... > con 2 métrica(s), el CSS compilado declara 2 columna(s)
AssertionError: tablet:grid-cols-3: expected 3 to be 2 // Object.is equality
      Tests  3 failed | 51 passed (54)
```

### C5 — la correspondencia sigue viva pero el panel deja de usarla

Clases escritas a mano en el JSX, con la función intacta. Es la otra mitad de C4, y hace falta: con
sólo el aserto de C4, alguien podría dejar la función correcta y escribir la rejilla fija al lado.

```
 FAIL  ... > el barrido de clases del Dashboard no se deja nada > sólo deja sin resolver lo que se declara fuera del archivo
AssertionError: expected [ 'inputClasses' ] to deeply equal [ 'cn', 'inputClasses' ]
 FAIL  ... > el panel escribe exactamente las clases de esa correspondencia
AssertionError: expected [ 'grid-cols-1', 'tablet:grid-cols-3' ] to deeply equal [ 'grid-cols-1', …(2) ]
 FAIL  src/features/dashboard/ui/DashboardView.test.tsx > ... > la rejilla de métricas declara tantas columnas como métricas elegidas
      Tests  3 failed | 51 passed (54)
```

### C6 — la trampa de E12(b): columnas escritas para "desaparecer hacia abajo"

Se escribe el caso de dos métricas al revés: dos columnas en la base y una hacia abajo.

```
 FAIL  ... > con 2 métrica(s), el CSS compilado declara 2 columna(s)
AssertionError: max-tablet:grid-cols-1: expected 1 to be 2 // Object.is equality
 FAIL  ... > las columnas extra viven en una condición de ancho MÍNIMO
AssertionError: grid-cols-2: expected 0 to be greater than 0
```

### C7 — vuelve la `Card` alrededor del selector de orden

```
 FAIL  ... > `Card` es para contenido: ningún control la lleva (E13 c) > ActiveProjectsPanel.tsx: monta las tarjetas justas
AssertionError: expected 2 to be 1 // Object.is equality
 FAIL  src/features/dashboard/ui/DashboardView.test.tsx > ... > el selector de orden no vive dentro de una tarjeta
AssertionError: expected true to be false // Object.is equality
```

### C8 — `--danger-inverse` apunta al rojo que no se lee sobre el espresso

```
 FAIL  ... > --danger-inverse llega al mínimo de texto contra el fondo
AssertionError: expected 3.014898634483563 to be greater than or equal to 4.5
```

El **3.0149:1** que mide el test es el mismo número que motivó el token nuevo.

### C9 — el tono inverso del campo se vuelve un `prop` decorativo

```
 FAIL  ... > los dos tonos del campo se distinguen de verdad > la etiqueta cambia de color entre tonos
AssertionError: expected 'font-body font-semibold text-sm text-…' not to be 'font-body font-semibold text-sm text-…'
```

### Lo que un control DEJÓ VER, y hay que decirlo

En C9 el test de DOM de `Field` **no cayó**, y es correcto que no caiga: deriva las clases esperadas
de las mismas variantes que usa la producción, así que comprueba **el cableado** (que el `prop`
llegue al marcado), no **los valores**. Los valores los mide `field.variants.test.ts`, que sí cayó.
Lo mismo pasa en C4 con el test de DOM de la rejilla. **Ningún gate de este lote mide las dos cosas a
la vez, y ninguno pretende hacerlo**: por eso van los dos.

### Comprobación extra: ninguna palabra de los tests nuevos se coló como CSS

Los archivos de gate escriben nombres de **propiedad CSS** al literal. Se compiló `globals.css` y se
listaron los selectores emitidos: no aparece ninguno derivado de esas palabras. El único selector
nuevo del lote es el del rojo inverso, que sí es una utilidad de producción.

---

## 9. Verificación final — salida real de `bash ./init.sh`

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  81 passed | 3 skipped (84)
      Tests  1400 passed | 13 skipped (1413)
   Start at  17:00:17
   Duration  104.51s (transform 7.17s, setup 78.68s, import 91.97s, tests 53.60s, environment 35.23s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**EXIT 0.**

### 9.1 Aritmética de tests, cerrada sin residuo

Partida `78 / 1349` → llegada `81 / 1400`: **+3 archivos, +51 tests**.

| dónde | +tests |
|---|---|
| `app-shell.classes.test.ts` (nuevo) | +12 |
| `dashboard-ui.classes.test.ts` (nuevo) | +18 |
| `field.variants.test.ts` (nuevo) | +10 |
| `DashboardView.test.tsx` (32 → 36) | +4 |
| `Field.test.tsx` (6 → 8) | +2 |
| `layout.test.tsx` (31 → 32) | +1 |
| `projects-ui.classes.test.ts` (9 → 9, reescrito sin cambiar comportamiento) | 0 |
| **subtotal escrito a mano** | **+47** |
| `no-hardcode.test.ts` (452 → 456): genera **dos** tests por fuente, y hay **dos** fuentes nuevos (`field.variants.ts` y `class-names-from-source.ts`) | +4 |
| **total** | **+51** |

Las cuentas de partida de cada archivo de test modificado se midieron **quitando los cambios con
`git stash` y volviendo a correrlos**, no de memoria.

---

## 10. Archivos tocados

**Nuevos**
- `src/shared/ui/testing/class-names-from-source.ts`
- `src/shared/ui/layout/app-shell/app-shell.classes.test.ts`
- `src/features/dashboard/ui/dashboard-ui.classes.test.ts`
- `src/shared/ui/primitives/field/field.variants.ts`
- `src/shared/ui/primitives/field/field.variants.test.ts`
- `progress/reports/impl_e13_ancho_contenido.md`

**Modificados**
- `src/app/globals.css` — tokens `--content-max-inline`, `--danger-inverse` y su alias de color.
- `src/shared/ui/layout/app-shell/AppShell.tsx` — la columna de contenido.
- `src/shared/ui/layout/layout.test.tsx` — +1 test de DOM.
- `src/shared/ui/primitives/field/Field.tsx` — `prop` `tone`; etiqueta y pie por `cva`.
- `src/shared/ui/primitives/field/Field.test.tsx` — +2 tests.
- `src/features/dashboard/ui/MetricsPanel.tsx` — `metricGridColumns`.
- `src/features/dashboard/ui/DashboardView.tsx` — fuera la `Card` del año.
- `src/features/dashboard/ui/ActiveProjectsPanel.tsx` — fuera la `Card` del orden.
- `src/features/dashboard/ui/DashboardView.test.tsx` — +4 tests.
- `src/features/projects/ui/projects-ui.classes.test.ts` — pasa a consumir la pieza compartida.
- `progress/current.md` — sección de la tanda en curso.

**NO tocados, a propósito:** `feature_list.json`, la `Card` de `ProjectsToolbar.tsx` (contenedor de
sección, fuera de alcance por contrato) y la **deuda 153** (el estado vacío del año inalcanzable, que
es lógica y va aparte).

---

## 11. Decisiones no obvias, y lo que cuestan

1. **La técnica del gate 146 se MOVIÓ, no se copió.** El encargo pide reusar, no reinventar. Se
   reescribió `projects-ui.classes.test.ts` para consumir
   `shared/ui/testing/class-names-from-source.ts`. Riesgo asumido: tocar un gate que ya estaba
   pagado. Mitigación: conserva **los mismos 9 tests en verde**. Beneficio: el próximo agujero se
   arregla **una vez** para los tres consumidores. De paso se corrigió una errata real: el contraste
   contra el texto crudo escribía la secuencia de espacio en blanco **dentro de una plantilla**, o
   sea que lo que buscaba era la letra ese. Con el formato actual el resultado no cambia; la
   intención sí.
2. **`EXTERNAL_SOURCES` es una lista exacta, y se pagó.** Adoptar `cn()` en `MetricsPanel.tsx` mete
   `cn` en la lista del gate del Dashboard; está declarado ahí con su motivo. `ProjectsToolbar.tsx`
   **no** se tocó, así que la lista de `/proyectos` sigue igual y su gate sigue verde.
3. **`--danger-inverse` es alcance añadido, y se declara como tal.** No estaba en el encargo, pero
   E13(c) exige que el control siga siendo **accesible** sin el marco, y al salir de la tarjeta el
   mensaje de error caía a 3.02:1. Se resolvió con la pareja que el sistema ya usa
   (`--fg` / `--fg-inverse`), no inventando una categoría nueva.
4. **`fieldLabelVariants` y `fieldMessageVariants` NO se exportan por el barrel**, así que
   `public-api.test.ts` no cambia. **No es esconder la pieza para esquivar el gate**: es la misma
   política que `toggle.variants.ts` y `segmented-control.variants.ts`, que tampoco exportan su
   `cva`. El componente `Field` y su `prop` sí son públicos; `cardVariants` y `buttonVariants` son la
   excepción histórica, no la regla.
5. **El `main` sigue full-bleed y la columna es hija suya.** E13 dice que el caparazón **no cambia de
   geometría**; además `main` sigue siendo el landmark y su fondo puede seguir corriendo de borde a
   borde el día que haga falta.

---

## 12. LO QUE NO PUDE VERIFICAR — el eje visible

**No tengo navegador en esta sesión.** No afirmo que nada "se vea bien": los tests verdes no son
evidencia de eso, y en este repo ya se cerraron dos pantallas visiblemente rotas con la suite entera
en verde (deudas 118 y 141). La REGLA 4 la mide el leader.

**Qué cambié y qué espero que se vea distinto:**

1. **En las 6 rutas privadas**, el contenido deja de tocar los bordes de la ventana por encima de
   1040px y aparece centrado con aire a los lados. En un monitor de 1536px, **248px de margen por
   lado**.
2. **En el Dashboard**, las filas que reparten sus dos mitades a los extremos —el título "Tu año en
   números" con sus conmutadores, y "Proyectos en curso" con el orden y "Ver todos"— pasan de
   **1488px** de separación a **992px**. Sigue siendo mucho: es una reducción de un tercio, no una
   desaparición.
3. **Con la métrica por defecto (una)**, la tarjeta de horas ocupa el **ancho completo** de la
   columna en vez de un tercio con dos tercios de fondo vacío.
4. **El paso a paso del año y el bloque "Ordenar por" pierden su recuadro blanco** y quedan sobre el
   fondo de la app, a la misma altura visual que sus vecinos de fila. Etiqueta y ayuda pasan a crema;
   el mensaje de error del año, a un rojo claro.

**Lo que hay que mirar con lupa, porque es donde puede fallar:**

- **El tope es una decisión de aspecto y yo no lo vi en pantalla.** La derivación es honesta y la
  aritmética cierra, pero **1040px puede quedar estrecho** para un panel de datos en un monitor
  grande. Está tokenizado justamente para esto: cambiarlo es **una línea** de `globals.css` — eso sí,
  obliga a rehacer la derivación del gate, que es lo que impide moverlo a ojo.
- **El caparazón y el contenido dejan de estar alineados por encima de 1040px.** El archivero y la
  banda de cuenta siguen **full-bleed** (E13 lo exige), así que el wordmark queda a 24px del borde y
  la columna de contenido empieza a 248px. Es **inherente** a "acotar el contenido sin tocar el
  caparazón", no un descuido; si al mirarlo canta, lo que hay que reabrir es la decisión del
  caparazón, no la del tope.
- **El nuevo rojo inverso sólo se ve en un sitio** (año fuera de rango). Cumple 5.00:1 medido, pero
  **el tono no lo eligió nadie mirándolo**.
- **El hueco vertical entre el hero y la fila de filtros no se tocó**: E13 lo deja fuera a propósito.
  Si sigue viéndose grande, no es una regresión de esta tanda.

---

## 13. Estado final por decisión

| decisión | estado |
|---|---|
| E13(a) contenedor | **CERRADA** |
| E13(b) rejilla de métricas | **CERRADA** |
| E13(c) `Card` fuera de los controles | **CERRADA** |
| E13(d) gate + control positivo | **CERRADA** (9 controles de la ronda 1 en §8; **corregida en la ronda 2**, ver §15) |

`bash ./init.sh` → **EXIT 0**. Listo para review.

> **⚠️ Este cierre es el de la RONDA 1 y la review lo rechazó.** El gate de E13(d) daba verde con el
> tope apuntando a la nada. El estado vigente está en la **§15.5**.

---

## 14. Deuda fichada en esta tanda

Tres entradas nuevas en `progress/deudas.md`, todas nacidas **de la propia implementación** y
declaradas en vez de escondidas:

- **155 🟠** — por encima del tope, el caparazón (full-bleed) y el contenido (acotado) dejan de estar
  alineados. **Es inherente a E13**, que exige las dos cosas a la vez; no es un descuido. Medido: 24px
  contra 248px a 1536px de ventana.
- **156 🟠** — el valor del tope se derivó pero **no se vio en pantalla**. Depende de la REGLA 4.
- **157 🟢** — `--danger-inverse` cumple su contraste medido, pero el tono no lo eligió nadie
  mirándolo y hoy aparece en un solo sitio.

**Deuda que esta tanda reduce sin cerrarla: la 150** (*"el gate de clases cubre 3 archivos de los ~20
que pintan clases"*). Pasa de **3 a 7** archivos cubiertos (los 3 de `/proyectos`, los 3 del Dashboard
y el `AppShell`), y sobre todo **deja de ser copiable a mano**: la técnica vive ahora en una pieza
compartida, así que sumar un archivo cuesta una línea. **No se marca saldada** porque quedan archivos
sin cubrir y esa decisión no es mía.

---

# §15. RONDA 2 — el bloqueante B1 y las tres correcciones de registro

> Todo lo de arriba es la **ronda 1** y **se conserva**, con sus notas de corrección puestas donde
> tocaba (§8/C3 lleva un aviso en el sitio, no borrado). Esta sección es lo nuevo.
>
> Veredicto de la review: **CHANGES_REQUESTED**, 1 bloqueante.
> Informe: `progress/reports/review_e13_ancho_contenido.md`.

## 15.1 B1 — el gate salía VERDE con el tope apuntando a la nada

**Lo que el reviewer midió** (no razonó): mutó `AppShell.tsx` a una utilidad de tope con el token
`--content-max-inlinee` —**una `e` de más**, un token que no existe en ningún sitio— y la suite salió
**verde, 44 passed**. En el navegador eso es `max-width: var(--<token inexistente>)`, que cae a su
valor inicial (`none`): **no hay tope**, o sea la pantalla queda **exactamente en el defecto que E13
vino a arreglar**, con todos los gates en verde.

**La causa, en una línea.** `app-shell.classes.test.ts` comparaba el nombre del token **por
subcadena**:

```ts
declaration.value.includes(CONTENT_MAX)
```

El nombre bueno **está dentro** del malo, así que el filtro lo daba por bueno. Es la **deuda 146-A**
otra vez —la que costó la frontera de fin de nombre en el selector— aplicada esta vez al **valor de
la declaración**. El propio helper que este archivo consume **sí** tiene esa frontera, y el gate la
tiraba a la basura tres líneas más abajo al comparar el valor a mano.

**Lo que más pesa, y lo asumo entero: el segundo cinturón tenía el MISMO agujero, no otro.**
`layout.test.tsx` buscaba el contenedor con una comprobación de inclusión sobre el nombre de clase,
así que fallaba por la misma costura. Es literalmente lo que prohíbe el comentario de
`writtenClassAttributes` que yo mismo moví al helper: *"una segunda red que falla donde falla la
primera no es una segunda red"*. La escribí y la incumplí en el mismo lote.

**Y por qué mi control positivo C3 no lo vio.** Corrí la mutación **en la dirección que sí cae**. La
comparación por subcadena caza el token **recortado** (prefijo) y **no** caza el **alargado**
(sufijo). Un control corrido en una sola dirección no es un control: es una coincidencia.

### La corrección

1. **Pieza compartida nueva: `src/shared/ui/testing/css-tokens.ts`** con `tokensIn()` y
   `usesToken()`. La comparación deja de ser por subcadena **y deja de ser por frontera de regex**:
   se **extraen los nombres de token enteros** del texto y se compara por **igualdad**. Así no hay
   frontera que ajustar mal ni dirección en la que falle.

   **Por qué en un módulo propio y no dentro de `class-names-from-source.ts`:** ese módulo arrastra
   el compilador de Tailwind y el de TypeScript, y a `usesToken()` la necesita también un test de
   **DOM** que sólo monta un componente. Hacerle importar un compilador entero para responder "¿esta
   clase consume este token?" no sale a cuenta. `class-names-from-source.ts` **lo reexporta**, así
   que hay **una sola implementación** y los dos consumidores preguntan exactamente lo mismo — que
   era justamente el argumento del reviewer para subirla al helper.

2. **Los dos sitios corregidos**: `app-shell.classes.test.ts` (el valor de la declaración compilada)
   y `layout.test.tsx` (el nombre de clase en el DOM).

3. **La pinza, que es lo que mata la CLASE de fallo y no este caso.** Test **nuevo** en
   `app-shell.classes.test.ts`: *"ningún tope del caparazón apunta a un token que no exista"*. Recoge
   **todos** los tokens que consume cualquier declaración de tope de ancho del caparazón y exige que
   `globals.css` los declare. Los dos asertos son **complementarios, no redundantes**, y se demuestra
   abajo con el control B1-c:

   | aserto | qué caza que el otro no |
   |---|---|
   | *"acota el ancho con el token"* (identidad) | un token **que sí existe** pero es **otro** |
   | *"ningún tope apunta a un token que no exista"* (pinza) | un token **inexistente**, sea cual sea, hoy y con cualquier nombre futuro |

   Y el segundo lleva su propio seguro contra el verde vacío: si el caparazón no consumiera **ningún**
   token en un tope, el test falla en vez de pasar por lista vacía.

### Control positivo, en las DOS direcciones (salida real)

Mutaciones sobre copia de seguridad, revertidas; **md5 de `AppShell.tsx` idéntico antes y después**
(`7e158bcc3429b9e7330c86b45521126c`).

**B1-a — token ALARGADO (`--content-max-inlinee`). Es EL CASO QUE SALÍA VERDE en la ronda 1:**

```
 FAIL  src/shared/ui/layout/layout.test.tsx > layout shell (smoke) > mete el contenido en la columna acotada del caparazón
AssertionError: el contenido no cuelga de ningún contenedor con el tope de ancho: la columna de E13(a) no existe o no lo envuelve: expected null not to be null
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > la columna de contenido llega al CSS compilado > una clase del caparazón acota el ancho con el token, y sin condición
AssertionError: ninguna clase del caparazón aplica el tope de ancho del contenido: la columna no existe, o su utilidad consume otro token: expected 0 to be greater than 0
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > la columna de contenido llega al CSS compilado > ningún tope del caparazón apunta a un token que no exista
AssertionError: estos tokens los usa un tope del caparazón y NO están declarados en globals.css: en el navegador la propiedad cae a su valor inicial y no hay tope: expected [ '--content-max-inlinee' ] to deeply equal []
      Tests  3 failed | 42 passed (45)
```

**B1-b — token RECORTADO (`--content-max-inlin`):**

```
 FAIL  src/shared/ui/layout/layout.test.tsx > layout shell (smoke) > mete el contenido en la columna acotada del caparazón
AssertionError: el contenido no cuelga de ningún contenedor con el tope de ancho: la columna de E13(a) no existe o no lo envuelve: expected null not to be null
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > la columna de contenido llega al CSS compilado > una clase del caparazón acota el ancho con el token, y sin condición
AssertionError: ninguna clase del caparazón aplica el tope de ancho del contenido: la columna no existe, o su utilidad consume otro token: expected 0 to be greater than 0
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > la columna de contenido llega al CSS compilado > ningún tope del caparazón apunta a un token que no exista
AssertionError: estos tokens los usa un tope del caparazón y NO están declarados en globals.css: en el navegador la propiedad cae a su valor inicial y no hay tope: expected [ '--content-max-inlin' ] to deeply equal []
      Tests  3 failed | 42 passed (45)
```

**Las dos direcciones dan el MISMO rojo** (`3 failed | 42 passed`), que es exactamente lo que la
asimetría de la ronda 1 no daba. Y el **segundo cinturón cae en las dos**, así que dejó de compartir
costura con el primero.

**B1-c — token que SÍ existe pero es el equivocado (`--auth-inset-inline`).** No lo pidió la review;
lo corrí para comprobar que los dos asertos no son el mismo aserto dos veces:

```
 FAIL  src/shared/ui/layout/layout.test.tsx > ... > mete el contenido en la columna acotada del caparazón
AssertionError: el contenido no cuelga de ningún contenedor con el tope de ancho: la columna de E13(a) no existe o no lo envuelve: expected null not to be null
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > ... > una clase del caparazón acota el ancho con el token, y sin condición
AssertionError: ninguna clase del caparazón aplica el tope de ancho del contenido: la columna no existe, o su utilidad consume otro token: expected 0 to be greater than 0
      Tests  2 failed | 43 passed (45)
```

**Cae el de identidad y NO cae la pinza** —el token existe—, que es justo el reparto de trabajo que
se buscaba. Si fueran redundantes, aquí caerían los dos o ninguno.

**Verde restaurado tras cada mutación:** `Test Files 2 passed (2)` · `Tests 45 passed (45)`.

## 15.2 Corrección de registro — la prosa decía "una `Card`" y quedan tres

Punto 2 del reviewer, y es el mismo defecto que fue bloqueante en la ronda 2 del lote anterior: **un
comentario que promete lo que el código no sostiene**. Los **números** de `ALLOWED_CARDS` estaban
bien (`MetricsPanel.tsx: 2`, `DashboardView.tsx: 0`, `ActiveProjectsPanel.tsx: 1`); lo que estaba mal
era la prosa que los explicaba, en **dos** sitios de `dashboard-ui.classes.test.ts`: el docstring de
cabecera decía *"queda exactamente uno"* y el de `ALLOWED_CARDS` razonaba *"y por qué uno"*.

Reescritos los dos. Y de paso se corrige lo que la frase vieja hacía mal aparte de contar mal:
enunciaba la regla como **"cuántas quedan"**, que no es la frontera de E13(c). La frontera es
**contenido sí, control no**. Las tres que quedan son la tarjeta de métrica, su silueta de carga y la
silueta de la tarjeta de proyecto: **las tres son contenido**. Las dos que se fueron envolvían un
**control**.

## 15.3 Corrección de registro — el recuento de controles en `current.md`

Punto 3 del reviewer. Decía *"los **siete** controles positivos"* y la §8 lista **nueve**. Corregido
a **doce** (nueve de la ronda 1 + tres de la ronda 2), que es lo que hay ahora.

## 15.4 Corrección de registro — la afirmación de §8/C3

Punto 4 del reviewer. Corregida **en su sitio, con aviso y sin borrar el texto viejo** (misma
política que el RFC usa para las decisiones derogadas): queda escrito que el control se corrió sólo
en la dirección que ya fallaba y que por eso dio por bueno un gate roto.

## 15.5 Verificación de la ronda 2

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  81 passed | 3 skipped (84)
      Tests  1403 passed | 13 skipped (1416)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**EXIT 0.**

### Aritmética de la ronda 2, contra la partida de la ronda 1 (`81 / 1400`)

**+0 archivos, +3 tests.** Medido archivo por archivo, no de memoria:

| dónde | antes | después | delta |
|---|---|---|---|
| `app-shell.classes.test.ts` — test nuevo de la **pinza** | 12 | 13 | **+1** |
| `no-hardcode.test.ts` — genera **dos** tests por fuente, y `css-tokens.ts` es un fuente nuevo | 456 | 458 | **+2** |
| `layout.test.tsx` — se cambió el criterio de comparación, no se añadió test | 32 | 32 | 0 |
| `dashboard-ui.classes.test.ts` — sólo prosa | 18 | 18 | 0 |
| **total** | **1400** | **1403** | **+3** |

**Cero archivos de test nuevos**: `css-tokens.ts` es un fuente de utilería, no un `*.test.ts`, así que
la cuenta de archivos se queda en 81.

## 15.6 Archivos tocados en la ronda 2

**Nuevo**
- `src/shared/ui/testing/css-tokens.ts` — `tokensIn()` y `usesToken()`, con el porqué (el verde falso
  medido) escrito dentro.

**Modificados**
- `src/shared/ui/testing/class-names-from-source.ts` — reexporta las dos funciones; una sola
  implementación para los dos consumidores.
- `src/shared/ui/layout/app-shell/app-shell.classes.test.ts` — comparación por igualdad de token,
  helper `isDeclared()`, y el **test nuevo de la pinza**.
- `src/shared/ui/layout/layout.test.tsx` — misma comparación por igualdad; deja de compartir agujero
  con el gate de CSS.
- `src/features/dashboard/ui/dashboard-ui.classes.test.ts` — **sólo prosa** (los dos docstrings de las
  `Card`). Ni un número tocado.
- `progress/current.md` — recuento de controles.
- `progress/reports/impl_e13_ancho_contenido.md` — esta sección + el aviso en §8/C3.

**Sigue sin tocarse:** `feature_list.json`, la `Card` de `ProjectsToolbar.tsx`, la **deuda 153**, y las
dos observaciones no bloqueantes del reviewer (`text-danger-inverse` sin gate de CSS compilado, y el
`320` de la derivación que vive sólo en el test) — **son fichas del leader**, no trabajo de esta
ronda.

## 15.7 Lo que sigo sin poder verificar

Lo mismo que en la ronda 1, y no cambia: **no tengo navegador**. La ronda 2 es toda de gate y de
registro; no mueve ni un píxel respecto de lo que dejó la ronda 1. Sigue en pie todo lo escrito en la
§12, incluidas las deudas **155**, **156** y **157**.

Y una honesta de esta ronda: **el bloqueante lo encontró el reviewer probando, no yo**. Mi control
positivo existía, estaba escrito, y era falso por correrse en una sola dirección. Queda como aviso
para el próximo: **un control que sólo se corre en la dirección en la que ya sabés que cae no prueba
nada** — y en este repo esa lección ya se había pagado dos veces (deudas 146 y 149).

---

# §16. RONDA 3 — B2: los gates vigilaban el NOMBRE del token y nada de su VALOR

> Las §§0-14 son la **ronda 1** y la §15 la **ronda 2**; las dos **se conservan**.
> Veredicto de la review de ronda 2: **B1 aprobado** (el reviewer reprodujo el arreglo: el caso que
> daba `44 passed` ahora da `3 failed | 42 passed`, el segundo cinturón cae también, y confirmó que el
> módulo aparte está justificado y la reexportación es pura) y **bloqueo por una cuarta vía, B2**.
>
> **⏱️ VENTANA DE MUTACIONES: ABIERTA y ya CERRADA.** Todas las mutaciones de esta ronda están
> hechas y revertidas. `globals.css` vuelve a su md5 `eed29f5373e3748adb94497902633b0a` —el mismo que
> el reviewer dejó anotado— y `AppShell.tsx` no se tocó en esta ronda. **El árbol está quieto: se
> puede medir la pantalla.**

## 16.1 Qué estaba roto

**Los gates comprobaban el nombre del token hasta el último carácter y NADA de su valor.**
`tokenLength()` leía el número con `Number.parseFloat`, que **descarta el sufijo en silencio**: para
ella `1040`, `1040px` y `1040em` son el mismo número. La derivación cuadraba con los tres.

```
--content-max-inline: 1040      (sin unidad)  ->  Tests 1403 passed   <- LA SUITE ENTERA
--content-max-inline: 1040em                  ->  también pasa
```

En el navegador `max-width: 1040` **no es una longitud válida** (una longitud necesita unidad salvo
el cero): la declaración se descarta en tiempo de valor computado, `max-width` cae a su valor inicial
`none` y **no hay tope**. Con `1040em` el tope existe pero vale ~16 veces lo pedido, o sea tampoco
acota. **Los dos desenlaces son el mismo:** la pantalla vuelve exactamente al defecto que E13 vino a
arreglar, la deuda 154 abierta, y nadie avisando.

**Y esta vez no hubo que imaginarse el navegador.** Mientras el reviewer corría la mutación, el leader
estaba haciendo su verificación en pantalla y **midió el contenedor sin tope, llegando al borde de la
ventana**, con el token en unidades de tipografía. Estuvo a punto de reportarlo como bug mío antes de
darse cuenta de que era el control positivo de otro. Así se ve este fallo cuando pasa de verdad.

**Lo que lo vuelve inminente, y es el argumento que más pesa:** la **deuda 156** —que fiché yo en la
ronda 1— planifica **editar esa línea exacta** de `globals.css` en cuanto el leader termine su
REGLA 4, porque el valor se derivó sin que nadie lo viera en pantalla. **El próximo cambio previsto de
este repo era justo el que el gate no sabía vigilar.**

Es la **quinta** aparición de esta familia en el repo: cuatro vías de verde falso en la deuda 146, B1
en la ronda 2 de esta enmienda, y ahora B2. El patrón se repite: **el gate mide la forma del nombre y
no el efecto**.

## 16.2 La corrección

**1. `isAbsolutePxLength()` en la pieza compartida** (`src/shared/ui/testing/css-tokens.ts`, junto a
`usesToken`, que nació de B1 por el mismo motivo). Exige número **con unidad absoluta de píxeles**.

**2. El criterio de alcance, escrito para que nadie lo sobre-aplique** (lo pidió el encargo). Está en
el docstring de la función, y es:

> Vale **sólo para los tokens que se consumen como una longitud CSS** —topes de ancho, espaciados,
> anchos de ventana—, que son los que quedan rotos si les falta la unidad. **NO** vale para los que
> legítimamente no llevan ninguna: profundidad de apilamiento, interlineado, proporciones, opacidades,
> colores ni duraciones. Un gate que se la exigiera a todos estaría inventando un error donde no lo
> hay.

Tampoco acepta expresiones de cálculo ni cadenas de referencias sin resolver — **no porque estén
prohibidas, sino porque este comprobador no sabe evaluarlas**, y denunciar es mejor que dar por buena
una que no se entendió. Si algún día un token de longitud pasa a declararse así, la salida correcta es
enseñarle a resolverlo, no aflojar la comprobación.

**3. Aplicada en DOS capas, a propósito** (misma lógica que la pinza de B1: que la protección no
dependa de un solo punto):

| capa | qué es | qué cubre |
|---|---|---|
| dentro de `tokenLength()` | lanza con mensaje propio | **todos** los tokens de la derivación: el tope, `--space-1/4/6` y `--bp-tablet`. Es el punto 3 del reviewer, comprobado abajo en **B2-d** |
| test propio con nombre, *"el tope se declara con unidad de longitud, no con un número pelado"* | aserto visible en la suite | el tope, **con nombre en el listado de tests** |

El test con nombre no es redundante y tiene un motivo concreto: **la deuda 156 planifica editar esa
línea**. Cuando eso pase, el rojo tiene que decir *qué* se rompió en el listado de tests, no esconderse
dentro de la excepción de un ayudante.

**4. Y en el test de la derivación se compara el valor CRUDO**, no sólo el número:
`tokenValue(CONTENT_MAX)` contra `` `${esperado}px` ``. Es la alternativa directa que sugirió el
reviewer, y mata las dos direcciones en el sitio exacto donde se lee el número.

## 16.3 Control positivo — cuatro direcciones, salida real

Mutaciones sobre copia de seguridad, revertidas. **md5 de `globals.css` idéntico antes y después:
`eed29f5373e3748adb94497902633b0a`.** `AppShell.tsx` no se tocó en esta ronda.

### B2-a — SIN UNIDAD (`1040`). Es EL CASO que daba la suite entera en verde

Sobre el gate:

```
 FAIL  ... > cuadra con las tres columnas de tarjeta a su ancho máximo
AssertionError: expected '1040' to be '1040px' // Object.is equality
 FAIL  ... > el tope se declara con unidad de longitud, no con un número pelado
AssertionError: el tope vale "1040": sin una unidad de longitud absoluta el navegador descarta la declaración y la columna se queda sin acotar: expected false to be true
 FAIL  ... > cae exacto en la rejilla de espaciado de la app
Error: El token --content-max-inline vale "1040", que no es una longitud absoluta en píxeles. Un número sin unidad hace que la declaración sea inválida en el navegador y la propiedad caiga a su valor inicial; otra unidad da un tope que no es el pedido. Las dos cosas dejan la pantalla sin acotar con la suite en verde (bloqueante B2).
 FAIL  ... > no muerde por debajo del ancho de tablet
Error: El token --content-max-inline vale "1040", que no es una longitud absoluta en píxeles. […]
      Tests  4 failed | 10 passed (14)
```

Y **sobre la SUITE COMPLETA**, que es como el reviewer lo midió en verde:

```
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > … > cuadra con las tres columnas de tarjeta a su ancho máximo
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > … > el tope se declara con unidad de longitud, no con un número pelado
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > … > cae exacto en la rejilla de espaciado de la app
 FAIL  src/shared/ui/layout/app-shell/app-shell.classes.test.ts > … > no muerde por debajo del ancho de tablet
 Test Files  1 failed | 80 passed | 3 skipped (84)
      Tests  4 failed | 1400 passed | 13 skipped (1417)
```

**De `1403 passed` a `4 failed`.** Es la comparación que cierra el bloqueante.

### B2-b — UNIDAD EQUIVOCADA (`1040em`)

```
 FAIL  ... > cuadra con las tres columnas de tarjeta a su ancho máximo
AssertionError: expected '1040em' to be '1040px' // Object.is equality
 FAIL  ... > el tope se declara con unidad de longitud, no con un número pelado
AssertionError: el tope vale "1040em": sin una unidad de longitud absoluta el navegador descarta la declaración y la columna se queda sin acotar: expected false to be true
 FAIL  ... > cae exacto en la rejilla de espaciado de la app
Error: El token --content-max-inline vale "1040em", que no es una longitud absoluta en píxeles. […]
 FAIL  ... > no muerde por debajo del ancho de tablet
Error: El token --content-max-inline vale "1040em", que no es una longitud absoluta en píxeles. […]
      Tests  4 failed | 10 passed (14)
```

### B2-c — VALOR NO NUMÉRICO (`nope`), para que se vea el reparto

Ya caía antes de esta ronda (la lectura de coma flotante daba `NaN` y el ayudante lanzaba), pero
**caía por un solo camino y con un mensaje que hablaba de otra cosa**. Ahora cae por los tres y el
mensaje dice lo que pasa:

```
 FAIL  ... > cuadra con las tres columnas de tarjeta a su ancho máximo
AssertionError: expected 'nope' to be '1040px' // Object.is equality
 FAIL  ... > el tope se declara con unidad de longitud, no con un número pelado
AssertionError: el tope vale "nope": sin una unidad de longitud absoluta el navegador descarta la declaración y la columna se queda sin acotar: expected false to be true
 FAIL  ... > cae exacto en la rejilla de espaciado de la app
Error: El token --content-max-inline vale "nope", que no es una longitud absoluta en píxeles. […]
      Tests  4 failed | 10 passed (14)
```

### B2-d — no lo pidió nadie: **un token DE LA DERIVACIÓN sin unidad** (`--space-4: 16`)

Es el punto 3 del reviewer —*"como `tokenLength` es genérico, la comprobación protege de paso a
`--space-*` y `--bp-tablet`"*— comprobado en vez de supuesto:

```
 FAIL  ... > cuadra con las tres columnas de tarjeta a su ancho máximo
Error: El token --space-4 vale "16", que no es una longitud absoluta en píxeles. […]
      Tests  1 failed | 13 passed (14)
```

**Verde restaurado tras las cuatro:** `Test Files 2 passed (2)` · `Tests 46 passed (46)`
(`app-shell.classes` + `layout`).

## 16.4 Lo que NO cierro, y por qué queda escrito

**El mismo agujero existe en otros TRES gates de tokens del repo, y no los toco en esta ronda.**
Lo conté, no lo supuse — y salieron tres, no los dos que esperaba:

| gate | ayudante | tokens que lee |
|---|---|---|
| `src/shared/ui/breakpoint-tokens.test.ts` | `length()` | los `--bp-*` y sus alias |
| `src/shared/ui/layout/account-band/account-band.tokens.test.ts` | `length()` | geometría de la banda de cuenta |
| `src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts` | `length()` | el presupuesto entero del archivero |

Los tres tienen **la misma copia literal**: `Number.parseFloat` y un rechazo que sólo mira si el
resultado es un no-número. Un token suyo sin unidad pasaría igual.

**Medido también en la otra dirección, y esto sí es buena noticia:** cero comparaciones por subcadena
de nombres de token en el resto de `src/**`, o sea que **B1 estaba sólo en mis dos sitios y está
cerrado**. Lo que está duplicado es la lectura permisiva del **valor**.

No lo arreglo acá por tres motivos, y el tercero es el que manda:

1. Son gates **preexistentes** de otras enmiendas, fuera del alcance de E13.
2. Sus tokens **no están planificados para editarse**; el mío sí (deuda 156). El riesgo no es el mismo.
3. Tocar dos gates ya pagados en una ronda 3 que existe para cerrar un bloqueante es exactamente cómo
   se abren bloqueantes nuevos.

**Fichado como deuda 158** con la medición, que es lo que el reviewer pedía que no faltara: *"lo que no
me parece defendible es dejarlo sin escribir en ningún sitio"*.

**Y el límite residual que el reviewer marcó sin bloquear, lo confirmo y no lo cierro:** `isDeclared()`
comprueba que el token aparezca declarado **en el texto** de `globals.css`, no en un ámbito que
aplique. Un token movido dentro de una regla condicional seguiría contando como declarado. Va también
a la **deuda 158**, con la etiqueta de "deducido leyendo, no medido", igual que él lo dejó.

## 16.5 Verificación de la ronda 3

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  81 passed | 3 skipped (84)
      Tests  1404 passed | 13 skipped (1417)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**EXIT 0.**

### Aritmética de la ronda 3, contra la partida de la ronda 2 (`81 / 1403`)

**+0 archivos, +1 test.**

| dónde | antes | después | delta |
|---|---|---|---|
| `app-shell.classes.test.ts` — test nuevo *"el tope se declara con unidad de longitud…"* | 13 | 14 | **+1** |
| `css-tokens.ts` — se le añade `isAbsolutePxLength` a un fuente **que ya existía** desde la ronda 2, así que `no-hardcode.test.ts` no genera ninguno nuevo | — | — | 0 |
| resto | — | — | 0 |
| **total** | **1403** | **1404** | **+1** |

Acumulado desde el baseline original (`78 / 1349`): **+3 archivos, +55 tests**.

## 16.6 Archivos tocados en la ronda 3

- `src/shared/ui/testing/css-tokens.ts` — `isAbsolutePxLength()` **con el criterio de alcance escrito**.
  Comprobado a mano que el archivo sigue limpio para los tres guardrails de `no-hardcode` (no lleva
  ningún literal de píxeles, ni color hexadecimal, ni función de color) — importa porque **este
  archivo NO es un test y sí lo barre el guardrail**, comentarios incluidos.
- `src/shared/ui/layout/app-shell/app-shell.classes.test.ts` — `tokenLength()` valida la unidad, la
  derivación compara el **valor crudo**, y el **test nuevo** con nombre.
- `progress/deudas.md` — **deuda 158**.
- `progress/current.md` y este informe.

**Sigue sin tocarse:** `feature_list.json`, la `Card` de `ProjectsToolbar.tsx`, la **deuda 153**, y las
observaciones no bloqueantes del reviewer.

## 16.7 Lo que sigo sin poder verificar, y una nota de coordinación

**No tengo navegador**, igual que en las dos rondas anteriores. La ronda 3 es toda de gate: **no mueve
ni un píxel** respecto de lo que dejó la ronda 1. Sigue en pie lo escrito en la §12, con las deudas
**155**, **156** y **157**.

**⏱️ Para el leader: la ventana de mutaciones está CERRADA.** Las mutaciones de esta ronda tocaron
`globals.css` (el valor del tope y, en B2-d, `--space-4`), o sea justo lo que se ve en pantalla. Todas
revertidas y el md5 comprobado. Si mediste el contenedor sin tope mientras tanto, **era un control
positivo, no el estado del repo**.

Y la lección de esta ronda, escrita para el próximo: en la ronda 1 verifiqué **que la clase existiera**;
en la ronda 2, **que el nombre del token fuera el correcto**; hizo falta una tercera para **mirar el
valor**. Las tres veces el gate medía **la forma de lo escrito** en vez de **el efecto**. Y las tres
veces el agujero apareció **probando**, no leyendo.
