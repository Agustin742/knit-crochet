# Informe de implementación — #10 `dashboard_metrics`

**Estado:** implementada + verificación verde (`bash ./init.sh` OK, `pnpm build` OK).
**Fecha:** 2026-07-23.

## Qué se construyó

`GET /api/dashboard/metrics?year=&type=` → `{ hours, projects, yarnMeters, comparison }`.
Feature de **agregación / solo-lectura** (no muta nada), scopeada por `userId` de la sesión.
Feature-first espejando `features/patterns/**` y `time-tracking/api/**`.

## Archivos creados

- `src/features/dashboard/types.ts` — `MetricsFilter`, `Comparison`, `DashboardMetrics`.
- `src/features/dashboard/validation.ts` — `metricsFiltersSchema` (zod: `year` coercionado a int
  opcional, `type` enum `CRAFT_TYPES` opcional → 400 si inválidos).
- `src/features/dashboard/api/store.ts` — `DashboardStore` + `createDashboardStore(db)` (solo lectura).
- `src/features/dashboard/api/metrics.ts` — `getDashboardMetrics(...)` + `yearRange(year)`.
- `src/features/dashboard/api/comparison.ts` — `pickComparison(yarnMeters)`.
- `src/features/dashboard/api/testing/in-memory-store.ts` — doble en memoria fiel.
- `src/features/dashboard/api/index.ts` — barrel del api.
- `src/features/dashboard/index.ts` — barrel del feature (`./api`, `./types`, `./validation`; sin `./schema`).
- `src/app/api/dashboard/metrics/route.ts` — Route Handler fino con `withSession`.
- `src/features/dashboard/api/metrics-service.test.ts` — 11 tests de servicio + comparison.
- `src/app/api/dashboard/metrics/dashboard-routes.test.ts` — 4 tests de ruta (200/401/400 + defaults).

## Archivos modificados

- `src/shared/config/index.ts` — añadida `YARN_COMPARISONS` (`as const`, `label`+`meters`, semilla PRD §8,
  ordenada ascendente por `meters`) + type `YarnComparison`.
- `src/shared/config/index.test.ts` — 2 tests: semilla exacta + invariante de orden ascendente.
- `feature_list.json` — #10 `pending` → `done`.
- `progress/current.md` — plan de la sesión.

## Reglas de cálculo (PRD §8) y decisiones

1. **`hours` = Σ `craft_sessions.duration`** con `start` en el año, scopeado por `userId`; con `type`,
   `innerJoin` con `projects` y `projects.type = type`. **Devuelve el agregado crudo en segundos**
   (unidad del dominio, igual que `Project.time`); la conversión a horas es de la UI (fuera del PRD).
   Documentado en `types.ts`/`store.ts` y cubierto por test (`hours` = 5400 seg, no dividido).
2. **`projects`** = proyectos del usuario con `startDate` en el año **OR** `endDate` en el año; con `type`,
   además `projects.type = type`. `endDate` nullable: en SQL sus comparadores dan NULL y la fila no entra
   por esa rama; el doble replica la misma semántica.
3. **`yarnMeters` = Σ (`usedQuantity` × `length`)** — agregado **lifetime** (PRD §11.2): NO filtra por
   `year` ni `type`, solo `userId`. Comentado explícito + test de invarianza (year 2026/2000/type no cambian).
4. **`comparison`**: mayor referencia con `meters ≤ yarnMeters` (para `times ≥ 1`); si ninguna cabe
   (`yarnMeters` < 12, incl. `0`) → menor referencia. `yarnMeters = 0` → `times = 0` contra "Un colectivo".
   Criterio documentado en `comparison.ts` y cubierto por 3 tests + 1 end-to-end vía servicio.

## Trampa del driver (aplicada)

Todos los agregados (`sum(duration)`, `count(*)`, `sum(usedQuantity * length)`) van envueltos en
`Number(...)` con `coalesce(..., 0)`, igual que `sumDuration` en `time-tracking/api/store.ts`. Sin esto,
el driver `neon-http` devolvería `numeric` como string.

## Costura de arquitectura (S1)

El `DashboardStore` importa las **tablas** por su `schema.ts` directo (`@/features/time-tracking/schema`,
`@/features/projects/schema`, `@/features/yarns/schema`), nunca por los barrels `index.ts`. No llama a
stores/servicios de otros features ni duplica su lógica: agrega directo sobre las tablas. Sin migración
nueva, sin tocar ningún `schema.ts`.

## Doble en memoria fiel

`createInMemoryDashboardStore()` reproduce la semántica REAL de las queries: scoping por `userId`, ventana
de año semiabierta `[start, end)` sobre `start`/`startDate`/`endDate`, filtro `type` uniendo la sesión con
su proyecto, y `yarnMeters` que ignora por completo `year`/`type`. (Lección del smoke de #8: un doble que
miente deja verdes en falso.)

## Verificación

`bash ./init.sh` → **VERDE**:
- lint verde, typecheck verde.
- Tests: **266 passed | 6 skipped** (28 files passed, 1 skipped). Baseline eran 249; +17 nuevos, 0 rotos.

`pnpm build` → **OK** (`✓ Compiled successfully`). La ruta `ƒ /api/dashboard/metrics` queda registrada
como función dinámica en la tabla de rutas.

## Observaciones para el reviewer / leader

- Respuesta del endpoint: devuelve el objeto de métricas **directo** (`{ hours, projects, yarnMeters,
  comparison }`), no envuelto, para respetar el contrato literal del PRD §9 (a diferencia de patterns que
  envuelve en `{ patterns }`).
- `year` se valida con `z.coerce.number().int().min(1970).max(9999)`. Un `?year=` vacío se descarta en
  `readQuery` (sin filtro → año actual); `?year=abc` → 400.
- No hay smoke real nuevo contra Neon en esta sesión (los agregados están cubiertos por el doble fiel + la
  trampa `Number(...)` aplicada). Si se quiere, se puede añadir un caso al `neon.smoke.test.ts` para
  ejercer `sum(usedQuantity * length)` contra la DB real (deuda técnica #8 del harness, opcional).
