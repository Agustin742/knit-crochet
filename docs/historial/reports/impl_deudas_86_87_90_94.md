# impl — lote de deudas 86 / 87 / 90 / 94 (enablers de #19 `dashboard_ui`)

> **No es una feature de `feature_list.json`.** Ese archivo **no se tocó** (sigue con 33 features y ninguna
> `in_progress`). Es un lote de deuda técnica sobre `src/shared/ui/`, pedido como enabler de #19.
>
> Baseline verificada por el leader en `3d244f1` con el árbol limpio: **60 passed | 3 skipped** archivos,
> **756 passed | 13 skipped** tests. **Reproducida por mí antes de tocar nada** (salida pegada abajo).

---

## 0. Resumen en una tabla

| Deuda | Qué se hizo | Dónde | Gate nuevo |
|---|---|---|---|
| **86** | Port 1:1 del shimmer del template, con banda / duración / curva **tokenizadas** | `globals.css`, `skeleton.variants.ts`, `Skeleton.tsx` | `skeleton.tokens.test.ts` (**sobre el CSS compilado**) |
| **87** | Bloqueo del `overflow` del raíz con **contador de referencias** | `root-scroll-lock.ts` (nuevo), `Dialog.tsx` | 6 tests en `Dialog.test.tsx` + aserto de `afterEach` |
| **90** | Prop `initialFocusRef` con repliegue al panel; **default intacto** | `Dialog.tsx` | 7 tests en `Dialog.test.tsx` |
| **94** | Prosa corregida en **los tres** sitios + el razonamiento convertido en test | `Dialog.tsx`, `dialog.variants.ts`, `Dialog.test.tsx` | `dialog.portal.tokens.test.ts` |

**Resultado:** `60 → 62` archivos de test, `756 → 788` tests. **+32 tests, 0 regresiones, 0 skips nuevos.**

---

## 1. Archivos creados y modificados

### Creados (3)

| Archivo | Qué es |
|---|---|
| `src/shared/ui/primitives/dialog/root-scroll-lock.ts` | El bloqueo de scroll con contador de referencias (deuda 87) |
| `src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts` | Gate del shimmer **sobre el CSS compilado** (deuda 86) |
| `src/shared/ui/primitives/dialog/dialog.portal.tokens.test.ts` | El porqué del portal, convertido en aserciones (deuda 94) |

### Modificados (7 de código + `progress/`)

```
 progress/current.md                                |  19 ++
 progress/deudas.md                                 |  (86/87/90/94 tachadas + fichas 95-102)
 src/app/globals.css                                |  39 ++++
 src/shared/ui/primitives/dialog/Dialog.test.tsx    | 237 ++++++++++++++++++++-
 src/shared/ui/primitives/dialog/Dialog.tsx         |  70 +++++-
 src/shared/ui/primitives/dialog/dialog.variants.ts |  11 +-
 src/shared/ui/primitives/skeleton/Skeleton.test.tsx|  48 +++--
 src/shared/ui/primitives/skeleton/Skeleton.tsx     |  18 +-
 src/shared/ui/primitives/skeleton/skeleton.variants.ts | 27 ++-
```

**`src/shared/ui/public-api.test.ts` NO cayó, y está bien que no cayera.** Lo comprobé en vez de suponerlo:
el aviso decía que caería al añadir o cambiar un export de `primitives/` o `feedback/`, y aquí **no cambió
ninguno**. `initialFocusRef` es una **prop** (no un export); `root-scroll-lock` **no se reexporta** desde
`dialog/index.ts` a propósito (ficha 98); y `SKELETON_ANIMATED_CLASS` → `SKELETON_ANIMATED_CLASSES` es un
símbolo que **`skeleton/index.ts` nunca exportó** — sólo lo consumen el componente y sus tests. La superficie
pública del template portable queda **byte a byte igual**.

---

## 2. Deuda 86 — el shimmer

### Qué había

`animate-pulse`, la utilidad de fábrica de Tailwind. El CSS compilado daba `pulse 2s cubic-bezier(.4,0,.6,1)
infinite`: ni la duración ni la curva eran tokens del sistema, y el guardrail de no-hardcode **no puede
verlo** porque no lleva ni `px` ni color. Y encima era el efecto equivocado.

### Qué dice el template (la fuente que el leader localizó)

```
línea  25: @keyframes kc-shimmer { 0% { background-position: -200px 0 } 100% { background-position: 200px 0 } }
línea 140: .kc-skeleton { background: linear-gradient(90deg, var(--surface-sunken) 25%, var(--brand-cream) 50%,
                          var(--surface-sunken) 75%); background-size: 200px 100%;
                          animation: kc-shimmer 1.4s linear infinite; border-radius: var(--radius-sm); }
```

### Qué se hizo — `globals.css`

Seis tokens nuevos y una regla de fotogramas, todo dentro de `@theme`:

| Token | Valor | De dónde sale |
|---|---|---|
| `--dur-shimmer` | `1400ms` | `1.4s` del template |
| `--ease-loop` | `linear` | `linear` del template |
| `--skeleton-band` | `200px` | `200px` del template |
| `--skeleton-band-size` | `var(--skeleton-band) 100%` | derivado de la banda |
| `--skeleton-gradient` | `linear-gradient(90deg, ...)` | el degradado del template |
| `--animate-skeleton` | `kc-shimmer var(--dur-shimmer) var(--ease-loop) infinite` | compone los anteriores |

Más `@keyframes kc-shimmer`, con `calc(-1 * var(--skeleton-band))` y `var(--skeleton-band)`: **un solo token
gobierna a la vez el tamaño del fondo y el recorrido**, así que no se pueden desincronizar. El componente no
escribe ningún número: nombra `animate-skeleton` y dos utilidades que consumen los tokens de fondo.

### Decisiones no obvias

- **`--ease-loop`, no `--ease-linear`.** Tailwind v4 ya trae una utilidad estática para la curva lineal;
  declarar un token con ese nombre habría creado una segunda definición de la misma utilidad. El nombre
  elegido además es semántico como sus hermanas (`--ease-standard`/`--ease-entrance`/`--ease-exit`): un bucle
  continuo no acelera ni frena porque se vería la costura entre vueltas.
- **`--dur-shimmer` no entra en la escala rápido/base/lento** porque no mide una transición de interfaz, mide
  una vuelta completa de un bucle. Está documentado en el propio `globals.css`.
- **Quieto ≠ invisible.** Con `prefers-reduced-motion` el degradado **se quita entero** en vez de congelarse a
  mitad de recorrido. Congelarlo dejaría franjas repetidas del degradado (ruido); quitándolo queda la
  superficie hundida de la base, que se sigue leyendo como un bloque de carga. Hay un test que lo dice con
  esas palabras: *"quieto NO es invisible: conserva la superficie hundida de la base"*.
- **`prefers-reduced-motion` sigue resolviéndose en JS**, con el mismo hook de `shared/ui/lib/`. No se
  degradó nada: los tres tests de preferencia que ya existían siguen ahí, sólo que ahora iteran sobre
  conjuntos de clases en vez de sobre una sola. Eso obligó a renombrar las dos constantes a plural
  (`SKELETON_ANIMATED_CLASSES` / `SKELETON_STILL_CLASSES`), que **no son API pública**.

### Por qué el gate mide el CSS compilado (REGLA 7)

*"Un gate que sólo corre sobre el doble no mide producción."* Aquí el doble sería el **fuente**: una regla de
fotogramas declarada pero **no emitida** anima exactamente nada, y una utilidad que Tailwind no genera es una
clase inerte en el atributo `class`. Leyendo `globals.css` como texto, los dos fallos se ven verdes.
`skeleton.tokens.test.ts` compila con `postcss` + `@tailwindcss/postcss` (misma técnica que
`src/app/globals-css.test.ts`) y asierta sobre la salida.

Verificación adicional, **sobre el bundle de producción de verdad** (no sobre la corrida del test):

```
$ f=.next/static/chunks/1wccx2690-wow.css
@keyframes kc-shimmer{0%{background-position:calc(-1 * var(--skeleton-band)) 0}to{background-position:var(--skeleton-band) 0}}
--animate-skeleton:kc-shimmer var(--dur-shimmer) var(--ease-loop) infinite;
--dur-shimmer:1.4s;
--ease-loop:linear;
--skeleton-band:200px;
--skeleton-band-size:var(--skeleton-band) 100%;
--skeleton-gradient:linear-gradient(90deg, var(--surface-sunken) 25%, var(--brand-cream) 50%, var(--surface-sunken) 75%);
.animate-skeleton{animation:var(--animate-skeleton)}
.bg-\(image\:--skeleton-gradient\){background-image:var(--skeleton-gradient)}
.bg-size-\(--skeleton-band-size\){background-size:var(--skeleton-band-size)}
.bg-none{background-image:none}

$ grep -c "animate-pulse" "$f"
0
```

El minificador escribe `1.4s` (el valor del template, tal cual) y `to` por `100%`. **La utilidad de latido ya
no aparece ni una vez en el CSS de producción.**

---

## 3. Deuda 87 — el scroll del fondo

`primitives/dialog/root-scroll-lock.ts` bloquea el `overflow` del elemento raíz mientras haya algún diálogo
abierto. El `Dialog` lo consume desde un `useEffect` propio cuyo **valor de retorno es el soltador**.

### Las tres trampas, decididas explícitamente

**1. Desmontar sin cerrar.** Resuelto: el soltador **es** la limpieza del efecto, no una llamada aparte que
alguien pueda olvidar. **Testeado** (`lo suelta aunque el diálogo se DESMONTE sin cerrarse`), porque "lo da
gratis un `useEffect`" es exactamente la clase de afirmación que deja de ser cierta con un refactor.

**2. Dos diálogos a la vez → SE RESUELVE, con contador de referencias.** No se declara fuera de alcance.
Razón de la decisión: el arreglo cuesta unas líneas y la alternativa —guardar el valor previo en cada
diálogo— **falla en un caso realista**, no teórico. Con guardar-y-restaurar:

- cerrar el de **arriba** funciona por accidente (restaura el `hidden` que había puesto el de abajo);
- cerrar el de **abajo** con el de arriba todavía abierto **devuelve el scroll**, que es el bug original
  reapareciendo dentro de su propio arreglo.

Hay **un test para cada orden de cierre**, justamente porque el primero no discrimina. Medido:
la mutación "guardar-y-restaurar sin contador" deja verde el test de cerrar-arriba y **rojo el de
cerrar-abajo** (salida en §6).

**3. No pisar un valor previo.** Se guarda el `overflow` en línea que hubiera antes del **primer** bloqueo y
se restaura ese. **Testeado** partiendo de un valor previo puesto a mano.

Extra no pedido: cada soltador es **idempotente**. Llamarlo dos veces no descuenta dos veces — que es como se
corrompe un contador, y React monta y limpia efectos dos veces en modo estricto.

### Un detalle del propio test que se corrigió sobre la marcha

El `afterEach` de `Dialog.test.tsx` **asierta** que ningún diálogo se fue sin soltar el bloqueo (el contador
es estado de módulo: si un test lo deja puesto, el siguiente mide otra cosa). La primera versión asertaba
**antes** de limpiar, y en la mutación 87-A eso convirtió **5 rojos reales en 13**, arrastrando en cascada
tests de foco y de `axe` que no tenían nada que ver. Se cambió a *limpiar y luego asertar sobre el valor
capturado*. **Es literalmente el aviso de la REGLA 3** —en #31 un informe declaró 9 rojos donde salían 12—
visto desde el otro lado: un gate que exagera el daño es tan malo para diagnosticar como uno que lo esconde.
Los dos números están abajo, el malo y el bueno.

---

## 4. Deuda 90 — foco inicial configurable

Prop opcional `initialFocusRef?: RefObject<HTMLElement | null>`.

**El default no cambia.** Sin la prop, el efecto hace exactamente lo de antes: enfocar el panel. Los tests que
ya existían (`al abrir, el foco entra en el diálogo`, los cuatro de la trampa de foco, los tres del retorno al
disparador) siguen verdes sin tocarlos, y además hay uno nuevo que lo dice explícitamente: *"SIN la prop,
sigue enfocando el panel exactamente como antes"*.

### El repliegue, y por qué se decidió así

```ts
const target =
  requested && panel && focusableWithin(panel).includes(requested)
    ? requested
    : panel;
target?.focus();
```

La condición **se deriva de `focusableWithin`**, la misma lista que usa la trampa de `Tab`. Consecuencias
buscadas: no hay dos criterios de "enfocable" que se puedan desincronizar, y los tres casos malos —no montado,
no enfocable, fuera del panel— se cubren con una sola comprobación. El repliegue es **el panel**, nunca "nada":
quedarse sin enfocar deja el foco en el `body`, o sea a quien navega por teclado tirado al principio del
documento, que es el fallo que el invariante 3 existe para evitar.

**El dato que justifica no confiar en el DOM (REGLA 7).** Lo medí en vez de suponerlo: con la mutación
"obedecer la prop a ciegas", el test del `input` deshabilitado **se pone rojo** — es decir, **happy-dom sí
enfoca un control deshabilitado**. Si el repliegue se hubiera apoyado en *"llamo a `focus()` y luego miro
dónde quedó el foco"*, el gate habría dado verde sin repliegue ninguno. Decidir explícitamente es lo que hace
que el test mida la decisión y no la buena voluntad del doble.

**Limitación aceptada y fichada (99, y la restricción de `tabindex="-1"`):** sólo se puede pedir foco sobre
algo que la trampa ya reconoce como parada de tabulación, y la decisión se toma una sola vez al abrir.

---

## 5. Deuda 94 — la prosa del portal

**La conclusión no se tocó: el portal al `body` sigue siendo obligatorio.** Lo que cambió es la explicación.

### Los tres valores, verificados en `globals.css` antes de escribirlos

```
--z-base: 1;      (globals.css)
--z-nav: 100;     (globals.css)
--z-overlay: 200; (globals.css)
--z-modal: 300;   (globals.css)
```

Y las dos afirmaciones estructurales, comprobadas en el código y no copiadas del enunciado:

- `AppShell.tsx`: el `main` lleva posición relativa **y** el token de la capa base → **abre un contexto de
  apilamiento propio en el escalón 1**, y `{children}` vive dentro.
- `ArchiveNav.tsx:76` y `BottomNav.tsx:32` declaran el token de nav, y en `AppShell` los dos son **hermanos**
  del `main`, no descendientes.
- `archive-nav.variants.ts:72` y `:133`: el archivero crea su contexto con `filter: drop-shadow(...)`.
  **No hay ningún `transform`** — lo verifiqué leyendo el archivo.

### Se corrigieron TRES sitios, no uno

La causa equivocada estaba repetida en `Dialog.tsx` (docblock), en `dialog.variants.ts` (comentario de
z-index) y en el comentario del test del portal en `Dialog.test.tsx`. Corregir uno solo habría dejado dos
copias del razonamiento que empuja a quitar el portal.

### Y se convirtió en test — decisión y justificación

El enunciado lo ofrecía como opcional ("si podés, mejor que un comentario"). **Se hizo**, y la razón es el
escenario de fallo de la propia ficha: alguien lee el comentario, va a comprobarlo, ve que la premisa es falsa
y quita el portal. **Un comentario no impide dos veces el mismo error.** Ya falló una vez —lo escribió el
implementer de #33 y lo cazó su reviewer—, así que la probabilidad de que vuelva a fallar no es hipotética.

`dialog.portal.tokens.test.ts` ata las cuatro piezas del argumento, cada una por separado:

1. el `main` está posicionado **y** lleva `z-index` (las **dos** condiciones de un contexto de apilamiento —
   con una sola no habría jaula y el portal sobraría);
2. el contenido de la página vive dentro de esa jaula;
3. los dos navs declaran el escalón de nav y **ninguno se monta dentro del `main`**;
4. `--z-base` < `--z-nav` < `--z-modal`, y el velo entre nav y panel.

La otra mitad —que el panel **de verdad** sale del árbol— ya se mide en runtime en `Dialog.test.tsx`, y los
dos archivos se citan mutuamente.

**Nombres de clase:** en ese test se arman por concatenación en runtime (`z-(` + token + `)`, y la utilidad de
posición partida en dos). Ni un nombre de clase literal, porque Tailwind escanea también los `.test.ts`
(REGLA 1). Precio del acoplamiento a `AppShell`: **ficha 100**.

---

## 6. REGLA 3 — condición doble, en las dos direcciones, con la salida real

Método: copia byte a byte de cada archivo al scratchpad **antes** de mutarlo y restauración con `cp`, para que
no quede ni un carácter movido. Comprobado al final con `git status` (§7).

### Gate 86

**86-A — volver al latido de fábrica** (`SKELETON_ANIMATED_CLASSES = ["animate-pulse"]`):

```
 ❯ src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts (9 tests | 1 failed) 240ms
     × el Skeleton no vuelve al latido de opacidad de fábrica 9ms
AssertionError: expected [ 'animate-pulse' ] to not include 'animate-pulse'
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 17 passed (18)
```

→ restaurado: `Test Files 2 passed (2) · Tests 18 passed (18)`

**Nota honesta:** **1 rojo, no más**. Los tests de comportamiento del `Skeleton` siguen verdes porque
**derivan** de la constante (REGLA 2b, que es como tienen que estar). El que cae es el ancla, que es
justamente su trabajo.

**86-B — borrar la regla de fotogramas de `globals.css`** (el caso "declarado pero no emitido"):

```
 ❯ src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts (9 tests | 1 failed) 268ms
     × la regla de fotogramas SE EMITE y recorre de menos una banda a más una banda 6ms
Error: la regla de fotogramas kc-shimmer no se emitió
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 17 passed (18)
```

**86-C — los valores CORRECTOS pero escritos a mano** (`kc-shimmer 1400ms linear infinite`, sin tokens):

```
     × la duración y la curva se referencian, no se escriben dentro de la animación 5ms
AssertionError: expected 'kc-shimmer 1400ms linear infinite' to contain 'var(--dur-shimmer)'
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 17 passed (18)
```

Esta es **la mutación que define la deuda 86**: el efecto se ve idéntico y el ancla de valores sigue verde
(`la animación resuelve a los valores del template` **no cae**, porque los valores son los mismos). Lo único
que cae es el test de que salgan de tokens. Justo lo que la ficha pedía vigilar.

**86-D — la banda se desvía del template** (`200px` → `240px`):

```
     × la banda mide lo que mide en el template, y gobierna el tamaño del fondo 10ms
     × la regla de fotogramas SE EMITE y recorre de menos una banda a más una banda 1ms
 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 16 passed (18)
```

Caen **dos**, y eso confirma que la banda gobierna de verdad las dos cosas.

→ restaurado tras B/C/D: `Test Files 2 passed (2) · Tests 18 passed (18)`, y
`git diff --stat src/app/globals.css` → `1 file changed, 39 insertions(+)` (las mismas 39 de mi cambio, cero
borrados: el archivo volvió a su sitio).

### Gate 87

**87-A — quitar el bloqueo entero** (efecto + import fuera):

```
     × bloquea el scroll del elemento raíz mientras está abierto 58ms
     × lo suelta aunque el diálogo se DESMONTE sin cerrarse 2ms
     × con dos abiertos, cerrar el de ARRIBA no devuelve el scroll 2ms
     × con dos abiertos, cerrar el de ABAJO tampoco lo devuelve 3ms
     × restaura el overflow que ya hubiera, no un valor fijo 4ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 1 passed (2)
      Tests  5 failed | 34 passed (39)
```

> **El número anterior, y por qué cambió.** La **primera** corrida de esta misma mutación dio
> `Tests 13 failed | 26 passed (39)`, con tests de foco y de `axe` en rojo. **No eran 13 fallos: eran 5 y una
> cascada** — el `afterEach` asertaba antes de limpiar, así que el `scroll` que dejó un test se propagó a
> todos los siguientes. Se arregló el `afterEach` (limpiar y luego asertar sobre el valor capturado) y la
> mutación se volvió a correr. Dejo los dos números porque el primero es el que un informe descuidado habría
> pegado como "13 rojos, gate potentísimo".

`lo devuelve al cerrar` **queda verde** con la mutación, y es correcto: sin bloqueo el valor ya es `""`, que
es lo que ese test espera. Lo cubre el primero de la lista.

**87-B — guardar-y-restaurar sin contador de referencias:**

```
     × con dos abiertos, cerrar el de ABAJO tampoco lo devuelve 8ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected '' to be 'hidden'
AssertionError: un diálogo se fue sin soltar el bloqueo: expected 'hidden' to be ''
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 38 passed (39)
```

**1 rojo, y es el que tenía que ser.** `cerrar el de ARRIBA` sigue verde: la implementación ingenua acierta
ese caso por accidente. Sin el test del orden inverso, esta mutación habría pasado entera.

→ restaurado: `Test Files 2 passed (2) · Tests 39 passed (39)`

### Gate 90

**90-A — ignorar la prop** (siempre el panel, o sea el comportamiento de antes de la deuda):

```
     × enfoca el campo pedido cuando la prop apunta a uno de dentro 71ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 38 passed (39)
```

**1 rojo, y los otros 38 verdes es el resultado deseado**: prueba que el default no se movió.

**90-B — obedecer la prop a ciegas, sin repliegue** (`requested ?? panel`):

```
     × repliega al panel si el elemento pedido no es enfocable 72ms
     × repliega al panel si el elemento pedido está FUERA del diálogo 41ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 37 passed (39)
```

`repliega al panel si el elemento pedido no llegó a montarse` **queda verde** aquí, y lo digo en vez de
callarlo: el `??` ya cubre el `null`. Lo distingue la mutación siguiente.

**90-C — sin repliegue ninguno** (`const target = requested`):

```
     × al abrir, el foco entra en el diálogo 74ms
     × tabular en círculo nunca saca el foco del diálogo 92ms
     × tabular hacia atrás tampoco lo saca 121ms
     × el ciclo recorre TODAS las paradas del diálogo, en orden 224ms
     × cierra con Escape y avisa al llamador 109ms
     × cierra con Escape desde cualquier control de dentro 117ms
     × lo devuelve al cerrar 95ms
     × SIN la prop, sigue enfocando el panel exactamente como antes 68ms
     × repliega al panel si el elemento pedido no llegó a montarse 66ms
     × repliega al panel si el elemento pedido no es enfocable 50ms
     × repliega al panel si el elemento pedido está FUERA del diálogo 61ms
⎯⎯⎯⎯⎯⎯ Failed Tests 11 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 1 passed (2)
      Tests  11 failed | 28 passed (39)
```

11 rojos: sin foco inicial se cae media suite del diálogo. Es la prueba de que el repliegue no es cosmético.

→ restaurado: verde.

### Gate 94

**94-A — el `main` pierde posición y `z-index`** (deja de ser jaula):

```
     × está posicionado Y lleva z-index: las dos condiciones de un contexto de apilamiento 7ms
AssertionError: el main dejó de estar posicionado: expected '<main className="flex-1">' to contain 'relative'
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

**94-B — invertir la desigualdad de tokens** (`--z-base: 1` → `500`):

```
     × el escalón de la jaula es MENOR que el del nav 3ms
     × el token del modal es MAYOR que el del nav, y aun así no alcanza 1ms
AssertionError: expected 500 to be less than 100
AssertionError: expected 500 to be less than 300
 Test Files  1 failed (1)
      Tests  2 failed | 5 passed (7)
```

**94-C — meter los navs DENTRO del `main`** (compartirían jaula: el portal dejaría de hacer falta):

```
     × ninguno de los dos se monta dentro del main 7ms
AssertionError: expected '<main className="relative flex-1 z-(-…' not to contain 'ArchiveNav'
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

**94-D — el escenario de la ficha: alguien lee, se convence y QUITA el portal:**

```
     × se monta en un portal al body, fuera del árbol de la página 70ms
AssertionError: expected true to be false
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 38 passed (39)
```

→ restaurado en los cuatro casos: verde.

---

## 7. El árbol quedó byte a byte como estaba (comprobado)

`AppShell.tsx` se mutó dos veces (94-A y 94-C) y **no aparece en `git status`**, que es la prueba de que
volvió idéntico. Igual `globals.css`, `Dialog.tsx`, `skeleton.variants.ts` y `root-scroll-lock.ts`, cuyos
diffs son exactamente los de mi trabajo:

```
$ git status --short
 M progress/current.md
 M src/app/globals.css
 M src/shared/ui/primitives/dialog/Dialog.test.tsx
 M src/shared/ui/primitives/dialog/Dialog.tsx
 M src/shared/ui/primitives/dialog/dialog.variants.ts
 M src/shared/ui/primitives/skeleton/Skeleton.test.tsx
 M src/shared/ui/primitives/skeleton/Skeleton.tsx
 M src/shared/ui/primitives/skeleton/skeleton.variants.ts
?? src/shared/ui/primitives/dialog/dialog.portal.tokens.test.ts
?? src/shared/ui/primitives/dialog/root-scroll-lock.ts
?? src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts
```

(`progress/deudas.md` y este informe se escribieron después de esta comprobación.)

---

## 8. Verificación

### Baseline, reproducida por mí ANTES de tocar nada

```
$ pnpm test --silent
 Test Files  60 passed | 3 skipped (63)
      Tests  756 passed | 13 skipped (769)
   Duration  56.25s
```

Coincide con la del leader.

### `bash ./init.sh` — final

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
[OK]    feature_list.json válido (33 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  62 passed | 3 skipped (65)
      Tests  788 passed | 13 skipped (801)
   Start at  00:51:46
   Duration  56.72s (transform 4.47s, setup 44.22s, import 47.47s, tests 31.77s, environment 17.25s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**60 → 62 archivos, 756 → 788 tests. Los 3 smokes siguen `skipped` y compilando (13 skipped, igual que la
baseline).**

### `pnpm build`

```
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 10.0s
  Running TypeScript ...
  Finished TypeScript in 10.4s ...
  Collecting page data using 3 workers ...
✓ Generating static pages using 3 workers (15/15) in 305ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/auth/login
  … (23 rutas de API sin cambios)
├ ƒ /login
└ ○ /register

ƒ Proxy (Middleware)
```

### Checklist visual del SDD §9

| Punto | Estado |
|---|---|
| 1. RTL + `user-event`, comportamiento y a11y | ✅ 32 tests nuevos |
| 2. Smoke de render | ✅ los que ya había, intactos |
| 3. `axe` en primitivos | ✅ `Skeleton` y `Dialog` siguen con el suyo, verde |
| 4. Typecheck + lint + build | ✅ arriba |
| 5. Fidelidad visual | ⚠️ **revisión humana pendiente** → fichas **95** y **102** |

No aplica smoke de ruta: no se montó ninguna página.

---

## 9. Reglas del repo aplicadas

- **pnpm siempre.** Ni un `npm`/`npx` en toda la sesión.
- **REGLA 1 (clases de Tailwind).** Ningún nombre de clase con comodín ni inventado, en ningún sitio. En los
  tests nuevos los nombres se arman por concatenación o se **importan** del módulo de variantes; en este
  informe se describen en prosa salvo las que aparecen dentro de salidas reales pegadas (que son literales
  válidos y ya existentes). En `progress/deudas.md` reescribí en prosa incluso las formas con comodín que la
  ficha 86 original citaba.
- **Gotcha de `globals.css`:** ningún nombre de clase en los comentarios nuevos, así que no hay forma de que
  una secuencia de cierre de comentario quede pegada a un prefijo de utilidad.
- **Guardrail de no-hardcode:** los tres archivos nuevos entran solos en el barrido por directorios.
  `root-scroll-lock.ts` no lleva números ni colores; los dos `.test.ts` están excluidos por diseño. **Todo
  número y color nuevo vive en `globals.css`.**
- **Guardrail de sintaxis canónica:** las dos utilidades nuevas usan la forma corta con paréntesis.
- **`Dialog` en portal:** todos los tests nuevos lo buscan por `screen`/`document.body`, nunca por el
  `container` de `render()`; el `axe` va sobre el documento.
- **`// @vitest-environment happy-dom`** en los tests de componente. Los dos tests de tokens **no** lo llevan
  a propósito: no montan nada, leen archivos y compilan CSS.
- **REGLA 2, las dos piezas.** (a) Un ancla por contrato: `TEMPLATE` en `skeleton.tokens.test.ts` (los valores
  del template, escritos a mano una sola vez, con el porqué al lado) y los cuatro `z-index` en el gate del
  portal. (b) Todo lo de comportamiento **deriva**: las clases se importan de las variantes, la lista de
  paradas de tabulación se lee del DOM, el tamaño del fondo se comprueba **derivado** de la banda.
- **REGLA 7.** El gate del shimmer corre sobre el **CSS compilado**, y encima se comprobó el **bundle de
  producción**; el repliegue del foco se decide en el código en vez de confiar en el `focus()` de happy-dom,
  y esa desconfianza resultó estar **medida y justificada** (happy-dom enfoca controles deshabilitados).

---

## 10. Deudas nuevas propuestas (95-102)

Ya escritas en `progress/deudas.md`, al final, bajo *"Nuevas del lote de deudas 86/87/90/94"*. `deudas.md`
pasa de **94** a **102** fichas; las cuatro de este lote quedan **tachadas y explicadas**, no borradas.

| # | Titular | Nota |
|---|---|---|
| **95** | La fidelidad **en pantalla** del shimmer sigue sin verificarse, y hay dos motivos concretos | El fondo se repite (varias bandas a la vez en un bloque ancho) y la forma redonda mide menos de un cuarto de la banda. Fiel al template, que sólo tenía una forma. **Regla 4** |
| **96** | El resto del árbol sigue alcanzable con el modal abierto (la mitad de la 87 que no se hizo) | `inert` cerraría esto **y la 88** de una vez. Prioridad baja |
| **97** | El bloqueo no compensa el ancho de la barra de scroll → el fondo salta al abrir | No medible en happy-dom. **Regla 4** |
| **98** | `root-scroll-lock` vive en la carpeta del `Dialog` y su contador es global | Promoverlo a `shared/ui/lib/` **con el segundo consumidor**, no antes |
| **99** | El foco inicial se decide **una vez**, al abrir | Contenido que llega después se queda con el repliegue |
| **100** | El gate del portal lee `AppShell.tsx` como **texto** | Precio de convertir la 94 en test: acopla un primitivo al layout y se rompe si el `main` pasa a `cva` |
| **101** | Nada obliga a que otro test que monte un `Dialog` compruebe que soltó el bloqueo | Familia de la **92**: disciplina, no gate. Se cierra subiendo el aserto al setup global |
| **102** | El `@keyframes` está en el bundle, pero **nadie ha visto moverse el shimmer** | Hermana de la 95. Entra gratis en la primera pasada de navegador de #19 |

**Las tres que más valen para #19:** la **95** y la **102** (las dos se cierran mirando la pantalla una vez,
y #19 va a montar skeletons igualmente) y la **101** (el modal de #19 es el primer consumidor del bloqueo
fuera de su propio test).

---

## 11. Fuera de alcance, respetado

No se tocaron las deudas **88**, **89**, **91**, **92** ni **93**. No se tocó ninguna página, ni `src/proxy.ts`,
ni la card de proyecto, ni `feature_list.json`.

---

## ⚠️ CORRECCIÓN DEL LEADER (2026-08-07) — añadida al cerrar el lote

Este informe afirma en §4 y §9, como **dato medido**, que *happy-dom sí enfoca un `input` deshabilitado*.
**Es falso.** Lo levantó el reviewer del lote (`review_deudas_86_87_90_94.md`, único bloqueante) y **el leader
lo verificó con una sonda propia** que enfrentaba las dos tesis en el mismo archivo: salió `1 failed |
1 passed`, y la que cayó fue la de este informe. `focus()` sobre un control deshabilitado es un **no-op**: el
foco se queda en el disparador.

**Cae también el corolario** que colgaba de ese dato ("el gate habría dado verde sin repliegue").

**El código NO se toca y la decisión sigue siendo la correcta:** derivar el repliegue de `focusableWithin`
mantiene un único criterio de "enfocable" compartido con la trampa de foco. **Lo que estaba mal era la
justificación, no la elección.**

La ficha **90** de `progress/deudas.md` lleva la misma corrección. Se deja escrito en vez de borrarse porque
un dato inventado en el libro mayor es peor que no tenerlo: el siguiente agente lo citaría como medición ajena.
