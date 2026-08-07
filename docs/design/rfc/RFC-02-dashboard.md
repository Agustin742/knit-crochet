# RFC-02 — Dashboard (Principal)

- **Alcance:** la página de inicio post-login. Métricas del año + comparativas + crear proyecto + activos + ovillo hero.
- **Estado:** borrador. Depende de **RFC-01 (shell)**.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`).
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
> fuera el número de otra deuda. De ahí se propagó a `feature_list.json` #19, y de ahí a esta enmienda.
> **No tachar la deuda 13 al cerrar #19: ya está tachada por otro motivo, y volver a tocarla corrompe el
> libro mayor.** Verificado de forma independiente por el leader contra `progress/deudas.md`.

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
- **Lo medido (`progress/reports/explore_19_datos_y_primitivas.md` §A.3):** esa afirmación es **cierta pero
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

## 8. Slices de implementación (→ `feature_list.json`)

IDs reales en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 16 `dashboard_comparison_3metrics`** (backend) — extender `comparison` a las 3 métricas
  (+ referencias en `shared/config`, +tests). **`done` (2026-08-05).**
- **feature 33 `ui_primitives_2`** (design system, **slice nueva del 2026-08-06**) — **PRERREQUISITO de #19.**
  Entrega las seis piezas del SDD §6 que esta página necesita y que **no existían**: barra de progreso,
  skeleton, estado vacío, estado de error, toggle conmutable/superponible y modal. Salieron a slice propia
  porque **las necesitan todas las páginas #19-#30**, no sólo el Dashboard.
- **feature 19 `dashboard_ui`** — página Dashboard (hero + selector conmutable/superponible + métricas
  + comparativas + filtros año/tipo + activos con orden/ver-todos + modal de creación con type).
  **Sus cinco decisiones de scope están cerradas en la enmienda E1 (§7-bis).**
