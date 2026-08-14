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

---

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
