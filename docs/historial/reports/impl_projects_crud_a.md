# Informe — Feature #6 `projects_crud`, sub-tarea A (cimientos + CRUD base)

Estado: **implementada, pendiente de review**. La feature queda `in_progress`
en `feature_list.json` (la cierra el reviewer tras A+B).

---

## 1. Verificación

```
bash ./init.sh
...
[OK]    lint verde
[OK]    typecheck verde
 Test Files  15 passed (15)
      Tests  103 passed (103)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Punto de partida: 70 tests en 12 archivos → ahora **103 tests en 15 archivos**.
Ningún test previo se tocó ni se rompió.

Extra (no lo pide el arnés, pero valida las firmas de los Route Handlers contra
el validador generado por Next 16): `pnpm build` pasa y lista las rutas
`ƒ /api/projects` y `ƒ /api/projects/[id]`. Tras el build se re-ejecutaron
`typecheck` y `lint` con el `.next/types` regenerado: verdes.

---

## 2. Archivos

### Creados

| Archivo | Qué es |
|---|---|
| `src/features/projects/types.ts` | `ProjectRecord`, `NewProjectRecord`, `ProjectYarnRecord`, `CreateProjectInput`, `UpdateProjectInput`, `ProjectPatch`, `ProjectFilters` |
| `src/features/projects/validation.ts` | zod: `createProjectSchema`, `updateProjectSchema`, `projectFiltersSchema`, `projectIdSchema` |
| `src/features/projects/api/progress.ts` | `calculateProgress(rounds, targetRounds)` |
| `src/features/projects/api/errors.ts` | `ProjectNotFoundError` |
| `src/features/projects/api/store.ts` | `ProjectStore` (interfaz) + `createProjectStore(db)` (Drizzle) |
| `src/features/projects/api/create-project.ts` | `createProject(userId, input, store?)` |
| `src/features/projects/api/list-projects.ts` | `listProjects(userId, filters, store?)` |
| `src/features/projects/api/get-project.ts` | `getProject(userId, id, store?)` |
| `src/features/projects/api/update-project.ts` | `updateProject(userId, id, input, store?)` |
| `src/features/projects/api/delete-project.ts` | `deleteProject(userId, id, store?)` |
| `src/features/projects/api/index.ts` | API pública de la capa `api` |
| `src/features/projects/api/testing/in-memory-store.ts` | Doble en memoria de `ProjectStore` compartido por los tests |
| `src/app/api/projects/route.ts` | `GET` (filtros) + `POST` |
| `src/app/api/projects/[id]/route.ts` | `GET` / `PATCH` / `DELETE` |
| `src/shared/lib/http.test.ts` | Tests de `withSession` / `sessionErrorResponse` |
| `src/features/projects/api/project-service.test.ts` | Tests de servicios + `calculateProgress` (9) |
| `src/app/api/projects/projects-routes.test.ts` | Tests de los 5 endpoints (19) |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/shared/lib/http.ts` | + `withSession`, + `sessionErrorResponse` |
| `src/shared/lib/auth/session.ts` | reexporta `InvalidSessionError` |
| `src/app/api/auth/me/route.ts` | migrado a `withSession` (comportamiento idéntico) |
| `src/features/projects/index.ts` | ahora exporta `api`, `types` y `validation` además de `schema` |
| `progress/current.md` | bitácora + deuda técnica 1 marcada como saldada |

**No se tocó** `src/features/projects/schema.ts` ni ninguna otra feature.

---

## 3. API del helper de sesión (la consumen B y #7-#10)

Un endpoint privado necesita **un solo import**: `@/shared/lib/http`.

```ts
export function withSession<TArgs extends unknown[]>(
  route: string,
  handler: (userId: string, ...args: TArgs) => Promise<NextResponse>,
): (...args: TArgs) => Promise<NextResponse>;
```

- `route`: etiqueta para el log del 500 (p. ej. `"POST /api/projects/:id/rounds"`).
- Resuelve el `userId` con `requireSessionUserId()` y lo pasa **como primer
  argumento**; el resto de argumentos del Route Handler se reenvían intactos, así
  que la firma resultante es exactamente la que Next espera.
- Mapea `InvalidSessionError` → `401 {"error":"No autenticado."}`.
- Cualquier error no capturado por el handler → `500 {"error":"Error interno del
  servidor."}` + `console.error`. **El handler solo trata sus errores de dominio**
  (los demás los relanza con `throw`).

Uso, sin parámetros de ruta:

```ts
export const GET = withSession("GET /api/projects", async (userId: string, request: Request) => { ... });
```

Con parámetros de ruta (Next 16: `params` es una `Promise`):

```ts
type RouteContext = { params: Promise<{ id: string }> };

export const POST = withSession(
  "POST /api/projects/:id/rounds",
  async (userId: string, request: Request, context: RouteContext) => { ... },
);
```

Un handler sin argumentos (`/api/auth/me`) se declara `async (userId) => ...` y el
exportado sigue siendo invocable como `GET()` — por eso los tests de #4 no se tocaron.

También existe `sessionErrorResponse(route, error)` por si algún handler necesita
capturar la sesión a mano; **el patrón por defecto es `withSession`** y es el único
usado en el repo (no hay dos patrones conviviendo).

---

## 4. Dónde vive `progress` (para la sub-tarea B)

`src/features/projects/api/progress.ts`:

```ts
export function calculateProgress(rounds: number, targetRounds: number): number
```

Reexportada por `@/features/projects/api` y por `@/features/projects`.
Reglas implementadas: `targetRounds <= 0 → 0` (evita la división por cero),
`round(rounds / targetRounds * 100)` y clamp `0..100`.

**B debe usarla en `POST /api/projects/:id/rounds`** al aplicar el `delta`
(`calculateProgress(nuevoRounds, project.targetRounds)`), igual que hace
`updateProject`. El cliente nunca envía `progress`: no está en ningún esquema zod
y los objetos zod no-strict lo descartan (hay un test que lo comprueba).

---

## 5. Contrato de datos y decisiones no obvias

1. **`ProjectStore`** (`api/store.ts`) es el único punto de acceso a Drizzle del
   feature, calcado del patrón de `auth`. Todas sus operaciones reciben `userId` y
   lo aplican en el `WHERE`. Los servicios lo reciben como último parámetro con
   default, lo que permite testear sin DB.
   **B añadirá aquí** `linkYarn` / `unlinkYarn` / `listYarnIds` sobre `projectYarns`
   y sus equivalentes en el doble en memoria (que ya tiene un array `links`).
2. **Doble en memoria en `api/testing/in-memory-store.ts`** (no en el archivo de
   test): lo comparten el test de servicios y el de rutas, y B lo reutilizará.
   Replica el scoping y los filtros; expone `rows`, `links`, `lastFilters` y `reset()`.
3. **Acceso ajeno = 404.** `ProjectNotFoundError` se lanza igual si el proyecto no
   existe o si es de otro usuario. No hay 403 en ninguna ruta.
4. **`id` con formato no-UUID → 404**, no 400: un id malformado no puede existir, y
   así se evita además que Postgres reviente con un cast inválido (sería un 500).
   Se valida con `projectIdSchema` antes de tocar la capa de datos.
5. **Query params vacíos = sin filtro.** El PRD escribe la URL como
   `?active=&type=&needle=&yarnId=&from=&to=`; se descartan los valores `""` antes
   de pasar por zod. Un valor **presente e inválido** sí es 400
   (`?active=maybe`, `?type=macrame`, `?needle=gorda`, `?yarnId=123`, `?from=ayer`).
6. **`active`** se traduce a `status ∈ {in_progress, paused}` usando
   `ACTIVE_PROJECT_STATUSES` de `shared/config` (PRD §4); `active=false` es su negación.
7. **`needle`** filtra dentro del array `needles` con containment jsonb
   (`needles @> '[4]'::jsonb`); admite decimales (3.5 mm).
8. **`yarnId`** filtra con un `EXISTS` sobre `project_yarns` (no un JOIN, para no
   duplicar filas).
9. **`from`/`to`** se aplican sobre **`startDate`** (inclusive en ambos extremos).
   El PRD solo dice "rango de fechas"; se eligió `startDate` por ser la fecha que
   siempre existe (`endDate` es nullable). Listado ordenado por `startDate` desc.
10. **`PATCH` vacío (`{}`) → 400** ("No hay nada que actualizar").
11. **`DELETE` → 204** sin cuerpo. Borrado duro: no hay soft-delete en el PRD.
    Ojo: si el proyecto ya tiene enlaces en `project_yarns` o `craft_sessions`, la FK
    de Postgres lo rechazará → hoy sería un 500. **Queda anotado como riesgo para B/#7**
    (decidir si el DELETE debe limpiar antes los enlaces); fuera del scope de A porque
    esos enlaces todavía no se pueden crear.
12. `time` y `completedSteps` no se tocan aquí más allá de aceptarse en el body;
    su lógica de negocio es de B (#steps) y #7 (#time).

---

## 6. Qué queda explícitamente para la sub-tarea B

- `POST /api/projects/:id/rounds` con `{ delta }` → aplicar el delta (sin bajar de 0)
  y **recalcular `progress` con `calculateProgress`**.
- `PATCH /api/projects/:id/steps` con `{ completedSteps }`.
- `POST /api/projects/:id/yarns` (`{ yarnId }`) y `DELETE /api/projects/:id/yarns/:yarnId`
  → enlace N:N sobre `projectYarns`, añadiendo los métodos correspondientes a
  `ProjectStore` y al doble en memoria. Solo referencia: **no** descuenta stock.
- Todos los endpoints nuevos deben usar `withSession` y devolver 404 para proyectos
  ajenos, reutilizando `getProject` / `ProjectNotFoundError`.
