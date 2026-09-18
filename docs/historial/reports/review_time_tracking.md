# Review — feature #7 `time_tracking`

**Veredicto: APROBADO**

Revisor: agente `reviewer`. Fecha: 2026-07-22.
Alcance auditado: `docs/harness/architecture.md`, `conventions.md`, `verification.md`,
`CHECKPOINTS.md` y `docs/product/PRD-01-estructura-funcional.md` §4.7, §5, §9 (Sessions),
§12.6 (fuente de verdad funcional).

---

## 0. Resultado de la verificación (ejecutada por el revisor, no copiada del informe)

```
$ bash ./init.sh                       -> exit code 0
[OK] node -> v24.11.1 · pnpm -> 11.9.0
[OK] lint verde
[OK] typecheck verde
 Test Files  20 passed (20)
      Tests  169 passed (169)
[OK] Entorno listo.
```

```
$ pnpm build                           -> exit code 0
Compiled successfully · 8/8 static pages
f /api/projects/[id]/sessions
f /api/projects/[id]/sessions/start
f /api/projects/[id]/sessions/stop
```

**Conteo real confirmado: 169 tests en 20 archivos** (declarado: 169/20; punto de partida
134/17 -> **+35 tests, +3 archivos, 0 rotos**). Las 3 rutas nuevas quedan registradas como
dinámicas. `pnpm` en todo momento; ningún `npm`/`npx`.

---

## 1. Endpoints y capas — OK

| Endpoint | Handler | Servicio | `withSession` | Delgadez |
|---|---|---|---|---|
| `POST /api/projects/:id/sessions/start` | `src/app/api/projects/[id]/sessions/start/route.ts` | `startSession` | sí (l.16) | 20 líneas: `readProjectId` -> zod -> delega -> serializa |
| `PATCH /api/projects/:id/sessions/stop` | `.../sessions/stop/route.ts` | `stopSession` | sí (l.16) | idem |
| `GET /api/projects/:id/sessions` | `.../sessions/route.ts` | `listSessions` | sí (l.12) | idem |

Cero lógica de negocio en los `route.ts`: no hay cálculo de duración, ni suma, ni acceso a
Drizzle. Todo vive en `src/features/time-tracking/api/`. El acceso a Drizzle está aislado en
`api/store.ts` tras la interfaz `CraftSessionStore` (mismo patrón aprobado en #6). Los
errores de dominio se traducen en `src/app/api/projects/[id]/sessions/errors.ts`
(404/409) y lo demás sube a `withSession` -> 500 con `{ error }`, sin stack traces.
Se **reutiliza** `readProjectId`/`projectNotFound` de `@/app/api/projects/params`: la deuda
#5 no crece.

`start` crea con `end: null, duration: 0` (`start-session.ts:33-39`) — PRD §4.7 cumplido.

## 2. `duration` y `end` los calcula SIEMPRE el servidor — VERIFICADO

No me he quedado en la declaración del implementer. `sessionCommandSchema`
(`validation.ts:11-14`) es `z.strictObject({}, ...).nullish()`: cualquier clave desconocida
es error de parseo -> `validationErrorResponse` -> **400**, antes de tocar el servicio.

Comprobación real, en dos tests que pasan en verde:
- `session-routes.test.ts:214-224` — `POST start` con `{ duration: 9999, end: ... }` -> **400**
  y `store.sessions` sigue en 0 (no se creó nada).
- `session-routes.test.ts:300-312` — `PATCH stop` con `{ duration: 1 }` -> **400**, la sesión
  sigue con `end === null` y `Project.time` sigue en 0.

Además, aunque el body pasara, sería inocuo: `stopSession` ignora por completo el payload y
construye el patch con `{ end: now, duration: calculateDuration(active.start, now) }`
(`stop-session.ts:49-52`). No hay ninguna ruta por la que un valor del cliente llegue a
`craft_sessions.duration` ni a `Project.time`. `Project.time` tampoco está en `ProjectPatch`,
así que `PATCH /api/projects/:id` no puede escribirlo. **Las métricas de #10 no son
falseables desde el cliente.**

## 3. `Project.time` como suma cacheada — OK, la decisión de recalcular es correcta

`stopSession` hace `time = await store.sumDuration(userId, projectId)` y luego
`setProjectTime` (`stop-session.ts:57-58`). El valor **no depende del valor anterior**, así
que cualquier deriva se auto-sana en el siguiente stop. Verificado, no solo afirmado:
`craft-session-service.test.ts:143-160` corrompe `time` a 99999 a mano y comprueba que el
siguiente stop lo devuelve a 100. Un `time += delta` no tendría esa propiedad.

**Caso frontera "y si se borran sesiones"** — auditado explícitamente: el **único** camino
que borra sesiones en todo el código es `ProjectStore.removeCraftSessions`, invocado solo
desde `deleteProject`, que a continuación borra la fila del proyecto. Cuando desaparecen las
sesiones desaparece también el `Project.time` que las cacheaba: **no existe ningún estado en
el que `time` sobreviva a sus sesiones**. No hay endpoint de borrado de sesión individual (el
PRD §9 tampoco lo pide). Si #10/#11 añadieran uno, tendría que recalcular; queda anotado
abajo como riesgo futuro, no como defecto.

Sin transacción (3 statements): riesgo asumido y correctamente mitigado justamente por haber
elegido recálculo — un fallo entre statements deja `time` bajo temporalmente y se corrige
solo. Aceptable con Neon HTTP.

## 4. Doble start / doble stop — OK, ninguno produce 500

- **Doble start** -> reutiliza la sesión abierta y responde **200** (vs **201** la primera vez):
  `start-session.ts:28-31` + `route.ts:31` (`status: started ? 201 : 200`). Mantiene la
  invariante "como mucho una sesión abierta por proyecto". Tests: servicio
  (`craft-session-service.test.ts:75-86`, mismo `id`, `sessions` sigue con longitud 1) y ruta
  (`session-routes.test.ts:199-212`, 201 -> 200 con el mismo id).
- **Doble stop** -> **409** `NoActiveSessionError` (`stop-session.ts:44-47` + `errors.ts:17-19`).
  Tests: 409 tras un stop previo y 409 sin start previo, a nivel servicio y a nivel ruta
  (`session-routes.test.ts:270-298`); el de ruta afirma explícitamente 409 **y no 404 ni 500**,
  comprobando además que `Project.time` no se altera.
- **Ninguno cae en 500**: los dos errores de dominio están traducidos en
  `craftSessionErrorResponse` antes de que `withSession` los convierta en 500.
- La asimetría 200/409 está justificada y es coherente: 404 sería indistinguible del 404 de
  "proyecto ajeno" que usan estos mismos endpoints.
- Carrera real: `store.close` lleva `isNull(craftSessions.end)` en el `WHERE`
  (`store.ts:107-120`); el stop perdedor recibe `undefined` y se traduce a 409
  (`stop-session.ts:53-55`), no sobrescribe la duración.

## 5. Cálculo de `duration` — OK

`calculateDuration` (`stop-session.ts:15-20`) = `Math.max(0, Math.floor((end - start) / 1000))`,
segundos enteros, coherente con `integer` del schema y con PRD §4.7 ("segundos").
- Truncado hacia abajo verificado con un caso no trivial: 1.999 s -> **1**
  (`craft-session-service.test.ts:44-46`).
- Nunca negativa: reloj hacia atrás -> **0** (`craft-session-service.test.ts:49-51`).
- `NaN` imposible en la práctica: ambos operandos son `Date`; `active.start` es `notNull` en
  el schema y `now` lo inyecta el servidor (`new Date()` por defecto). No hay parseo de
  fechas de cliente en ninguna de las dos puntas.

## 6. AUDITORÍA DE LA FRONTERA DEL `DELETE` — RESUELTA CORRECTAMENTE

Antecedente: en #6 el `DELETE` de proyecto con lanas enlazadas daba 500 por
`ON DELETE no action`; `craft_sessions_project_id_projects_id_fk`
(`drizzle/0000_cold_marrow.sql:107`) tenía exactamente el mismo defecto latente.

**a) Orden real de operaciones — correcto.** `src/features/projects/api/delete-project.ts:23-34`:

```ts
const existing = await store.findById(userId, id);   // 1. propiedad, ANTES de borrar nada
if (!existing) throw new ProjectNotFoundError();
await store.removeYarnLinks(id);                     // 2. dependencias
await store.removeCraftSessions(id);                 // 3. dependencias
const deleted = await store.remove(userId, id);      // 4. la fila
```

La comprobación de propiedad ocurre **antes** de cualquier borrado, y las dos dependencias
van **antes** de la fila. Verificado también por comportamiento:
`project-deletion.test.ts:62-73` — con proyecto ajeno el servicio lanza y **la sesión sigue
ahí** (`store.sessions` longitud 1, `rows` longitud 1): no borra y luego falla.

**b) No borra de más — verificado en la implementación, no solo en el test.**
`projects/api/store.ts:187-193`:

```ts
await database.delete(craftSessions).where(eq(craftSessions.projectId, projectId))
```

Filtra **exclusivamente por `projectId`** (nunca por `userId` suelto, que sí se habría
llevado las sesiones de todos los proyectos del usuario). Como `projectId` es una PK única ya
validada como propiedad del usuario en el paso 1, es imposible alcanzar sesiones de otro
proyecto o de otro usuario. Copia exacta del patrón `removeYarnLinks` ya aprobado. El doble en
memoria replica la semántica con `splice` in-place sobre el array compartido
(`projects/api/testing/in-memory-store.ts:196-203`), así que el test observa el mismo array.

**c) Sin migración y sin tocar los schemas de #3 — confirmado por inspección del filesystem.**
`drizzle/` intacto (un solo `0000_cold_marrow.sql`, mtime 21 jul 19:01, previo a la sesión).
`src/features/time-tracking/schema.ts` y `src/features/projects/schema.ts` sin modificar.
El arreglo vive íntegramente en la capa de servicio.

**d) Tests de la costura — presentes en los dos niveles exigidos.**
- Servicio (`time-tracking/api/project-deletion.test.ts`): borrado con 2 sesiones (una
  cerrada + una abierta) y cero huérfanas; **las sesiones de otro proyecto sobreviven**
  (l.48-60); proyecto ajeno -> no toca ninguna sesión (l.62-73).
- Ruta (`app/api/projects/session-routes.test.ts:358-392`): **204** + `store.sessions` a 0 +
  `rows` a 0; y con dos proyectos, la sesión del proyecto superviviente queda intacta.

## 7. SCOPING POR `userId` — OK en los tres endpoints

| Endpoint | Origen del `userId` | Scoping | Ajeno/inexistente | Sin cookie |
|---|---|---|---|---|
| `POST .../sessions/start` | JWT vía `withSession` | `findProject(userId,...)` + `create({userId,...})` | 404 | 401 |
| `PATCH .../sessions/stop` | JWT vía `withSession` | `findProject` + `findActive(userId,...)` + `close(userId,...)` + `sumDuration(userId,...)` + `setProjectTime(userId,...)` | 404 | 401 |
| `GET .../sessions` | JWT vía `withSession` | `findProject` + `listByProject(userId, projectId)` | 404 | 401 |

- El `userId` sale **siempre** de `requireSessionUserId()` (cookie httpOnly firmada) y jamás
  del body ni de la query: `sessionCommandSchema` no admite **ninguna** clave, y los handlers
  no leen `searchParams`.
- **Toda** operación de `CraftSessionStore` lleva `eq(craftSessions.userId, userId)` en el
  `WHERE` (`store.ts:66-141`); no hay ni una query sin scoping. Incluso `sumDuration` filtra
  por usuario, así que ni el cache de `time` puede contaminarse.
- **`GET /sessions` no filtra sesiones de otro usuario**: `listByProject` filtra por
  `userId` **y** `projectId` (`store.ts:82-93`), doble barrera junto al `findProject` previo.
  Cubierto por `listSessions` con `user-2` -> `ProjectNotFoundError`
  (`craft-session-service.test.ts:242-250`) y por el aislamiento entre proyectos
  (`session-routes.test.ts:333-344`).
- Proyecto ajeno devuelve **404 con el mismo cuerpo** que uno inexistente
  ("El proyecto no existe."), sin filtrar existencia — verificado en los 3 endpoints a la
  vez (`session-routes.test.ts:156-172`) y sin crear ninguna sesión.
- `withSession` da **401** en los 3 sin cookie (`session-routes.test.ts:140-154`).
- Id malformado -> 404 (no 500): `session-routes.test.ts:174-183`.

## 8. Alcance respetado — OK

El repo no es un repositorio git, así que en lugar de `git diff --stat` he auditado el
filesystem por marca de tiempo (ventana de la sesión #7). Archivos tocados: **exactamente los
20 declarados** en el informe — 12 nuevos de `time-tracking`, 4 de `app/api/.../sessions`,
1 test de rutas, y **solo 3 de `src/features/projects/`**:

- `projects/api/delete-project.ts` (la llamada nueva y su comentario),
- `projects/api/store.ts` (`removeCraftSessions` en interfaz e implementación),
- `projects/api/testing/in-memory-store.ts` (`sessions` y su borrado).

Los tres son estrictamente la frontera del `DELETE`, la única razón autorizada. **No se tocó
ningún otro archivo de #6**, ni `schema.ts`, ni `drizzle/`, ni `package.json`, `tsconfig.json`,
`next.config.*` o `drizzle.config.*`. Sin dependencias nuevas.

## 9. Tests reales y borde mockeado — OK

35 tests nuevos, ninguno tautológico: todos afirman sobre el resultado o sobre el estado del
store (status HTTP, `duration` exacta, `Project.time` exacto, longitud y contenido de
`sessions`), nunca "no lanza". Cubren camino feliz + errores (401/404/400/409) para cada
unidad. Sin DB real y sin red: doble en memoria compartido entre projects y time-tracking, y
`vi.mock` limitado al borde (`createProjectStore`, `createCraftSessionStore`, `next/headers`).
Niveles 0, 1 y 2 de `verification.md` cubiertos.

## 10. Estado de la feature — OK

`feature_list.json` mantiene la feature 7 en **`in_progress`** (l.115) y es la única que no
está `done`/`pending`. El implementer **no** la marcó `done`, como corresponde.

---

## Checkpoints

- **C1:** [x] arnés completo; `bash ./init.sh` exit code 0.
- **C2:** [x] una sola feature `in_progress` (#7); las `done` tienen tests verdes;
  `progress/current.md` describe la sesión activa sin residuos.
- **C3:** [x] capas respetadas (la UI no toca DB — no hay UI aún; lógica en
  `features/time-tracking/api/`; Drizzle solo en `store.ts` + `shared/db`; handlers finos con
  zod y scoping por `userId`); estructura feature-first; sin dependencias nuevas; sin
  `console.log` sueltos ni TODOs sin contexto; sin secretos hardcodeados (`JWT_SECRET` por
  entorno; la única constante literal es la del test).
- **C4:** [x] cada módulo no trivial tiene test; lint y typecheck verdes; 169/169 tests verdes.
- **C5:** [x] sin artefactos sospechosos (`*.tmp`/`*.orig`: ninguno); `progress/history.md`
  tiene entrada de la sesión anterior (#6) — la de #7 la escribe el líder al cerrar;
  la feature #7 queda en el estado correcto (`in_progress`, lista para pasar a `done`).

## Cambios requeridos

Ninguno. Nada bloqueante.

## Observaciones no bloqueantes (para el líder, no para el implementer)

1. **Ciclo de imports entre `projects` y `time-tracking` a nivel `schema`.**
   `projects/api/store.ts:7` importa `@/features/time-tracking/schema`, que a su vez importa
   `@/features/projects` (index) -> `./api` -> `store.ts`. El ciclo es real pero benigno (las
   referencias FK de Drizzle son closures perezosas) y está verificado por `pnpm build`,
   typecheck y 169 tests. Es una desviación **consciente y comentada** de la convención
   "consume otros features por su `index.ts`", y la alternativa limpia — mover ambas tablas a
   un módulo de schema compartido — tocaría #3, ya cerrada. Acepto la excepción tal cual; si
   se repite en #8/#9, conviene decidirlo a nivel arquitectura y no feature a feature.
2. **`removeCraftSessions` vive en `ProjectStore`.** Coherente con `removeYarnLinks`, pero el
   store de projects conoce una tabla ajena. Aceptable hoy; si aparece una tercera FK hacia
   `projects`, merece un servicio de borrado en cascada explícito.
3. **Deuda futura, no de esta feature:** si #10/#11 añaden borrado de sesión individual,
   deberá recalcular `Project.time` en la misma operación. Hoy no existe ese camino.
4. **Deuda #7 vigente:** nada ha corrido contra una DB real. En particular
   `coalesce(sum(...), 0)` devuelve `numeric` (string por el driver); `sumDuration` ya hace
   `Number(...)` explícito (`store.ts:134`), pero conviene confirmarlo en el primer smoke
   contra Neon.
