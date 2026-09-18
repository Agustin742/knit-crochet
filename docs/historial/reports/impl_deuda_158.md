# Implementación — deuda técnica 158

> Informe incremental. Se escribe ANTES de empezar y se actualiza por tanda.
> Estado inicial: `in_progress`.

## Encargo

Sustituir la lectura permisiva de valores de tokens CSS (`Number.parseFloat`)
por `isAbsolutePxLength()` en TRES gates:

| gate | ayudante | qué lee |
|---|---|---|
| `src/shared/ui/breakpoint-tokens.test.ts:60` | `length()` | los `--bp-*` y alias Tailwind |
| `src/shared/ui/layout/account-band/account-band.tokens.test.ts:73` | `length()` | geometría de la banda de cuenta |
| `src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts:57` | `length()` | presupuesto del archivero |

Más una MEDICIÓN sin arreglo: `isDeclared()` en `app-shell.classes.test.ts`.

## Plan

- [ ] T0 — Leer ficha 158, conventions, verification, `css-tokens.ts`.
- [ ] T1 — Arreglar `breakpoint-tokens.test.ts` + control positivo 4 direcciones.
- [ ] T2 — Arreglar `account-band.tokens.test.ts` + control positivo.
- [ ] T3 — Arreglar `archive-nav.tokens.test.ts` + control positivo.
- [ ] T4 — Medir `isDeclared()` / media query. NO arreglar.
- [ ] T5 — `bash ./init.sh` EXIT 0, aritmética de tests sin residuo.

## Bitácora

(pendiente)

---

### T0 — Lectura hecha (2026-08-24)

Ficha 158 leída (`progress/deudas.md:2330`). `isAbsolutePxLength()` leído en
`src/shared/ui/testing/css-tokens.ts`: `/^-?\d+(?:\.\d+)?px$/`, con el criterio
de alcance escrito (vale para tokens consumidos como LONGITUD; **no** para
profundidad de apilamiento, interlineado, proporciones, opacidades, colores ni
duraciones).

**Hallazgo que condiciona el diseño (archive-nav).** El `length()` de
`archive-nav.tokens.test.ts` NO lee sólo longitudes: también lee
`--leading-tight: 1.1` (interlineado, línea 226 de `globals.css`) y, vía
`integer()`, los `--z-nav-leaf-1..6` / `--z-nav-band` (profundidad de
apilamiento, líneas 341-347). Esos **legítimamente no llevan unidad**. Si a
`length()` se le exige `px` a secas, ese gate se pone rojo contra un CSS
correcto. Por eso ahí hay que **partir el lector en dos**, no endurecer uno
solo:

- `length()` → exige `px` (vía `isAbsolutePxLength`).
- `unitless()` → exige número **sin** unidad (el error simétrico: un
  `--leading-tight: 1.1px` o un `z-index: 6px` también son declaraciones
  inválidas).

No es scope creep: es la condición para que el arreglo no rompa el gate.

**Forma del control positivo (para no repetir el B2).** El control no puede
probar `isAbsolutePxLength` en abstracto — eso ya está probado en su módulo.
Tiene que probar que **este gate** se pone rojo. Por eso en los tres archivos se
parametriza la lectura por el TEXTO del CSS:

```
lengthIn(css, name)   // lector estricto
length(name) = lengthIn(GLOBALS_CSS, name)
```

y la derivación que hace el `it` real se extrae a una función de `css`. El
control positivo llama a **esa misma función** con copias mutadas del
`globals.css` REAL:

| dirección | valor | esperado |
|---|---|---|
| (a) sin unidad | `1180` | la derivación del gate LANZA |
| (b) unidad relativa `em` | `1180em` | la derivación del gate LANZA |
| (c) unidad relativa `rem` | `1180rem` | la derivación del gate LANZA |
| (d) px correcto | `1180px` | la derivación del gate PASA |

La mutación lleva guardia: si el patrón no casa, `withValue()` lanza. Sin esa
guardia, una mutación que no se aplicase dejaría la dirección (d) verde por
accidente — que es la forma exacta en que un control positivo miente.

### Plan de tandas

- T1 — `breakpoint-tokens.test.ts` (el grave). +3 tests.
- T2 — `account-band.tokens.test.ts`. +3 tests.
- T3 — `archive-nav.tokens.test.ts` (con el corte `length`/`unitless`). +4 tests.
- T4 — Medición de `isDeclared()` en `app-shell.classes.test.ts`. SIN arreglar.
- T5 — `bash ./init.sh` y aritmética: 1404 + 10 = 1414 esperados.

---

### T1 — `src/shared/ui/breakpoint-tokens.test.ts` — HECHO

**Cambios**

- Importa `isAbsolutePxLength` de `./testing/css-tokens`.
- `length(name)` (con `Number.parseFloat` + `Number.isNaN`) → **eliminada**.
  En su lugar: `declarationIn(css, name)` (valor crudo) + `lengthIn(css, name)`
  que exige `isAbsolutePxLength` y lanza con el mensaje del caso concreto (media
  query descartada entera → mueren las utilidades de esa variante).
- La comparación del gate se extrae a `expectPairAgrees(css, suffix)`. El `it`
  real la llama con `GLOBALS_CSS`; el control positivo con mutantes.
- `withValue(css, name, value)` para fabricar mutantes, **con guardia**: si el
  patrón no casa, lanza (sin eso, una mutación no aplicada dejaría la dirección
  verde pasando por accidente).

**Control positivo — 3 tests nuevos, sobre TODOS los pares descubiertos**

Se muta **el par entero** (los dos namespaces al mismo valor) para que el único
motivo posible de fallo sea la unidad: con los dos lados escritos igual la
comparación numérica cuadra, y el gate viejo habría salido verde con las tres
formas. El valor del mutante se saca con la lectura **permisiva**
(`permissiveNumber`), no con el lector estricto, para que la dirección "sigue
verde con px" no dependa de que el CSS real ya esté bien.

| dirección | resultado |
|---|---|
| sin unidad (`1180`) | el gate LANZA ✓ |
| `em` | el gate LANZA ✓ |
| `rem` | el gate LANZA ✓ |
| `px` | el gate PASA ✓ |

**Medición sobre el `globals.css` REAL** (mutado en disco, corrido, restaurado
y `git status` limpio en cada vuelta):

```
sin arreglo previo (baseline de la ficha): 1404 passed, gate VERDE con --breakpoint-desktop: 1180
CSS sano                : Tests  9 passed (9)
--breakpoint-desktop: 1180    → Tests  1 failed | 8 passed (9)
--breakpoint-desktop: 1180em  → Tests  1 failed | 8 passed (9)
--breakpoint-desktop: 1180rem → Tests  1 failed | 8 passed (9)
```

El que cae es el `it` REAL (`--breakpoint-desktop vale lo mismo que
--bp-desktop`), no un control auxiliar: el gate se pone rojo por el defecto de
verdad. Antes de este cambio, esa misma mutación en disco daba la suite entera
en verde.

Tests: 6 → 9 (**+3**).

---

### T2 — `src/shared/ui/layout/account-band/account-band.tokens.test.ts` — HECHO

**Cambios**

- Importa `isAbsolutePxLength` de `../../testing/css-tokens`.
- `declaration`/`resolved`/`length` se parametrizan por el texto del CSS:
  `declarationIn(css, name)`, `resolvedIn(css, name)`, `lengthIn(css, name)`;
  quedan los envoltorios finos `declaration(name)` y `resolved(name)` sobre
  `GLOBALS_CSS` para no tocar el resto del archivo.
- `lengthIn` exige `isAbsolutePxLength` y lanza explicando el desenlace real
  (declaración inválida → la propiedad cae a su valor inicial → el solape que
  este gate vigila deja de estar vigilado).
- Las cuatro constantes de geometría (`BAND_HEIGHT`, `WORST_CASE_TAB_TOP_*`,
  `NAV_TOP`) pasan a salir de **una** función `geometry(css)`, que es la que
  alimenta los asertos reales y la que corre el control positivo.
- `lengthIn` **apunta cada token que lee** en `LENGTH_TOKENS_READ`. El control
  positivo muta esos tokens descubiertos, no una muestra escrita a mano (patrón
  de las deudas 40/43/71). La foto `GEOMETRY_LENGTH_TOKENS` se toma justo
  después de la derivación real: si se iterase el conjunto vivo, el propio
  control lo alimentaría mientras itera.

**Control positivo — 4 tests nuevos**

Corren `geometry()` —la MISMA función que produce los números de los asertos—
contra copias mutadas del `globals.css` real, token por token de los
descubiertos:

| dirección | resultado |
|---|---|
| "la derivación lee al menos una longitud" (anti-medir-aire) | ✓ |
| sin unidad | `geometry()` LANZA ✓ |
| `em` y `rem` | `geometry()` LANZA ✓ |
| `px` | `geometry()` PASA ✓ |

**Medición sobre el `globals.css` REAL** (mutando `--touch-target`, que es el
que alimenta `--nav-tab-height`, y restaurando con `git status` limpio):

```
CSS sano            : Test Files 1 passed | Tests 13 passed (13)
--touch-target: 44   → Test Files 1 failed | Tests no tests
--touch-target: 44em → Test Files 1 failed | Tests no tests
```

Nota honesta sobre la forma del rojo: como la derivación es de ámbito de módulo,
el fallo sale como **error de carga del archivo** (`no tests`), no como un `it`
en rojo. Es igual de ruidoso y da exit distinto de 0, y era ya el comportamiento
previo para un token no declarado — pero conviene saberlo al leer la salida.

Tests: 9 → 13 (**+4**).

---

### T3 — `src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts` — HECHO

**Cambios**

- Importa `isAbsolutePxLength` de `../../testing/css-tokens`.
- Misma parametrización por texto de CSS: `declarationIn`, `resolvedIn`,
  `lengthIn`, con los envoltorios finos `declaration`, `resolved`, `length`.
- **El corte en DOS lectores** (lo que anunciaba T0): `lengthIn` exige `px`;
  `unitlessIn` exige número **sin** unidad. `integer()` pasa a apoyarse en
  `unitless()` y las dos cuentas del wordmark cambian
  `length("--leading-tight")` por `unitless("--leading-tight")`.
  Sin este corte el gate se pondría rojo contra un `globals.css` correcto:
  `--leading-tight: 1.1` y `--z-nav-*: 1..7` **no llevan unidad y no deben
  llevarla** (criterio escrito en `isAbsolutePxLength`).
- Los dos lectores apuntan lo que leen (`LENGTH_TOKENS_READ`,
  `UNITLESS_TOKENS_READ`): el control positivo muta lo descubierto.

**Control positivo — 5 tests nuevos**

Los cuatro de siempre sobre las longitudes (guardia anti-medir-aire, sin unidad,
`em`/`rem`, `px`) **más el error simétrico**: una proporción o un `z-index`
**con** unidad también ponen el gate en rojo (y sin unidad sigue verde). Ese
quinto cierra el agujero que abre el corte en dos lectores — si no, el lector
laxo sería el nuevo `parseFloat`.

**Limitación declarada, no escondida.** Aquí los tokens se descubren mientras
corren los `it`, no en una derivación de ámbito de módulo como en account-band
(reestructurar los siete `it` de este archivo era más cirugía de la que la deuda
pide). Como el bloque de control va **el último**, bajo `init.sh` ve todos los
tokens del gate. Si alguien corriera sólo estos tests con `-t`, el conjunto
contendría al menos los que se leen al declarar los `describe` (el presupuesto
horizontal entero) — nunca vacío, y el primer `it` lo comprueba. La cobertura
sería menor pero jamás falsamente verde.

Tests: 22 → 27 (**+5**).

---

### Medición ANTES / DESPUÉS (la que prueba que la deuda era real)

Protocolo: se guardaron mis tres archivos, se restauraron los de `HEAD`
(`git checkout HEAD -- <los tres>`), se rompieron **tres tokens a la vez** en el
`globals.css` real, uno por gate:

```
--breakpoint-desktop: 1180      (sin unidad; el caso 🔴 de la ficha)
--touch-target:       44em      (unidad relativa; alimenta --nav-tab-height)
--nav-height:         104       (sin unidad)
```

| | CSS sano | CSS con los TRES tokens rotos |
|---|---|---|
| gates de `HEAD` (antes) | `3 passed / 37 passed` | **`3 passed / 37 passed`** ← verde con todo roto |
| gates de esta sesión | `3 passed / 49 passed` | **`3 failed / 6 failed \| 30 passed`** |

Los que caen con los gates nuevos son `it` **reales**, no controles auxiliares:

```
FAIL breakpoint-tokens > --breakpoint-desktop vale lo mismo que --bp-desktop
FAIL account-band.tokens (el archivo entero: la derivación es de ámbito de módulo)
FAIL archive-nav.tokens > las 6 ranuras más una pestaña entran en el alto del nav
FAIL archive-nav.tokens > la pestaña mide un objetivo táctil
FAIL archive-nav.tokens > la pestaña más alta sigue dentro del nav con el hover puesto
FAIL archive-nav.tokens > el wordmark entra entero por encima de la hoja más alta (E7)
FAIL archive-nav.tokens > la pestaña que comparte columna con el wordmark no lo alcanza (E7)
```

`globals.css` restaurado desde copia y `git status` limpio para ese archivo tras
cada vuelta (comprobado).

**Comprobación de que no queda ninguna lectura permisiva suelta:**

```
$ grep -n "Number.parseFloat(" <los tres archivos>
breakpoint-tokens.test.ts:101       → dentro de lengthIn   (tras isAbsolutePxLength)
account-band.tokens.test.ts:128     → dentro de lengthIn   (tras isAbsolutePxLength)
archive-nav.tokens.test.ts:107      → dentro de lengthIn   (tras isAbsolutePxLength)
archive-nav.tokens.test.ts:140      → dentro de unitlessIn (tras la comprobación simétrica)
```

Los mutantes del control positivo se fabrican quitando el sufijo **del texto**
(`bareNumber`), no con una lectura permisiva: así no queda ni un `parseFloat`
de token fuera de un lector que valide.

Suma de las tres tandas: 37 → 49 tests (**+12**).

---

### T4 — MEDICIÓN de la "mitad hermana" (`isDeclared()`), **sin arreglar**

**Pregunta:** ¿se puede mover el token dentro de una regla condicional y que el
gate siga verde con el tope inexistente por debajo de esa condición?

**Respuesta: SÍ. Medido, ya no deducido.**

**Prueba.** En `src/app/globals.css` se sacó `--content-max-inline: 1040px` del
bloque `@theme` (línea 179) y se declaró **sólo dentro de una media query que no
casa con ninguna pantalla real**:

```css
@media (min-width: 5000px) {
  :root {
    --content-max-inline: 1040px;
  }
}
```

Por debajo de 5000px el token **no está definido**, así que
`max-width: var(--content-max-inline)` es una declaración inválida: `max-width`
cae a `none` y **no hay tope de ancho** — exactamente el defecto que E13 vino a
arreglar y exactamente el desenlace del bloqueante B2.

Resultado:

```
$ pnpm vitest run src/shared/ui/layout/app-shell/app-shell.classes.test.ts
 Test Files  1 passed (1)
      Tests  14 passed (14)

$ pnpm vitest run          # la SUITE ENTERA, con la mutación puesta
 Test Files  81 passed | 3 skipped (84)
      Tests  1416 passed | 13 skipped (1429)
```

O sea: **ni `app-shell.classes.test.ts` ni ningún otro gate del repo se entera.**
No es sólo que `isDeclared()` no distinga el ámbito; es que **nadie más cubre ese
flanco**. `tokenValue()` / `tokenLength()` tampoco, porque leen el mismo texto
con la misma regex de línea (`^\s*--token:`), y el aserto de "sin condición"
(`entry.conditions).toEqual([])`) mira las condiciones de la regla de la
**utilidad**, no las de la **declaración del token**.

Por qué la mutación no rompe nada más: la utilidad de tope es de valor arbitrario
(`max-w-(--content-max-inline)`), no depende de que el token esté registrado en
`@theme` para compilar. Emite exactamente el mismo CSS; lo único que cambia es
que la variable que consume no existe en tiempo de pintado.

`globals.css` restaurado; `git status` limpio para ese archivo (comprobado).

**NO se ha arreglado**, como se pidió. Apunte para quien lo arregle: el arreglo
correcto no es endurecer la regex, es **preguntárselo al CSS compilado** —que ya
está disponible en ese archivo vía `compileGlobalsCss()`— comprobando que la
declaración del token cae en una regla **sin condiciones**, que es justo la
comprobación que el archivo ya sabe hacer para la utilidad (`entry.conditions`).
La pieza existe; hay que apuntarla al otro lado.

---

### T5 — Verificación: `bash ./init.sh` → **EXIT 0**

Salida real (corrida sola, sin nada más en marcha — deuda 145):

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  81 passed | 3 skipped (84)
      Tests  1416 passed | 13 skipped (1429)
   Start at  13:37:57
   Duration  116.94s (transform 11.19s, setup 86.59s, import 108.65s, tests 57.83s, environment 39.46s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**La aritmética, sin residuo:**

| | archivos | tests |
|---|---|---|
| punto de partida medido | `81 passed \| 3 skipped (84)` | `1404 passed \| 13 skipped (1417)` |
| tests añadidos | 0 archivos nuevos | **+12** (3 breakpoint + 4 account-band + 5 archive-nav) |
| **esperado** | `81 \| 3 (84)` | `1416 \| 13 (1429)` |
| **obtenido** | `81 passed \| 3 skipped (84)` | `1416 passed \| 13 skipped (1429)` |

1404 + 12 = 1416 ✔ · 1417 + 12 = 1429 ✔ · saltados 13 sin tocar ✔ · archivos 84
sin tocar (los tres gates ya existían) ✔ · 116.94 s, en la misma horquilla que
los 127.63 s de referencia ✔.

---

## Archivos modificados

| archivo | qué |
|---|---|
| `src/shared/ui/breakpoint-tokens.test.ts` | `length()` permisiva → `lengthIn()` con `isAbsolutePxLength` + control positivo en 4 direcciones (+3 tests) |
| `src/shared/ui/layout/account-band/account-band.tokens.test.ts` | ídem + geometría reunida en `geometry(css)` + descubrimiento de tokens leídos (+4 tests) |
| `src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts` | ídem + corte en dos lectores (`lengthIn` px / `unitlessIn` sin unidad) (+5 tests) |

Ninguno **creado**. `src/shared/ui/testing/css-tokens.ts` **no se ha tocado**:
`isAbsolutePxLength()` se reutiliza tal cual, como pedía el encargo. `globals.css`
se mutó tres veces para medir y quedó restaurado y limpio en `git status` las tres
veces. `feature_list.json` no se ha tocado.

## Decisiones no obvias

1. **El corte en dos lectores en `archive-nav`** no es un extra: sin él el gate
   se pondría rojo contra un CSS correcto, porque lee `--leading-tight` (una
   proporción) y los `--z-nav-*` (profundidad de apilamiento) con el mismo
   ayudante que las longitudes. El criterio de alcance escrito en
   `isAbsolutePxLength` dice explícitamente que a esos **no** se les exige
   unidad. El lector nuevo les exige lo contrario, que es el error simétrico y
   es igual de silencioso.
2. **Los mutantes se fabrican quitando el sufijo del texto**, no leyendo el
   número con `parseFloat`. Así la dirección "sigue verde con px" no depende de
   que el CSS real ya esté bien, y no queda ni una lectura permisiva suelta en
   los tres archivos.
3. **`withValue()` lleva guardia.** Una mutación que no se aplica es un control
   positivo que miente en la dirección verde.
4. **Los tokens del control se descubren, no se enumeran.** Los apuntan los
   propios lectores. Una lista escrita a mano se queda corta en la siguiente
   edición sin que nadie lo note (deudas 40/43/71).
5. **No he tocado `progress/current.md`**: estaba modificado en disco por otra
   mano durante la sesión y no quería pisar ese cambio. Todo el estado de esta
   tanda está aquí.

## Deuda NUEVA encontrada (para que la fiche el leader, no la vuelco yo)

**A. Nada impide que aparezca un CUARTO gate con la lectura permisiva.**
Esta deuda se ha saldado gate por gate, a mano, por quinta vez en la misma
familia de fallo. Medición de hoy, ya con el arreglo puesto:

```
$ grep -rn "parseFloat" src --include=*.test.ts --include=*.test.tsx
breakpoint-tokens.test.ts:101        (dentro de lengthIn, validado)
account-band.tokens.test.ts:128      (dentro de lengthIn, validado)
app-shell.classes.test.ts:128        (dentro de tokenLength, validado en la ronda 3)
archive-nav.tokens.test.ts:107       (dentro de lengthIn, validado)
archive-nav.tokens.test.ts:140       (dentro de unitlessIn, validado)
```

Hoy los cinco call sites están validados. **Escenario de fallo concreto:** mañana
alguien escribe `foo.tokens.test.ts` con `const px = Number.parseFloat(value)` —
que es lo natural y lo que hicieron los cuatro anteriores—, deriva geometría con
él, y la sexta aparición de esta familia entra en el repo con toda la suite en
verde. **Cómo se mataría la CLASE:** un gate de repo (del estilo del de
no-hardcode, que ya barre `src/**`) que prohíba leer el valor de un token CSS con
una lectura numérica que no pase por `isAbsolutePxLength` o por un lector que
valide la unidad. Es la diferencia entre arreglar cinco casos y cerrar la puerta.

**B. `isDeclared()` — está en T4 arriba, con la prueba.** Resumen para la ficha:
la mitad hermana **deja de ser deducida y pasa a estar medida**. Con el token
metido en una media query, `app-shell.classes.test.ts` sale `14 passed` y la
suite entera `1416 passed`. **Ningún gate del repo cubre ese flanco.** La ficha
158 puede quitarle la etiqueta "NO medida".

**C. Menor, de forma del rojo.** En `account-band.tokens.test.ts` la derivación
es de ámbito de módulo, así que el fallo por unidad sale como error de carga del
archivo (`Tests no tests`) en vez de como un `it` en rojo. Es ruidoso y da exit
distinto de 0 —no es un verde falso—, pero cuesta más de leer. Si molesta, se
arregla moviendo la llamada a `geometry()` dentro de un `beforeAll`.

---

## Veredicto

Los tres gates arreglados, control positivo en cuatro direcciones por gate y
verificado además contra el `globals.css` REAL mutado. `bash ./init.sh` EXIT 0
con `1416 passed | 13 skipped (1429)`, que es exactamente el punto de partida más
los 12 tests añadidos. La medición extra de `isDeclared()` está hecha y **no**
arreglada, como se pidió.

---

## TANDA T6 (reanudada por el leader tras aprobar T1-T5)

Punto de partida nuevo: `81 passed | 3 skipped (84)` archivos,
`1416 passed | 13 skipped (1429)` tests.

Encargo:

- **T6 (a)** — arreglar `isDeclared()` en `app-shell.classes.test.ts`
  preguntándoselo al **CSS compilado** (`compileGlobalsCss()`), no endureciendo
  la regex: la declaración del token tiene que caer en una regla **sin
  condiciones**. Control positivo en las DOS direcciones (rojo con el token
  dentro de una condición —la mutación de T4, ya probada—, verde con el token en
  `@theme` como está hoy). Si `tokenValue()`/`tokenLength()` comparten el flanco
  y es el mismo puñado de líneas, cubrirlos; si es refactor grande, parar y
  reportar.
- **T6 (b)** — la (C) del informe: mover la derivación de `geometry()` de
  `account-band.tokens.test.ts` a un `beforeAll` para que el fallo salga como
  `it` en rojo y no como error de carga.
- **NO** se toca la (A) (gate de repo). La ficha el leader.

Plan:

- [ ] T6.0 — Leer `app-shell.classes.test.ts` entero y
      `class-names-from-source.ts` (qué devuelve `rulesFor` / `conditions`).
- [ ] T6.1 — Ámbito: ¿el compilado conserva la media query alrededor de la
      declaración del token? Medirlo antes de escribir el gate.
- [ ] T6.2 — `isDeclared()` sobre el compilado + control positivo 2 direcciones.
- [ ] T6.3 — Alcance de `tokenValue()`/`tokenLength()`.
- [ ] T6.4 — `beforeAll` en account-band.
- [ ] T6.5 — `bash ./init.sh` EXIT 0 y aritmética desde 1416.

### T6 (a) — `isDeclared()` / `tokenValue()` contra el CSS COMPILADO — HECHO

**Medición previa (T6.1), antes de escribir nada.** Se compiló `globals.css` con
el compilador real y se miró dónde cae la declaración del token, en los dos
estados:

```
hoy (en @theme):        {"selector":":root, :host","value":"1040px","conditions":[]}
con la mutación de T4:  {"selector":":root","value":"1040px","conditions":["@media (min-width: 5000px)"]}
```

El compilado **conserva la regla-arroba** alrededor de la declaración. Confirmado
también que los otros cuatro tokens que el gate lee (`--space-1`, `--space-4`,
`--space-6`, `--bp-tablet`) salen en `:root, :host`, sin condiciones y con valor
literal en píxeles — o sea que se les puede aplicar el mismo camino sin romper
nada.

**Cambios**

`src/shared/ui/testing/class-names-from-source.ts` (la pieza compartida):

- `compileCss(source)` — compila un TEXTO de CSS con el compilador de la app.
  `compileGlobalsCss()` pasa a ser un envoltorio de una línea sobre ella. Es lo
  que permite que el control positivo compile un `globals.css` mutado **de
  verdad** en vez de simular el compilado a mano.
- `globalsCssSource()` — el texto sin compilar, para quien necesite mutarlo sin
  volver a resolver la ruta del archivo por su cuenta.
- `declarationsOf(css, property)` + `EmittedDeclaration` — las declaraciones de
  una propiedad en el compilado, con **selector** y **condiciones**. Es
  literalmente la pregunta que `rulesFor` ya hacía para las utilidades
  (`conditions`), apuntada al otro lado. No toca la superficie pública del design
  system (`public-api.test.ts` cubre `./index`, `./primitives` y `./feedback`, no
  `./testing`).

`src/shared/ui/layout/app-shell/app-shell.classes.test.ts`:

- **La regex sobre el texto se abandona, no se endurece**, como se pidió. Se
  borra la lectura cruda de `globals.css` (`GLOBALS_CSS` y el `readFileSync`
  asociado); ahora hay `effectiveDeclarationsIn(compiled, name)`: las
  declaraciones que el compilador emite **en la raíz** y **sin condición**.
- `isDeclared()` y `tokenValue()` pasan por ahí. **`tokenLength()` queda cubierto
  de rebote**, porque lee a través de `tokenValue()` — era el alcance que el
  encargo pedía comprobar, y ha salido el mismo puñado de líneas, sin refactor
  grande.
- La comparación de nombre **entero** que protegía del verde falso de la ronda 1
  se conserva y mejora: `declarationsOf` compara la propiedad **por igualdad**,
  no por subcadena ni por una frontera escrita a mano.
- Se cubre además la **otra mitad del ámbito**: `ROOT_SELECTOR`. Un token
  declarado sin condición pero bajo un selector que no alcanza al caparazón
  tampoco existe para él.
- El cuerpo del `it` real se extrae a `capTokens(compiled)` /
  `undeclaredCapTokens(compiled)`, para que el control positivo corra **la misma
  función** que el aserto de verdad.

**Control positivo — 3 tests nuevos, en las DOS direcciones**

| dirección | resultado |
|---|---|
| token dentro de una consulta de medios inalcanzable (la mutación medida en T4) | `undeclaredCapTokens` devuelve `[--content-max-inline]` → gate ROJO ✓ |
| token bajo un selector que no es la raíz | gate ROJO ✓ |
| token en `@theme`, como está hoy | gate VERDE ✓ |

El primero comprueba antes que `capTokens(conditional)` sigue siendo igual que
`capTokens(css)`: si la mutación hubiera roto la utilidad en vez de mover el
token, el rojo vendría de otro sitio y el control no mediría lo que dice medir.

**Medición sobre el `globals.css` REAL** (la mutación de T4, aplicada en disco):

```
antes de T6 (medido en T4):  Test Files 1 passed | Tests 14 passed (14)
después de T6:               Test Files 1 failed | Tests 6 failed | 11 passed (17)
```

Y los que caen son `it` **reales**, cinco de ellos:

```
× cuadra con las tres columnas de tarjeta a su ancho máximo
× el tope se declara con unidad de longitud, no con un número pelado
× cae exacto en la rejilla de espaciado de la app
× no muerde por debajo del ancho de tablet
× ningún tope del caparazón apunta a un token que no exista
× (control) y con el token declarado sin condición, como está hoy, sigue VERDE
```

`globals.css` restaurado, `git status` limpio para ese archivo.

Tests: 14 → 17 (**+3**).

### T6 (b) — el rojo de `account-band` sale como `it`, no como error de carga — HECHO

Primero se probó con `beforeAll`, que es lo que pedía el encargo, y **se midió
que no sirve**: un hook que lanza deja los tests como **saltados**
(`Tests 13 skipped (13)`), y un resumen lleno de "skipped" se lee como si no
pasara nada — cambia un rojo mal etiquetado por otro.

La forma que sí cumple el objetivo es **derivación perezosa y memorizada**:
`bandGeometry()` corre la primera vez que un test la pide y guarda el resultado;
`geometryLengthTokens()` fuerza la derivación antes de fotografiar los tokens
leídos. Medido con `--touch-target: 44em` en el `globals.css` real:

```
antes (ámbito de módulo): Test Files 1 failed | Tests no tests
con beforeAll:            Test Files 1 failed | Tests 13 skipped (13)
perezosa (lo entregado):  Test Files 1 failed | Tests 6 failed | 7 passed (13)
  × la pestaña de la última columna en la ranura 6 no deja techo para un control
  × por eso va en el FLUJO: su borde inferior queda por encima del cajón
  × (los cuatro del control positivo)
```

Ahora el rojo dice **qué invariante se rompió**. Los `it` que dependen de la
geometría desestructuran el resultado al principio del cuerpo, así que los
asertos se leen igual que antes. Tests: 13 → 13 (**+0**).

### Un rojo que apareció por el camino (y por qué NO se tocó el gate que lo dio)

La primera corrida completa de T6 salió `1 failed`:

```
× has no raw px sizes in shared\ui\testing\class-names-from-source.ts
```

Causa: el comentario que escribí en la pieza compartida citaba la mutación con el
número **escrito en píxeles**, y `no-hardcode.test.ts` barre ese archivo (no es
un `.test.`) sin distinguir una longitud en la prosa de una en el código. El
guardrail tenía razón y **no se ha tocado**: se reescribió la prosa sin el
literal y se dejó dicho ahí mismo por qué. Es la misma disciplina que ese archivo
ya tiene con los nombres de clase en los comentarios.

### T6.5 — Verificación: `bash ./init.sh` → **EXIT 0**

```
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 Test Files  81 passed | 3 skipped (84)
      Tests  1419 passed | 13 skipped (1432)
   Start at  13:55:36
   Duration  199.31s (transform 19.04s, setup 154.32s, import 198.15s, tests 103.14s, environment 59.37s)

[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**Aritmética desde el punto de partida de T6:**

| | archivos | tests |
|---|---|---|
| partida (fin de T5) | `81 passed \| 3 skipped (84)` | `1416 passed \| 13 skipped (1429)` |
| T6 (a) app-shell | +0 | **+3** |
| T6 (b) account-band | +0 | **+0** (misma cuenta, otra forma de rojo) |
| **esperado** | `81 \| 3 (84)` | `1419 \| 13 (1432)` |
| **obtenido** | `81 passed \| 3 skipped (84)` | `1419 passed \| 13 skipped (1432)` |

1416 + 3 = 1419 ✔ · 1429 + 3 = 1432 ✔ · saltados 13 sin tocar ✔ · 84 archivos,
ninguno creado ✔.

**Sobre la duración, que subió (199 s / 172 s frente a los 117 s de T5).** No lo
achaco a la deuda 145 sin comprobarlo, como se me pidió: **la máquina estaba
libre y mis comandos van en serie**, no hubo ninguna corrida solapada. Dos
corridas completas seguidas dieron **el mismo resultado** (`1419 passed`, cero
fallos, ningún test caído por timeout) con **199.31 s** y **172.24 s**. El archivo
que toqué cuesta **2.18 s él solo** con sus 17 tests (antes de T6: 1.86 s con 14),
o sea que las dos compilaciones extra de Tailwind del control positivo aportan
~0.3 s: los 55-80 s de diferencia **no salen de este cambio**. El desglose lo
confirma — lo que crece es `setup` (86 → 154 s) e `import` (108 → 198 s), que son
el arranque del entorno por archivo y no dependen de nada de lo que toqué.
Variación de máquina, sin síntoma de la 145.

## Archivos de T6

| archivo | qué |
|---|---|
| `src/shared/ui/testing/class-names-from-source.ts` | + `compileCss()`, `globalsCssSource()`, `declarationsOf()` y `EmittedDeclaration` |
| `src/shared/ui/layout/app-shell/app-shell.classes.test.ts` | `isDeclared`/`tokenValue`/`tokenLength` leen del CSS **compilado** (raíz + sin condición); + control positivo en dos direcciones (+3 tests) |
| `src/shared/ui/layout/account-band/account-band.tokens.test.ts` | derivación perezosa y memorizada: el rojo sale como `it` |

`globals.css` se mutó tres veces más para medir y quedó restaurado y limpio en
`git status` las tres veces. `feature_list.json` sigue sin tocarse. La (A) del
informe —el gate de repo que mataría la clase entera— **no se ha abierto**, como
se ordenó.

## Veredicto de T6

- La mitad hermana está cerrada por la vía buena: se le pregunta al **compilado**,
  no a la regex, y de rebote quedan cubiertos `tokenValue()` y `tokenLength()`.
- El control positivo corre en las dos direcciones y además contra el
  `globals.css` real: la mutación que en T4 daba `14 passed` ahora deja el gate
  con `6 failed | 11 passed`, cinco de ellos `it` reales.
- El rojo de `account-band` ya se lee: `beforeAll` se probó, se midió que sólo
  cambia "no tests" por "13 skipped", y se entregó la forma perezosa que sí
  nombra el invariante roto.
- `bash ./init.sh` EXIT 0 con `1419 passed | 13 skipped (1432)`: 1416 + 3, sin
  residuo.
