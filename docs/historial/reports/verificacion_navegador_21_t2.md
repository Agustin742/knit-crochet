# REGLA 4 — Verificación en navegador de #21 T2 (tres tabs + cronómetro) **y el primer MÓVIL del proyecto**

**Quién y cuándo:** el leader, 2026-08-25, con el árbol quieto.
**Cómo:** `pnpm dev` del leader (Next 16.2.10). **El usuario restauró la ventana de Chrome a petición
del leader**, y eso desbloqueó lo que llevaba **siete sesiones** sin poder medirse.

---

## 0. El bloqueo del móvil: la hipótesis de la sesión pasada era INCOMPLETA

Se creía que `resize_window` fallaba **porque la ventana estaba maximizada**. Con la ventana ya
restaurada, se pidió **390×844** y el resultado medido fue **502×750**.

**Conclusión corregida:** el problema no era sólo la maximización — **Chrome impone un ancho mínimo de
ventana de ~500 px** y `resize_window` **informa éxito igualmente** (*"Successfully resized … to
390x844"*). O sea: la herramienta miente en las dos situaciones, y **502 px es el ancho más estrecho
que este método puede alcanzar**. No es un móvil de 390, pero **cruza los breakpoints** y es la primera
medición sub-tablet del proyecto.

---

## 🔴 1. HALLAZGO GRAVE — el quick-start del cronómetro NO arranca el cronómetro: abre el detalle

**Es una REGRESIÓN introducida por T1** (la capa del tap sobre la tarjeta), y **cierra el hueco que el
propio reviewer de T1 dejó abierto** en su §D.4: *"nadie hizo clic en el botón de arranque con la capa
puesta… riesgo bajo, medición cero"*. **Riesgo alto.**

**Procedimiento, con el estado comprobado antes de cada clic y reproducido DOS veces:**

| paso | medición |
|---|---|
| `elementFromPoint` en el centro del quick-start | `SPAN ▶`, `closest('button')` = **"Empezar a tejer asdasd"**, `qs.contains(hit) === true` |
| clic real del ratón en ese punto | → **`drawerOpen === true`** |
| `aria-label` del quick-start después | **sigue "Empezar a tejer asdasd"** (no pasa a Dejar/Parar) |
| tiempo en la tarjeta | **`0 min`**, invariable |

**El hit-testing es correcto** —el puntero SÍ llega al botón del cronómetro—, así que el fallo está
**después**: el evento termina activando la capa del tap igualmente.

**Por qué es 🔴:** un usuario lo ve y **le impide hacer algo** — arrancar el cronómetro desde la lista,
**una función que ya existía y funcionaba antes de T1**. Es regresión, no carencia.

> **Por qué ningún gate podía verlo:** `happy-dom` **no hace hit-testing**. El test que afirma que tocar
> el cronómetro no abre el detalle **pasa en verde mientras en Chrome hace lo contrario**. Es la
> **REGLA 7** en su forma más pura, y el reviewer de T1 lo escribió palabra por palabra —
> *"pasaría igual aunque en Chrome no pasara"*— **sin poder medirlo**.

---

## 🟠 2. La navegación móvil no está pegada abajo. **NO es de #21: es preexistente**

Medido a 502 px:

| propiedad | valor |
|---|---|
| `position` | **`static`** |
| `z-index` | `100` — **inerte sobre un elemento estático** |
| rect | **y=934** con el viewport en **750** → **fuera de pantalla** |
| archivero de escritorio en ese ancho | **`0×0`** (oculto, correcto) |

O sea: **en angosto, la única navegación de la app sólo aparece haciendo scroll hasta el fondo de la
página.** El `z-index: 100` delata la intención — alguien la escribió creyendo que flotaba.

**Es 🟠 y no 🔴 porque se puede navegar** (scrolleando), pero está a un paso de 🔴.
**No lo produjo T2 ni T1:** viene del bottom-nav original y **sale a la luz ahora** porque es la primera
vez que alguien puede mirar el móvil.

---

## ✅ 3. Lo que T2 SÍ hace bien, medido

- **Las cuatro pestañas caben en una fila a 502 px**, sin cortarse ni desbordar — era la duda explícita
  del implementer, que no podía verlo.
- **El arreglo del hueco de la foto FUNCIONA**: el marco ya no domina la pantalla y el `<dl>` de datos
  entra en dos columnas sin empujar nada fuera de vista. **E2(g) aplicado al cajón sin romper la
  tarjeta.**
- **Cero desbordamiento horizontal**: `documentElement.scrollWidth` **487** ≤ viewport. El `<body>` no
  scrollea de lado en angosto.
- El archivero de escritorio **se oculta correctamente** en angosto.

---

## Lo que sigue SIN medir

- **El móvil de verdad (≤ 390 px).** 502 es el suelo de este método. Para bajar de ahí hace falta otra
  vía (emulación por CDP o el modo dispositivo de DevTools), **no** `resize_window`.
- El tab **Sesiones** con un cronómetro **corriendo de verdad** contra el backend: el hallazgo 🔴 de
  arriba **impide arrancarlo desde la tarjeta**, que era el camino natural para probarlo.

---

## ⚠️ CORRECCIÓN del leader sobre el hallazgo 🔴 (mismo día, tras el review)

**El hallazgo 1 queda REBAJADO de "confirmado" a "reproducido dos veces, mecanismo SIN PROBAR y con una
alternativa no descartada".** Se corrige aquí porque **una ficha que miente es peor que no tenerla**.

### Lo que el reviewer corrigió de mi comprobación, y tenía razón

Mis dos "pruebas" de que **el cronómetro no arrancaba** no probaban nada:

1. **El `aria-label` del quick-start NUNCA cambia** — la enmienda **E1(e)** fijó que el quick-start
   *"sólo arranca"*, **no es un toggle**. Esperar "Dejar de tejer" era esperar algo que el diseño no hace.
2. **`Project.time` sólo se recalcula al PARAR**, así que ver `0 min` después de arrancar es lo normal.

**Lo único que mis dos primeras mediciones prueban es que EL CAJÓN SE ABRIÓ.**

### Lo que sí quedó medido después, contra el backend

`GET /api/projects/:id/sessions` → **1 sesión en total, 0 corriendo**, y **ninguno de mis clics de hoy
creó una sesión nueva**. O sea: **el cronómetro efectivamente no arrancó**. Eso sigue en pie.

### Por qué el mecanismo NO está probado, y el control quedó a medias

El reviewer pidió un control barato para **separar un fallo real de un artefacto de coordenada** — que
el clic sintético caiga desplazado, en la tarjeta en vez de en el botón. **Intenté ese control y no pude
terminarlo:**

- Instrumenté `document` con escuchas en fase de captura (`pointerdown`, `mousedown`, `click`…) y el
  clic devolvió **`events: []`**: **ni un solo evento llegó a la página**.
- Un **clic de control** sobre un botón distinto (`Crochet`) tampoco produjo eventos **ni cambió su
  `aria-pressed`**.
- Causa encontrada: **`document.visibilityState === "hidden"`** — la pestaña había pasado a segundo
  plano tras el `location.reload()`. **Con la página oculta no llega ningún clic**, así que el
  experimento no vale ni a favor ni en contra.

### Estado honesto del hallazgo

| hecho | estado |
|---|---|
| Con la ventana visible, clic en el punto del ▶ → **el cajón se abre** | **reproducido 2 veces** |
| `elementFromPoint` en ese punto → dentro del botón del cronómetro | **medido** |
| Ningún clic creó sesión → **el cronómetro no arranca** | **medido contra el backend** |
| **¿El clic sintético cae donde `elementFromPoint` dice?** | ❌ **SIN COMPROBAR** — es la alternativa que explicaría todo sin que haya bug |
| Mecanismo del fallo (propagación / orden de manejadores) | ❌ **sin diagnosticar**; el reviewer **descartó** propagación (los controles son hermanos) y el `transform` de `:active` |

**Qué hace falta para cerrarlo:** con la ventana **visible y en primer plano**, repetir el clic con la
instrumentación puesta y leer **a qué elemento llega el evento**. Si llega al ▶ y aun así se abre el
cajón → **bug real**. Si llega a la tarjeta → **artefacto de mi medición**, y el 🔴 se retira.

### Hipótesis principal del artefacto: **la escala de píxeles (dpr 1.25)**

Analizando los números **sin volver a tocar el navegador**, hay una explicación que encaja con **todas**
las observaciones y que apunta a mi método, no al código:

**El `devicePixelRatio` de esta máquina es 1.25.** Con el viewport en **502×750 CSS**, la captura sale
**628×868**, o sea **px físicos** (`502 × 1.25 = 627.5`). Si la herramienta de clic interpreta las
coordenadas que le paso como **px físicos** mientras yo se las doy en **px CSS** (que es lo que devuelve
`getBoundingClientRect`), el clic aterriza en **coordenada ÷ 1.25**:

| lo que pedí | dónde caería de verdad | qué hay ahí | qué observé |
|---|---|---|---|
| `(420, 520)` sobre el ▶ | `(336, 416)` | zona de la **tarjeta** | **se abrió el cajón** ✔ encaja |
| `(420, 577)` sobre el ▶ | `(336, 462)` | zona de la **tarjeta** | **se abrió el cajón** ✔ encaja |
| `(222, 51)` sobre `Crochet` (control) | `(178, 41)` | cabecera, **sin control** | **no pasó nada** ✔ encaja |

**Si esto se confirma, el 🔴 se retira entero**: no habría bug, sino un clic que nunca tocó el botón —
exactamente el artefacto de coordenada que el reviewer pidió descartar y que yo no descarté antes de
reportarlo.

**Pero no lo doy por bueno todavía**, porque hay un dato que NO encaja: en la verificación de **T1** el
viewport era **1536×730** y la captura salió **1568×745** —factor ≈ 1.02, **no 1.25**—, así que la
relación captura/viewport no es constante entre sesiones y la hipótesis puede fallar.

### Prueba definitiva, para ejecutar en cuanto la ventana esté visible y en primer plano

**No hace falta hacer clic** — basta `hover`, que no dispara nada y no ensucia datos:

1. Medir el centro del quick-start con `getBoundingClientRect` → `(cx, cy)` en px CSS.
2. `hover` en `(cx, cy)`.
3. Leer `document.querySelectorAll(':hover')` y quedarse con el **último** elemento.

- Si el último `:hover` es el **botón del cronómetro** → el clic sí llega al botón, y entonces el 🔴 es
  **real**: hay que diagnosticar por qué se abre el cajón igualmente.
- Si es la **tarjeta** o la capa del tap → **artefacto de coordenada confirmado**, el 🔴 se retira y se
  anota el factor de conversión para todas las verificaciones futuras.

**Nota de método que ya vale para el futuro:** en este repo, **una medición hecha con clics sintéticos no
es concluyente hasta que se comprueba a qué elemento llega el evento**. Instrumentar `document` en fase
de captura cuesta cuatro líneas y convierte una sospecha en un hecho.

---

# ✅ RESOLUCIÓN (2026-08-25, ventana visible y en primer plano)

## 🔴 B1 **SE RETIRA. NO HAY BUG.** Era un artefacto de coordenadas del leader

**La hipótesis del `devicePixelRatio` era correcta, y ahora está MEDIDA, no supuesta.**

Se instrumentó `document` con una escucha de `mousemove` en fase de captura y se hizo **`hover`** (no
clic, para no ensuciar datos) sobre el centro del quick-start:

| | valor |
|---|---|
| coordenada **pedida** a la herramienta | `(420, 521)` |
| **dónde cayó el puntero de verdad** | **`(336, 417)`** |
| **ratio** | **x = 1.250 · y = 1.249** ← exactamente el `devicePixelRatio` |
| botón bajo el puntero | **"Ver detalle de asdasd"** (la capa del tap) |

**La herramienta de clic/hover toma las coordenadas en píxeles FÍSICOS; `getBoundingClientRect` las
devuelve en píxeles CSS.** Todos mis clics caían en `coord ÷ 1.25`, **sobre la tarjeta**. El quick-start
**nunca recibió un solo clic mío**.

### Y con la coordenada corregida (× dpr), el comportamiento es el CORRECTO

`hover` en `(525, 651)` → el puntero cae en `(420, 521)`, **dentro** del quick-start. Clic real ahí:

- **`drawerOpened: false`** — **el cajón NO se abre** ✅
- **`running: 1`** — **la sesión arranca** (comprobado contra el backend) ✅
- región viva: **"Empezaste a tejer asdasd."** — el feedback visible que exige **E2(d)** ✅
- el `aria-label` sigue en "Empezar a tejer" — **correcto**, E1(e): sólo arranca, no es toggle ✅

**El quick-start y la capa del tap conviven bien. T1 no introdujo ninguna regresión.**

## ✅ El tab Sesiones, verificado en vivo con un cronómetro REAL

- El reloj **tickea**: `04:21` → `04:24` en tres segundos.
- **Parar** funciona: `runningNow: 0`, el panel pasa a `00:00` + *"El cronómetro está parado."*, y **el
  historial registra la sesión de hoy (4 min)**.
- Historial y **tiempo total** presentes.

## ⚠️ Un segundo falso positivo del leader, también descartado: el **500** del endpoint

En mitad de la prueba, `GET /api/projects/:id/sessions` devolvió **500** con HTML de error y el tab
Sesiones pintó *"Se soltó un punto"*. **No era la app.** El log del servidor mostraba
*"Jest worker encountered 2 child process exceptions"*: el `next dev` del puerto 3000 había quedado
**degradado** al detenerlo el arnés (sus workers murieron, el proceso siguió escuchando).

**Con un servidor limpio, el mismo endpoint devuelve `200` y JSON válido.** Se comprobó antes de
reportar nada.

## 📌 Observación de accesibilidad (NO es defecto — es mejor que el RFC)

**RFC-03 §5 pide *"cronómetro con `aria-live` para el tiempo"`***. Medido: el reloj de segundos
**no** está en una región viva; lo que se anuncia es un `role="status"` aparte con **minutos**
("4 min", "El cronómetro está parado.").

**Es la decisión correcta y va contra la letra del RFC:** anunciar un reloj que cambia **cada segundo**
convertiría al lector de pantalla en un metrónomo. **Sugerencia:** que el RFC recoja el matiz, para que
nadie lo "arregle" en el futuro creyendo que falta algo.

## 🧾 Dato heredado en los datos del usuario (no es bug de nadie)

El historial muestra una sesión del **13 de agosto de 281 h 20 min**. Es de la verificación en navegador
de **#20**: se arrancó el cronómetro y **no se paró**. **Lección aplicada hoy:** el cronómetro que
arrancó esta verificación **se paró expresamente** antes de terminar.

---

## 🧭 REGLA DE MÉTODO NUEVA (vale para todas las verificaciones futuras)

> **Las coordenadas de `computer` van en píxeles FÍSICOS: multiplica siempre por `devicePixelRatio`
> antes de pinchar.** En esta máquina, `dpr = 1.25`.
>
> Y antes de reportar cualquier hallazgo hecho con clics sintéticos: **comprueba a qué elemento llega el
> evento** (escucha de `mousemove`/`click` en captura, cuatro líneas). Hoy eso convirtió un 🔴 en un
> artefacto. **Dos veces en la misma sesión** —el otro fue el 500 del servidor moribundo— casi se
> reporta como defecto de la app algo que era del entorno de medición.

---

## Segunda pasada: los tabs Progreso y Lanas, y los cuatro puntos que NO se pueden mirar

**Progreso ✅** — `0%`, barra, `VUELTAS` con `−/1/+`, `Meta de vueltas` editable con su ayuda y
`Guardar meta`. **No pinta checklist ni "crear patrón"**: el proyecto no tiene patrón, así que
**E3(d) se cumple en pantalla**, no sólo en el código.

**Lanas ✅** — distingue **los dos vacíos**: *"Todavía no enlazaste ninguna lana a este proyecto"* y,
aparte, *"Tu inventario de lanas está vacío"*. Es el criterio de **E2(e)** aplicado bien.

### ❌ Los cuatro puntos que el reviewer dejó pendientes NO son verificables hoy: **faltan datos**

| punto | por qué no se puede |
|---|---|
| contraste de los **13 swatches** (ojo con `--yarn-neutral`, que **es** `--surface-sunken`, y `--yarn-white`) | **el inventario de lanas está vacío** |
| lana **multicolor** | ídem |
| **checklist** con patrón real | el proyecto **no tiene patrón** y no hay patrones creados |
| **buscador** con inventario grande | inventario vacío |

**Quedan declarados como NO VERIFICADOS, no como aprobados.** Para mirarlos hay que **crear datos de
prueba** (lanas de varias familias de color, una multicolor, y un patrón con pasos), y eso **escribe en
los datos del usuario**: se pide antes, no se hace por cuenta propia.

### ⚠️ Un detalle menor visto de paso — `1 / 0`

Con `targetRounds` sin fijar, el tab Progreso muestra **`0%`** y el contador **`1 / 0`**. Se lee como
una división por cero. **No rompe nada** —el porcentaje sale bien— pero *"1 / 0"* no es lo que un
usuario espera cuando aún no puso meta. **Ficha 🟠 abajo.**

### 📌 Corrección al método: el factor de escala **NO es estable**

En la misma sesión y la misma ventana, una captura salió en **px físicos** (628×868 con viewport
502×694) y la siguiente en **px CSS** (502×694). Un clic calculado con el factor de la anterior **falló
el objetivo**.

**Conclusión reforzada:** no basta con multiplicar por `devicePixelRatio` — **hay que confirmar dónde
cayó el puntero cada vez** (escucha de `mousemove` en captura). Y cuando lo único que se quiere es
**ver** un panel y no probar el puntero, **cambiar de pestaña por código** (`el.click()`) es más honesto
que pelearse con coordenadas: no finge una medición de *hit-testing* que no se está haciendo.
