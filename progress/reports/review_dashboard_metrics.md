# Review — feature #10 `dashboard_metrics`

**Veredicto:** APROBADO

## Verificación ejecutada por el reviewer (no confiada al informe)

- `bash ./init.sh` → **VERDE**: `lint verde`, `typecheck verde`, `Test Files 28 passed | 1 skipped`, `Tests 266 passed | 6 skipped`. Baseline 249 → +17 nuevos, 0 rotos.
- `pnpm build` → `✓ Compiled successfully in 7.2s`. La ruta `ƒ /api/dashboard/metrics` queda registrada como función dinámica.
- Sin `console.log`/`TODO`/`: any` en `src/features/dashboard/**`.

## Auditoría punto por punto

1. **Trampa `numeric → string`:** OK. Los tres agregados van envueltos en `Number(...)` con `coalesce(...,0)`:
   - `sumHours` — ambas ramas (con y sin `type`): `store.ts:66,71,76,80`.
   - `countProjects` — `store.ts:102,105`.
   - `sumYarnMeters` — `coalesce(sum(usedQuantity * length), 0)` + `Number(...)`: `store.ts:111,115`.
   Coincide con el patrón de `sumDuration` en `time-tracking/api/store.ts:125,134`.

2. **`yarnMeters` lifetime:** OK. `sumYarnMeters(userId)` solo filtra `eq(yarns.userId, userId)` (`store.ts:108-116`), sin `year` ni `type`. Test de invarianza en `metrics-service.test.ts:131-145` (2026/2000/type no lo alteran).

3. **`hours` unidad:** OK. Devuelve el crudo de `duration` en segundos, sin dividir. Fijado por `metrics-service.test.ts:40` (`expect(metrics.hours).toBe(5400)`). Documentado en `types.ts:22-28`.

4. **Ventana de año:** OK. `yearRange` = `[new Date(year,0,1), new Date(year+1,0,1))` con `gte`/`lt` sobre timestamps (`metrics.ts:13-18`); nada de `BETWEEN` ni `extract(year ...)`. `hours` filtra por `craft_sessions.start` (`store.ts:59-61`); `projects` por `startDate` OR `endDate` en rango (`store.ts:86-95`). Sin `year` → `new Date().getFullYear()` (`metrics.ts:31`), con test `defaults to the current server year`.

5. **Costura S1:** OK. `store.ts:8-10` importa las tablas por `@/features/projects/schema`, `@/features/time-tracking/schema`, `@/features/yarns/schema` (directo, no barrel). No invoca stores/servicios de otros features: agrega directo sobre tablas. `dashboard/index.ts` no exporta `./schema`. Build/typecheck verdes ⇒ sin ciclo. `git status` confirma que no se tocó ningún `schema.ts` ni hay migración nueva en `drizzle/`.

6. **Scoping por `userId`:** OK. Los tres agregados filtran por `userId`. El Route Handler usa `withSession` (`route.ts:17`); query inválida → 400 vía `metricsFiltersSchema.safeParse` + `validationErrorResponse` (`route.ts:20-23`). Tests: 401 sin sesión, 400 con `year=abc` y `type=sewing` (`dashboard-routes.test.ts:63-121`).

7. **Fidelidad del doble en memoria:** OK. `in-memory-store.ts` replica la semántica SQL: ventana `[start,end)` sobre `start`/`startDate`/`endDate`, `type` vía lookup del proyecto de la sesión, y `yarnMeters` que ignora `year`/`type`. La lógica AND/OR del `countProjects` real es equivalente (el `type` se aplica en AND, la ventana en OR). **Observación (no bloqueante):** el agregado SQL real (`sum(usedQuantity * length)`, el `innerJoin` de horas) solo está cubierto por el doble; convendría un caso en el smoke Neon para ejercerlo contra la DB (deuda técnica #8, ya anotada por el implementer como opcional).

8. **`comparison`:** OK. `pickComparison` elige la mayor referencia con `meters ≤ yarnMeters`, y la menor si ninguna cabe (`comparison.ts:19-26`). `YARN_COMPARISONS` fija en `shared/config/index.ts:23-29` (semilla PRD §8 exacta, orden ascendente) con test de semilla + invariante de orden. Casos cubiertos: `700 → Torre Eiffel`, `5 → colectivo (times<1)`, `0 → colectivo times=0` (`metrics-service.test.ts:148-181`).

## Alcance

Limpio. `git status` muestra tocado solo: `src/features/dashboard/**`, `src/app/api/dashboard/**`, `src/shared/config/index.ts` + su test, `feature_list.json`, `progress/**`, `tsconfig.tsbuildinfo`. No se tocó ningún `schema.ts`, ni `drizzle/`, ni otro feature.
(Nota menor de contexto: `.claude/agents/leader.md` y `CLAUDE.md` figuran modificados en el árbol, pero son archivos del arnés ajenos a esta feature y no afectan el veredicto.)

## Checkpoints

- C3: [x] Capas respetadas — UI no toca DB, lógica en `features/dashboard/api`, Route Handler fino con zod + `withSession`, scoping por `userId`.
- C4: [x] Cada módulo con lógica tiene test; lint + typecheck + tests verdes.

## Cambios requeridos

Ninguno.
