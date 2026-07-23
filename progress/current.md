# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ (última cerrada: #10 `dashboard_metrics`, APROBADA a la primera)
- **Última tarea:** #10 `dashboard_metrics` cerrada — primer cierre con el nuevo informe de síntesis
- **Inicio:** _—_
- **Agente:** _—_

## Plan

_Describe en 3-5 bullets qué vas a hacer antes de tocar código._

## Bitácora

- #1-#10 cerradas + arquitectura de la capa de schema + smoke real contra Neon (ver `history.md`).
  Queda **1 feature**: #11 `calculators` (última).
- `bash ./init.sh` verde: lint, typecheck, **266 tests** en 28 archivos (el smoke queda skipped
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

## Próximo paso — #11 `calculators` (última feature)

- Lógica **pura sin DB** (PRD §7), resultados efímeros (se ejecuta en cliente, no se persiste).
  `features/calculators`, sin endpoints ni acceso a DB.
- **Aumentos:** entrada `P` (currentStitches) y `A` (stitchesToAdd) → instrucción legible en español.
  `A<=0` o `P<=0` → error de validación. `base = floor(P/A)`, `remainder = P mod A`. Salida:
  `remainder` tramos de `(base+1)` p + aumento, luego `(A - remainder)` tramos de `base` p + aumento.
  Caso canónico `P=40, A=6` → `"Teje 7 p, aumenta 1 (×4); luego teje 6 p, aumenta 1 (×2). Total: 46 p."`
- **Regla de 3:** `skeinsB = ceil(skeinsA × lengthB / lengthA)` (redondeo hacia arriba).
- **Costura:** feature autocontenida, sin store ni schema. Ojo con la redacción EXACTA del string de
  aumentos (el test canónico del acceptance la fija) y con el redondeo `ceil` de la regla de 3.
- Al cerrar: informe de síntesis → `progress/informs/2.informe-calculators.md`.

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
