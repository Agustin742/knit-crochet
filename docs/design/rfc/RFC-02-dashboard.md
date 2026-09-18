# RFC-02 — Dashboard (Principal)

- **Alcance:** la página de inicio post-login. Métricas del año + comparativas + crear proyecto + activos + ovillo hero.
- **Estado:** borrador. Depende de **RFC-01 (shell)**.
- **Proceso:** ver **[RFC-00](RFC-00-proceso.md)** (proceso SDD, jerarquía de verdad, mapeo al backlog de UI).
- **Estética:** template como insumo adaptable; ovillo ASCII fijo.

---

## 1. Decisiones que fija este RFC

- **Métrica conmutable** (horas / proyectos / metros) **y superponible** (se pueden ver combinadas, no solo una). **Default: horas.**
- **Comparativas graciosas siempre visibles**, y **para las 3 métricas** (no solo metros).
- **Filtro de año:** rango libre, abre en el **año actual**.
- **Filtro de tipo:** dos botones (agujas / crochet) que **se combinan**.
- **Lista de activos:** tope **N ≈ 15** con "ver todos"; orden default **último tejido**, cambiable desde la UI.
- **Dos botones de crear** (dos agujas / crochet) → abren el **modal de creación** con el `type` preseleccionado.
- **Ovillo ASCII de hero**: gira solo y se arrastra.

## 2. Estructura y componentes

- **Hero:** `<ascii-yarn>` (de RFC-01) + wordmark/saludo. En `kc-focusframe` para el encuadre luminoso.
- **Selector de métrica:** control conmutable/superponible (chips o `kc-toggle` múltiples) horas/proyectos/metros.
- **Panel de métricas:** `kc-card` por métrica activa, con el número grande (`--font-display`) + su **comparativa** (`--font-mono`, ej. "≈ 2 Torres Eiffel 🗼"). `kc-emphasis` en la comparativa.
- **Filtros:** selector de año (input/stepper, rango libre) + dos botones de tipo combinables (`kc-btn` con estado activo).
- **Botones crear:** `kc-btn--primary` ×2 ("Nuevo dos agujas", "Nuevo crochet").
- **Lista de activos:** `kc-card` compacta reutilizando la card de Proyectos (RFC-03): foto, nombre, `kc-progress`, tiempo. Control de orden (dropdown) + "ver todos" → Proyectos.

## 3. Datos / backend

- Consume `GET /api/dashboard/metrics?year=&type=` → `{ hours, projects, yarnMeters, comparison }`.
- Lista de activos: `GET /api/projects?active=true` (limit/orden en cliente; la lista es chica, ~15).
- **Orden "último tejido" (Q14):** el `ProjectRecord` **no** trae timestamp de la última sesión. Dos caminos: **(a)** aproximar con `updatedAt` (que ya se bumpea al parar una sesión, `store.ts` `setProjectTime`) — **sin cambio de backend**; **(b)** exponer un timestamp preciso de última sesión por proyecto — **cambio de backend**. Decisión pendiente (recomiendo (a) para no tocar backend).
- **Cambio de backend (nuevo):** extender `comparison` para dar comparativas de **horas y proyectos**, no solo metros (hoy `pickComparison` solo cubre `yarnMeters`). Añadir listas de referencia en `shared/config` para las 3 métricas.

## 4. Estados

- **Loading:** ovillo ASCII como loader + `kc-skeleton` en las cards de métrica.
- **Vacío (sin datos ese año):** `kc-empty` → "Todavía no tejiste nada en {año}" + botones de crear.
- **Error:** `kc-error` → "Se enredó la madeja" + reintentar.

## 5. Accesibilidad

- Los botones de tipo y el selector de métrica con `aria-pressed`. Año con label. Comparativas con texto real (no solo emoji).

## 6. Fuera de alcance

- El CRUD completo de proyectos (RFC-03); acá solo el modal de creación rápida y la lista de activos.

## 7. Adaptación al harness

- Página en `src/app/(app)/page.tsx` (o `/dashboard`). UI en `src/features/dashboard/ui/`.
- Reusa la card de proyecto de `src/features/projects/ui/`.
- Verificación: RTL (conmutar/superponer métrica, filtros, orden) + axe + smoke + build.

## 7-bis. Enmienda E1 — las cinco decisiones de #19, cerradas (2026-08-06)

> La ficha de #19 arrastraba **tres** decisiones heredadas de #14 y del proxy, y #16 dejó **dos** más.
> Las cinco las cerró el usuario **antes de empezar**, como manda RFC-00 §6. **No se reabren.**

**E1.1 — `/` pasa a ser PRIVADA, y no hay landing pública.** Se quita `/` de `PUBLIC_PAGES` en
`src/proxy.ts`. Sin sesión, `/` redirige a `/login?next=/` — mecanismo que el proxy **ya tiene montado y
probado**. Con sesión, `/login` sigue redirigiendo a `/`, así que el circuito cierra solo. Quedan públicas
**sólo** `/login` y `/register`. **Salda la deuda 1** (abierta durante la feature **#13 `ui_shell_nav`**).
> **CORRECCIÓN (2026-08-07, leader).** Esta enmienda decía *"salda las deudas 1 y 13"*. **Era falso y queda
> corregido.** La **deuda 13** es el interlineado del botón perdido por `twMerge`, **saldada el 2026-07-31**
> con gate propio en `button.variants.test.ts`: no tiene relación con el proxy, las rutas ni la sesión.
> El error nació de leer el `(#13)` del título de la deuda 1 —que es **el id de la feature donde se
> detectó**, convención del libro mayor (la deuda 2 lleva el mismo `(#13)` y trata de otra cosa)— como si
> fuera el número de otra deuda. De ahí se propagó a la ficha de la feature #19, y de ahí a esta enmienda.
> **No tachar la deuda 13 al cerrar #19: ya está tachada por otro motivo, y volver a tocarla corrompe el
> libro mayor.** Verificado de forma independiente por el leader contra `docs/historial/deuda-tecnica.md`.

Se descartó una landing pública aparte: ningún
RFC la pide, y RFC-02 define el Dashboard como "la página de inicio post-login" **en `/`**.

**E1.2 — El hero REEMPLAZA al fondo global en `/`; nunca dos ovillos vivos.** Hoy `AppShellClient` monta
`<AsciiYarn />` como fondo de **todo** el grupo `(app)`. En `/`, ese fondo **no se monta**: el único ovillo es
el hero, `interactive` y arrastrable (RFC-02 §1). En el resto de rutas sigue el fondo de siempre.
**Coste aceptado:** hay que dar al caparazón una forma de que la ruta decida su fondo, y hoy lo fija el
layout. Es fontanería acotada, y se paga una vez. Se descartó la segunda instancia porque **dos efectos ASCII
simultáneos duplican el coste de CPU** del bucle de asciificación, justo en la página que más se abre.

**E1.3 — El hero NO será operable por teclado, y es a propósito.** Es una **pieza decorativa de marca**: no
transmite información ni habilita ninguna acción, así que quien no pueda arrastrarlo **no se pierde nada**.
Sigue `aria-hidden` con el canvas no enfocable, así que **axe pasa**. Se descartó hacerlo enfocable porque
obligaría a sacarlo del árbol accesible oculto y darle nombre, rol e instrucciones — anunciarle a un lector de
pantalla un adorno que no lleva a ninguna parte. **Debe quedar documentado en el código** para que nadie lo
"arregle" por error.

**E1.4 — Formato de comparativa: `≈ 2,1 veces <etiqueta>`.** Las etiquetas de `shared/config` están escritas
como frases con artículo (`"El Obelisco"`, `"Un colectivo"`, `"Una semana laboral"`), así que **concatenar un
número delante produce texto roto** (*"≈ 2,1 El Obelisco"*). Anteponer **"veces"** funciona con **las once**
etiquetas de las tres listas, es español natural y **no toca ni un dato**.
- **`times < 1`** → frase propia: *"todavía no llegás a El Obelisco"*.
- **`times = 0`** → **no se pinta comparativa**. El número grande ya dice cero, y una comparativa de cero no
  informa de nada — además evita que una cuenta recién creada, que es la primera impresión de la app, muestre
  tres comparativas en cero y parezca rota.
- Se descartó pluralizar las etiquetas en config: reabriría el contrato cerrado en #16, obligaría a reescribir
  las tres listas y sus tres anclas, y **varias no tienen plural natural** (*"El Señor de los Anillos
  (extendida)"*).
- **Consecuencia: el ejemplo del PRD §8 (*"≈ 2 Obeliscos"*) dejó de ser literal y se corrigió allí**, para que
  el PRD no mienta. **Salda la deuda 69.**

**E1.5 — La tarjeta de metros lleva una marca visible de "total histórico".** Los metros son agregado
*lifetime* y **no se mueven** con el filtro de año ni de tipo (PRD §11.2), mientras las otras dos sí. Sin la
marca, el usuario cambia el año, ve **moverse dos comparativas y quedarse una**, y parece un bug. Se resuelve
**en la UI**, no en el payload: no toca el contrato de `/api/dashboard/metrics`, cerrado en #16, cuyo único
consumidor es esta misma página. **Salda la deuda 66.**

## 7-ter. Enmienda E2 — las tres decisiones que quedaban de #19, cerradas (2026-08-07)

> E1 cerró cinco decisiones, pero **quedaban tres abiertas** que sólo se vieron al planificar la slice:
> una que la ficha de #19 arrastraba sin resolver (la card), una que este mismo RFC dejaba escrita como
> pendiente (**Q14**, §3) y una que salió de medir el arnés. Las tres las cerró el usuario **antes de
> empezar**, como manda RFC-00 §6. **No se reabren.**

**E2.1 — La card de proyecto la crea #19, en `src/features/projects/ui/`, y SIN quick-start.**
La ficha de #19 decía *"reusa la card de proyecto de RFC-03"* y **esa card no existía**: la crea #20, que va
después. Se rompe el empate a favor de que **#19 la cree y #20 la reuse**.
- **Dónde vive: `src/features/projects/ui/`**, no `src/features/dashboard/ui/`. Es la card *de proyecto*, y
  §7 de este RFC ya mandaba buscarla ahí. Ponerla en `dashboard/` obligaría a #20 a importarla del feature
  ajeno al revés, o a moverla —churn gratis sobre una pieza ya probada.
- **Qué lleva: foto, nombre, barra de progreso y tiempo.** La versión de RFC-02 §2, **sin el quick-start de
  cronómetro** que RFC-03 §2 sí le pone.
- **Por qué sin quick-start:** la versión de RFC-02 es **subconjunto estricto** de la de RFC-03, así que #20
  la extiende **de forma aditiva** sin reescribir nada. Con quick-start, #19 tendría que cablear
  `time-tracking` (`POST /:id/sessions/start`), su estado de carga y su error — en la página que RFC-02 §6
  declara **fuera del CRUD de proyectos**. Se descartó también dejar un slot de acción vacío "preparado":
  un slot que ningún consumidor usa no se puede probar contra un consumidor real, y es código muerto.
- **Encargo explícito para #20:** el quick-start es tuyo, y es aditivo. No reescribas la card: añadile la
  acción.

**E2.2 — Q14 cerrada: la lista de activos ordena por `updatedAt`, y la etiqueta deja de decir "último
tejido".** §3 de este RFC dejaba la decisión abierta y recomendaba el camino (a) apoyándose en que
`updatedAt` *"ya se bumpea al parar una sesión"*.

> ⚠️ **DEROGADA EN PARTE el 2026-08-26 por la enmienda E7 (b3) de RFC-03.** Lo que decae es **sólo** la
> negativa a abrir el backend para saber si un cronómetro corre: **`GET /api/projects` pasa a incluir, por
> proyecto, su sesión abierta (o `null`)**. Lo demás de E2.2 —el orden por `updatedAt` y la etiqueta— sigue
> vigente. **Por qué se deroga:** aquella decisión dejó a la lista sin forma de saberlo, y la consecuencia
> quedó escrita en `ProjectsView.tsx:130-138` (*"la marca **se pierde al recargar**"*). El usuario la
> encontró usando la app: **tras un F5, el botón dice «Empezar» con el cronómetro corriendo**. Un estado
> que sólo vive en memoria del navegador **no puede gobernar un control que promete una acción**.
- **Lo medido (`docs/historial/reports/explore_19_datos_y_primitivas.md` §A.3):** esa afirmación es **cierta pero
  incompleta**. `setProjectTime` sí lo bumpea al parar el cronómetro — aunque vive en
  `src/features/time-tracking/api/store.ts`, **no** en el store de projects como decía §3. Pero **también**
  lo bumpean `PATCH /api/projects/:id` (renombrar, la nota, la foto, el estado…), sumar vueltas y marcar
  pasos. Y **no** lo bumpea arrancar una sesión.
- **Conclusión: `updatedAt` es "último toque", no "último tejido".** Es un **superconjunto**: se pasa de
  largo con cualquier edición de metadatos, y se queda corto mientras hay una sesión abierta sin parar.
- **Decisión: se toma el camino (a) —ordenar por `updatedAt`, coste cero, backend intacto— Y se corrige la
  etiqueta visible para que diga lo que el dato de verdad mide** (del tipo *"Actividad reciente"*). Se
  descartó mantener el rótulo "último tejido" sobre un dato que no lo sostiene: en este repo **una etiqueta
  que miente es peor que no tenerla**, y el orden además **es cambiable desde la UI** (§1), así que el
  usuario que quiera otro criterio lo tiene a un clic.
- **Se descartó el camino (b)** (exponer `lastSessionAt` con un `MAX(craft_sessions.end)` en el `list` del
  store): reabriría el backend, que está cerrado, y mete una slice entera antes de #19 para afinar un orden
  que el usuario puede cambiar. **Queda como deuda**, no como trabajo de #19.

**E2.3 — El guardrail de no-hardcode se amplía a `src/` dentro de #19.**
Medido (`explore_19_datos_y_primitivas.md` §C.3): `no-hardcode.test.ts:27` ancla su barrido a
`src/shared/ui/`, así que **`src/features/dashboard/ui/` y `src/features/projects/ui/` nacerían sin
vigilancia** de colores y píxeles sueltos. (El otro guardrail, el de sintaxis canónica de Tailwind, **sí**
barre todo `src/` desde su línea 49 — ése no hace falta tocarlo.)
- **Decisión: ampliar la raíz del barrido a `src/` en esta misma slice.** Son ~3 líneas y cierra el agujero
  para las once páginas que vienen detrás (#19-#30). Es la medicina de las deudas **40/43/71**, que es
  exactamente lo que ese archivo dice haber venido a matar.
- **Los rojos preexistentes se FICHAN, no se arreglan aquí.** Si al ampliar se encienden archivos ya
  escritos (`src/features/auth/ui/`, de #31/#32), se excluyen con **motivo escrito** y se abre ficha de
  deuda. #19 no se convierte en un lote de limpieza sobre código ajeno cuyo tamaño nadie ha medido.

## 7-quater. Enmienda E3 — el Dashboard entra en la columna acotada (2026-08-20)

**La decisión de fondo NO vive aquí, vive en [RFC-01 §3, enmienda E13](RFC-01-shell.md)**, porque no es del
Dashboard: es del caparazón y rige para las 6 rutas. Esta sección sólo registra **qué le toca a esta
página**, para que quien lea el RFC-02 no tenga que deducirlo.

**Qué la motiva.** La verificación en navegador del 2026-08-20 (la primera que se completa; informe
`docs/historial/informes/25.informe-deudas_146_147_148.md` §REGLA 4). El usuario reportó la página como *"horrible"*
y la causa raíz resultó ser que **no existe contenedor de ancho máximo en toda la app** — no un defecto de
esta página. **Deuda 154.**

| # | Qué cambia en el Dashboard | Referencia |
|---|---|---|
| **E3 (a)** | El contenido de la página pasa a vivir dentro de la **columna centrada con tope** del `AppShell`. La página **no declara ancho propio**: lo hereda. | E13 (a) |
| **E3 (b)** | **El panel de métricas deja de reservar tres columnas fijas**: pinta tantas como métricas haya elegidas (1 → ancho completo, 2 → mitades, 3 → tercios). **§1 no se toca** — la métrica sigue siendo conmutable y superponible; lo que cambia es que no se guarda sitio para lo que no está. Importa porque el default es **una** métrica, así que hoy **el estado por defecto es el peor que la página sabe pintar**. | E13 (b) |
| **E3 (c)** | **El selector de orden y el de año pierden su `Card`.** `Card` queda para contenido (tarjeta de métrica, tarjeta de proyecto). Hoy el bloque "Ordenar por" se lee como un panel a la deriva, con "Ver todos" colgando fuera de su marco, porque dos controles llevan marco y sus vecinos de la misma fila no. | E13 (c) |

**Lo que esta enmienda NO arregla, y conviene no confundir:** el **estado vacío del año es inalcanzable**
mientras haya un proyecto activo (**deuda 153**) — `isEmpty` exige que la lista de activos esté vacía y esa
lista es **de por vida**, no del año, porque `GET /api/projects?active=true` (§3) no tiene filtro de año.
Es un fallo de **lógica**, no de layout, y arreglarlo obliga a elegir qué significa "Proyectos en curso".

## 7-quinquies. Enmienda E4 — qué significa "Proyectos en curso", y el vacío se vuelve alcanzable (2026-08-24)

**Qué la motiva.** La **deuda 153**, abierta por la verificación en navegador del 2026-08-20 y anunciada al
final de E3 como *"un fallo de lógica que obliga a elegir"*. La elección **la tomó el usuario el
2026-08-24**, con las tres salidas medidas sobre el código antes de preguntar.

**El hecho comprobado que obliga a decidir.** `getActiveProjects` (`dashboard-client.ts:119`) **recibe
`year` y no lo manda nunca**: su `queryString` sólo lleva `active` y `type`. El parámetro **miente**, y
eso hay que arreglarlo sea cual sea la salida. Comprobado también que el backend **sí** sabe filtrar por
fecha —`store.ts:103-107` aplica `from`/`to` sobre `startDate`—, así que la salida "filtrar por año" era
barata; **se descartó igual**, por lo que significa, no por lo que cuesta.

### La decisión

| # | Qué se fija | Por qué |
|---|---|---|
| **E4 (a)** | **"Proyectos en curso" es el PRESENTE, no una rebanada del año.** El panel muestra lo que está abierto *ahora* y **no se filtra por año**. En consecuencia el parámetro `year` **se elimina** de `getActiveProjects`: no se manda ni se recibe. Un parámetro que no se usa se borra, no se documenta. | Es lo que el nombre del panel promete. Filtrar por `startDate` habría **escondido un proyecto empezado en 2025 y aún vivo hoy** de la vista de 2026 — un proyecto que estás tejiendo desaparecería de "en curso". |
| **E4 (b)** | **El vacío es del AÑO y sólo del año:** `isEmpty` deja de exigir `data.projects.length === 0` y se juzga con las métricas del año (`hours`, `projects`). | Es **literalmente el mismo razonamiento que el código ya tiene escrito tres líneas más arriba** para los metros (E1.5): un agregado *lifetime* dentro de un juicio *anual* hace el vacío inalcanzable. `projects` caía en la misma trampa que su vecino se cuidó de esquivar. |
| **E4 (c)** | El estado vacío de §4 (*"Todavía no tejiste nada en {año}"*) pasa a ser **alcanzable en pantalla**, y con él la copia que saldó la **deuda 147**. Ese camino de llegada tiene que quedar **anclado por test**, no sólo arreglado. | La 147 se saldó bien y su copia estaba anclada, pero **nadie podía verla**. Un estado que ningún test alcanza vuelve a romperse sin que nadie se entere. |

**Lo que E4 NO cambia.** El panel sigue recibiendo el filtro de **tipo** (`type`), que sí es un filtro del
presente y sigue teniendo sentido. Y **§4 no cambia de texto**: el vacío siempre dijo *"sin datos ese

### E4 (d) — el vacío del año NO puede esconder un proyecto vivo

**Derivada por el leader al implementar E4, no elegida aparte.** Sale de comprobar el render: hoy
`isEmpty` **sustituye a los dos paneles** (`DashboardView.tsx:287`), y con E4(b) el vacío pasa a ser
alcanzable **teniendo proyectos activos** — año 2027 recién empezado, proyecto abierto en 2026 y
todavía en las agujas. Con la composición actual, ese proyecto **desaparecería de la pantalla**.

**Por qué no se acepta ese desenlace:** es *literalmente* el motivo por el que se descartó filtrar el
panel por año en E4(a). Sería llegar al mismo sitio por la otra puerta.

| Qué se fija | |
|---|---|
| El estado vacío del año sustituye **al panel de métricas**, que es lo que juzga el año. | El vacío dice *"todavía no tejiste nada en {año}"*: es una afirmación **sobre las métricas del año**. |
| **"Proyectos en curso" se pinta siempre que haya proyectos activos**, esté el año vacío o no. | Es del **presente** (E4 a). Un juicio sobre el año no gobierna un panel que no es del año. |
| Si además no hay proyectos activos, no hay panel que pintar y la página queda en el vacío puro. | El caso del usuario nuevo, que es para quien se escribió el estado vacío, no cambia. |
año"*; lo que cambia es que ahora la condición del código coincide con lo que la frase promete.

### E4 (e) — la copia del vacío se desdobla (decisión del usuario, 2026-08-24)

**Qué la motiva.** Un hallazgo del implementer de E4, medido sobre el render y elevado al usuario, que
**eligió**. Al volverse alcanzable con proyectos activos (E4 b + d), el estado vacío pintaba su
descripción de siempre —*"Empezá el primero y acá van a estar tus horas, tus proyectos y lo que llevás
tejido de cada uno"*— **justo encima del panel "Proyectos en curso" con el proyecto dentro**. Le decía
*"empezá el primero"* a quien tiene uno a la vista.

**Es la misma familia que la 153 que E4 acaba de saldar**, un piso más arriba: una afirmación
*lifetime* ("el primero") dentro de un estado **anual**. La condición ya se arregló; la frase seguía
prometiendo lo que la condición dejó de exigir.

| Qué se fija | |
|---|---|
| **El título NO cambia.** Sigue siendo el de §4: *"Todavía no tejiste nada en {año}"*. | Es una afirmación sobre el año y es cierta en los dos casos. |
| **La descripción pasa a tener dos formas**, elegidas por si hay o no proyectos activos. | El mismo estado se alcanza ahora por dos caminos que **no le hablan a la misma persona**. |
| **Sin proyectos activos** → la copia de hoy, la que saldó la **deuda 147**. Intacta, con su ancla. | Es el usuario que de verdad empieza de cero, que es para quien se escribió. |
| **Con proyectos activos** → una copia que habla **sólo del año** y **no presupone cero proyectos de por vida**, en el mismo tono que el resto de la app (voseo, cercano). | El año está en blanco, pero su proyecto sigue ahí abajo: la frase no puede contradecir lo que se ve en la misma pantalla. |
| Las **dos direcciones** quedan ancladas por test. | Sin el control inverso no se sabe si la copia salió por el motivo correcto — mismo criterio que E4 (c). |

**Qué le pasa a "§4 no cambia de texto"** (dicho arriba, en *Lo que E4 NO cambia*): sigue valiendo para
el **título**, que es lo que §4 fija, y **deja de valer para la descripción**, que a partir de aquí
depende de si hay algo en curso. Se anota explícitamente para que nadie lea las dos frases como una
contradicción.

## 8. Slices de implementación (→ backlog de UI)

IDs reales en la tabla de [RFC-00 §4](RFC-00-proceso.md); las entradas que siguen abiertas están en `docs/product/backlog-ui.md`:

- **feature 16 `dashboard_comparison_3metrics`** (backend) — extender `comparison` a las 3 métricas
  (+ referencias en `shared/config`, +tests). **`done` (2026-08-05).**
- **feature 33 `ui_primitives_2`** (design system, **slice nueva del 2026-08-06**) — **PRERREQUISITO de #19.**
  Entrega las seis piezas del SDD §6 que esta página necesita y que **no existían**: barra de progreso,
  skeleton, estado vacío, estado de error, toggle conmutable/superponible y modal. Salieron a slice propia
  porque **las necesitan todas las páginas #19-#30**, no sólo el Dashboard.
- **feature 19 `dashboard_ui`** — página Dashboard (hero + selector conmutable/superponible + métricas
  + comparativas + filtros año/tipo + activos con orden/ver-todos + modal de creación con type).
  **Sus cinco decisiones de scope están cerradas en la enmienda E1 (§7-bis).**
