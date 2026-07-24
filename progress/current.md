# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ — ✅ **las 11 features del PRD-01 están DONE**
- **Última tarea:** #11 `calculators` cerrada (APROBADA a la primera) → alcance funcional completo
- **Inicio:** _—_
- **Agente:** _—_

## Plan

- Crear `src/features/calculators/` autocontenida SIN `api/`, `schema.ts` ni rutas.
- `errors.ts`: `InvalidCalculatorInputError` (clase nombrada, estilo del repo).
- `increases.ts`: valida enteros positivos (P>0, A>0); `base=floor(P/A)`, `remainder=P%A`;
  string en español. Casos borde: `remainder=0` (solo tramo base, sin ×0), `P<A` (base=0 → fraseo alternativo), singular/plural de (×1).
- `rule-of-three.ts`: `ceil(skeinsA*lengthB/lengthA)`, valida entradas >0.
- `types.ts` + `index.ts` (barrel). Tests co-ubicados. Verificar `bash ./init.sh` + `pnpm build`.

## Bitácora

- **#1-#11 cerradas** + arquitectura de la capa de schema + smoke real contra Neon (ver `history.md`).
  **No quedan features pendientes**: el PRD-01 (estructura funcional) está completo.
- `bash ./init.sh` verde: lint, typecheck, **281 tests** en 30 archivos (el smoke queda skipped
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

## Próximo paso — fin del PRD-01 (decisión del usuario)

- **No hay más features en `feature_list.json`.** El alcance funcional (datos, BFF, lógica) está
  completo y verificado: 281 tests + smoke real contra Neon (6/6).
- **Pendiente operativo:** hay bastante trabajo sin commitear en el árbol (features #8 bugfix, #9,
  #10, #11 + el nuevo proceso de `informs/` + edición del arnés). Conviene un/varios commits limpios.
- **Siguiente fase (fuera del PRD-01):** UI / estilos / Three.js. Ver `visual.md` cuando se arranque.
  Antes de tocar UI, cablear Cloudinary como endpoint único (`POST /api/uploads/image`, deuda 3) y
  decidir la deuda 5 (lanas enlazadas en `GET /api/projects/:id`).

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
