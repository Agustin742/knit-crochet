# Explore #20 — la card de #19, el quick-start aditivo y el contrato del cronómetro

**Fecha:** 2026-08-12 · **Modo:** sólo lectura (no se tocó ni un archivo de `src/**`).
**Pregunta:** qué expone hoy la card, cómo se le añade el quick-start de forma aditiva, y cuál es el
contrato exacto del endpoint que ese quick-start tiene que llamar.

Todo lo que sigue está leído del repo con archivo y línea. Lo que no se pudo comprobar está marcado
**NO MEDIDO**. No se ejecutó ningún test ni build en esta exploración (**NO MEDIDO**: que la suite
pase hoy).

---

## 1. La card actual (`src/features/projects/ui/ProjectCard.tsx`)

### 1.1 Props exactas

`ProjectCardProps` — declarado en `src/features/projects/ui/ProjectCard.tsx:12-22`:

| prop | tipo | obligatoria | default |
|---|---|---|---|
| `project` | `ProjectCardData` (`./types`) | sí | — |
| `headingLevel` | `2 \| 3 \| 4` (`ProjectCardHeadingLevel`, línea 9-10) | no | `3` (línea 44) |
| `className` | `string` | no | — |

`PROJECT_CARD_HEADING_LEVELS = [2, 3, 4] as const` (línea 7). No hay `...rest`: la card **no** reenvía
atributos DOM arbitrarios al nodo raíz. Cualquier `onClick`, `id` o `data-*` que #20 quisiera pasarle
hoy **no compila** — habría que añadir la prop explícitamente (esto es lo que hace el añadido "aditivo"
inevitable: tocar la firma, no el marcado existente).

### 1.2 Qué renderiza

Raíz `<Card className={className}>` (línea 50), que es un `div` (`src/shared/ui/primitives/card/Card.tsx:11-22`,
`forwardRef<HTMLDivElement>` con spread de props). Dentro, un contenedor en columna (línea 51) con
exactamente cuatro piezas, en este orden:

1. `<ProjectPhoto>` (línea 52 → definido en 87-117): `<img>` nativo con `alt=""`, `loading="lazy"`,
   `decoding="async"`; si `image === null` pinta un hueco con la inicial del nombre (líneas 91-98).
   Deliberadamente **no** `next/image` (comentario en 101-106).
2. `<Heading>` dinámico `h2`/`h3`/`h4` con el nombre (líneas 47, 54-56).
3. `<ProgressBar value={project.progress} label={`Progreso de ${project.name}`} />` (líneas 61-64).
   El primitivo pinta `role="progressbar"` y `aria-valuenow` (`src/shared/ui/primitives/progress-bar/ProgressBar.tsx:66`,
   con un `data-slot="progress-bar"` y otro `data-slot="progress-bar-fill"` en 76 — esos son del primitivo,
   no de la card).
4. Un `<p>` con el porcentaje a la izquierda y la duración a la derecha (líneas 66-72), con
   `<span className="sr-only">Tiempo tejido: </span>` delante del tiempo (línea 69).

Documentación en el propio archivo (líneas 24-41) que repite el encargo de E2.1: *"NO lleva quick-start
de cronómetro, y no es un olvido… #20 la extiende de forma aditiva sin reescribir nada. Tampoco hay un
slot de acción 'preparado' esperándolo"*. Y: *"Es un `div` … y **no** un `li` ni un `article`: quien la
monte en una lista la envuelve"*.

### 1.3 `data-slot` / `data-testid` que expone

**Ninguno de los dos, en toda la card.** Barrido de `data-slot` sobre `src/` (`grep`): los aciertos son
todos de `src/shared/ui/**` (`empty-state`, `error-state`, `account-band`, `bg-3d`, `archive-nav` con
`leaf`/`sheet`/`track`/`tab`, `dialog`/`dialog-scrim`, `progress-bar`/`progress-bar-fill`, `skeleton`,
`toggle`, `toggle-group`, `ascii-yarn`). `data-testid` en `src/` sólo aparece dentro de tests y en
`AsciiYarnScene.tsx:156`.

**Consecuencia para #20:** el enganche de un test sobre la card es hoy **el rol accesible**
(`heading`, `progressbar`, texto), no un selector de datos. Si el quick-start necesita un asidero
estable, lo natural aquí es el rol `button` con nombre accesible, que además es lo que el propio test
de #19 vigila hoy (§1.5).

### 1.4 Server o Client Component

`ProjectCard.tsx` **no tiene `"use client"`** (la línea 1 es un `import`). Tampoco lo tiene
`src/features/projects/ui/index.ts`. O sea: hoy es un componente **sin directiva**, que hereda el
entorno de quien lo importa. Su único consumidor real, `src/features/dashboard/ui/ActiveProjectsPanel.tsx:1`,
**sí** es `"use client"`, así que en la práctica ya se compila dentro del bundle de cliente.

Esto importa para el añadido: en cuanto la card tenga estado o `onClick`, o pasa a llevar `"use client"`
ella misma, o el control interactivo se extrae a un componente hermano que sí la lleve. Ambas salidas
son compatibles con el consumidor actual (que ya es cliente). **NO MEDIDO**: si añadir `"use client"`
a `ProjectCard.tsx` rompe algún test o el build.

### 1.5 Tests que la cubren hoy

`src/features/projects/ui/ProjectCard.test.tsx` (127 líneas, `@vitest-environment happy-dom`, RTL + `vitest-axe`):

| línea | qué fija |
|---|---|
| 27-41 | las cuatro piezas de RFC-02 §2 (heading, `img[src]`, `progressbar`, duración) |
| 49-56 | el porcentaje 0-100 va **directo** a la barra (`aria-valuenow="42"`), sin dividir por 100 |
| 59-65 | el nombre accesible de la barra es `Progreso de <nombre>` |
| 68-73 | el tiempo se muestra como `3 h 20 min`, nunca los segundos crudos |
| 75-82 | sin foto se conserva el marco (no hay `img`) |
| 91-96 | la foto queda fuera del árbol accesible: `alt=""` **y** `queryAllByRole("img")` vacío |
| 98-105 | `headingLevel` por defecto 3 y honra el 2 |
| **112-117** | **`queryAllByRole("button")` y `queryAllByRole("link")` valen 0** |
| 119-126 | `axe` sin violaciones, con y sin foto |

**El gate de la línea 112-117 es el que #20 tiene que actualizar, y es el único.** Está escrito a
propósito como gate de dos direcciones (comentario 107-111: *"El gate va en las dos direcciones de
verdad — no hay NINGÚN botón — para que no se cuele 'preparando' el hueco con un control muerto"*).
Al añadir el quick-start ese test **falla por diseño**: hay que reescribirlo como "sin `onQuickStart`
no hay botón; con él, exactamente uno" — que es la forma aditiva correcta, porque preserva la
invariante para el consumidor de #19 (el Dashboard, que **no** pasa la acción).

Cobertura indirecta: `src/features/dashboard/ui/DashboardView.test.tsx:430` cuenta
`getAllByRole("progressbar")` para verificar el tope de activos; monta cards reales. Si el quick-start
apareciera **sin** ser opt-in, ese test y el `axe` del Dashboard verían botones nuevos.

Guardrail que también toca la card: `src/shared/ui/no-hardcode.test.ts:94` nombra explícitamente
`features/projects/ui/ProjectCard.tsx` como prueba de que el barrido llega fuera de `shared/ui`
(el barrido prohíbe hex, `rgb()` y literales `px` en todo `src/`; ver cabecera del archivo y
`HEX_COLOR`/`RGB_COLOR`/`PX_LITERAL`). Cualquier estilo del quick-start tiene que salir de tokens.

---

## 2. El tipo de datos y la deuda 109

`src/features/projects/ui/types.ts`:

- Líneas 22-29: `SerializedProject = Omit<ProjectRecord, "startDate"|"endDate"|"createdAt"|"updatedAt"> &
  { startDate: string; endDate: string | null; createdAt: string; updatedAt: string }`. El comentario
  (3-21) explica por qué: el `Date` del dominio miente al cruzar la red.
- Línea 32: `ProjectListPayload = { projects: SerializedProject[] }`.
- **Líneas 40-43:**
  ```ts
  export type ProjectCardData = Pick<
    SerializedProject,
    "id" | "name" | "image" | "progress" | "time"
  >;
  ```

### 2.1 Qué incluye el `Pick` hoy — los cinco campos

| campo | tipo (vía `projects` en `src/features/projects/schema.ts`) | lo usa la card? |
|---|---|---|
| `id` | `uuid` → `string` | **No se renderiza**. No aparece en ninguna línea de `ProjectCard.tsx`. Está en el tipo pero sin consumidor — y es justo el que el quick-start necesita para la URL. |
| `name` | `text` notNull → `string` | sí (líneas 52, 55, 63) |
| `image` | `text` nullable → `string \| null` | sí (línea 52 → 87-117) |
| `progress` | `integer` notNull default 0 → `number` | sí (líneas 62, 67) |
| `time` | `integer` notNull default 0 → `number` (segundos) | sí (línea 70) |

### 2.2 Qué queda "colado" si se le pasa un proyecto entero

Es exactamente lo que ficha la **deuda 109** (`progress/deudas.md:1432-1435`): al ser un `Pick`, un
`SerializedProject` completo satisface `ProjectCardData` por compatibilidad estructural, y de hecho
`ActiveProjectsPanel.tsx:116` le pasa el proyecto entero (`<ProjectCard project={project} />`, donde
`project: SerializedProject`). En tiempo de ejecución el objeto que llega a la card lleva **todos** los
campos de la tabla, no cinco.

Los **quince** campos que viajan de más (columnas de `projects` en `schema.ts:17-40` menos los cinco
del `Pick`):

`userId`, `type`, `status`, `rounds`, `targetRounds`, `needles` (`number[]`), `startDate` (string ISO),
`endDate` (string ISO o `null`), `patternId` (`string | null`), `completedSteps` (`number[]`), `notes`,
`createdAt` (string ISO), `updatedAt` (string ISO).
(Son 13 columnas extra: 18 columnas totales − 5 del `Pick`. Recuento hecho sobre `schema.ts:18-39`:
`id, userId, name, image, type, status, rounds, targetRounds, progress, needles, startDate, endDate,
time, patternId, completedSteps, notes, createdAt, updatedAt` = 18.)

TypeScript **no** impide que el cuerpo de la card lea ninguno de ellos, porque el objeto real los tiene;
lo único que hoy lo impide es que el tipo declarado no los expone — es decir, `project.status` **sí**
da error de compilación dentro de `ProjectCard.tsx` mientras la prop esté tipada como `ProjectCardData`.
El riesgo de la 109 es el inverso y más sutil: **ampliar el `Pick`** (p. ej. añadir `status` "ya que
está") es un cambio de una línea que nadie frena, y a partir de ahí la card empieza a decidir cosas con
datos que no son suyos.

**Lectura para #20:** el quick-start **no necesita ampliar el `Pick`**. Con `id` (ya presente) basta
para construir la URL. Lo que sí necesita —saber si hay sesión abierta— **no está en el proyecto**
(§3.4), así que la tentación de meter un campo nuevo en `ProjectCardData` es real y hay que decidirla
a conciencia: si el estado "corriendo" se pasa como prop propia (`running`, `pending`) en vez de como
campo del proyecto, el `Pick` se queda intacto y la deuda 109 no crece.

---

## 3. El contrato del cronómetro

### 3.1 `POST /api/projects/:id/sessions/start`

**Handler:** `src/app/api/projects/[id]/sessions/start/route.ts:16-36`. Export `POST`, envuelto en
`withSession("POST /api/projects/:id/sessions/start", …)`.

**Cuerpo que pide:** ninguno. `sessionCommandSchema`
(`src/features/time-tracking/validation.ts:11-14`) es
`z.strictObject({}).nullish().transform(() => ({}))`: acepta **sin body**, con `null`, o con `{}`;
rechaza cualquier propiedad. `readJsonBody` devuelve `undefined` si el body no es JSON parseable
(`src/shared/lib/http.ts:26-32`), y `nullish` lo admite. Medido en
`src/app/api/projects/session-routes.test.ts:65-67` (`plainRequest()` = `new Request(url, {method:"POST"})`,
sin `content-type` ni body) y línea 190: funciona.

**Respuesta OK:** `NextResponse.json({ session }, { status: started ? 201 : 200 })` (línea 31).
- **201** = se creó una sesión nueva.
- **200** = ya había una corriendo y se **reutiliza** (no se pisa, no se duplica, no da error).

`session` es un `CraftSessionRecord` (`src/features/time-tracking/types.ts:3`), es decir la fila de
`craft_sessions` (`src/features/time-tracking/schema.ts:6-17`):
`{ id: uuid, userId: uuid, projectId: uuid, start: timestamp, end: timestamp|null, duration: integer }`.
⚠️ **`start` y `end` cruzan la red como cadena ISO**, igual que en `SerializedProject`: el tipo
`CraftSessionRecord` declara `Date` porque lo infiere Drizzle. El propio test de rutas lo asume en
`session-routes.test.ts:244` (`new Date(body.session.end as unknown as string)`). Si #20 lee la
respuesta, **necesita su propio tipo serializado**, o el mismo bug que documenta `projects/ui/types.ts:3-21`.

**Códigos de error (todos con cuerpo `{ error: string }`, `src/shared/lib/http.ts:9-16`):**

| status | cuándo | mensaje / origen |
|---|---|---|
| 401 | sin cookie de sesión válida | `"No autenticado."` — `http.ts:54-62`; medido en `session-routes.test.ts:140-154` |
| 404 | proyecto inexistente, **de otro usuario**, o id no-UUID | `"El proyecto no existe."` — `params.ts` (`readProjectId` devuelve `null` si el id no parsea como uuid → `projectNotFound()`) y `craftSessionErrorResponse` para `ProjectNotFoundError`; medido en `session-routes.test.ts:156-183`. Ajeno e inexistente son indistinguibles a propósito (nunca 403). |
| 400 | el cliente manda cualquier campo en el body | primer `issue.message` de zod → `"Esta operación no admite datos: el servidor los calcula."`; `validationErrorResponse` en `http.ts:18-23`; medido en `session-routes.test.ts:214-224` |
| 500 | error no controlado | `"Error interno del servidor."` — `withSession` |

**Qué pasa si ya hay una sesión abierta: se REUSA.** `src/features/time-tracking/api/start-session.ts:28-31`:
busca `store.findActive` (la fila con `end IS NULL` más reciente) y, si existe, devuelve
`{ session: active, started: false }` sin tocar nada. El comentario 12-15 lo justifica: *"El timer es un
toggle de UI: un doble click o un remontaje tras recargar no debe fragmentar el tiempo en dos sesiones ni
bloquear al usuario con un error"*. **No es 409, no crea una segunda fila, no reinicia `start`.**
Medido en `session-routes.test.ts:199-212` (201 luego 200, mismo `id`, una sola fila).

**Consecuencia práctica para el quick-start:** el start es **idempotente**. Un doble tap no puede
corromper nada, así que el botón puede ser optimista sin riesgo de duplicar sesiones. Lo único que
distingue "arranqué yo" de "ya estaba corriendo" es el **status 201 vs 200**, que el cliente actual del
repo **descarta** (`dashboard-client.ts` sólo mira `response.ok`, línea 68).

### 3.2 Existe `stop`, y es `PATCH`, no `POST`

`PATCH /api/projects/:id/sessions/stop` — `src/app/api/projects/[id]/sessions/stop/route.ts:16-36`.
Mismo schema de body vacío. Respuesta `{ session, time }` con **200** (línea 31), donde `time` es el
nuevo `Project.time` recalculado como Σ `duration` (`stop-session.ts:57-60`, comentario 24-29: se
**recalcula**, no se incrementa, para que el cache se auto-sane).

**Doble stop / stop sin start ⇒ 409** con `{ error: "No hay ninguna sesión de tejido en marcha." }`
(`NoActiveSessionError` → `sessions/errors.ts:17-19`; medido en `session-routes.test.ts:270-298`).
**El 409 vive en el stop, no en el start.** Esto es lo contrario de lo que se podría suponer y es
justo la asimetría que el quick-start tiene que manejar: arrancar dos veces es gratis, parar dos veces
es un error visible.

`duration` se trunca a segundos enteros y nunca es negativa (`stop-session.ts:15-20`).
Parar **bumpea `projects.updatedAt`** (`time-tracking/api/store.ts:137-142`); arrancar **no** — es
exactamente lo que documenta la enmienda E2.2 del RFC-02 (líneas 138-143).

### 3.3 `GET /api/projects/:id/sessions`

`src/app/api/projects/[id]/sessions/route.ts:12-27`. Devuelve `{ sessions: CraftSessionRecord[] }` con
200, **de la más reciente a la más antigua** (`store.listByProject` ordena por `start` descendente,
`store.ts:92`). Una sesión abierta se reconoce por `end === null` (medido en `session-routes.test.ts:329`).
404 con las mismas reglas que los otros dos. Es **por proyecto**: no hay endpoint de "mis sesiones".

### 3.4 ¿Se puede saber desde la lista si un proyecto tiene sesión abierta? **No.**

Comprobado en las tres capas:

- **Payload de la lista:** `GET /api/projects` responde `{ projects }` con filas de `projects` intactas
  (`src/app/api/projects/route.ts`, `listProjects` → `store.list`). Las columnas de la tabla
  (`schema.ts:17-40`) **no incluyen nada de sesiones**: no hay `activeSessionId`, ni `runningSince`, ni
  `lastSessionAt`. `time` es el acumulado cerrado y sólo se mueve al **parar**.
- **Filtros:** `projectFiltersSchema` (`src/features/projects/validation.ts:39-50`) admite
  `active`, `type`, `needle`, `yarnId`, `patternId`, `from`, `to`. `active` es el **status** del proyecto
  (`in_progress`/`paused`, ver `ProjectFilters.active` en `projects/types.ts:52-55`), **no** "cronómetro
  corriendo". No hay filtro por sesión abierta. (Nota lateral: tampoco hay parámetro de **búsqueda de
  texto**, y la toolbar de #20 pide "buscar" — es una decisión de scope aparte de esta pregunta.)
- **Store de sesiones:** `findActive` existe (`time-tracking/api/store.ts:29-32, 66-80`) pero es
  **por proyecto** y es interno del servidor; no hay ninguna consulta "todas las sesiones abiertas del
  usuario" ni ningún servicio que la exponga (`time-tracking/api/` contiene sólo `list-sessions`,
  `start-session`, `stop-session`).
- La decisión de **no** exponer esto ya está tomada y fichada: enmienda E2.2 del RFC-02 (líneas 149-151)
  descarta el camino (b) —`MAX(craft_sessions.end)` en el `list`— porque *"reabriría el backend, que está
  cerrado"*, y lo deja **como deuda**.

**Las opciones que quedan para "qué botón pinto", todas medibles hoy:**

1. **N peticiones `GET /api/projects/:id/sessions`**, una por card. Correcto pero con coste lineal en el
   número de cards (el Dashboard tope ~15; la lista de #20 no tiene tope conocido — **NO MEDIDO**).
2. **Botón de una sola dirección: "Empezar" siempre, y el 201/200 informa después.** Es lo que el
   contrato favorece: el start es idempotente y devuelve la sesión viva. El estado "corriendo" se
   aprende **al tocar**, no antes. Encaja con "quick-**start**" (RFC-03 §2 dice quick-start, no toggle).
3. **Estado en memoria del cliente**, sembrado sólo con lo que esta pantalla ha arrancado. Se pierde al
   recargar; ningún dato del servidor lo restaura.
4. Reabrir el backend para exponerlo — **descartado por E2.2**, no es de esta slice.

No hay una quinta. Cualquier plan que asuma que la lista "ya sabe" si el cronómetro corre está
asumiendo un dato que no existe.

### 3.5 Barreras de import (crítico para el cableado)

`src/features/time-tracking/index.ts:1-4` re-exporta `./api` (→ `store.ts` → `@/shared/db` → Drizzle) y
`./schema` (→ Drizzle). **Importar `@/features/time-tracking` desde un componente de cliente mete el ORM
en el bundle del navegador.** Es la misma trampa que documentan `NewProjectDialog.tsx:5-11` y
`projects/ui/index.ts:1-7`. Rutas internas seguras:
- `@/features/time-tracking/types` — sólo `import type` de schema, se borra en compilación.
- `@/features/time-tracking/validation` — sólo `zod` (pero `sessionCommandSchema` no sirve de nada en
  cliente: el body es vacío).

---

## 4. Precedente de mutación desde el navegador

### 4.1 Sí existe, y hay exactamente dos POST de navegador escritos

| POST | archivo | línea |
|---|---|---|
| `POST /api/auth/login` y `/register` | `src/features/auth/ui/auth-client.ts:42-68` (`postAuth`) | primer precedente del repo |
| `POST /api/auth/logout` | `src/features/auth/ui/auth-client.ts:81-91` (`postLogout`) | |
| `POST /api/projects` | `src/features/dashboard/ui/dashboard-client.ts:137-146` (`createProject`) | el que cita el encargo |

**El quick-start no sería el primer POST del repo, pero sí el primer POST fuera de `auth` y `dashboard`,
y el primero de `projects`.** También sería el primer **`PATCH`** desde navegador si #20 pintara un stop
(**medido**: `grep` de `method:` en `src/features/**/ui/` sólo encuentra `"POST"` en esos dos archivos).

### 4.2 El molde: `dashboard-client.ts`

Su comentario de cabecera (líneas 8-16) dice literalmente el porqué de cada pieza: *"No hay cliente
compartido para el navegador en el repo (`shared/lib/http.ts` es exclusivamente de servidor), así que
esto copia la forma del único precedente, `features/auth/ui/auth-client.ts`"*. Las cinco decisiones que
un `projects-client.ts` debería heredar:

1. **Endpoints y mensajes como constantes exportadas** (líneas 17-23) *"para que los tests los importen
   en vez de reescribirlos"*.
2. **`fetch` pelado con `credentials: "same-origin"`** (línea 63). No hay wrapper compartido; sí hay
   duplicación consciente entre `auth-client` y `dashboard-client` (`readErrorMessage` está copiado
   literal en los dos: `auth-client.ts:15-30` ≡ `dashboard-client.ts:40-55`). **Un tercer cliente
   duplicaría por tercera vez** — decisión a tomar en el plan, no aquí.
3. **Unión discriminada en vez de excepciones:**
   `type DashboardRequestResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }`
   (líneas 26-28), con **`status: 0` = la petición no llegó a salir** (línea 25, 65).
4. **Lector de error defensivo**: intenta `response.json()` y busca la clave `error`; si falla (un 500
   puede responder HTML) devuelve `UNEXPECTED_ERROR_MESSAGE` (40-55). También trata el **200 con cuerpo
   ilegible** como error (76-81).
5. `response.ok` cubre 200 y 201 sin distinguirlos (`auth-client.ts:58-61`, `dashboard-client.ts:68`).
   **Para el quick-start esto es una pérdida de información**: 201 vs 200 es la única señal de "ya estaba
   corriendo". Si #20 la quiere, tiene que devolver el `status` también en el caso `ok`, que es un
   ensanchamiento del molde, no una copia.

### 4.3 Estado de "enviando" y de error: el patrón vivo

`src/features/dashboard/ui/NewProjectDialog.tsx` es el único ejemplo completo de mutación con UI:

- `const [pending, setPending] = useState(false)` (línea 58); se enciende antes del `await`
  (línea 77) y se **apaga sólo en el camino de error** (línea 81) — en el de éxito el componente se
  desmonta, así que no hace falta.
- El botón recibe `loading={pending}` (línea 125). El primitivo `Button`
  (`src/shared/ui/primitives/button/Button.tsx:13-34`) traduce `loading` a **`disabled` implícito**
  (línea 22: `disabled={disabled ?? loading}`), **`aria-busy`** (línea 23) y un spinner `aria-hidden`
  (26-30). O sea: el anti-doble-click y el anuncio accesible ya están resueltos en el primitivo, gratis.
- El error de servidor se guarda en `formError` y se pinta en un **`<p role="alert">`** (líneas 106-113).
  El comentario de la línea 70-71 avisa de que el mensaje de `Field` **no** es región viva (deuda 38).
- El éxito lo comunica hacia arriba con un callback (`onCreated`, línea 86) y el padre **recarga** con
  un token incremental (`DashboardView.tsx:93, 143`, comentario 91-92: *"Un booleano no serviría — dos
  reintentos seguidos tienen que disparar dos peticiones"*).

Contraste importante para #20: ese patrón vive en un **modal que se desmonta**. Un quick-start dentro de
una card de una grilla es **N controles simultáneos con estado independiente**, y el `role="alert"` por
card multiplicaría los anuncios. `DashboardView.tsx:190-192` muestra la alternativa que el repo ya usa
para lo colectivo: **una sola región viva por página** (`<p role="status" className="sr-only">`).
Decisión abierta para el plan, no medida aquí.

Para `Button` de icono, la variante existe: `size: "icon"` (`button.variants.ts:54`,
`min-w-(--touch-target) p-0 text-lg/tight rounded-md`), y hay precedente de uso con `aria-label`
en `DashboardView.tsx:204-210` (los ± del año). RFC-03 §2 pide precisamente `kc-btn--icon`.

### 4.4 Cómo se testean estos POST

`DashboardView.test.tsx` (cabecera, líneas 41-48) espía `fetch` con `vi.fn()` y un helper
`jsonResponse(status, body)` que construye una `Response` real; importa los endpoints y mensajes desde
`dashboard-client` en vez de reescribirlos (líneas 14-18). Ése es el molde de test para el quick-start.

---

## 5. Qué dice RFC-03 §2 (y §1) literalmente sobre el quick-start

Citas exactas de `docs/design/rfc/RFC-03-proyectos.md`:

- **§1, línea 20:** `- **Cronómetro:** Start/Stop + tiempo en vivo + histórico; **quick-start desde la card**.`
- **§2, línea 27:** `- **Lista:** grilla de cards de proyecto: foto, nombre, `kc-progress`, tiempo, y **quick-start** de cronómetro (`kc-btn--icon`). Tap → drawer.`
- **§8, líneas 71-72:** la slice #20 es *"toolbar (segmentado activo/inactivo, tipo, más filtros) + grilla de cards + quick-start"*.
- **§1, línea 16:** `- **Card = solo** foto, nombre, `kc-progress`, tiempo total (los detalles se ven al abrir).`
- **§5, línea 53:** accesibilidad del cronómetro = *"cronómetro con `aria-live` para el tiempo"* — pero eso está enunciado junto al drawer; el tiempo en vivo es del tab Sesiones (§2 línea 32: *"cronómetro Start/Stop (tiempo en vivo, tick client)"*), **no** de la card.

**Lo que el RFC fija, sin interpretar:**

1. **Aspecto:** botón de icono (`kc-btn--icon` en el vocabulario del template; el equivalente real del
   repo es `<Button size="icon">` con `aria-label`).
2. **Qué es:** "quick-**start**". El texto **nunca** dice "quick-stop" ni "toggle". Start/Stop aparece
   siempre asociado al **drawer / tab Sesiones** (§1 línea 20 y §2 línea 32), no a la card.
3. **Tiempo en vivo:** atribuido al drawer (§2 línea 32), **no** a la card.

**Lo que el RFC NO dice — y hay que decidir antes de implementar:**

- **Qué pasa exactamente al tocarlo**: no hay una frase que describa la retroalimentación (¿el botón
  cambia? ¿aparece un aviso? ¿la card se marca?). §4 sólo define los tres estados de **pantalla**
  (loading con `kc-skeleton`, vacío *"Tu cesto está vacío — empezá un proyecto"*, error *"Se soltó un
  punto"* + reintentar) — que son de la **carga de la lista**, no de la mutación. **No hay estado de
  error especificado para el quick-start.** Ver §4.3 de este informe para el precedente disponible.
- **Qué pinta si ya hay una sesión abierta**: no lo dice, y como se midió en §3.4 el dato **no está
  disponible** en la lista. Esto no es una omisión menor: es una decisión que el RFC no puede resolver
  porque el backend no la sostiene.

### 5.1 El tap y el drawer: el conflicto real

`§2 línea 27` dice, en la misma frase: *"…y **quick-start** de cronómetro (`kc-btn--icon`). **Tap → drawer.**"*
Y `feature_list.json` (entrada id 20, `acceptance[2]`) lo repite: *"card = foto + nombre + progress +
tiempo + quick-start; **tap abre el drawer (feature 21)**"*.

Es decir: **la card entera es tocable (abre el drawer) y además lleva un botón dentro (arranca el
cronómetro)**. Un control dentro de otro control. Los hechos medidos alrededor:

- La feature **21 `projects_detail_ui` está `pending`** (`feature_list.json`, id 21, `"status": "pending"`),
  así que en el momento de #20 **el drawer no existe**. **Ninguna** de las dos fuentes dice qué debe
  hacer el tap mientras tanto.
- La card de hoy **no acepta ningún manejador de click** (§1.1) y su test exige **cero botones y cero
  enlaces** (§1.5). Los dos añadidos —el quick-start y el destino del tap— caen sobre la misma firma.
- El RFC **no** dice que el tap del quick-start abra el drawer, ni que no lo abra. Literalmente: el
  quick-start es un `kc-btn--icon` y el tap (de la card) va al drawer. La lectura natural —el botón
  arranca el cronómetro y **no** propaga al drawer— es una **inferencia**, no una cita. Queda como
  **decisión abierta para el usuario** (RFC-00 §6), y es del mismo tipo que las tres que cerró E2.
- Nota de accesibilidad medible: la card raíz es un `div` (`Card.tsx:16`) y el comentario de
  `ProjectCard.tsx:38-40` insiste en que *"quien la monte en una lista la envuelve"*. Un `div` con
  `onClick` no es alcanzable por teclado; el patrón que el repo ya usa para "ir a otro sitio" es un
  `Link` de texto (`ActiveProjectsPanel.tsx:94-96`, con clases de foco explícitas en 132-137).
  **Anidar un `<button>` dentro de un `<a>` es HTML inválido y `axe` lo marca** — y la card corre `axe`
  en su propio test (línea 119-126). **NO MEDIDO** con qué regla exacta, pero es la restricción que
  decide la forma del marcado.

---

## 6. Resumen operativo (lo que el plan de #20 tiene que decidir)

**Hechos duros, todos medidos:**

1. La card acepta 3 props, expone **cero** `data-slot`/`data-testid`, no tiene `"use client"`, y su test
   `ProjectCard.test.tsx:112-117` **prohíbe explícitamente cualquier botón o enlace**. Ese test es el
   único que hay que reescribir, y la forma aditiva correcta es hacerlo condicional a la prop nueva.
2. `ProjectCardData` es `Pick<SerializedProject, "id"|"name"|"image"|"progress"|"time">`. `id` ya está y
   basta para la URL: **el quick-start no obliga a ampliar el `Pick`** (deuda 109 no tiene por qué crecer).
3. `POST /api/projects/:id/sessions/start`: **sin body** (mandar algo = 400), **201** si crea, **200** si
   **reutiliza** una sesión abierta (nunca 409, nunca duplica), 404 si el proyecto no es del usuario o el
   id no es UUID, 401 sin cookie. Es **idempotente**. Devuelve `{ session }` con `start`/`end` como
   **cadenas ISO**, no `Date`.
4. El **409 está en el stop** (`PATCH …/sessions/stop`, `"No hay ninguna sesión de tejido en marcha."`),
   no en el start.
5. **No hay forma de saber desde la lista si un proyecto tiene sesión abierta.** Ni columna, ni filtro,
   ni endpoint agregado. E2.2 ya descartó abrir el backend para esto.
6. El molde de cliente HTTP existe (`dashboard-client.ts`), pero **descarta el status en el camino OK**,
   que es justo la señal 201/200 que el quick-start podría querer.
7. `Button` con `loading` ya da `disabled` + `aria-busy` + spinner; `size="icon"` existe y tiene
   precedente de uso con `aria-label`.

**Decisiones abiertas que ninguna fuente cierra (candidatas a subir al usuario antes de implementar):**

- ¿El quick-start es **sólo start** (lo que dice el texto) o un **toggle start/stop**? Si es toggle, hay
  que resolver §3.4 y asumir el 409.
- ¿El **tap de la card** abre el drawer en #20, si el drawer (#21) todavía no existe? ¿Y el botón
  propaga o no?
- ¿Dónde se anuncia el **error** del quick-start: un `role="alert"` por card, o **una** región viva de
  página como en `DashboardView.tsx:190-192`?
- ¿Se crea un **tercer** cliente HTTP duplicando `readErrorMessage` por tercera vez, o se factoriza?

---

*Notas de método: no se ejecutó ningún comando de test, lint ni build; todas las afirmaciones sobre
comportamiento en runtime provienen de leer los tests que ya existen en el repo y están citados con
archivo y línea. Los códigos de estado del cronómetro están respaldados por aserciones reales en
`src/app/api/projects/session-routes.test.ts`. No se cita ninguna clase de Tailwind que no esté escrita
literalmente en el archivo indicado.*
