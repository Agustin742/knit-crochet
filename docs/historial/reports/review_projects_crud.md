# Review — feature #6 `projects_crud` (sub-tareas A + B)

**Veredicto final (tras correccion): APROBADO (APPROVED)** — ver la seccion
"Re-review tras correccion" al final del documento.

**Veredicto de la 1a pasada (se conserva como historial): RECHAZADO (CHANGES_REQUESTED)**

Motivo unico y bloqueante: `DELETE /api/projects/:id` —endpoint incluido en el
acceptance de esta misma feature— produce un **500** en un flujo normal y
alcanzable que la propia feature habilita (enlazar una lana y luego borrar el
proyecto). Ver seccion "Cambios requeridos", punto 1.

Todo lo demas esta **bien**: arquitectura, scoping, calculo de `progress`,
validacion zod, tests y verificacion estan en orden y el trabajo es de calidad
alta. La correccion pedida es acotada (un servicio, un test).

---

## Verificacion ejecutada por el revisor

| Comando | Resultado |
|---|---|
| `bash ./init.sh` | **VERDE**, exit code 0. lint verde, typecheck verde, **Test Files 17 passed (17) - Tests 131 passed (131)** (tras A eran 103/15, B anadio 28 tests y 2 archivos: coincide con el informe) |
| `pnpm build` | **VERDE**. Next 16.2.10, compilado OK, TypeScript OK. Lista las 6 rutas: `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/rounds`, `/api/projects/[id]/steps`, `/api/projects/[id]/yarns`, `/api/projects/[id]/yarns/[yarnId]` |

El rechazo **no** es por verificacion en rojo; es por un defecto funcional que
ningun test cubre porque nadie escribio el caso.

---

## Checklist del acceptance, punto por punto

### 1. Endpoints completos y Route Handlers finos — OK

Los 9 endpoints existen y los 6 route files son finos: parsean, validan con zod,
delegan en `src/features/projects/api/*` y serializan. **Cero** acceso a Drizzle
o logica de negocio en `src/app/**`. El unico acceso a Drizzle del feature esta
centralizado en `src/features/projects/api/store.ts`.

Filtros `?active=&type=&needle=&yarnId=&from=&to=`: los seis implementados
(`store.ts:47-91`). `active` via `ACTIVE_PROJECT_STATUSES` + `not(...)`,
`needle` con containment jsonb, `yarnId` con `EXISTS` sobre `project_yarns`
(no JOIN, no duplica filas), `from`/`to` sobre `startDate`.

`src/app/api/projects/params.ts` no es un `route.ts`: correcto, Next no lo
interpreta como ruta y `pnpm build` lo confirma.

### 2. Calculo de `progress` — OK

- `src/features/projects/api/progress.ts:7-16`: `targetRounds <= 0` da 0,
  `Math.round(rounds/targetRounds*100)`, clamp `Math.min(100, Math.max(0, raw))`.
- Se recalcula **en el servicio**: `create-project.ts:24`, `update-project.ts:25-30`
  (solo si cambia `rounds`/`targetRounds`, mezclando con el valor existente),
  `add-rounds.ts:27`.
- **Nunca se acepta del cliente**: `progress` no esta en `createProjectSchema`
  (`validation.ts:13-26`) ni por tanto en `updateProjectSchema` (`.partial()` de
  aquel), no esta en `CreateProjectInput` (`types.ts:9-22`) y los objetos zod
  no-strict lo descartan. Verificado ademas que `PATCH {"progress":99}` acaba en
  **400** ("No hay nada que actualizar"), no en persistencia: el `.refine` de
  `validation.ts:30-33` corre despues del strip. Test explicito en
  `projects-routes.test.ts:203-216`.
- **B reutilizo la funcion de A**: `add-rounds.ts:2` importa `calculateProgress`
  de `@/features/projects/api/progress`. Grep confirma que la formula existe en
  **un solo sitio** del repo. Sin duplicacion.

### 3. `rounds` con delta — OK

`add-rounds.ts:24`: `Math.max(0, existing.rounds + delta)`. `delta` negativo
admitido (`roundsDeltaSchema` es `z.number().int()`, sin `.min`). Suelo en 0
cubierto por test de servicio y de ruta.

### 4. `steps` — OK

`completedSteps` vive en `projects` (`schema.ts:32`, jsonb `number[]`), **no** en
`patterns`. Validacion `z.array(z.number().int().min(0)).max(1000)`
(`validation.ts:5,11,58-60`). Normalizacion `[...new Set(x)].sort(asc)`
(`set-completed-steps.ts:24`), coherente con lo documentado en el informe B y con
el comentario del propio archivo. Semantica de reemplazo total, documentada.

### 5. Enlace N:N `ProjectYarn` — OK

- `schema.ts:39-50`: solo `projectId` + `yarnId`, **sin cantidad**, PK compuesta.
- **No descuenta stock**: ninguna ruta ni servicio de B escribe en `yarns`;
  `store.findYarn` sobre `yarns` es un `SELECT id`. Test
  `project-actions-routes.test.ts:304-316` lo verifica.
- Doble enlace controlado: `onConflictDoNothing()` en Drizzle (`store.ts:151`) y
  el servicio devuelve `changed=false` -> HTTP 200 en vez de 201. Nunca rompe la
  PK compuesta ni duplica fila. Desenlace idempotente -> 204.

### 6. Seguridad de scoping — OK (auditoria completa abajo)

### 7. `withSession` — OK

Los 9 handlers privados usan `withSession` (`shared/lib/http.ts:65-83`). Grep
confirma que **no queda ningun `try/catch` a 401 a mano** conviviendo:
`sessionErrorResponse` solo se usa dentro de `withSession`. `/api/auth/me`
(`src/app/api/auth/me/route.ts`) mantiene comportamiento observable identico:
mismo 200 `{user}`, mismo 404 `UserNotFoundError`, mismo 401 sin sesion; los
tests de #4 no se tocaron y siguen verdes.

### 8. Validacion zod — OK

Un esquema por endpoint en `validation.ts`. Los **query params** se validan con
`projectFiltersSchema` y un filtro presente e invalido da **400**, no se ignora
en silencio: test `projects-routes.test.ts:328-344` cubre `?active=maybe`,
`?type=macrame`, `?needle=gorda`, `?yarnId=123`, `?from=ayer`. Parametro vacio
(`?active=`) = sin filtro, tal y como escribe la URL el PRD seccion 9.
Body invalido -> 400 con el primer `issue.message`. Sin stack traces al cliente.

### 9. Tests — OK

131 tests / 17 archivos. Los 4 archivos del feature cubren: creacion con progress
calculado, `progress` con `targetRounds=0` y clamp a 100, cada uno de los 6
filtros + combinacion + vacios + invalidos, delta +/-/suelo en 0, steps
normalizados y reemplazo total, enlace/doble enlace/desenlace idempotente,
**lana ajena -> 404** con cuerpo `{"error":"La lana no existe."}`, proyecto ajeno
-> 404 en los 9 endpoints, sin sesion -> 401 en los 9.

Mockean **solo el borde**: `createProjectStore` (doble en memoria en
`api/testing/in-memory-store.ts`, que replica scoping y filtros) y `next/headers`.
Sin DB real ni red. El JWT se firma de verdad con `signSessionToken`, y
`withSession` + zod + los route handlers reales se ejercen sin doblar. No son
tautologicos: comprueban status, cuerpo y **efecto en el store**
(p. ej. `expect(store.rows[0]?.rounds).toBe(5)` tras un 401/404, o
`expect(store.links).toHaveLength(0)`).

### 10. Estado de la feature — OK

`feature_list.json` -> `#6 projects_crud: "in_progress"`. Ningun implementer la
marco `done`. `progress/current.md` describe la sesion activa sin basura previa.

---

## Auditoria de scoping por `userId` — endpoint por endpoint

`userId` siempre procede de `withSession` -> `requireSessionUserId()` -> JWT de la
cookie httpOnly. **En ningun endpoint el `userId` ni el criterio de propiedad
vienen del body, del query o del path**: el grep de `userId` en `src/app/**` no
devuelve una sola lectura desde el request; el unico `userId` que circula es el
primer argumento inyectado por `withSession`.

| Endpoint | Origen del `userId` | Donde se aplica el scoping | Ajeno | Sin sesion |
|---|---|---|---|---|
| `GET /api/projects` | JWT (`withSession`) | `store.list` -> `eq(projects.userId, userId)` como primera condicion del `and(...)` (`store.ts:48`) | no aparece en la lista | 401 |
| `POST /api/projects` | JWT | `create-project.ts:19-25` fuerza `userId` **despues** del spread de `input`; `userId` no esta en `createProjectSchema` ni en `CreateProjectInput`, asi que un `userId` en el body se descarta y no puede sobrescribir | n/a | 401 |
| `GET /api/projects/:id` | JWT | `store.findById` -> `and(eq(userId), eq(id))` (`store.ts:97`) | **404** "El proyecto no existe." | 401 |
| `PATCH /api/projects/:id` | JWT | `findById` scopeado + `store.update` con `and(eq(userId), eq(id))` en el WHERE (`store.ts:115`). `ProjectPatch` no admite `userId` | **404** | 401 |
| `DELETE /api/projects/:id` | JWT | `store.remove` -> `and(eq(userId), eq(id))` (`store.ts:123`) | **404** | 401 |
| `POST /:id/rounds` | JWT | `addRounds` -> `findById(userId,...)` y `update(userId,...)` | **404** | 401 |
| `PATCH /:id/steps` | JWT | `setCompletedSteps` -> `findById(userId,...)` y `update(userId,...)` | **404** | 401 |
| `POST /:id/yarns` | JWT | `assertOwnedEnds` (`project-yarns.ts:21-35`) valida **los dos extremos**: `findById(userId, projectId)` -> 404 proyecto, y `findYarn(userId, yarnId)` -> 404 lana | **404** en cualquiera de los dos | 401 |
| `DELETE /:id/yarns/:yarnId` | JWT | identico `assertOwnedEnds` antes de `unlinkYarn` | **404** en cualquiera de los dos | 401 |

**El fallo cruzado que se buscaba NO esta presente.** `store.findYarn`
(`store.ts:128-135`) filtra por `and(eq(yarns.userId, userId), eq(yarns.id, yarnId))`:
enlazar una lana de otro usuario a un proyecto propio devuelve 404 y no crea fila
(tests `project-actions.test.ts:163-174` y `project-actions-routes.test.ts:351-367`).
El orden de comprobacion (proyecto antes que lana) evita filtrar existencia.

**Nunca 403 ni 401 por propiedad**: `ProjectNotFoundError`/`YarnNotFoundError`
son indistinguibles entre "no existe" y "es de otro". Un id malformado tambien da
404 (decision documentada), lo que ademas evita el 500 por cast invalido en
Postgres.

Excepcion revisada y **aceptada**: `listYarnIds`/`linkYarn`/`unlinkYarn`
(`store.ts:139-167`) no reciben `userId` porque `project_yarns` no tiene esa
columna. Solo se invocan **despues** de `assertOwnedEnds` en el mismo servicio, y
esta comentado en el codigo (`store.ts:137-138`). No hay via de acceso a esos
metodos que salte la comprobacion.

Un `yarnId` ajeno en el filtro `?yarnId=` tampoco filtra informacion: el `EXISTS`
va anidado bajo el `WHERE projects.user_id = $userId` de la consulta externa.

---

## CHECKPOINTS.md

- **C1** — [x] arnes completo, `bash ./init.sh` exit 0.
- **C2** — [x] una sola feature `in_progress` (#6); las `done` (#1-#5) siguen con
  tests verdes; `progress/current.md` describe la sesion activa.
- **C3** — [x] capas respetadas (UI sin DB, no hay UI aun; logica en
  `features/projects/api/`; Drizzle solo en `store.ts`; handlers finos con zod y
  scoping por JWT); estructura feature-first; **sin dependencias nuevas**; sin
  `console.log` sueltos ni TODOs sin contexto (grep limpio en `src/`); sin
  secretos hardcodeados (`JWT_SECRET` por entorno; la constante `SECRET` de los
  tests es solo de test).
- **C4** — [ ]  <- lint, typecheck y los 131 tests estan verdes, pero
  `deleteProject` tiene un camino de fallo real **no cubierto por ningun test**
  (proyecto con lanas enlazadas). La verificacion no es completa mientras ese
  caso no exista.
- **C5** — [x] sin artefactos sospechosos sin trackear (los `??` de `git status`
  son codigo y reports de la feature; `tsconfig.tsbuildinfo` es deuda
  pre-existente ya anotada). Cierre de sesion e `history.md` corresponden al leader.

---

## Cambios requeridos (bloqueantes)

1. **`DELETE /api/projects/:id` devuelve 500 si el proyecto tiene lanas enlazadas.**
   `drizzle/0000_cold_marrow.sql:102` crea la FK
   `project_yarns_project_id_projects_id_fk ... ON DELETE no action` (y
   `schema.ts:42-44` no declara `onDelete`). Desde que B habilito
   `POST /:id/yarns`, la secuencia `POST /api/projects/:id/yarns` ->
   `DELETE /api/projects/:id` viola la FK en Postgres y `withSession` lo convierte
   en `500 {"error":"Error interno del servidor."}`. Es un flujo de usuario
   corriente (borrar un proyecto al que se le asigno lana) y `DELETE /api/projects/:id`
   esta en el acceptance de #6, asi que **no es deuda para #7: es un defecto de
   esta feature**. Ambos implementers lo detectaron (informe A punto 5.11, informe
   B punto 6.1) y ninguno lo corrigio.

   Correccion pedida, dentro de la capa del feature y sin migracion:
   - En `src/features/projects/api/delete-project.ts`, borrar primero los enlaces
     del proyecto y despues la fila, tras comprobar la propiedad con
     `store.findById(userId, id)` (mantener 404 para ajeno/inexistente).
   - Anadir a `ProjectStore` un `removeYarnLinks(projectId)` (o equivalente) con
     su implementacion Drizzle y en `api/testing/in-memory-store.ts`.
   - Test obligatorio: proyecto con al menos una lana enlazada -> `DELETE
     /api/projects/:id` responde **204**, la fila desaparece de `store.rows` y
     `store.links` queda vacio. Y test de que el `DELETE` de un proyecto ajeno con
     enlaces sigue dando 404 sin borrar nada.
   - Si se prefiere `onDelete: "cascade"` en `schema.ts` + migracion, hay que
     generar la migracion con drizzle-kit y dejarla en `drizzle/`; la opcion del
     servicio es menos invasiva porque el schema es de la feature #3, ya cerrada.

## Observaciones no bloqueantes

1. **`readProjectId` duplicado**: existe en `src/app/api/projects/[id]/route.ts:23-27`
   (de A) y en `src/app/api/projects/params.ts:17-23` (de B), con el mismo cuerpo.
   Lo mismo `notFound()` vs `projectNotFound()`. Unificar el de A para que importe
   de `params.ts` y borrar el duplicado: 4 lineas. Hacerlo aprovechando el arreglo
   del punto 1.
2. **`project-actions.test.ts:179`** vuelve a hacer
   `store.yarns.push({ id: OTHER_YARN_ID, ... })` sobre un store que ya lo tiene
   desde `storeWithYarn()`. Es inocuo (`findYarn` usa `find`), pero la linea sobra.
3. **`findYarn` en `ProjectStore` lee la tabla `yarns` de otra feature.** Correcto
   hoy (no existe `features/yarns/api/`), pero cuando llegue #8 debe invertirse a
   consumir un `getYarn(userId, id)` publico. Anotar como deuda tecnica en
   `progress/current.md`, tal y como propone el informe B punto 6.2.
4. **`GET /api/projects/:id` no devuelve las lanas enlazadas.** Fuera del
   acceptance; decision aceptada, queda como ampliacion futura si la UI lo necesita.

## Como se cierra

Aplicado el punto 1 (con sus tests) y, opcionalmente, la observacion 1, la feature
queda aprobable sin mas cambios. Re-revision acotada a `delete-project.ts`,
`store.ts`, el doble en memoria y los tests nuevos.

---

# Re-review tras correccion — feature #6 `projects_crud`

**Veredicto: APROBADO (APPROVED)**

Revision acotada al unico defecto bloqueante del rechazo anterior (`DELETE
/api/projects/:id` con lanas enlazadas) y a la busqueda de regresiones. El resto
del acceptance no se re-audita: ya fue aprobado punto por punto arriba y la
correccion no lo toca.

## Verificacion ejecutada

| Comando | Resultado |
|---|---|
| `bash ./init.sh` | **VERDE**. lint verde, typecheck verde, **Test Files 17 passed (17) — Tests 134 passed (134)**, duracion 16.08s, "Entorno listo". Conteo real = el declarado por el implementer (131 -> 134, +3 tests, mismos 17 archivos) |
| `pnpm build` | **VERDE**. TypeScript OK, 8 paginas estaticas, Proxy (Middleware) presente. Lista las 6 rutas de projects: `/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/rounds`, `/api/projects/[id]/steps`, `/api/projects/[id]/yarns`, `/api/projects/[id]/yarns/[yarnId]` |

## 1. El defecto esta corregido — OK

`src/features/projects/api/delete-project.ts` (28 lineas). Orden real de las
operaciones, leido en el codigo:

1. `linea 17`: `const existing = await store.findById(userId, id)`
2. `lineas 18-20`: si no hay fila -> `throw new ProjectNotFoundError()` -> 404
3. `linea 22`: `await store.removeYarnLinks(id)` — **enlaces primero**
4. `linea 24`: `await store.remove(userId, id)` — **fila despues**
5. `lineas 25-27`: segunda guarda `if (!deleted) throw` (carrera entre consultas)

La comprobacion de propiedad (paso 1-2) ocurre **antes** de borrar nada: un
proyecto ajeno ni siquiera pierde sus enlaces. La FK
`project_yarns_project_id_projects_id_fk` (`ON DELETE no action`) ya no puede
violarse, porque cuando se ejecuta el `DELETE FROM projects` no queda ninguna
fila hija. Adios al 500.

El comentario de `delete-project.ts:7-11` documenta el porque (FK sin cascada,
el enlace es solo referencia, PRD §4.6). Correcto: la razon no es evidente
leyendo solo el codigo.

## 2. Sin migracion y sin tocar el schema — OK

- `src/features/projects/schema.ts`: **no modificado**. `git status --short` no
  lo lista (solo aparecen `src/features/projects/index.ts` y el directorio
  `src/features/projects/api/` sin trackear) y su mtime sigue siendo el
  `jul 21 19:01` de la feature #3.
- `drizzle/`: contiene **un solo** archivo, `0000_cold_marrow.sql` (5792 bytes,
  mtime `jul 21 19:01`) + `meta/`. **Ninguna migracion nueva.**

Se resolvio donde pedia el review: en la capa del feature.

## 3. `removeYarnLinks` en ambos stores y con el mismo comportamiento — OK

| Implementacion | Codigo | Devuelve |
|---|---|---|
| Interfaz | `store.ts:38-39` — `removeYarnLinks(projectId: string): Promise<number>`, con comentario "imprescindible antes de `remove` (FK)" | `number` |
| Drizzle | `store.ts:171-177` — `delete(projectYarns).where(eq(projectYarns.projectId, projectId)).returning({yarnId})` -> `rows.length` | nº de enlaces borrados |
| Doble en memoria | `in-memory-store.ts:183-188` — filtra `links` por `link.projectId !== projectId`, calcula `removed = links.length - remaining.length` y reemplaza el array **in place** (`links.splice(0, links.length, ...remaining)`) | nº de enlaces borrados |

Ambas se comportan igual: mismo criterio de filtrado (`projectId` exacto, un
solo `eq`/`!==`, **sin** `or` ni condicion suelta que pudiera barrer de mas) y
mismo valor de retorno. El `splice` in place del doble es importante y esta bien
hecho: el array `links` esta expuesto por referencia en `InMemoryProjectStore`,
asi que reasignarlo habria dejado a los tests mirando el array viejo.

`removeYarnLinks` no recibe `userId`: es la misma excepcion ya documentada y
aceptada para `linkYarn`/`unlinkYarn` (`project_yarns` no tiene columna
`userId`), y aqui es aun mas segura porque el unico invocante la llama despues
de `findById(userId, id)` en el mismo servicio.

## 4. Los 3 tests existen y son reales — OK

1. **204 + fila fuera + enlaces vacios** — `project-service.test.ts:162-180`
   ("clears the yarn links before deleting the project"): crea proyecto, empuja
   un enlace, `deleteProject` resuelve, `store.rows` 0 y `store.links` 0.
2. **No se borra de mas** — `projects-routes.test.ts:412-428` ("deletes a project
   with linked yarns clearing the N:N links first"): siembra **dos** proyectos
   del mismo usuario enlazados a **la misma lana** (`OTHER_UUID`), borra uno y
   asserta `response.status === 204`,
   `store.rows.map(r => r.id)` **igual a `[other.id]`** y
   `store.links` **igual a `[{ projectId: other.id, yarnId: OTHER_UUID }]`**.
   Este es exactamente el riesgo que señalaba el review (un `delete` mal
   filtrado se llevaria los enlaces de todos los proyectos) y el test lo cubre
   con `toEqual` sobre el contenido, no con un `length`.
3. **Ajeno con enlaces -> 404 sin borrar nada** — `projects-routes.test.ts:430-442`:
   proyecto de `user-2` con enlace, `DELETE` desde `user-1` -> **404**,
   `store.rows` sigue con 1 y `store.links` sigue con 1. Verifica el efecto en el
   store, no solo el status: prueba que el `findById` previo corta antes del
   `removeYarnLinks`.

Ninguno es tautologico: los tres comprueban status **y** estado resultante del
store, y el 2 discrimina entre "borro lo que debia" y "borro de mas".

## 5. Sin regresiones ni alcance desbordado — OK

El repo no tiene commit de esta feature (todo `src/app/api/projects/` y
`src/features/projects/api/` esta sin trackear), asi que el `git diff --stat` no
aisla la correccion; se acota por mtime. Archivos tocados en la ventana de la
correccion (22:38–22:41), **exactamente los 5 declarados** en el informe:

```
22:38  src/features/projects/api/store.ts
22:39  src/features/projects/api/testing/in-memory-store.ts
22:40  src/features/projects/api/delete-project.ts
22:40  src/app/api/projects/projects-routes.test.ts
22:41  src/features/projects/api/project-service.test.ts
```

Todo lo demas del feature quedo en la ventana anterior (22:20–22:26, sub-tarea
B) y no se ha vuelto a tocar: rutas, `params.ts`, `project-yarns.ts`,
`add-rounds.ts`, `set-completed-steps.ts`, `validation.ts`, `errors.ts`,
`index.ts` y `project-actions.test.ts` estan intactos. Correccion **quirurgica**.

Sin regresiones: los 131 tests previos siguen pasando sin modificarse (134 = 131
+ 3 casos nuevos, mismos 17 archivos), `pnpm build` sigue listando las 6 rutas y
`store.remove`, `linkYarn`, `unlinkYarn` y `listYarnIds` no cambiaron de firma ni
de semantica. El resto de endpoints conserva el comportamiento ya aprobado.

Nota: la observacion no bloqueante 1 (`readProjectId` duplicado) **no** se
aplico. Correcto — era opcional y el lider pidio alcance minimo. Sigue viva como
deuda menor, junto con las observaciones 2, 3 y 4.

## 6. Estado de la feature — OK

`feature_list.json` -> `#6 projects_crud: "status": "in_progress"`. El
implementer **no** la marco `done`. El cierre corresponde al leader.

## CHECKPOINTS.md (re-evaluados)

- **C1** — [x] `bash ./init.sh` exit 0.
- **C2** — [x] una sola feature `in_progress` (#6); #1-#5 siguen verdes.
- **C3** — [x] capas respetadas: la correccion vive en
  `features/projects/api/delete-project.ts` (servicio) y `store.ts` (unico punto
  Drizzle); `src/app/**` no cambio; sin dependencias nuevas; sin
  `console.log`/TODOs; sin secretos.
- **C4** — [x] **resuelto**. lint, typecheck y 134 tests verdes, `pnpm build`
  verde, y el camino de fallo que faltaba (borrar proyecto con lanas enlazadas)
  esta corregido y cubierto por 3 tests, incluido el caso de no-borrar-de-mas.
- **C5** — [x] sin artefactos sospechosos nuevos; `drizzle/` sin migracion
  espuria; `tsconfig.tsbuildinfo` sigue siendo la misma deuda pre-existente.

## Cambios requeridos

Ninguno. La feature queda **aprobada** y lista para que el leader la cierre.
