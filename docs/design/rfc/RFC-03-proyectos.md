# RFC-03 — Proyectos

- **Alcance:** lista + filtros + CRUD + detalle (con progreso, rounds, pasos, lanas, patrón y cronómetro).
- **Estado:** borrador. Depende de **RFC-01**.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`).
- **Estética:** template adaptable.

---

## 1. Decisiones que fija este RFC

- **Detalle en drawer lateral**; **crear/editar en modal**; **ver y editar por separado** (el drawer abre en modo ver; "editar" abre el modal).
- **Filtros principales:** activo/inactivo, tipo, rango de fechas. **Resto** (aguja, lana usada) en **"más filtros"**.
  → ⚠️ **El rango de fechas NO entra en #20** (enmienda **E1(b)**, §7-bis): §2 no lo pone en el toolbar y
  la ficha de #20 tampoco. El backend sí lo soporta. **No lo añadas "arreglando" esta línea.**
- **Activo/inactivo** = toggle **segmentado aparte**, default **activos**.
- **Botones de tipo** (agujas/crochet) **filtran** la lista.
- **Card = solo** foto, nombre, `kc-progress`, tiempo total (los detalles se ven al abrir).
- **Detalle en tabs:** General · Progreso · Lanas · Sesiones.
- **Rounds** con controles **+/−**.
- **Pasos (checklist):** si el proyecto **no** tiene patrón, **se ocultan** y se ofrece **"crear patrón"**.
- **Cronómetro:** Start/Stop + tiempo en vivo + histórico; **quick-start desde la card**.
- **Lanas enlazadas:** buscador/selector del inventario; se muestra el **color de la lana** + marca + tipo.
- **Patrón:** se puede **elegir de biblioteca** o **crear embebido** (ambas opciones).

## 2. Estructura y componentes

- **Toolbar:** segmentado activo/inactivo (`kc-tabs`/toggle) + botones de tipo (`kc-btn`) + "más filtros" (desplegable) + buscar.
  → ⚠️ **`kc-tabs` no existe en el repo**: el segmentado son **dos `Toggle`** con la exclusividad impuesta
  por el consumidor (**E1(i)**). **"Más filtros"** es un **`<details>` nativo**, no un modal (**E1(g)**).
  **"Buscar" NO tiene backend** y se filtra **en cliente** (**E1(a)**) — §3 de este mismo RFC no lo respalda.
- **Lista:** grilla de cards de proyecto: foto, nombre, `kc-progress`, tiempo, y **quick-start** de cronómetro (`kc-btn--icon`). Tap → drawer.
  → ⚠️ **En #20 la card NO es tocable** (**E1(f)**): el drawer es la feature **#21**, que está `pending` y
  **no existe** cuando se implementa #20. Además un `<button>` dentro de un `<a>` es HTML inválido y `axe`
  lo marca. **El tap lo añade #21**, de forma aditiva.
- **Drawer de detalle** (`kc-tabs`):
  - **General:** nombre, foto, tipo, status, needles, fechas, notas. Botón "Editar" → modal.
  - **Progreso:** rounds (+/−) + `targetRounds` (editable) → `kc-progress` recalculado; pasos (checklist si hay patrón; si no, "crear patrón").
  - **Lanas:** lista de lanas enlazadas (swatch de color + marca·tipo·colorName) + buscador para enlazar/desenlazar.
  - **Sesiones:** cronómetro Start/Stop (tiempo en vivo, tick client) + histórico de sesiones.
- **Modal crear/editar:** form (`kc-field`/`kc-input`) con foto (upload), tipo, targetRounds, needles, patrón (elegir/embebido).

## 3. Datos / backend

- `GET /api/projects` (filtros `?active=&type=&needle=&yarnId=&from=&to=`), `POST`, `GET/PATCH/DELETE /:id`.
- Acciones: `POST /:id/rounds` ({delta}), `PATCH /:id/steps` ({completedSteps}), `POST/DELETE /:id/yarns[/:yarnId]`.
- Cronómetro: `POST /:id/sessions/start`, `PATCH /:id/sessions/stop`, `GET /:id/sessions`.
- **Cambios de backend (nuevos):**
  - **`GET /:id` debe devolver las lanas enlazadas** (deuda 5) — hoy no las trae.
  - **Cloudinary incremental:** parte del `POST /api/uploads/image` para la foto del proyecto.

## 4. Estados

- **Loading:** `kc-skeleton` en las cards.
- **Vacío:** `kc-empty` → "Tu cesto está vacío — empezá un proyecto" + los 2 botones de crear.
- **Error:** `kc-error` → "Se soltó un punto" + reintentar.
- **Borrado:** confirmación siempre (`kc-dialog`); si el proyecto tiene lanas/sesiones, la cascada la maneja la FK (ya resuelto en backend).

## 5. Accesibilidad

- Segmentado con `aria-pressed`; rounds +/− con labels; cronómetro con `aria-live` para el tiempo; drawer con foco atrapado y `aria-modal`.

  → ⚠️ **El `aria-live` NO va en el reloj de segundos** (enmienda **E4**, §7-quinquies): anunciar un
  valor que cambia **cada segundo** convierte al lector de pantalla en un metrónomo y tapa el resto de
  la pantalla. Lo que se anuncia son los **minutos** y los cambios de estado. **No lo "arregles"
  creyendo que falta algo.**

## 6. Fuera de alcance

- CRUD de lanas (RFC-04) y de patrones (RFC-05); acá solo se **enlazan**.

## 7. Adaptación al harness

- Página `src/app/(app)/proyectos/`. UI en `src/features/projects/ui/`.
- Verificación: RTL (filtros, rounds, enlazar lana, cronómetro start/stop) + axe + smoke + build.

## 7-bis. Enmienda E1 — las nueve decisiones de #20, cerradas (2026-08-12)

> 🔴 **CORRECCIÓN (2026-08-12, leader).** Esta enmienda se tituló *"las **ocho** decisiones"* y enumera
> **nueve** (a-i). **Queda corregida, no borrada.** El desajuste nació de contar sólo las **ocho que
> cerró el usuario** y olvidar que **E1(i) la añadió el leader** — está marcada como tal en su propio
> encabezado. **Son nueve en total: ocho del usuario + una del leader.** Lo levantó el implementer de
> #20 (§6.1 de `progress/reports/impl_projects_list_ui.md`), leyendo el documento en vez de fiarse del
> título. Es la misma raíz que este proyecto lleva registrada cuatro veces: *nadie volvió a la fuente a
> contar*.

> **Por qué existe esta enmienda.** Al planear **#20 `projects_list_ui`** se midió el repo contra este
> RFC y aparecieron **nueve** puntos que ninguna fuente cerraba —y uno que este mismo RFC **se
> contradice a sí mismo**—. No son detalles de implementación: son decisiones que el implementer no
> puede improvisar sin inventarse el contrato. **Ocho las cerró el usuario** el 2026-08-12; **E1(i) la
> asumió el leader** por ser técnica y no de producto.
> Informes de medición: `progress/reports/explore_20_filtros_backend.md`,
> `explore_20_card_quickstart.md`, `explore_20_pagina_estados_gates.md`.

### E1(a) — "Buscar" se resuelve **en cliente**, filtrando por nombre. No se toca el backend.

**§2 pide un buscador que §3 no respalda.** Medido: `projectFiltersSchema`
(`src/features/projects/validation.ts:39-50`) tiene **exactamente siete** claves —`active`, `type`,
`needle`, `yarnId`, `patternId`, `from`, `to`— y **ninguna es de texto**. No hay `ilike`, ni `tsvector`,
ni índice de texto en `src/features/projects/schema.ts`. **Y el PRD §6.2 tampoco lo pide**: el buscador
aparece por primera vez en §2 de este RFC. No es que el backend se lo olvidara — **nunca se especificó
como dato**.

**Lo que decide el motivo:** el endpoint **no pagina** (`store.list` no aplica `.limit()` ni `.offset()`,
y el test ancla `projects-routes.test.ts:310-320` lo impide con `toEqual`), así que **la lista ya se trae
entera de todas formas**. Filtrar en memoria **no empeora nada**. Es además el precedente que ya sentó
#19: el orden y el tope de activos son de cliente porque el contrato no los tiene
(`ActiveProjectsPanel.tsx:36`, `filters.ts:56`).

**Se descartó** ampliar el backend: rompería "backend cerrado" (features 1-18 `done`) y obligaría a tocar
el test ancla del contrato, el PRD §9 y §3 de este RFC. Es una feature de backend, no un detalle de #20.

> ⚠️ **Modo de fallo silencioso que hace urgente esta decisión, medido ejecutando zod 4.4.3:**
> `projectFiltersSchema` es un `z.object` **sin `.strict()`**, y el modo por defecto de zod es *strip*.
> `GET /api/projects?search=gorro` responde **200 con la lista sin filtrar** — no un 400, sin log, sin
> aviso. **Un buscador cableado contra un parámetro inexistente no falla: miente.**

### E1(b) — El **rango de fechas NO entra** en el toolbar de #20. Se ficha como deuda.

Contradicción interna del RFC: **§1 lo declara filtro *principal*** y el PRD §6.2 lo lista, pero **§2 —la
línea que describe el toolbar— no lo menciona**, y el `acceptance` de #20 tampoco. El backend **sí** lo
soporta (`?from=&to=`, `gte`/`lte` sobre **`startDate`**, `store.ts:103-108`).

Se deja fuera para **mantener #20 pegada a su ficha**, que ya es una slice grande. Como el backend existe,
añadirlo después es **aditivo y barato**. La contradicción se resuelve a propósito más adelante, no de
refilón dentro de otra slice.

### E1(c) — Las opciones de **aguja** salen de una **lista fija en `src/shared/config`**.

Medido: **no existe ningún endpoint de "medidas de aguja usadas"**. `needles` es una columna **jsonb por
proyecto** (`number[]`), y el filtro `?needle=` es **contención jsonb** (`projects.needles @> '[4]'::jsonb`,
`store.ts:77-81`) — o sea *"el array de agujas contiene esta medida"*, un solo valor por petición.

**Se descartó derivar las opciones de los proyectos ya cargados porque es circular**: la lista que tenés ya
está filtrada, así que elegir 4mm reduciría la lista y 4mm podría quedar como única opción. Las medidas de
aguja son un **conjunto estándar del dominio**, no un dato del usuario — van donde el proyecto ya guarda
este tipo de listas.

### E1(d) — La lana se etiqueta **sólo por color** en su selector. La limitación se ficha.

`GET /api/yarns` devuelve la **fila cruda**: `brandId`/`typeId` son **UUIDs, no nombres**
(`src/features/yarns/api/store.ts:244-249`). El único sitio del repo que aplana los nombres es
`listLinkedYarns` (`store.ts:177-199`), y **sólo sirve al detalle de un proyecto**, no a un selector global.

Se usa `colorName` (y `colorFamily` si hace falta desambiguar). **Precio aceptado y escrito:** dos lanas de
la misma marca con el mismo nombre de color **no se distinguen** en el desplegable. Se descartó pedir
marcas y tipos aparte: triplicaría el fetch de un desplegable secundario que vive **dentro** de "más
filtros".

### E1(e) — El quick-start **sólo arranca**. No es un toggle start/stop.

Es lo que este RFC dice **literalmente**: §1 línea 20 y §2 línea 27 dicen *"quick-**start**"*, y **nunca**
"toggle" ni "quick-stop". Start/Stop aparece siempre asociado al **drawer / tab Sesiones** (§2 línea 32),
no a la card.

**Los tres hechos medidos que lo sostienen** (el implementer no los re-deriva):

1. **`POST /:id/sessions/start` es IDEMPOTENTE.** `start-session.ts:28-31`: si ya hay una sesión abierta,
   la **reutiliza** y responde **200**; si crea, **201**. **Nunca 409, nunca duplica, nunca reinicia
   `start`.** Un doble tap no puede corromper nada, así que el botón puede ser optimista.
2. **El 409 está en el STOP, no en el start.** `PATCH /:id/sessions/stop` responde **409
   `"No hay ninguna sesión de tejido en marcha."`** si no hay ninguna corriendo. Arrancar dos veces es
   gratis; parar dos veces es un error visible. Es la asimetría contraria a la que uno supondría.
3. **No hay forma de saber desde la lista si un proyecto tiene el cronómetro corriendo.** Ni columna
   (`schema.ts:17-40` no tiene `activeSessionId` ni `runningSince`), ni filtro (`active` es el **status**
   del proyecto, no el cronómetro), ni endpoint agregado (`findActive` es **por proyecto** e interno del
   servidor). La enmienda **E2.2 del RFC-02 ya descartó** abrir el backend para esto.

**Por eso un toggle era inviable sin mentir:** obligaría a una petición extra **por card**, o a un estado
en memoria que **se pierde al recargar** y pinta el botón equivocado tras un F5. El estado "corriendo" se
aprende **al tocar** (201 vs 200), no antes.

> **Nota para el cliente HTTP:** el molde de #19 (`dashboard-client.ts:68`) mira sólo `response.ok`, que
> **funde 200 y 201**. Si #20 quiere distinguir "arranqué yo" de "ya estaba corriendo", tiene que
> devolver el `status` **también en el camino OK** — es un ensanchamiento del molde, no una copia.

### E1(f) — En #20 **la card no es tocable**. Sólo el quick-start es interactivo.

§2 dice, en la misma frase, *"quick-start (`kc-btn--icon`). **Tap → drawer**"* — un control dentro de otro
control. Pero **la feature 21 `projects_detail_ui` está `pending`: el drawer NO EXISTE** en el momento de
#20, y **ninguna fuente dice qué debe hacer el tap mientras tanto**.

**El motivo técnico que cierra la decisión:** anidar un `<button>` dentro de un `<a>` es **HTML inválido y
`axe` lo marca** — y la card **corre `axe` en su propio test** (`ProjectCard.test.tsx:119-126`). Además la
raíz de la card es un `div` (`Card.tsx:16`), y un `div` con `onClick` **no es alcanzable por teclado**.

**#21 añade el tap cuando el drawer exista**, y será aditivo igual que lo es ahora el quick-start. Se
descartó enlazar a una ruta inexistente (dejaría un 404 cableado) y adelantar un drawer mínimo (se come el
alcance de #21 y rompe "una sola feature a la vez").

### E1(g) — "Más filtros" se hace con **`<details>`/`<summary>` nativo**.

Medido: **no existe primitivo de disclosure, popover ni desplegable** en `src/shared/ui/`. Lo más cercano
es `Dialog` (modal en portal).

`<details>` es **accesible de fábrica**, no necesita primitivo nuevo, no usa portal, y **no arrastra el
gate de bloqueo de scroll** que sí exigiría el `Dialog` (deuda 101: nada obliga a que un test que monta un
`Dialog` compruebe que soltó el bloqueo; #19 se lo escribió a mano en `DashboardView.test.tsx:185`). Para
**dos campos** dentro de una toolbar, un modal es desproporcionado.

Se descartó crear un primitivo nuevo: tocaría `public-api.test.ts`, que está **anclado al literal**, y es
una slice de design system, no de #20.

### E1(h) — #20 escribe su **propio `projects-client.ts`**: tercer clon, y se ficha como deuda.

Medido: **no hay cliente HTTP compartido de navegador.** `src/shared/lib/http.ts` importa `next/server` y
es **exclusivamente de Route Handlers**. Hay **dos clones** del mismo patrón (`auth-client.ts` y
`dashboard-client.ts`), con `readErrorMessage` **copiado literal** entre los dos.

Se duplica por tercera vez **a propósito**: extraer un cliente compartido toca **dos features ya `done` y
revisadas** (auth y dashboard) y sus tests — es refactor de `shared/lib`, no trabajo de esta slice.
**Queda fichado** para no llegar a cinco copias en #21/#22.

**Las cinco decisiones del molde que el clon hereda** (`dashboard-client.ts:8-16`): endpoints y mensajes
como **constantes exportadas** (para que los tests los importen en vez de reescribirlos), `fetch` pelado
con `credentials: "same-origin"`, resultado como **unión discriminada** en vez de excepciones,
**`status: 0` = la petición no llegó a salir**, y lector de error defensivo (un 500 puede responder HTML;
un 200 con cuerpo ilegible se trata como error).

### E1(i) — El segmentado activo/inactivo son **dos `Toggle` con la exclusividad impuesta desde el consumidor**. *(Decisión del leader, no del usuario.)*

§2 escribe *"`kc-tabs`/toggle"*, pero **en el repo sólo existe la mitad `toggle`**. `ToggleGroup` es
`role="group"` y **su JSDoc dice explícitamente que NO impone exclusividad**, y que no es `radiogroup` ni
`tablist` porque esos prometen exactamente una opción activa.

Se resuelve con **dos `Toggle`** dentro de un `ToggleGroup` (que aporta el `aria-label` obligatorio), y la
exclusividad la impone el consumidor. Cumple lo que pide §5 (*"segmentado con `aria-pressed`"*) sin crear
un primitivo nuevo ni tocar `public-api.test.ts`.

**Default = activos**, y ojo con esto: **el backend NO tiene default de "activos"**. Sin el parámetro
devuelve **todo** (`store.ts:68-73`). El *"default activos"* de §1 es una decisión de **cliente**: la
página tiene que mandar `?active=true` **explícitamente**, igual que ya hace
`dashboard-client.ts:123-126`. Y `active` **sólo acepta las cadenas `"true"`/`"false"`**: `?active=1` da
**400**.

> 🔴 **ENMENDADA POR E2(c) el 2026-08-13. La parte mecánica de E1(i) sigue vigente; su justificación
> era mala y el resultado en pantalla era malo.** *"Sin crear un primitivo nuevo ni tocar
> `public-api.test.ts`"* **es un argumento de coste del arnés usado para decidir una cuestión de
> experiencia de usuario**, y produjo cuatro botones idénticos donde dos son excluyentes y dos
> acumulables. Además la premisa era falsa: un componente en `features/**/ui/` no toca ese ancla.
> Ver **deuda 142** y `docs/harness/conventions.md` §"El template es un SUELO, no un techo".
> **No revertir E2(c) "restaurando" esto.**

---

## 7-ter. Enmienda E2 — las decisiones VISUALES de `/proyectos` (2026-08-13)

**Por qué existe esta enmienda.** #20 se cerró verde (`1281 passed`), con `axe`, gate de composición y
review aprobado a la primera. El usuario abrió la página y **se veía mal**. La verificación en navegador
real del leader (`progress/reports/verificacion_navegador_proyectos.md`) midió seis defectos, y la
exploración de `docs/` encontró la causa raíz: **este RFC fija piezas y su orden, y nada de aspecto**
(deuda **143**). Las nueve decisiones de E1 son todas de contrato. Cuando el contrato calla, el
inventario de `shared/ui/` pasa a ser la especificación por descarte.

**E2 es el contrato visual que faltaba.** No es una feature: es deuda técnica (**136-144**).
`feature_list.json` **no se toca**; #20 sigue `done`.

### E2(a) — La página adopta la jerarquía del Dashboard: secciones con título visible

Hoy `/proyectos` tiene un `h1` suelto y **ninguna sección titulada**, mientras el Dashboard (#19, la
otra página de contenido) usa `<section>` con `<h2>` **visible** y los controles en la fila del título.
La lista se alinea con ese precedente: deja de ser una pila plana de bloques.
**Sigue habiendo exactamente un `h1`** — el gate de composición no se toca.

### E2(b) — Todo el toolbar vive en UNA sola superficie, y desaparece la fila de alturas incompatibles

Hoy medio toolbar flota sobre el fondo espresso (los `Toggle`) y medio sobre una tarjeta elevada (el
buscador), en una fila `items-end` que mezcla hijos de 44px con uno de 123px: la tarjeta se lee como un
**diálogo abierto** y quedan ~78px de hueco muerto (deuda **136**).

- **Segmentado + tipo + buscar + "más filtros" van dentro de un único `Card`.**
- **El `Card` se queda en variante `raised`, obligatorio.** No es estética: es la **única superficie
  clara donde el anillo de foco llega a 3:1** (medido: 4.68 / 3.13 / 2.95 / 2.41 — deuda **31**).
  `flat` **no vale**.
- **Trampa simétrica, medida, no la descubras a golpes:** al entrar en la `Card`, el `<summary>` de
  "Más filtros" **tiene que pasar de `text-fg-inverse` a `text-fg`** (crema sobre `raised` = **1.14:1**,
  la deuda **32** al revés). Y ojo con el dato que agrava todo lo anterior: **`text-fg` y `--bg` son el
  mismo color (1.00:1)**, así que un `Field` suelto sobre el fondo no es "poco legible": es **invisible**.

### E2(c) — El segmentado deja de parecerse a los filtros de tipo (la observación del usuario)

**El defecto:** cuatro botones idénticos de 44px en fila, de los cuales **los dos primeros son
excluyentes** (estado) y **los dos siguientes acumulables** (tipo). Nada en la pantalla lo dice.

1. **Los dos grupos llevan etiqueta VISIBLE.** Hoy sus nombres (`STATUS_GROUP_LABEL`,
   `TYPE_GROUP_LABEL`) existen **sólo como nombre accesible**: quien mira la pantalla no los ve. Es la
   mitad del arreglo y es barata.
2. **Se crea un componente de segmentado de verdad** para el grupo excluyente: **un solo contenedor
   continuo, sin separación entre opciones**, con la opción elegida rellena — la forma que promete
   "elegís una". Los filtros de **tipo se quedan como fichas separadas con hueco entre ellas** — la
   forma que promete "podés marcar varias". **La diferencia de comportamiento tiene que verse sin
   probar los botones.**
3. **Dónde vive y qué gate paga.** Va en **`src/shared/ui/primitives/`**, y **sí, hay que añadirlo a la
   lista literal de `public-api.test.ts`: se paga y punto.** Es un control genérico, no algo de
   proyectos. *(Medido: meterlo en `features/projects/ui/` esquivaría ese ancla — y precisamente por eso
   no se hace: esconder la pieza para no tocar un gate es la enfermedad que E2 viene a curar.)*
4. **Accesibilidad, sin retroceder:** se conserva `aria-pressed` (lo pide §5) y el nombre accesible del
   grupo. No se usa `radiogroup` ni `tablist` por el motivo que ya daba el JSDoc de `ToggleGroup`.

### E2(d) — Toda acción con efecto tiene feedback VISIBLE. Se acaba el aviso sólo para lector de pantalla

**Contexto medido, y es peor que un descuido:** en **toda la app no existe feedback visible de una
acción que sale bien** (deuda **144**) — no hay `Toast` construido, `--success` sin un solo uso,
`--z-toast` declarado sin implementación. **La app sabe decir "esto falló" y no sabe decir "esto salió
bien".** El `sr-only` del quick-start no fue un despiste: era el único patrón que existía.

- **El aviso del quick-start pasa a ser visible.** Sigue siendo región viva y **conserva su
  `aria-label`** (deuda **114**): se le quita el `sr-only`, no el rol.
- **Además, la tarjeta que arrancó marca su estado.** Un aviso lejos del botón es feedback débil.
  Tras un arranque con éxito, esa tarjeta queda marcada como *en marcha* **durante la sesión de
  navegación**.
  ⚠️ **Límite honesto, escrito a propósito:** ese estado **se pierde al recargar**, porque
  **no hay forma de saber desde la lista si el cronómetro corre** (ni columna, ni filtro, ni endpoint;
  E2.2 del RFC-02 descartó abrir el backend). La marca es un hecho **de esta sesión**, y el texto tiene
  que sonar a eso. **Prohibido inventar un estado persistente que la app no puede sostener.**
- **E1(e) sigue en pie: el quick-start NO es un toggle.** Marcar "en marcha" no es ofrecer "parar".
- **No se construye un sistema de toasts.** Queda fuera de alcance; la deuda **144** sigue viva.

### E2(e) — El estado vacío distingue "no tenés proyectos" de "tus filtros no devuelven nada"

Hoy `ProjectsView.tsx:241` decide con `listIsEmpty` y le dice *"Tu cesto está vacío — Empezá un
proyecto"* a alguien que **sí tiene proyectos** y sólo filtró por Inactivos, por tipo o por aguja
(deuda **138**). Sólo el buscador de cliente distingue bien.

- **Tres casos, tres mensajes:** cesto vacío de verdad · filtros sin resultados · búsqueda sin
  coincidencias (este último ya existe y **se conserva tal cual**).
- **El caso "filtros sin resultados" ofrece la salida obvia: un control para quitar los filtros** que
  devuelva la vista a su estado por defecto. Hoy el usuario queda en un callejón sin salida.

### E2(f) — El copy deja de explicarle el andamiaje del proyecto al usuario

Dos textos escritos para un desarrollador, no para quien teje (deuda **139**):
`EMPTY_DESCRIPTION` (*"…te llevan al inicio, **que es donde hoy se crea en dos pasos**"* — el "hoy"
delata que es una excusa por que #22 no existe) y `SEARCH_HINT` (*"…sobre los proyectos ya cargados,
**sin volver a pedirlos**"* — explica E1(a), una decisión de arquitectura).

- **`SEARCH_HINT` se elimina.** Un campo llamado "Buscar" no necesita explicación, y su pista es
  además la causa de que la tarjeta mida 123px de alto.
- **`EMPTY_DESCRIPTION` se reescribe sin hablar de pasos, de rutas ni de lo que todavía no existe.**
- **Tono:** no hay guía de voz en `docs/` (dato medido). Se sigue **el precedente ya escrito en la
  app**: voseo rioplatense ("Empezá", "Probá"), tratamiento de "tu/tus", metáforas de tejido en los
  errores. **Imitar, no inventar un registro nuevo.**

### E2(g) — El hueco de la foto vacía deja de ser un vacío del 61% de la tarjeta

Con `image === null` la tarjeta dedica **su mayor superficie** a un rectángulo liso con una letra
diminuta (deuda **140**). **La proporción NO cambia** —para que la rejilla no quede dentada cuando
convivan tarjetas con foto y sin foto— pero **el placeholder tiene que leerse como algo puesto a
propósito**: la inicial en tamaño de display y la clase de tejido nombrada, con los tokens que ya
existen. Es la misma tarjeta que usa el Dashboard: **mejora las dos páginas a la vez, y por eso no se
puede romper la invariante de E1(f)/deuda 132** (sin `onQuickStart` → cero botones).

### E2(h) — Fuera de alcance de E2, explícito

- **La card sigue sin ser tocable** (E1(f) intacta): el detalle es **#21**. La lista seguirá siendo un
  escaparate sin puerta hasta entonces, y eso es una decisión tomada, no un olvido.
- **No se construye sistema de toasts** (deuda 144), **ni se toca el backend**, ni se añaden filtros.
- **El móvil no se pudo medir** en la verificación del leader (la ventana no baja de 1536px y no hay
  emulación de dispositivo disponible). La fila del toolbar es la primera sospechosa en angosto:
  **queda como verificación obligatoria del leader al cerrar**, no como algo que el implementer pueda
  dar por bueno.

---



## 7-quater. Enmienda E3 — el arranque de #21: qué piezas faltan y hasta dónde llega (2026-08-24)

**Qué la motiva.** Al planear **#21** el leader comprobó, **antes de lanzar nada**, qué piezas de las que
la ficha da por hechas existen de verdad. **Es el mismo control que en #19 destapó que la ficha asumía
componentes inexistentes**, y volvió a pagar: de las dos piezas centrales del drawer, **una no existe**.

### El inventario, medido

| pieza | ¿existe? | consecuencia |
|---|---|---|
| **Foco atrapado, `Escape`, `aria-modal`, portal al `body`, bloqueo de scroll, devolver el foco al abridor** | ✅ **SÍ**, en `Dialog` | Lo caro del drawer **ya está escrito y probado** |
| **`Drawer` lateral** | ❌ no | Le falta **sólo geometría** al `Dialog`: pegado al lateral y alto completo, en vez de centrado con `max-w-*` |
| **`Tabs`** | ❌ no | `SegmentedControl` es `role="group"` + `aria-pressed` y **su propio comentario dice *"no `radiogroup` ni `tablist`"*** |

### Las decisiones

| # | Qué se fija | Por qué |
|---|---|---|
| **E3 (a)** · *usuario* | **#21 se parte en DOS tandas.** **T1 — el esqueleto:** `Tabs` + `Drawer` + tab **General** + el **tap en la card** que E1(f) dejó pendiente. Al cerrar T1 el detalle **se abre y se usa**. **T2 — los tabs pesados:** Progreso, Lanas y Sesiones. | Es la feature más grande que queda y el usuario venía de cuatro sesiones sin ver una página nueva. T1 **es visible en pantalla**, y cada tanda pasa su review con foco en vez de rechazarse en bulto. |
| **E3 (b)** · *leader* | **El `Drawer` es una VARIANTE del `Dialog`, no un componente nuevo.** Se añade la geometría lateral a `dialog.variants.ts` y se reusa el mecanismo entero. | Reescribir una jaula de foco que ya está probada es regalar bugs de accesibilidad. Lo que cambia es dónde se pega el panel, no cómo se comporta. **El SDD y el ancla de contrato de `DIALOG_SIZES` mandan sobre la forma de añadir la variante.** |
| **E3 (c)** · *leader* | **`Tabs` nace como primitiva compartida** en `src/shared/ui/primitives/`, con `tablist`/`tab`/`tabpanel` y navegación por flechas. **No se construye sobre `SegmentedControl`.** | Los RFC-04 y RFC-05 también piden tabs. Y forzar un control de `aria-pressed` a comportarse como `tablist` da un componente que miente a los lectores de pantalla en los dos papeles. |
| **E3 (d)** · *usuario* | **Los botones cuyo destino aún no existe NO se pintan.** "Editar" llega con **#22** (el modal) y "crear patrón" con **#26-28**. Se añaden **de forma aditiva** cuando su destino exista. | **Mismo criterio que E1(f)** usó en #20 con el tap de la card, y funcionó. Nada en pantalla promete lo que la app no puede cumplir, y no queda un placeholder que alguien tenga que acordarse de quitar. |

### Lo que E3 NO cambia

**§1 y §2 siguen mandando** sobre el contenido de las cuatro tabs: E3 sólo fija **el orden** en que se
construyen y **con qué piezas**. El backend **no se toca**: §3 ya está entero, incluida la deuda 5 (las
lanas enlazadas viajan en `GET /:id`) que saldó la feature #17.
## 7-quinquies. Enmienda E4 — el `aria-live` del cronómetro, y #21 cerrada (2026-08-25)

**Quién la pide:** el **reviewer** de #21 T2, y el leader coincide. **Nace de la verificación en
navegador**, no de una discusión de despacho.

### E4 (a) — §5 se corrige: el `aria-live` NO va en el reloj de segundos

**Lo que decía §5:** *"cronómetro con `aria-live` para el tiempo"*.
**Lo que la implementación hace, medido en pantalla:** el reloj de segundos (`04:21` → `04:24`) **no**
está en una región viva; lo que se anuncia es un `role="status"` aparte con **minutos** (*"4 min"*) y
los **cambios de estado** (*"Empezaste a tejer asdasd."*, *"El cronómetro está parado."*).

**La implementación tiene razón y la letra del RFC estaba mal.** Anunciar un valor que cambia **cada
segundo** convierte al lector de pantalla en un **metrónomo** y tapa todo lo demás. **El cambio
significativo en un cronómetro es el minuto**, y hay test que lo mide **en las dos direcciones**.

> **Por qué se enmienda en vez de dejarlo pasar:** porque **el próximo implementer leería §5 y lo haría
> mal**. Una especificación que contradice a la práctica correcta es una trampa con retardo — la misma
> familia que las fichas que mienten.

### E4 (b) — #21 se cierra con cuatro puntos NO verificados, y se dice cuáles

La verificación en navegador (`progress/reports/verificacion_navegador_21_t2.md`) **no pudo mirar**, por
**falta de datos** en la base: el **contraste de los 13 swatches** de lana —con dos sospechosos
nombrados: **`--yarn-neutral`, que es literalmente `--surface-sunken`**, y `--yarn-white`—, la lana
**multicolor**, la **checklist con un patrón real** y el **buscador con un inventario grande**.

**Se cierran como NO VERIFICADOS, no como aprobados.** Mirarlos exige **crear datos de prueba**, y eso
escribe en los datos del usuario: **se pide antes**. Lo natural es que caigan dentro de **RFC-04**
(lanas, features #23-#25) y **RFC-05** (patrones, #26-#28), que es cuando esos datos existirán de todos
modos.

## 7-sexies. Enmienda E5 — el contador de vueltas sin meta deja de leerse como una división por cero (2026-08-25)

**Quién la pide:** el **usuario**, sobre la **deuda 166**, vista en pantalla el 2026-08-25.

**El síntoma.** Un proyecto recién creado, con una vuelta apuntada y sin meta fijada, muestra en la
cabecera del tab Progreso **`1 / 0`**. El porcentaje sale bien (`0%`), pero la fracción se lee como una
**división por cero** — y no lo es: `targetRounds === 0` no significa *"la meta vale cero"*, significa
**"no hay meta"**. La cabecera está imprimiendo la ausencia de un dato como si fuera el dato.

**La causa, en fuente (`ProgressTab.tsx:184`):** la fracción se compone **sin condicional**
(`${rounds} / ${targetRounds}`), aunque el propio componente **ya sabe** distinguir el caso: nueve líneas
más abajo usa `NO_TARGET_HINT` cuando `targetRounds === 0`. El conocimiento existe y la cabecera no lo usa.

### E5 (a) — Sin meta no se muestra fracción: se muestran **las vueltas**

Cuando `targetRounds === 0`, la cabecera del tab **no imprime denominador**. Muestra la cuenta de vueltas
sola, nombrada (**`3 vueltas`**), y el resto del bloque no cambia.

**Por qué esta y no un guion.** Es *decisión del usuario*, y la razón es que **sin meta no hay fracción que
mostrar**, así que no se inventa un denominador ni se sugiere con un símbolo que ahí falta algo. La
invitación a fijar meta **ya existe y está en su sitio**: el `NO_TARGET_HINT` del campo de meta, que es
donde se actúa. Repetirla arriba es decir dos veces lo mismo en la mitad de la pantalla donde el usuario
no puede hacer nada al respecto.

**Con meta (`targetRounds > 0`) no cambia nada:** sigue siendo `3 / 40`.

### E5 (b) — El `0%` sin meta se deja como está, y se dice por qué

Sin meta el porcentaje también es discutible: `0%` **de nada** tampoco significa gran cosa. **No entra en
E5** porque es una decisión distinta —qué es el progreso de un proyecto sin destino— y mezclarla convierte
un arreglo de copia de una línea en un rediseño del bloque. Se deja escrito aquí para que la próxima
sesión no lo redescubra como hallazgo.

### E5 (c) — El caso sin meta se cubre con test

La cabecera con `targetRounds === 0` y `targetRounds > 0` van **las dos** al test del componente. La 166
existió porque **ningún test miraba el caso sin meta**, que es además el estado **inicial de todo proyecto
nuevo**: el peor que la pantalla sabía pintar era el primero que veía cualquiera.

**Deuda que cierra:** **166**.

## 8. Slices de implementación (→ `feature_list.json`)

IDs reales en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 17 `projects_detail_yarns`** (backend) — `GET /:id` incluye lanas enlazadas (+tests).
- **feature 15 `uploads_image`** (backend, **compartido** con RFC-04/05) — `POST /api/uploads/image`
  (foto); **un endpoint único**, no uno por entidad.
- **feature 20 `projects_list_ui`** — toolbar (segmentado activo/inactivo, tipo, más filtros) + grilla
  de cards + quick-start.
- **feature 21 `projects_detail_ui`** (drawer + tabs) — General / Progreso (rounds, pasos) / Lanas
  (enlazar) / Sesiones (cronómetro).
- **feature 22 `projects_form_ui`** (modal) — form + foto + patrón (elegir/embebido).
