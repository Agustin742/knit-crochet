# Informe — Feature #6 `projects_crud`, sub-tarea B (endpoints de acción)

Estado: **implementada, pendiente de review**. `feature_list.json` queda
`in_progress` (la cierra el reviewer sobre A+B).

---

## 1. Verificación

```
bash ./init.sh
...
[OK]    lint verde
[OK]    typecheck verde
 Test Files  17 passed (17)
      Tests  131 passed (131)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Punto de partida (tras A): 103 tests en 15 archivos → ahora **131 tests en 17
archivos** (+28 tests, +2 archivos). Ningún test previo se tocó ni se rompió.

`pnpm build` verde; lista las rutas nuevas:

```
├ ƒ /api/projects/[id]/rounds
├ ƒ /api/projects/[id]/steps
├ ƒ /api/projects/[id]/yarns
└ ƒ /api/projects/[id]/yarns/[yarnId]
```

Tras el build se re-ejecutaron `pnpm typecheck` y `pnpm lint` con `.next/types`
regenerado: verdes. (Confirma además que `src/app/api/projects/params.ts` no se
interpreta como ruta: Next solo trata `route.ts`/`page.tsx` como especiales.)

---

## 2. Archivos

### Creados

| Archivo | Qué es |
|---|---|
| `src/features/projects/api/add-rounds.ts` | `addRounds(userId, id, delta, store?)` |
| `src/features/projects/api/set-completed-steps.ts` | `setCompletedSteps(userId, id, completedSteps, store?)` |
| `src/features/projects/api/project-yarns.ts` | `linkProjectYarn` / `unlinkProjectYarn` + `assertOwnedEnds` (privada) |
| `src/app/api/projects/params.ts` | Helpers de ruta: `readProjectId`, `readYarnId`, `projectNotFound`, `yarnNotFound`, `projectErrorResponse`, tipos de contexto |
| `src/app/api/projects/[id]/rounds/route.ts` | `POST` |
| `src/app/api/projects/[id]/steps/route.ts` | `PATCH` |
| `src/app/api/projects/[id]/yarns/route.ts` | `POST` |
| `src/app/api/projects/[id]/yarns/[yarnId]/route.ts` | `DELETE` |
| `src/features/projects/api/project-actions.test.ts` | Tests de los 4 servicios (14) |
| `src/app/api/projects/project-actions-routes.test.ts` | Tests de los 4 endpoints (14) |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/features/projects/api/store.ts` | + `findYarn`, `listYarnIds`, `linkYarn`, `unlinkYarn` en la interfaz y en la implementación Drizzle; + tipo `YarnRef` |
| `src/features/projects/api/testing/in-memory-store.ts` | + array `yarns` (id + dueño) y los 4 métodos nuevos; `reset()` lo limpia |
| `src/features/projects/api/errors.ts` | + `YarnNotFoundError` ("La lana no existe.") |
| `src/features/projects/validation.ts` | + `roundsDeltaSchema`, `completedStepsSchema`, `linkYarnSchema`, `yarnIdSchema` + tipos inferidos |
| `src/features/projects/api/index.ts` | reexporta los 3 módulos nuevos |
| `progress/current.md` | bitácora + plan de B |

**No se tocó** `src/features/projects/schema.ts`, ni ningún archivo de A salvo
los 4 puntos de extensión que el propio informe de A anunciaba (store, doble en
memoria, errores, validación, barrel). Las rutas y servicios de A quedan intactos.

---

## 3. Endpoints

| Endpoint | Body / params | Respuesta |
|---|---|---|
| `POST /api/projects/:id/rounds` | `{ delta: int }` (puede ser negativo) | `200 { project }` |
| `PATCH /api/projects/:id/steps` | `{ completedSteps: int[] >= 0 }` | `200 { project }` |
| `POST /api/projects/:id/yarns` | `{ yarnId: uuid }` | `201 { yarnIds }` si crea, `200 { yarnIds }` si ya existía |
| `DELETE /api/projects/:id/yarns/:yarnId` | param `yarnId: uuid` | `204` sin cuerpo |

Errores: `401` sin sesión (vía `withSession`), `404` proyecto o lana
inexistente/ajena, `400` body inválido (zod, primer `issue.message`).

---

## 4. Decisiones documentadas

1. **`completedSteps` se normaliza como conjunto ordenado**: `[...new Set(x)].sort(asc)`.
   `[2, 0, 2]` se persiste como `[0, 2]`. El endpoint es un **reemplazo total**
   del conjunto (no un merge): `{ completedSteps: [] }` lo vacía. Razón: son
   índices de instrucciones del patrón (PRD §4.2/§11.5); el orden y los duplicados
   no aportan información, y normalizar hace la comparación en la UI trivial.
2. **Doble enlace = idempotente, no 409.** `POST /:id/yarns` con una lana ya
   enlazada responde **200** (en vez de 201) con la lista resultante; no duplica
   fila ni rompe la PK compuesta (`onConflictDoNothing` en Drizzle). Motivo: el
   enlace es un conjunto, no un recurso con estado propio; un 409 obligaría al
   cliente a leer antes de escribir para una operación sin efectos secundarios.
   Simétricamente, `DELETE` responde **204** aunque no hubiera enlace.
3. **Scoping cruzado en el servicio.** `linkProjectYarn`/`unlinkProjectYarn`
   verifican **los dos extremos** antes de tocar `project_yarns`:
   `store.findById(userId, projectId)` → `ProjectNotFoundError` y
   `store.findYarn(userId, yarnId)` → `YarnNotFoundError`. Ambos → 404. Se
   comprueba el proyecto primero: si ninguno es tuyo, el mensaje habla del
   proyecto y no revela nada de la lana.
4. **`linkYarn`/`unlinkYarn`/`listYarnIds` no reciben `userId`** (única desviación
   de la regla de A "toda operación del store lleva `userId` en el WHERE):
   `project_yarns` no tiene columna `userId` y no hay a qué aplicarlo. El scoping
   queda garantizado por `assertOwnedEnds`, que corre antes en el mismo servicio;
   está comentado en el store. Alternativa descartada: un JOIN a `projects`+`yarns`
   en cada mutación, que duplicaría la comprobación ya hecha.
5. **`findYarn` vive en `ProjectStore`** y lee la tabla `yarns` importada desde
   `@/features/yarns` (su `index.ts` público, como manda `conventions.md`).
   Devuelve un `YarnRef = { id }`, lo mínimo que projects necesita saber. La
   feature #8 (`yarns_catalogs`) aún no existe, así que no hay servicio de lanas
   al que delegar; **si #8 expone un `getYarn(userId, id)`, este método debería
   migrar allí** (anotado como riesgo, punto 6.2).
6. **Enlazar NO descuenta stock** (PRD §4.5/§4.6): ninguna ruta de B escribe en
   `yarns`. Hay un test que verifica que solo se toca `project_yarns`.
7. **`delta` no acotado por arriba**, solo `z.number().int()`. El clamp de
   `progress` (0..100) y el suelo de `rounds` (0) ya hacen el resultado seguro;
   poner un máximo arbitrario sería inventar una regla que el PRD no pide.
8. **`params.ts` en `src/app/api/projects/`**: `readProjectId` + el mapeo de
   errores de dominio a 404 se comparten entre los 4 route handlers nuevos. No se
   puede exportar desde un `route.ts` (Next 16 valida los exports de esos archivos),
   así que vive en un módulo hermano. Los handlers siguen siendo finos: parsean,
   validan con zod, delegan y serializan.
9. **`yarnId` malformado en el path → 404**, no 400, por coherencia con la
   decisión 4 de A (un id que no es UUID no puede existir). En cambio, un `yarnId`
   malformado **en el body** de `POST /:id/yarns` sí es 400: ahí es un campo de
   payload, no una ruta.

**Reutilización de `calculateProgress`**: confirmado. `add-rounds.ts` importa
`calculateProgress` de `@/features/projects/api/progress` (la función de A) y la
llama con `(nuevoRounds, existing.targetRounds)`. **No se duplicó ni se
reimplementó** la fórmula en ninguna parte de B; `progress.ts` sigue siendo la
única fuente del cálculo (lo usan `create-project`, `update-project` y `add-rounds`).

---

## 5. Tests añadidos (28)

`project-actions.test.ts` (servicios, sin DB ni red, doble en memoria de A):
delta positivo / negativo / suelo en 0 / `targetRounds=0` → `progress=0` y clamp
100; steps deduplicados y ordenados, reemplazo total, proyecto ajeno; enlace,
doble enlace idempotente, desenlace idempotente, lana ajena → `YarnNotFoundError`,
proyecto ajeno → `ProjectNotFoundError`.

`project-actions-routes.test.ts` (rutas reales + `withSession` + zod reales, solo
mockeados `createProjectStore` y `next/headers`, igual que A): 401 en los 4
endpoints sin sesión, 404 en los 4 con proyecto ajeno, 404 con id desconocido o
malformado, deltas (+/−/suelo/sin target), 400 en delta ausente/decimal/no numérico,
steps normalizados, 400 en `completedSteps` ausente/negativo/decimal/no array,
enlace 201 sin tocar stock, doble enlace 200 sin duplicar, desenlace 204 idempotente,
lana ajena 404 con `{"error":"La lana no existe."}`, lana desconocida 404,
`yarnId` malformado en body 400 y en path 404.

---

## 6. Riesgos / notas para el reviewer

1. **`DELETE /api/projects/:id` sigue con el riesgo que anotó A** (punto 11 de su
   informe) y ahora es real: desde B ya se pueden crear filas en `project_yarns`,
   así que borrar un proyecto con lanas enlazadas violará la FK en Postgres → 500.
   Está **fuera del acceptance de #6** (que no menciona borrado en cascada), así
   que no lo he tocado: cambiar `deleteProject` es modificar código de A. Propuesta
   para el reviewer/leader: que `deleteProject` limpie primero `project_yarns`
   (o `onDelete: "cascade"` en el schema, que es de #3). **Recomiendo abordarlo
   como deuda técnica explícita antes de #7**, que añadirá `craft_sessions` con
   el mismo problema.
2. **`findYarn` en `ProjectStore` es una dependencia hacia la tabla de otra
   feature.** Es la opción menos mala hoy (no existe `features/yarns/api/`), pero
   cuando llegue #8 conviene invertirla: que `projects` consuma un servicio público
   de `yarns` en vez de su tabla. Anotado como deuda.
3. **Duplicación menor**: `readProjectId` existe dos veces, en
   `src/app/api/projects/[id]/route.ts` (de A) y en `params.ts` (mío). No unifiqué
   porque implicaba editar el route.ts de A. Es un refactor de 2 líneas si el
   reviewer lo quiere.
4. **`POST /:id/yarns` devuelve `{ yarnIds }`, no `{ project }`**, a diferencia de
   rounds/steps. El PRD no define el cuerpo de respuesta; se eligió devolver el
   estado del enlace porque el `Project` no cambia al enlazar. `GET /api/projects/:id`
   **no** incluye las lanas enlazadas (no está en el acceptance de #6); si la UI lo
   necesita, es una ampliación futura.
5. **`store.yarns` del doble en memoria solo guarda `{ id, userId }`**: es lo único
   que `findYarn` consulta. Cuando #8 traiga la entidad completa habrá que decidir
   si el doble se enriquece o si se sustituye por el store real de yarns.

---

## 7. Corrección tras review (rechazo del reviewer)

Informe del rechazo: `progress/reports/review_projects_crud.md`, sección "Cambios
requeridos (bloqueantes)", punto 1 — **único** defecto bloqueante. Es exactamente
el riesgo 6.1 de este informe, ahora corregido en lugar de dejado como deuda.

### Defecto

`DELETE /api/projects/:id` devolvía **500** cuando el proyecto tenía lanas
enlazadas: la FK `project_yarns_project_id_projects_id_fk` es `ON DELETE no action`
(`drizzle/0000_cold_marrow.sql:102`, `schema.ts:42-44`), así que la secuencia
`POST /api/projects/:id/yarns` → `DELETE /api/projects/:id` viola la FK en Postgres
y `withSession` lo traduce a `500 {"error":"Error interno del servidor."}`.

### Solución (capa del feature, sin migración)

El schema es de la feature #3, ya cerrada: **no** se tocó `schema.ts` ni se generó
migración. Se resuelve en el servicio, borrando los enlaces antes de la fila.

| Archivo | Cambio |
|---|---|
| `src/features/projects/api/delete-project.ts` | Ahora: `findById(userId, id)` → si no, `ProjectNotFoundError` (404 intacto para ajeno/inexistente); `removeYarnLinks(id)`; `remove(userId, id)`. Comentario explicando el porqué de la FK |
| `src/features/projects/api/store.ts` | + `removeYarnLinks(projectId): Promise<number>` en la interfaz y su implementación Drizzle (`DELETE FROM project_yarns WHERE project_id = $1 RETURNING`) |
| `src/features/projects/api/testing/in-memory-store.ts` | + `removeYarnLinks` en el doble (filtra `links` por `projectId` y devuelve cuántos quitó) |
| `src/features/projects/api/project-service.test.ts` | + 1 test de servicio |
| `src/app/api/projects/projects-routes.test.ts` | + 2 tests de ruta |

Notas de la corrección:

- **El 404 no cambia.** Antes la propiedad se comprobaba implícitamente en el
  `WHERE` de `remove`; ahora se comprueba explícitamente con `findById` **antes**
  de borrar nada, así que un proyecto ajeno ni siquiera pierde sus enlaces. Se
  mantiene la segunda guarda (`if (!deleted) throw`) por si la fila desaparece
  entre ambas consultas.
- **`removeYarnLinks` está scopeado al `projectId`**, y solo se invoca tras
  verificar la propiedad del proyecto en el mismo servicio (misma excepción
  documentada y ya aceptada por el reviewer para `linkYarn`/`unlinkYarn`:
  `project_yarns` no tiene columna `userId`).
- **No toca stock**: solo borra filas de `project_yarns`; `yarns` no se escribe
  (el enlace es solo referencia, PRD §4.6).
- **Alcance quirúrgico**: no se aplicó la observación no bloqueante 1 (unificar el
  `readProjectId` duplicado) ni ninguna otra, por indicación del líder.

### Tests añadidos (3, total 134)

1. `project-service.test.ts` — "clears the yarn links before deleting the project":
   proyecto con un enlace → `deleteProject` resuelve, `store.rows` y `store.links`
   quedan vacíos.
2. `projects-routes.test.ts` — "deletes a project with linked yarns clearing the
   N:N links first": dos proyectos enlazados a la misma lana; `DELETE` de uno
   responde **204**, su fila desaparece de `store.rows` y **solo** su enlace se va
   de `store.links` (el del otro proyecto sobrevive → confirma el scoping del borrado).
3. `projects-routes.test.ts` — "answers 404 without deleting anything for another
   user's project with links": proyecto ajeno con enlace → **404**, `store.rows` y
   `store.links` intactos.

### Verificación de la corrección

```
bash ./init.sh
[OK]    lint verde
[OK]    typecheck verde
 Test Files  17 passed (17)
      Tests  134 passed (134)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

131 → **134 tests**, mismos 17 archivos. Ningún test existente se rompió ni se
modificó (solo se añadieron casos). `pnpm build` verde, con las 6 rutas de
`/api/projects` listadas; `pnpm typecheck` y `pnpm lint` re-ejecutados tras el
build con `.next/types` regenerado: verdes.

`feature_list.json` sigue en `in_progress`: la cierra el reviewer tras re-revisar.
