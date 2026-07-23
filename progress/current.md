# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ (última cerrada: #8 re-cerrada tras bugfix de la DB real)
- **Última tarea:** smoke test real contra Neon → deuda #6 saldada + bugfix de `isDuplicateColorCode`
- **Inicio:** _—_
- **Agente:** _—_

## Plan

_Describe en 3-5 bullets qué vas a hacer antes de tocar código._

## Bitácora

- #1-#9 cerradas + arquitectura de la capa de schema + smoke real contra Neon (ver `history.md`).
  Quedan 2 features: #10 `dashboard_metrics`, #11 `calculators`.
- `bash ./init.sh` verde: lint, typecheck, **249 tests** en 26 archivos (el smoke queda skipped
  sin el flag). `pnpm build` OK.
- **La migración YA está aplicada a Neon** (`drizzle/0000_cold_ben_urich.sql`, PostgreSQL 17.10):
  8 tablas + 12 FKs verificadas contra la DB real.
- Smoke real disponible: `SMOKE_NEON=1 pnpm vitest run src/__smoke__/neon.smoke.test.ts` (6/6).
  Es la guardia viva para re-verificar la capa de datos tras cambios de store.
- Confirmado por el usuario: el cloud name de Cloudinary (`dd1zea1lo`) es correcto.
- Nota del entorno: **context7 no está disponible**; research = código en `node_modules/` + doc
  oficial + verificación empírica.

## Reglas de arquitectura vigentes

`docs/harness/architecture.md` §"Capa de schema" (S1/S2). Decisiones de producto asentadas en
**PRD §11** (§11.7 Cloudinary diferido, §11.8 borrado de catálogos = 409 bloqueante).

## Aprendizaje de proceso (confirmado hasta #9 + smoke)

1. Identificar la costura **ANTES** y asignarla por escrito en el brief → #7/#8/#9 aprobadas a la
   primera. Repetir en #10.
2. **Los dobles en memoria pueden mentir:** el smoke real destapó que `isDuplicateColorCode` no
   desenvolvía `error.cause` (el doble imitaba la forma plana → verde en falso; Postgres real da
   500 en vez de 409). Lección: para lógica que depende de la **forma del error del driver**, un
   test hermético que imite la forma REAL (anidada) + el smoke real. Vale para futuros stores.

## Próximo paso — #10 `dashboard_metrics`

- `GET /api/dashboard/metrics?year=&type=` → `{ hours, projects, yarnMeters, comparison }`
  (PRD §8, §9(Dashboard)). Feature de **agregación/lectura** (`features/dashboard`), sin mutaciones,
  scoping por `userId`.
- Cálculos (PRD §8): `hours = Σ CraftSession.duration` con `start` en el año; `projects` = iniciados/
  terminados en el año (`startDate`/`endDate`); `yarnMeters = Σ (Yarn.usedQuantity × Yarn.length)`
  como **agregado lifetime** (no fechado, PRD §11.2). `comparison` se deriva de `yarnMeters`.
- Comparativas: lista fija en `shared/config` (semilla PRD §8: colectivo 12, Obelisco 67.5,
  Eiffel 330, cancha 105, Everest 8849).
- **Costura a decidir en el brief:** el endpoint lee de 3 features (time-tracking, projects, yarns).
  `features/dashboard/api/` orquesta con queries de solo-lectura scopeadas por `userId`, sin duplicar
  lógica ni romper capas. **Ojo `sum()` de Postgres → `numeric` (string por el driver): aplicar
  `Number(...)` como en `sumDuration`** (misma trampa que ya mordió; el smoke lo confirmó). Añadir
  un caso al smoke si se quiere cubrir el agregado real.

## Deuda técnica acumulada

1. ~~**Boilerplate de sesión** (#4)~~ → saldada en #6.
2. **Orden de firma de Cloudinary** (#5): `upload.ts` usa `localeCompare` (sensible a locale/ICU).
   Migrar a comparador binario si se añaden más params firmables.
3. **Sanitización al cablear Cloudinary** (#5, decisión PRD §11.7): `folder`/`publicId` desde el
   `userId` del JWT validados con zod, nunca del body crudo. Aplica en la fase de UI (no cableado aún).
4. **`tsconfig.tsbuildinfo` trackeado en git** (pre-existente): añadir a `.gitignore`.
5. **`GET /api/projects/:id` no devuelve las lanas enlazadas** (#6): decidir al cablear la UI.
6. ~~**La app nunca ha hablado con una DB real**~~ → **SALDADA** (2026-07-23): migración aplicada a
   Neon, esquema verificado, 6/6 comportamientos de la capa de datos confirmados, y un bug real de
   traducción de error corregido. Smoke guardado por flag como guardia viva.
7. **Borrado de sesión individual** (futuro): si se añade, deberá recalcular `Project.time`.
8. **`sum()`/agregados → `numeric` (string por el driver):** aplicar `Number(...)` en cualquier
   agregado nuevo (aplica directo a #10 `dashboard_metrics`).
