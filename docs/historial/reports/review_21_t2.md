# Review — feature 21 `projects_detail_ui` — TANDA 2

**Veredicto: APPROVED (APROBADO)**

> **Historial de este informe.** Se emitió primero como **CHANGES_REQUESTED** por
> el bloqueante **B1** (regresión 🔴 del quick-start). **B1 queda RETIRADO** con
> la medición del leader: no había bug, era un artefacto de coordenadas — que es
> exactamente el control (a) que este informe pedía correr **antes** de tocar
> código. El detalle está en la **ADENDA** al final. El cuerpo se conserva **sin
> reescribir**, incluida la parte de B1, para que quede a la vista qué se
> sospechó, qué lo descartó y en qué orden.

**Estado final:** los tres tabs, el cronómetro, los dobles y el arreglo del hueco
de la foto quedan **aprobados**. **No hay cambios requeridos.** Lo que queda son
condiciones de cierre blandas y deuda ⚪ (ADENDA §A.4 y §A.5).

- `bash ./init.sh` → **EXIT 0**, `1587 passed | 13 skipped (1600)`, 90 archivos.
  Corrido por mí, no leído del informe.
- Aritmética: **1498 + 102 = 1600** ✔, **87 → 90 archivos** ✔. Cuadra sin residuo.
- **REGLA 4:** cubierta por el leader en lo esencial (foto, carril de pestañas,
  cronómetro en vivo, quick-start). **Cuatro puntos siguen sin mirarse**, y los
  dejo escritos como tales en §A.4 en vez de aprobarlos por omisión.

---

## 0. Escala usada

🔴 lo ve y le impide algo · 🟠 lo ve y puede seguir · ⚪ sólo lo ve un agente
editando código.

---

## 1. BLOQUEANTES

> ⛔ **B1 RETIRADO — NO HAY BUG.** Lo que sigue es el análisis original, que se
> conserva a propósito: sus dos descartes eran correctos y su control (a) fue el
> que encontró la causa real. Conclusión operativa en la **ADENDA §A.1**.

### ~~B1 🔴~~ **RETIRADO** — Tocar el quick-start abre el detalle y NO arranca el cronómetro

*(Análisis original, conservado tal cual. Ver ADENDA §A.1.)*

Medido por el leader en Chrome (502x750, proyecto `asdasd`, reproducido dos
veces): `elementFromPoint` en el centro del quick-start devuelve el `SPAN` del
play dentro del botón "Empezar a tejer asdasd", y el clic real abre el cajón sin
arrancar nada.

**Es una regresión de T1, no de T2.** El diff de `ProjectCard.tsx` en esta tanda
es **exclusivamente** la prop `size` de la foto (líneas 233-264 y 309-320): no
toca la capa del tap, ni el quick-start, ni el orden del DOM, ni el maquetado de
la tarjeta (`ProjectPhoto` sin `size` sigue en `aspect-video`). La capa del tap
(`DETAIL_TAP_CLASSES`, `ProjectCard.tsx:209-216`) y su botón
(`ProjectCard.tsx:131-139`) entraron en **T1 (`41643fd`)**. **No cargues el
defecto a esta tanda — pero #21 no cierra con él.**

**Es mío el fallo de review.** En `review_21_t1.md` D.4 escribí que el orden de
pintado quedaba "SIN VERIFICAR ... riesgo bajo, medición cero". La medición ya
existe y el riesgo era alto.

#### Lo que SÍ puedo aportar al diagnóstico (leído y medido en el código)

Dos hipótesis que **quedan descartadas**, para que nadie las persiga:

1. **NO es propagación de eventos.** Los dos controles son **hermanos**
   (`ProjectCard.tsx:131-139` y `162-172`), hijos del mismo `div.relative`. Un
   clic sobre el play sube por su cadena de ancestros —span, button,
   div.relative, Card, li…— y **la capa del tap no está en esa cadena**. Ningún
   manejador de `onOpenDetail` vive en un ancestro común: `ProjectsView.tsx:426-433`
   los pasa como dos props separadas y no hay ningún `onClick` intermedio. Un
   `stopPropagation()` en el quick-start **no arreglaría nada**, porque no hay
   nada que parar.
2. **NO es el desplazamiento de `:active`.** `buttonVariants` mete
   `active:[transform:translate(var(--border-width),var(--border-width))]`
   (`button.variants.ts`), o sea que el botón **se mueve mientras el ratón está
   apretado** — sospechoso legítimo, porque `elementFromPoint` se mide **en
   reposo** y el clic ocurre **en `:active`**. Pero los números lo matan:
   `--border-width: 2px` (`globals.css:304`) contra `--touch-target: 44px`
   (`globals.css:428`). Un desplazamiento de 2 px no saca el centro de un
   objetivo de 44 px.

**Con eso, el mecanismo me queda SIN DIAGNOSTICAR, y lo digo en vez de
inventarlo.** No hay en el código un camino por el que ese clic active
`onOpenDetail`. Las dos cosas que hay que descartar en el navegador, en orden:

- **(a) Integridad de la medición.** ¿Hubo scroll o relayout entre el
  `elementFromPoint` y el clic despachado? La capa del tap es `absolute inset-0`:
  **cubre la tarjeta entera**, así que cualquier desviación de la coordenada cae
  sobre ella y produce exactamente el síntoma observado. Control barato: leer
  `window.scrollY` antes y después, y volver a llamar a `elementFromPoint(x, y)`
  **inmediatamente después** del clic, con las mismas coordenadas.
- **(b) Si (a) sale limpio, es un fallo real de la capa** y hay que instrumentar
  el evento: un escuchador de `click` **en fase de captura** sobre el contenedor,
  registrando el `target` y el `eventPhase`, y comprobar si `handleQuickStart`
  llegó a correr.

⚠️ **Ojo con dos falsos negativos en la comprobación del leader**: el
`aria-label` del quick-start **nunca cambia** por diseño (E1(e): sólo arranca), y
el `time` de la tarjeta **tampoco cambia al arrancar** —`Project.time` sólo se
recalcula al **parar** (`stop-session.ts:57-58`)—. Los dos son invariantes
esperados **incluso con un arranque exitoso**. El testigo bueno de que arrancó es
la región viva `Cronómetro` de `ProjectsView.tsx:366-372`, que debe pintar
"Empezaste a tejer asdasd."

#### El agujero de gate que lo dejó pasar — REGLA 7 en estado puro

`ProjectCard.test.tsx:374-400`, el aserto clave:

    await userEvent.click(quickStart);
    expect(onQuickStart).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).not.toHaveBeenCalled();   // <-- no puede fallar NUNCA

`userEvent.click(quickStart)` **despacha el evento directamente sobre el
elemento**: no hay hit-testing, no hay capas, no hay z-index, no hay layout.
Como los dos botones son hermanos, `onOpenDetail` es **estructuralmente incapaz**
de ser llamado por ese despacho, pinte lo que pinte el CSS. Es un aserto que
**mide el doble y no la producción**, y es literalmente lo que escribí en T1:
"pasaría igual aunque en Chrome no pasara".

**Requisito de cierre:** el arreglo tiene que venir con una comprobación **que
pueda ponerse roja**. En happy-dom no la hay. O es una verificación en navegador
anotada como tal, o el arreglo cambia el diseño para que la corrección **no
dependa de geometría** (p. ej. que el tap deje de ser una capa que cubre la
tarjeta entera y pase a ser un control propio y acotado).

---

## 2. Lo que verifiqué YO, con sondas propias (y no leí del informe)

Escribí cuatro archivos de sonda temporales, los corrí, y **los borré**
(`git status` limpio de artefactos).

### 2.1 El cronómetro — las afirmaciones del implementer se sostienen ✔

**La afirmación clave era que `vi.getTimerCount()` cuenta exclusivamente el
intervalo del componente. La medí, no la leí:**

| sonda | qué mide | resultado |
|---|---|---|
| P1 | `getTimerCount()` sin nada montado, y con el tab montado y **parado** | **0 y 0** -> ni React, ni RTL, ni happy-dom programan `setInterval`. La afirmación es **cierta**. |
| P5 | con una sesión corriendo; tras avanzar 3 s; tras desmontar | **1 -> 1 -> 0** |
| P3 | Start/Stop/Start encadenados | **1** intervalo |
| P4 | desmontar con la petición **en vuelo** | 0 intervalos, sin `setState` tras desmontar |

Más lo que ya cubren los tests del implementer y que releí: cerrar el cajón con
el cronómetro corriendo -> 0 (`ProjectDetailDrawer.test.tsx:494-533`), y cambiar
de pestaña -> 0 (`:535-566`). **Y el desmontaje al cambiar de pestaña no es una
suposición**: `Tabs.tsx:163-174` monta **sólo** el panel elegido.

Estructuralmente además es correcto: un único `useEffect` con dependencia
`runningStart` (`SessionsTab.tsx:139-155`) —el **sello**, no el objeto—, así que
recargar el historial trae otra sesión y no reprograma nada. React garantiza la
limpieza antes de reejecutar: **duplicar el intervalo es imposible por
construcción**, no por prudencia.

### 2.2 Doble clic — lo di por defecto y estaba equivocado. Lo corrijo. ✔

Con un `fetch` de latencia **cero** medí 2 POST a `/start`, 2 PATCH a `/stop`
(con su **409 en la cara del usuario**) y 2 POST a `/rounds`. Estuve a punto de
fichar dos 🟠. **Rehíce la medición con 250 ms de latencia, que es la condición
en la que el guardado importa:**

| sonda | escenario | `disabled` a los 40 ms | peticiones |
|---|---|---|---|
| S1 | doble clic humano en "Sumar una vuelta" | **true** | **1** POST |
| S2 | doble clic humano en "Parar el cronómetro" | **true** | **1** PATCH, **sin alerta** |

**Los 2 disparos eran artefacto del mock instantáneo**: con latencia nula el
`pending` se enciende y se apaga dentro del mismo microtask, así que la segunda
pulsación es una **segunda acción deliberada**, no una duplicación. `Button`
resuelve `disabled={disabled ?? loading}` (`Button.tsx:22`) y React vacía el
update del evento discreto muy por debajo de los 40 ms. **La defensa funciona.
No hay defecto.** Lo dejo escrito con las dos mediciones porque la conclusión
contraria era muy fácil de sacar.

### 2.3 Una fuga que sí encontré, y por qué NO la ficho como bloqueante

Sonda **P6**: si `POST /start` sale **bien** y la recarga del historial **falla**,
la pantalla vuelve a ofrecer **"Empezar a tejer"** con **0 intervalos**, mientras
en el servidor hay una sesión abierta de verdad. Es el precio de derivar "está
corriendo" del listado (`SessionsTab.tsx:133-137`).

**No es bloqueante y no pierde datos:** hay un `role="alert"` **visible** con el
error de red (`DetailTabParts.tsx:57-66`; `SessionsTab.tsx:243` le pasa
`loadError`), volver a pulsar es **idempotente** en el servidor, y la sesión
sigue corriendo, así que al parar se contabiliza entera. Queda como **⚪ D4**.

### 2.4 Fugas y limpieza en general ✔

Los tres efectos de red llevan bandera `cancelled` con su limpieza
(`SessionsTab.tsx:102-123`, `ProgressTab.tsx:107-126`,
`ProjectDetailDrawer.tsx:123-148`), así que una respuesta que llega tarde no pisa
a la que corresponde. Ningún escuchador suelto ni `addEventListener` sin retirar
en los cuatro archivos nuevos. Cerrado el cajón, `ProjectDetailDrawer.tsx:198-200`
devuelve `null` y desmonta el subárbol entero.

---

## 3. REGLA 7 sobre los 102 tests nuevos ✔ (con una excepción: la de B1)

**Los dobles implementan las reglas del backend, y lo comprobé contra los route
handlers de verdad**, no contra el informe:

| contrato | producción | el doble |
|---|---|---|
| `POST /:id/sessions/start` | `{session}`, **201 crea / 200 reutiliza** (`sessions/start/route.ts:31`) | idéntico (`SessionsTab.test.tsx:84-97`) |
| `PATCH /:id/sessions/stop` | `{session, time}`, **409 sin sesión** (`stop/route.ts:31`) | idéntico (`:99-119`) |
| `time` del proyecto | **suma de duraciones**, recalculado, no incrementado (`stop-session.ts:57`) | `reduce` de duraciones (`:117`) |
| `POST /:id/yarns` | `{yarnIds}`, **sólo ids**, 201/200 (`yarns/route.ts:36`) | idéntico (`YarnsTab.test.tsx:73-92`) |
| `DELETE /:id/yarns/:yarnId` | **204 sin cuerpo** (`[yarnId]/route.ts:33`) | idéntico (`:94-96`) |
| `progress` | `calculateProgress` del backend | **importada del backend**, no recopiada (`ProgressTab.test.tsx:8` y `:119`) |

Lo mejor del lote es esa última fila: el doble **importa la función real del
backend** en vez de reimplementar la fórmula. Es exactamente lo que la REGLA 7
pide, y no lo había visto hacer todavía en este repo.

Dos aciertos más que evitan estados que producción no puede producir: el doble
del cajón sirve `/sessions` **por su ruta propia**
(`ProjectDetailDrawer.test.tsx:114-119`, con su motivo escrito: servir el detalle
para todo daría un `sessions` indefinido), y `YarnOption.colorFamily` **existe de
verdad** en producción —`YarnOption` es un `Pick` de `YarnRecord`
(`types.ts:67-70`) y `listYarns` devuelve la fila entera—, así que el swatch no
se pinta contra un campo inventado.

**Fechas y horas escritas a mano (deuda 164): cero.** `grep` de `20[0-9][0-9]` en
los tres tests nuevos y en `format.test.ts` no devuelve **nada**. Los fixtures
derivan el año del reloj (`SessionsTab.test.tsx:34`, `ProgressTab.test.tsx:39`) y
el instante se construye en hora **local**, para que el texto esperado no dependa
de la zona en la que corra la suite.

**La única excepción es B1**, y no está en los tests de T2: es
`ProjectCard.test.tsx:399`, heredado de T1.

---

## 4. El hueco de la foto — E2(g), la condición de cierre de #21

**Las dos mitades, comprobadas por separado:**

- **El cajón baja.** `size="detail"` -> `aspect-3/1` (`ProjectCard.tsx:262`), y el
  cajón lo pide (`ProjectDetailDrawer.tsx:308-313`). A los ~612 px de ancho útil:
  16/9 -> **344 px**, 3/1 -> **204 px**. La aritmética cierra. **Y el leader ya lo
  midió en Chrome: el marco ya no domina y la lista de datos entra en dos
  columnas.** ✔
- **La tarjeta NO se rompe.** `size` es opcional con **defecto `"card"`**
  (`ProjectCard.tsx:313`), y `ProjectCard` monta `ProjectPhoto` **sin pasarlo**
  (`:141-145`): la tarjeta sigue en `aspect-video`, con foto y sin ella —las dos
  ramas comparten el mismo `frame` (`:320`, usado en `:325` y `:356`)—. **E2(g)
  intacta.** ✔
- **La utilidad está derivada, no escrita al literal.**
  `ProjectCard.test.tsx:429-437`: `framingUtility()` la obtiene **por diferencia**
  entre los dos encuadres, y el test afirma que la diferencia es **exactamente una
  clase** (`:456-457`). Ni una clase de Tailwind citada en un test. ✔
- El ternario sobre constantes del propio archivo (`:255-259`) es correcto: el
  gate exige `unhandled === []` por componente
  (`projects-ui.classes.test.ts:132-136`) y **compila el CSS de verdad** para
  comprobar que cada clase emite regla, con `aspect-3/1` dentro. Verde.

**Un ⚪:** `DetailTabSkeleton` escribe `aspect-3/1` al literal
(`ProjectDetailDrawer.tsx:397`) en vez de derivarlo de `DETAIL_PHOTO_RATIO`. Si
mañana cambia el encuadre, la silueta de carga se descuadra respecto a la foto que
viene detrás. Ficha ⚪ **D5**.

**Un ⚪ de cobertura:** **nada prueba que el cajón pase `size="detail"`**. Los
tests de encuadre montan `ProjectPhoto` suelto y `ProjectDetailDrawer.test.tsx` no
menciona la foto. Borrar `size="detail"` de la línea 312 deja la suite **entera en
verde** y devuelve el hueco de 344 px, que es el defecto que esta tanda vino a
cerrar. Ficha ⚪ **D6**.

---

## 5. E3(d) — ningún control sin destino ✔

`grep` exhaustivo de "Editar", "Crear patrón", "Nuevo patrón" y "próximamente"
sobre `src/features/projects/ui/`: **cero coincidencias en código**. Sólo aparecen
en comentarios que explican por qué no están.

- Sin patrón, la sección de pasos **no se pinta** y no ofrece crearlo:
  `stepsStateOf` devuelve `absent` con `patternId === null`
  (`ProgressTab.tsx:66-79`) y `:260` la omite entera. Además **ni se pide el
  patrón** (`:107-110`): sin `patternId` no sale ninguna petición.
- El cajón no monta "Editar" (`ProjectDetailDrawer.tsx:88-90`), y hay un aserto
  **exacto** sobre la lista de botones (`ProjectDetailDrawer.test.tsx:322-334`),
  más su equivalente en Sesiones (`SessionsTab.test.tsx:419-430`).
- El `switch` sobre la unión de pestañas (`ProjectDetailDrawer.tsx:207-236`) hace
  que **añadir una pestaña sin contenido no compile**. Buen mecanismo.

---

## 6. El eje visible (el template es un SUELO, no un techo)

**Lo que el leader ya midió en Chrome, y doy por bueno:** las cuatro pestañas
caben en una fila a 502 px, el arreglo de la foto funciona, y no hay
desbordamiento horizontal (`scrollWidth` 487 <= viewport).

**¿Hay jerarquía visual, o todo pesa lo mismo?** Hay jerarquía, y está hecha por
tamaño, familia y superficie, no bajando el contraste:

- **Progreso**: el porcentaje en `font-display text-4xl` es lo primario; las
  vueltas en `text-3xl`; la cuenta cruda en mono `text-sm`; los títulos de bloque
  en mono `text-xs` versalitas. "Guardar meta" es `primary`; los +/- son `icon`.
- **Sesiones**: el reloj en `font-mono text-4xl` es lo primario, con el control
  debajo; el historial en texto base; el total separado por una línea.
- **Lanas**: enlazar es `secondary` **a fila completa** (el objetivo táctil es la
  línea entera y no un control chico al final: bien pensado), y "Quitar" es
  `ghost`, o sea accesorio.

**¿Dos controles con comportamiento distinto renderizados igual (deuda 142)?**
**No lo encuentro.** No hay ningún grupo excluyente junto a uno acumulable en los
tabs nuevos. El carril de pestañas es `role="tablist"` con navegación por flechas
y `tabindex` rotatorio (`Tabs.tsx`), distinto del `SegmentedControl`, y
`Tabs.tsx:37-70` deja escrito por qué no se construyó encima de él. Correcto.

**¿Alguna decisión visual justificada por el coste del arnés?** Reviso las tres
que lo rozan y **las tres pasan**:

- Los trece tokens `--yarn-*`: la pieza no existía y **se creó**, en `globals.css`,
  que es su sitio. Es el suelo aplicado bien, no un apaño.
- El ternario en vez de objeto indexado (`ProjectCard.tsx:258`): el motivo
  declarado es el resolvedor del gate, **pero no cambia lo que ve el usuario ni
  degrada la pieza** —es la misma clase escrita de otra forma—, así que no es "no
  creé la pieza correcta porque tocaría un gate". El `switch` de `yarnSwatchColor`
  (`YarnsTab.tsx:265-294`) encima gana exhaustividad de TypeScript: añadir una
  familia sin su color no compila.
- Lo que **sí** es una limitación está fichado y no disfrazado: el swatch no sube
  a `shared/ui/` (D1 del implementer, con su escenario de fallo y su medición).

**¿Toda acción con efecto tiene feedback VISIBLE (deuda 137)?** **Sí, y esta vez
está bien hecho.** Los errores van en `ActionError`, que es `role="alert"` **con
borde de peligro y color visible** (`DetailTabParts.tsx:62-78`), **no** un
`sr-only`. Los aciertos se ven solos: el contador cambia, la lana aparece o
desaparece de la lista, el reloj arranca. La única región `sr-only` es la del
cronómetro (`SessionsTab.tsx:221-229`) y **tiene su equivalente visible al lado**
—el reloj de `text-4xl`—, así que no es la trampa de la deuda 137. El grano de
minuto de esa región está bien razonado y medido en las dos direcciones.
*Salvedad menor:* guardar la meta con **el mismo valor** no produce ningún cambio
visible ni mensaje. ⚪, ficha **D7**.

**PENDIENTE DE PANTALLA — no lo apruebo por omisión:**

1. **El contraste real de los trece swatches** sobre la superficie del cajón.
   Llevan el borde del sistema para que un blanco o un crudo conserven silueta,
   pero eso es razonamiento, no medición. Los sospechosos son `--yarn-white`
   (`#fdfaf3`) y `--yarn-neutral`, que **es literalmente `--surface-sunken`**, o
   sea el color de una superficie de la propia app.
2. **El multicolor**: un `conic-gradient` dentro de un círculo de 20 px. Emite
   regla —el gate compila el CSS— pero **nadie ha visto si se lee como una rueda
   o como un borrón**.
3. **La checklist de pasos con un patrón de verdad**, que es el único camino de
   los tres tabs que exige datos que hoy casi nadie tiene.
4. **El buscador de lanas con inventario grande**: el corte a `MAX_YARN_RESULTS`
   (6) y el aviso de "hay N más".

---

## 7. Arquitectura y convenciones ✔

- **Backend: cero archivos tocados.** Verificado sobre el diff, no sobre el
  informe: nada de `src/features/**/api/`, `src/app/api/**` ni `schema.ts`.
- **UI sin DB, lógica fuera del componente:** las nueve funciones nuevas viven en
  `project-detail.ts` (módulo puro, con sus 25 tests) y el acceso HTTP en
  `projects-client.ts`. Ningún componente arma una petición a mano.
- **E1(h) respetada:** las siete acciones nuevas entran en el cliente que ya
  existía; **no** hay un cuarto clon del patrón HTTP. `requestWithoutBody` está
  justificado y es real: el camino feliz de `request` llama a `response.json()`,
  que **lanza** sobre el 204 del desenlace.
- **Sin números sueltos:** `MILLISECONDS_PER_SECOND` sube a `shared/config` junto
  a sus dos hermanas, en vez de escribir `1000` dentro del componente.
- `formatDateTime` **sin `timeZone`** frente a `formatDate` **en UTC**: la
  distinción fecha-de-calendario contra instante está bien razonada y documentada,
  y `formatClock` no reusa `formatDuration` por un motivo correcto (redondea a
  minutos, y un cronómetro recién arrancado tiene que mover algo).
- **El umbral del gate de clases baja de `>5`/`>15` a `>0`/`>0`.** Lo miré con
  lupa por si era un gate rebajado para caber, y **no lo es**: el aserto que ata
  el barrido a la realidad es el de al lado —`attributes + objectProperties ===
  writtenClassAttributes(fuente)`, exacto y **por archivo**
  (`projects-ui.classes.test.ts:113-123`)—, más `unhandled`, `bypassed`,
  `ambiguous` y `emptyAttributes` comparados contra `[]`. Con eso, el umbral
  numérico era una cifra inventada que había que rebajar cada vez que entraba un
  componente chico. El cambio **mejora** el gate.
- `console.log`, `TODO`, `FIXME`, secretos hardcodeados: **ninguno**.

---

## 8. Checkpoints  [SUPERSEDIDO POR A.3 — se conserva el original]

- **C1: [x]** — archivos base y los tres docs presentes; `bash ./init.sh`
  **EXIT 0** (corrido por mí, 335 s, ningún test cerca de su tope: la deuda 145
  **no** se reprodujo).
- **C2: [x]** — sólo #21 en `in_progress`; el implementer **no** la marcó `done`
  (correcto: eso pasa después de la review); `progress/current.md` describe la
  sesión activa.
- **C3: [x]** — capas respetadas, feature-first, cero dependencias nuevas, cero
  `console.log`/TODO/secretos. Backend intacto.
- **C4: [ ]** <- **Razón:** lint y typecheck verdes y 1587 tests en verde, **pero
  la verificación no es real en el punto que importa**: `ProjectCard.test.tsx:399`
  afirma "tocar el cronómetro no abre el detalle" con un aserto que **no puede
  fallar** en happy-dom, y en Chrome pasa lo contrario. Un test que no puede
  ponerse rojo no verifica nada. (Ver B1.)
- **C5: [ ]** <- **Razón:** la sesión no puede cerrarse con B1 abierto. Los
  archivos sin trackear son legítimos (4 fuentes + 3 tests + informes), mis sondas
  están borradas y el árbol está limpio de artefactos. Falta la entrada en
  `progress/history.md`, que es del leader al cerrar.

---

## 9. Cambios requeridos  [SUPERSEDIDO POR A.4 — se conserva el original]

1. **Arreglar B1** (🔴): que tocar el quick-start arranque el cronómetro y **no**
   abra el cajón, comprobado en Chrome. Antes de tocar código, correr el control
   **(a)** de la sección 1 para separar "fallo de la app" de "artefacto de la
   automatización": el síntoma es indistinguible de una coordenada desviada sobre
   una capa `absolute inset-0`, y **el código no ofrece ningún camino de
   propagación**. Usar como testigo del arranque la región `Cronómetro` de
   `ProjectsView`, **no** el `aria-label` ni el tiempo de la tarjeta (los dos
   falsos negativos de la sección 1).
2. **El arreglo viene con una comprobación que pueda ponerse ROJA.**
   `ProjectCard.test.tsx:399` **no cuenta como cobertura**: hay que anotar
   explícitamente que el eje geométrico **no lo mide ningún gate de este repo** y
   dejar la verificación en navegador como paso de cierre de #21.
3. **Cerrar la REGLA 4 de T2** sobre los cuatro puntos *pendientes de pantalla* de
   la sección 6 —contraste de los trece swatches (mirar `--yarn-white` y
   `--yarn-neutral`), el multicolor, la checklist con un patrón real y el buscador
   con inventario grande—. Si algo no se puede mirar, que quede escrito como no
   verificado, en vez de aprobado por omisión.

**Nada más.** Los tres tabs, el cronómetro, los dobles y el arreglo de la foto
**no requieren cambios**: quedan aprobados y no hay que volver a tocarlos.

---

## 10. Deuda observada (no la vuelco a `progress/deudas.md`)

Confirmo **D1**, **D2** y **D3** del implementer tal como las fichó. Añado:

- **D4 (⚪)** — *Arrancar bien + recargar mal deja la pantalla diciendo que no
  corre nada.* Sonda P6, sección 2.3. Recuperable (el arranque es idempotente) y
  con error visible; sin pérdida de datos. Vive en derivar el estado del listado.
- **D5 (⚪)** — *`aspect-3/1` duplicado al literal* en `DetailTabSkeleton`
  (`ProjectDetailDrawer.tsx:397`), en vez de derivarse de `DETAIL_PHOTO_RATIO`.
- **D6 (⚪)** — *Nada prueba que el cajón pida `size="detail"`.* Borrar esa línea
  deja la suite entera verde y reabre el defecto que #21 vino a cerrar.
- **D7 (⚪)** — *Guardar la meta con el mismo valor no da ningún feedback.*
- **D8 (⚪)** — *La pestaña elegida sobrevive al cierre del cajón.*
  `ProjectDetailDrawer` se monta siempre (`ProjectsView.tsx:447`) y devuelve `null`
  cerrado, así que su `useState<DetailTab>("general")` (`:105`) **no se reinicia**:
  abrir otro proyecto aterriza en la pestaña del anterior. No es una fuga, es una
  sorpresa menor. *Pendiente de pantalla si molesta.*

**Bajo la moratoria de gates NO abro** las deudas 160, 161, 164 ni el gate de CSS
compilado en `shared/ui/`. Menciono, como observación y sin abrirlos, los dos
gates que el implementer ya fichó (nada obliga a que un componente que programa un
intervalo demuestre que lo suelta; nada obliga a que una región viva nueva tenga
nombre propio). Al de los intervalos le doy la razón con más fuerza después de
medirlo yo: el patrón funciona, y hoy sólo lo sostiene la disciplina de dos
archivos de test.

---

## 11. Fuera de alcance de esta tanda — **no se carga a T2**

La navegación móvil (`position: static` con `z-index: 100` —inerte sobre un
elemento estático—, y su rect en y=934 con el viewport en 750) es **preexistente**
y viene del bottom-nav original. **No la trato como defecto de T2** y no entra en
mis bloqueantes. Sale a la luz ahora porque es la primera vez en siete sesiones
que se puede medir el móvil, y merece su propia entrada de deuda fuera de #21.

---
---

# ADENDA — cierre de T2 (tras la medición del leader)

## A.1 — B1 queda RETIRADO: no había bug, era la coordenada

El leader corrió el **control (a)** que pedía la sección 1 —instrumentar el
puntero y comprobar dónde cae de verdad— y encontró la causa:

| | valor |
|---|---|
| coordenada pedida | `(420, 521)` |
| **dónde cayó el puntero** | **`(336, 417)`** |
| ratio | **x 1.250 - y 1.249** = el `devicePixelRatio` exacto |
| botón bajo el puntero | **"Ver detalle de asdasd"** |

**La herramienta toma píxeles FÍSICOS y se le pasaban píxeles CSS.** Todos los
clics caían en `coord / 1.25`, o sea **sobre la capa del tap** — que es
`absolute inset-0` y cubre la tarjeta entera, exactamente el escenario que este
informe describió como "indistinguible del síntoma observado". **El quick-start
nunca recibió un clic.**

Con la coordenada corregida —clic en `(525, 651)`, puntero en `(420, 521)`,
dentro del botón— el comportamiento es el correcto:

- **el cajón NO se abre** (`drawerOpened: false`);
- **la sesión arranca** (`running: 1`, comprobado **contra el backend**, no contra
  la pantalla);
- la región viva dice **"Empezaste a tejer asdasd."** — el feedback de **E2(d)**,
  que es justo el testigo que esta review señaló como el bueno;
- el `aria-label` no cambia, **correcto por E1(e)**.

**T1 no introdujo ninguna regresión. El quick-start y la capa del tap conviven
bien.** Retiro también la autocrítica de la sección 1 sobre `review_21_t1.md`
D.4: la convivencia estaba bien resuelta, y no haberla verificado entonces no
ocultó ningún defecto.

Los **dos descartes** de la sección 1 se sostienen, y explican por qué el
mecanismo "no aparecía en el código": **porque no existía**. Que un análisis
estático no encuentre el camino de propagación era, en sí mismo, la señal de que
el fallo estaba en la medición y no en la aplicación.

**Segundo falso positivo del leader, también descartado por él:** el 500 en
`GET /:id/sessions` con el tab pintando "Se soltó un punto" **no era la app**,
era el `next dev` degradado tras haberlo detenido el arnés ("Jest worker
encountered child process exceptions"). Con servidor limpio: 200 y JSON válido.
Lo registro porque cierra el último cabo suelto sobre el tab Sesiones.

## A.2 — Lo que el leader verificó en vivo, y que yo había dejado pendiente

- **Cronómetro real en el tab Sesiones:** tickea (`04:21` a `04:24` en 3 s),
  **Parar** funciona (`runningNow: 0`, panel a `00:00`), la sesión cae al
  historial y el tiempo total aparece. Esto **cierra en producción** lo que yo
  sólo había medido con sondas: el intervalo no sólo se suelta, además **cuenta
  bien**.
- **Quick-start extremo a extremo**, incluida la región viva de E2(d).
- La foto y el carril de cuatro pestañas, ya reportados antes.

## A.3 — Checkpoints, versión final (supersede la sección 8)

- **C1: [x]** — arnés completo; `bash ./init.sh` **EXIT 0** (corrido por mí).
- **C2: [x]** — sólo #21 en `in_progress`; el implementer no la marcó `done`;
  `progress/current.md` describe la sesión activa.
- **C3: [x]** — capas respetadas, feature-first, backend intacto, cero
  dependencias nuevas, cero `console.log`/TODO/secretos.
- **C4: [x]** — lint y typecheck verdes, 1587 tests verdes, y cada módulo con
  lógica no trivial tiene su test. **Cambio mi marca anterior**: la mantenía
  abierta por `ProjectCard.test.tsx:399`, y con B1 retirado eso deja de ser "un
  gate que tapó un defecto" y pasa a ser **un aserto que promete más de lo que
  mide, sin defecto detrás**. Bajo la moratoria eso es **observación, no
  bloqueante**: el usuario no ve nada hoy y el comportamiento está verificado a
  mano en navegador. Queda como deuda blanca **D9**.
- **C5: [x]** — sin artefactos sospechosos: los archivos sin trackear son los
  legítimos de la tanda (4 fuentes + 3 tests + informes) y mis sondas están
  borradas. Los dos trámites que faltan —entrada en `progress/history.md` y #21 a
  `done`— **son del leader y van después de esta aprobación**, no antes.

## A.4 — Condiciones de cierre (supersede la sección 9)

**Cambios requeridos en el código: NINGUNO.** Lo que queda es del leader:

1. **Cerrar la REGLA 4 sobre lo que aún nadie ha mirado.** Cuatro puntos siguen
   **pendientes de pantalla**, y no los apruebo por omisión:
   - **El contraste real de los trece swatches** sobre la superficie del cajón. El
     sospechoso concreto es **`--yarn-neutral`, que es literalmente
     `--surface-sunken`**: una lana de familia neutra se dibuja **del color de una
     superficie de la propia app**, y lo único que la salva de desaparecer es el
     borde. Segundo sospechoso: `--yarn-white` (`#fdfaf3`).
   - **El multicolor**: `conic-gradient` dentro de un círculo de 20 px. Emite
     regla —el gate compila el CSS— pero nadie ha visto si se lee como una rueda
     o como un borrón.
   - **La checklist de pasos con un patrón de verdad**, que es el único camino de
     los tres tabs que exige datos que hoy casi nadie tiene.
   - **El buscador de lanas con inventario grande**: el corte a
     `MAX_YARN_RESULTS` (6) y el aviso de "hay N más".

   **Si alguno no se puede mirar, que quede escrito como no verificado.** Ninguno
   bloquea el cierre: son riesgo cosmético, no funcional.
2. **Los dos trámites de cierre**: entrada en `progress/history.md` y #21 a
   `done` en `feature_list.json`.

## A.5 — Sobre `aria-live` y RFC-03 sec.5: el implementer acertó contra la letra

Coincido, y lo digo con la responsabilidad de quien revisa accesibilidad: **no es
un defecto, es la lectura correcta**. La sección 5 pide `aria-live` "para el
tiempo", y lo que hay es un `role="status"` de **grano de minuto** ("4 min")
junto a un reloj **visible** con segundos (`SessionsTab.tsx:213-229`).

Anunciar un valor que cambia **cada segundo** no es accesibilidad: es un
metrónomo que **tapa todo lo demás** de la pantalla y vuelve inusable el tab para
quien depende de un lector. La regla real es que una región viva anuncie
**cambios significativos**, y en un cronómetro el cambio significativo es el
minuto. Lo que se **ve** lleva segundos; lo que se **anuncia**, sesenta veces
menos. Hay un test que lo mide en las dos direcciones
(`SessionsTab.test.tsx:305-319`).

**Recomendación de enmienda a RFC-03 (sección 5)**, no bloqueante, para que la
letra deje de contradecir a la práctica: sustituir "`aria-live` para el tiempo"
por algo como "el tiempo se anuncia con grano de minuto; los segundos viven sólo
en lo visible". Si no se enmienda, el próximo implementer leerá la letra y lo
hará mal.

## A.6 — Deuda, versión final

Se mantienen **D1**-**D3** (del implementer) y **D4**-**D8** (sección 10). Añado
las dos que salen del propio B1, que es la lección más cara del día:

- **D9 (blanca)** — *Un aserto que promete hit-testing y no puede medirlo.*
  `ProjectCard.test.tsx:399` (`expect(onOpenDetail).not.toHaveBeenCalled()` tras
  `userEvent.click(quickStart)`) es **estructuralmente incapaz de fallar** en
  happy-dom: los dos controles son hermanos y el despacho es directo sobre el
  elemento, sin capas ni layout. **Hoy no tapa ningún defecto** —el
  comportamiento está verificado a mano en Chrome—, así que bajo la moratoria es
  observación. Lo que pido es de coste cero y **no bloquea**: que el comentario
  de ese test **deje de afirmar que mide la convivencia de las dos capas**, para
  que ningún review futuro —ni el mío— lo cite como evidencia de algo que no
  comprueba. La cobertura del eje geométrico es, y seguirá siendo hasta que haya
  gate, **la verificación en navegador**.

- **D10 (blanca, del arnés, no del código)** — *La verificación en navegador toma
  píxeles físicos y se le pasan píxeles CSS.* Costó un bloqueante falso y tres
  observaciones erróneas en una sola sesión, y volvería a costarlo: el síntoma
  —clics que caen sobre la capa que cubre la tarjeta entera— **imita
  perfectamente a un bug real**. Debería quedar escrito en la nota de la REGLA 4
  que la coordenada se multiplica por `devicePixelRatio`, y que **el primer paso
  de cualquier medición por clic es confirmar dónde cayó el puntero**, no dónde
  se pidió que cayera.

---

**Veredicto final: APPROVED.** Sin cambios de código requeridos. Condiciones de
cierre en A.4, todas del leader y ninguna bloqueante.
