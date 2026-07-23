# Informe de implementación — #9 `patterns_crud`

Estado: implementada, **pendiente de review** (no marcada `done`).

## Alcance cubierto (vs. acceptance de feature #9)

| Acceptance | Cubierto por |
|---|---|
| CRUD `/api/patterns` con filtros `?type=&inLibrary=` | `route.ts` (GET/POST), `[id]/route.ts` (GET/PATCH/DELETE), `params.ts` |
| `instructions` array ordenado `{key,value}`; `metadata` array `{key,value}` | `validation.ts` (`keyValueSchema`, arrays con `.max`), `types.ts` |
| `inLibrary` distingue biblioteca vs embebido; biblioteca 1→N proyectos | default `false` en store/schema; costura `set null` deja el 1→N intacto |
| El completado de pasos NO vive en el patrón | No se añadió nada de steps; sigue en `Project.completedSteps` (#6) |
| Tests: CRUD, filtro por type e inLibrary, embebido vs biblioteca | 2 suites nuevas (servicio + rutas) |

Todos los endpoints son privados (`withSession`) y scopean por `userId`. Un
recurso ajeno/inexistente responde **404** (nunca 403), como en projects/yarns.

## Archivos creados

Feature `src/features/patterns/`:
- `types.ts` — `PatternRecord`/`NewPatternRecord`, `CreatePatternInput`, `UpdatePatternInput`, `PatternPatch`, `PatternFilters`; re-exporta `KeyValue` del schema.
- `validation.ts` — `createPatternSchema`, `updatePatternSchema` (con `.refine` de patch no vacío), `patternFiltersSchema` (`type` enum + `inLibrary` `booleanFlag`), `patternIdSchema`.
- `api/errors.ts` — `PatternNotFoundError`.
- `api/store.ts` — `PatternStore` + `createPatternStore` (Drizzle). `remove` solo borra el patrón; el `set null` lo hace Postgres.
- `api/testing/in-memory-store.ts` — `createInMemoryPatternStore(projects?)`; comparte `projects.rows` y simula el `set null` in-place en `remove`.
- `api/create-pattern.ts`, `api/list-patterns.ts`, `api/get-pattern.ts`, `api/update-pattern.ts`, `api/delete-pattern.ts` — servicios finos.
- `api/index.ts` — barrel del api.
- `api/pattern-service.test.ts` — 12 tests a nivel servicio.

Route handlers `src/app/api/patterns/`:
- `params.ts` — `readPatternId` (id inválido → 404), `readQuery` (query vacía = sin filtro), `patternNotFound`, `patternErrorResponse`.
- `route.ts` — GET (lista+filtros) / POST (crear).
- `[id]/route.ts` — GET / PATCH / DELETE.
- `patterns-routes.test.ts` — 11 tests a nivel ruta (mockean solo el borde: el store y `next/headers`).

## Archivos modificados

- `src/features/patterns/index.ts` — antes solo `export * from "./schema"`; ahora añade `./api`, `./types`, `./validation` (mirror de yarns). Verificado que NO rompe S1: `patterns/schema.ts` sigue importando solo `auth/schema` + `shared/db/enums`, nunca este barrel. `pnpm build` + typecheck + tests confirman que no hay ciclo.
- `progress/current.md` — nota de implementer en curso.

**Schema NO tocado** (`patterns/schema.ts`) y **ninguna migración generada**, según el brief.

## Decisión de la costura del borrado (`set null`)

La FK `projects.pattern_id → patterns` es `ON DELETE set null` (S2, ya declarada
en el schema de #3). Por tanto:
- `DELETE /api/patterns/:id`: 404 si el patrón no existe o es ajeno; si existe → **borra → 204**.
- Los proyectos que lo referenciaban quedan con `patternId = null`. **Lo hace Postgres por la FK, NO el servicio** (regla S2: `delete-pattern.ts` no limpia nada a mano).
- **No** hay 409, **no** hay `?force`, **no** hay aviso de "N proyectos usan este patrón" (sería confirmación de UI, fuera del alcance de este PRD).

Fidelidad del doble: `createInMemoryPatternStore(projects?)` comparte
`InMemoryProjectStore` (mismo patrón que yarns `#8`). En `remove` recorre
`projects.rows` y pone `patternId = null` in-place (no reasigna el array) donde
coincide. Cubierto por dos tests explícitos (servicio y ruta): crear proyecto
con `patternId = X`, borrar el patrón X → el proyecto sigue existiendo con
`patternId = null`.

## Verificación

`bash ./init.sh` — **VERDE**:
```
[OK] lint verde
[OK] typecheck verde
 Test Files  25 passed (25)
      Tests  242 passed (242)
[OK] tests verdes
[OK] Entorno listo.
```
Punto de partida: 219 tests / 23 archivos → ahora **242 tests / 25 archivos**
(+23 tests, +2 suites). Cero tests rotos de los 219 previos.

`pnpm build` — **OK**, rutas nuevas registradas:
```
✓ Compiled successfully
├ ƒ /api/patterns
├ ƒ /api/patterns/[id]
```

## Notas / riesgos para el reviewer

- **Deuda #6 sigue aplicando**: la app nunca ha hablado con una DB real. El
  `set null` está probado solo contra el doble que lo imita; confirmar en el
  primer smoke contra Neon. El servicio de producción (`store.remove`) NO simula
  nada: delega en la FK, que es lo correcto por S2.
- `keyValueSchema`: `key` obligatoria (min 1, max 200), `value` max 5000, sin
  `trim` en value (puede contener espacios significativos). `instructions` máx
  1000 items, `metadata` máx 200. Ajustables si el reviewer prefiere otros límites.
- El store de producción de patterns es **autocontenido** (solo importa
  `patterns/schema` + `shared/db`); no hay import cross-feature en el core. El
  acoplamiento con projects vive únicamente en el **doble de tests**, igual que
  yarns.
