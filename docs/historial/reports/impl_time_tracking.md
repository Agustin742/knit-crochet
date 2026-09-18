# Informe de implementación — Feature #7 `time_tracking`

**Estado:** implementada, lista para review. **NO** marcada como `done` (la cierra el reviewer).
**Verificación:** `bash ./init.sh` VERDE + `pnpm build` OK. **169 tests en 20 archivos**
(punto de partida: 134 en 17 → **+35 tests, +3 archivos**, 0 tests rotos).

---

## 1. Archivos creados

### Feature `time-tracking`

| Archivo | Qué contiene |
|---|---|
| `src/features/time-tracking/types.ts` | `CraftSessionRecord`, `NewCraftSessionRecord`, `ProjectTimeRef`, `StartSessionResult`, `StopSessionResult` |
| `src/features/time-tracking/validation.ts` | `sessionProjectIdSchema`, `sessionCommandSchema` (zod) |
| `src/features/time-tracking/api/errors.ts` | `NoActiveSessionError` |
| `src/features/time-tracking/api/store.ts` | `CraftSessionStore` + `createCraftSessionStore(database = db)` — único punto de acceso a `craft_sessions` y al cache `Project.time` |
| `src/features/time-tracking/api/start-session.ts` | `startSession(userId, projectId, store?, now?)` |
| `src/features/time-tracking/api/stop-session.ts` | `stopSession(...)` + `calculateDuration(start, end)` |
| `src/features/time-tracking/api/list-sessions.ts` | `listSessions(userId, projectId, store?)` |
| `src/features/time-tracking/api/index.ts` | API pública de la capa de servicios |
| `src/features/time-tracking/api/testing/in-memory-store.ts` | `createInMemoryCraftSessionStore(projects?)` — doble en memoria que **comparte estado** con el doble de projects |

### Route Handlers (finos)

| Archivo | Endpoint |
|---|---|
| `src/app/api/projects/[id]/sessions/start/route.ts` | `POST /api/projects/:id/sessions/start` |
| `src/app/api/projects/[id]/sessions/stop/route.ts` | `PATCH /api/projects/:id/sessions/stop` |
| `src/app/api/projects/[id]/sessions/route.ts` | `GET /api/projects/:id/sessions` |
| `src/app/api/projects/[id]/sessions/errors.ts` | `craftSessionErrorResponse` (404 / 409), a imagen de `app/api/projects/params.ts` |

Los tres usan `withSession` (401 automático), `readProjectId` + `projectNotFound` de
`@/app/api/projects/params` (se **reutiliza**, no se duplica: la deuda #5 no crece) y
delegan el 100 % de la lógica en `features/time-tracking/api/`.

### Tests nuevos

| Archivo | Tests |
|---|---|
| `src/features/time-tracking/api/craft-session-service.test.ts` | 17 — servicios contra el doble en memoria |
| `src/features/time-tracking/api/project-deletion.test.ts` | 3 — **frontera del `DELETE`** a nivel servicio |
| `src/app/api/projects/session-routes.test.ts` | 15 — los 3 endpoints + `DELETE /api/projects/:id` a nivel ruta |

## 2. Archivos modificados

| Archivo | Cambio | Motivo |
|---|---|---|
| `src/features/time-tracking/index.ts` | ahora reexporta `./api`, `./types`, `./validation` | API pública del feature |
| `src/features/projects/api/store.ts` | **+`removeCraftSessions(projectId)`** en la interfaz y en la implementación Drizzle | frontera del `DELETE` |
| `src/features/projects/api/testing/in-memory-store.ts` | **+`sessions: CraftSessionRecord[]`** y `removeCraftSessions` | idem |
| `src/features/projects/api/delete-project.ts` | **+`await store.removeCraftSessions(id)`** antes de `store.remove(...)` + comentario | idem |
| `feature_list.json` | feature 7 → `in_progress` (ya lo había dejado el líder) | — |
| `progress/current.md` | bitácora | — |

`src/features/time-tracking/schema.ts` **NO se ha tocado**. No hay migración nueva.
No se ha tocado nada más de `src/features/projects/**`.

---

## 3. Decisiones cerradas

### 3.1 Doble **start** → reutilizar la sesión abierta, `200 OK`

Si ya hay una `CraftSession` con `end = null` para ese proyecto, `startSession` la
devuelve tal cual con `started: false` y el handler responde **200** en vez de **201**.

*Justificación:* el cronómetro es un toggle de UI. Un doble click, un remontaje tras
recargar la página o un reintento de red **no deben** fragmentar el tiempo en dos
sesiones (rompería las métricas por año de #10) ni bloquear al usuario con un 409 que
no puede resolver sin saber que hay algo corriendo. Reutilizar mantiene la invariante
*"como mucho una sesión abierta por proyecto"* y hace el endpoint idempotente. El
`201` vs `200` deja al cliente distinguir "arranqué yo" de "ya estaba".

Descartado *cerrar la anterior y abrir otra*: partiría un tramo real de trabajo en dos
por un simple doble click.

### 3.2 Doble **stop** → `409 Conflict` (`NoActiveSessionError`)

*Justificación:* el proyecto existe y es del usuario, así que **404 sería mentira** y
además chocaría con el 404 de "proyecto ajeno/inexistente" que ya usan estos mismos
endpoints — el cliente no podría distinguir los dos casos. Un 200 idempotente tampoco
sirve: no hay recurso que devolver (no hay sesión) y ocultaría un bug de cliente
(botón "parar" visible sin timer). 409 = *conflicto de estado*, exactamente lo que es,
y es el mismo código que el PRD ya usa para conflictos de dominio (§ borrado de lana).
**Nunca 500**: el error de dominio se traduce explícitamente en
`craftSessionErrorResponse`.

Asimetría start/stop intencionada y consistente: **start es idempotente porque tiene un
recurso natural que devolver; stop no lo tiene.**

### 3.3 `duration` y `end` — siempre del servidor

`sessionCommandSchema` es un `z.strictObject({}).nullish()`: los endpoints admiten
llamarse **sin body**, pero cualquier campo enviado (`duration`, `end`, `start`…)
provoca **400** por clave no reconocida. Mismo principio que `progress` en #6: el
cliente no manda valores derivados. Hay test explícito de esto en start y en stop.

`calculateDuration(start, end) = max(0, floor((end - start) / 1000))`:
- **segundos enteros** truncados hacia abajo (el schema es `integer`);
- **nunca negativa**: un reloj que retrocede no puede restar tiempo al proyecto.

`now` se inyecta como último parámetro con default `new Date()` para poder testear el
cálculo de forma determinista sin tocar el reloj global en la capa de servicio.

### 3.4 `Project.time` → **recálculo** (`Σ duration`), no incremento por delta

Al cerrar una sesión: `time = await store.sumDuration(userId, projectId)` y luego
`setProjectTime`.

*Por qué no se desincroniza:* el cache queda **derivado de su propia fuente dentro de la
misma operación**. Cualquier deriva previa (una escritura perdida, un stop repetido, una
sesión borrada, una migración/seed manual) se **auto-sana en el siguiente stop**, porque
el valor no depende del valor anterior. Un `time += delta` arrastra el error para
siempre y no hay forma de detectarlo. El coste es un `SUM()` agregado por stop
(operación poco frecuente, filtrada por índice de `project_id`), despreciable frente a
la garantía. Hay un test dedicado (`resyncs a drifted Project.time`) que corrompe
`time` a mano y comprueba que el siguiente stop lo devuelve al valor correcto.

`Project.time` **no** entra en `ProjectPatch`, así que sigue siendo imposible que un
cliente lo escriba vía `PATCH /api/projects/:id`. El único camino de escritura es
`stopSession`.

### 3.5 Import de la tabla por ruta interna (excepción documentada)

`projects/api/store.ts` importa `{ craftSessions } from "@/features/time-tracking/schema"`
y `time-tracking/api/store.ts` importa `{ projects } from "@/features/projects/schema"`,
**no** por el `index.ts` de cada feature. Es una excepción consciente a la convención:
las dos features se referencian mutuamente (la FK ya existe en el schema de #3), y pasar
por los `index.ts` metería los *servicios* de una dentro del ciclo. Importando solo el
schema, el ciclo se limita a las tablas, cuyas referencias Drizzle son *lazy*
(`ForeignKeyBuilder` guarda un closure, no evalúa `() => projects.id` en tiempo de
módulo — verificado en `node_modules/drizzle-orm/pg-core/foreign-keys.cjs`). Confirmado
empíricamente: `pnpm build` compila y registra las 3 rutas nuevas. Ambos imports llevan
comentario explicando el porqué.

---

## 4. Frontera del `DELETE` — **RESUELTA** ✅

Confirmación explícita: **sí, la he resuelto en esta feature, no la he dejado como deuda.**

- **Problema:** `drizzle/0000_cold_marrow.sql:107` →
  `craft_sessions_project_id_projects_id_fk … ON DELETE no action`. En cuanto existiera
  una sesión, `DELETE /api/projects/:id` habría violado la FK y devuelto **500**.
- **Solución (capa de servicio, sin migración y sin tocar `schema.ts`):**
  `ProjectStore` gana `removeCraftSessions(projectId)` — copia exacta del patrón
  `removeYarnLinks` — y `deleteProject` la invoca antes de `store.remove(...)`:

  ```ts
  await store.removeYarnLinks(id);
  await store.removeCraftSessions(id);
  const deleted = await store.remove(userId, id);
  ```

- **Filtrado:** el `DELETE` de sesiones va **solo por `projectId`** (nunca por `userId`
  suelto), y `deleteProject` ya ha verificado antes con `findById(userId, id)` que el
  proyecto es del usuario. Así no puede borrar sesiones de otros proyectos ni de otros
  usuarios.
- **Tests obligatorios, presentes en dos niveles:**
  - servicio (`project-deletion.test.ts`): borra proyecto con 2 sesiones (una cerrada +
    una abierta) sin dejar huérfanas; **no borra las sesiones de otros proyectos**; con
    proyecto ajeno no toca ninguna sesión.
  - ruta (`session-routes.test.ts` → `DELETE /api/projects/:id with craft sessions`):
    **204** + cero sesiones huérfanas; y las sesiones del otro proyecto sobreviven.

---

## 5. Salida real de la verificación

```
$ bash ./init.sh
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> …
[OK]    pnpm -> …

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (11 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"
 RUN  v4.1.10 C:/_dev/projects/knit-crochet
 Test Files  20 passed (20)
      Tests  169 passed (169)
   Duration  22.24s
[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

```
$ pnpm build
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 19.1s
  Finished TypeScript in 10.3s
✓ Generating static pages using 3 workers (8/8) in 416ms

Route (app)
├ ƒ /api/projects/[id]
├ ƒ /api/projects/[id]/rounds
├ ƒ /api/projects/[id]/sessions
├ ƒ /api/projects/[id]/sessions/start
├ ƒ /api/projects/[id]/sessions/stop
├ ƒ /api/projects/[id]/steps
└ ƒ /api/projects/[id]/yarns/[yarnId]
```

Las 3 rutas nuevas quedan registradas como dinámicas (`ƒ`).

---

## 6. Cobertura frente al `acceptance`

| Criterio | Dónde |
|---|---|
| `POST …/sessions/start` crea `CraftSession` con `end = null` | `start-session.ts` · tests servicio + ruta (201) |
| `PATCH …/sessions/stop` setea `end` y `duration` en segundos | `stop-session.ts` · `calculateDuration` con test propio |
| `Project.time` = suma cacheada, actualizada al cerrar | `stopSession` → `sumDuration` + `setProjectTime` · 4 tests |
| `GET …/sessions` historial | `list-sessions.ts` · 3 tests (orden, aislamiento, vacío) |
| Scoping por `userId`; ajeno/inexistente → 404; sin sesión → 401 | `withSession` + `findProject` scopeado · tests "401 en los 3 endpoints" y "404 en los 3 endpoints" |
| Validación zod donde hay entrada | `sessionProjectIdSchema` (vía `readProjectId`) + `sessionCommandSchema` (400 si mandan `end`/`duration`) |
| Doble stop controlado | 409, 2 tests servicio + 2 tests ruta |
| Borde mockeado, sin DB ni red | doble en memoria + `vi.mock` solo de `createProjectStore` / `createCraftSessionStore` / `next/headers` |

---

## 7. Riesgos y notas para el reviewer

1. **Ciclo de imports entre features** (§3.5). Es el punto más discutible del cambio.
   Está acotado a los `schema.ts` y verificado con `pnpm build` + typecheck + 169 tests.
   Si el reviewer prefiere romperlo del todo, la única alternativa limpia sería mover
   ambas tablas a un módulo de schema compartido — eso **sí** tocaría #3 y requeriría
   decisión del líder.
2. **`removeCraftSessions` vive en `ProjectStore`.** Es coherente con `removeYarnLinks`
   (el brief lo pedía como plantilla exacta), pero significa que el store de projects
   sabe de una tabla de otro feature. La alternativa (inyectar un segundo store en
   `deleteProject`) cambiaría su firma pública.
3. **Sin transacción.** `close` → `sumDuration` → `setProjectTime` son 3 statements. Si
   el proceso muere entre el 1.º y el 3.º, `Project.time` queda temporalmente por
   debajo del real — y **se auto-corrige en el siguiente stop** justamente por haber
   elegido recálculo en vez de delta (§3.4). Con Neon HTTP no hay transacción multi-
   statement barata; si más adelante se pasa a driver WebSocket, envolverlo en `db.transaction`
   es un cambio de 3 líneas dentro del store.
4. **Carrera de doble stop concurrente:** `store.close` incluye `isNull(craftSessions.end)`
   en el `WHERE`, así que solo un stop simultáneo gana; el que pierde recibe `undefined`
   y se traduce a 409, no a un `duration` sobrescrito.
5. **`GET /api/projects/:id` sigue sin devolver `sessions`** (igual que no devuelve las
   lanas, deuda #6). El historial vive en su propio endpoint, que es lo que pide el PRD §9.
6. **Nada ha corrido contra una DB real** (deuda #7 vigente): las queries Drizzle de
   `craft-session store` están verificadas por tipos y por el doble, no por ejecución.
   En particular `coalesce(sum(...), 0)` devuelve `numeric` en Postgres → llega como
   *string* por el driver; por eso `sumDuration` hace `Number(...)` explícito.
7. `pnpm` en todo momento; ningún `npm`/`npx`. Feature **no** marcada `done`.
