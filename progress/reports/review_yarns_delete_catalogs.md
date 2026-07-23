# Review — feature #8 `yarns_catalogs` (ampliación: DELETE marca/tipo)

**Veredicto:** APPROVED
**Fecha:** 2026-07-22
**Alcance revisado:** los dos DELETE bloqueantes de catálogos
(`DELETE /api/brands/:id`, `DELETE /api/brands/:id/types/:typeId`).

## Verificación reproducida (no copiada del informe)

- `bash ./init.sh` → **exit 0**. lint verde, typecheck verde,
  **Test Files 23 passed / Tests 219 passed**. Coincide con el punto de partida
  204 → 219 (+15: 7 servicio + 8 ruta), 0 rotos, sigue en 23 archivos.
- `pnpm build` → `✓ Compiled successfully`. Rutas nuevas **registradas**:
  `ƒ /api/brands/[id]` y `ƒ /api/brands/[id]/types/[typeId]` (junto a las de #8 base).
- Sin dependencias nuevas (`package.json`/`pnpm-lock.yaml` sin cambios).
- Sin `console.*`, `TODO/FIXME`, secretos ni `process.env` en los archivos nuevos.

## Capas / convenciones

- Handlers finos: `[id]/route.ts` y `[id]/types/[typeId]/route.ts` solo parsean
  ids (zod vía `readBrandId`/`readBrandTypeIds` → `brandIdSchema`/`yarnTypeIdSchema`),
  delegan en el servicio y traducen el error con `brandErrorResponse`. Cero lógica.
- Lógica en `features/yarns/api/delete-brand.ts` y `delete-yarn-type.ts`.
- Drizzle SOLO en `store.ts` (5 métodos nuevos). El doble en memoria replica la
  semántica. Scoping por `userId` donde la tabla lo tiene (`yarns`, `brands`);
  `countBrandTypes`/`removeYarnType` van por `brandId` porque `yarn_types` no
  tiene `userId` y la propiedad ya se validó antes (mismo patrón que `listYarnTypes`).
- 404 (nunca 403) para recurso ajeno/inexistente/id malformado. Errores de dominio
  nombrados y tipados; 409 con contadores en el cuerpo.

## Semántica crítica (auditada, decisión de producto respetada)

- **409 SIN `?force`, SIN cascada** (distinto del DELETE de lana que sí tiene force).
  Confirmado: no se añadió `?force` ni cascada a marca/tipo.
- Marca: 404 si ajena/inexistente/malformada; con tipos O lanas → 409
  `{ error, types, yarns }` sin borrar; sin hijos → 204 y desaparece.
- Tipo: 404 si ajeno/inexistente **o si no pertenece a la marca de la URL**
  (`findYarnType` valida tipo→marca→usuario por join); con lanas → 409
  `{ error, yarns }` sin borrar; sin hijos → 204.
- **Conteo ANTES del delete**: en ambos servicios se cuenta y se lanza el 409
  antes de llamar a `removeBrand`/`removeYarnType`. Las FKs `yarn_types→brands`,
  `yarns→brands`, `yarns→yarn_types` son NO ACTION (verificado en
  `features/yarns/schema.ts`: `.references()` sin `onDelete`), por lo que el 500
  de Postgres es imposible por diseño: el 409 lo intercepta. Alineado con la tabla
  de `architecture.md §"Capa de schema"`.
- **No hay cascada**: `removeBrand` borra solo la fila de `brands` (WHERE userId+id);
  `removeYarnType` solo la fila de `yarn_types` (WHERE brandId+id). No tocan otras
  marcas/tipos/usuarios.

## Honestidad de los tests

- Servicio (`yarn-service.test.ts`) y ruta (`brands-routes.test.ts`) cubren los
  TRES caminos (204 / 409 / 404) en AMBOS endpoints.
- 409: el test comprueba que la fila **SIGUE** (`store.brands`/`store.types` con
  longitud 1) y verifica los contadores exactos (`types`/`yarns`).
- 204: comprueba que **DESAPARECIÓ** (longitud 0).
- 404: comprueba que **nada se borró** (longitud 1), incl. el caso "tipo que no
  pertenece a la marca de la URL" y "tipo bajo marca ajena". No son tautológicos.

## Fuera de scope (respetado)

- `schema.ts` NO tocado (no aparece en `git status`; sigue committeado).
- No se generó migración por esta ampliación.
- DELETE de lana (`delete-yarn.ts`, `?force=true`) y demás endpoints intactos;
  sus tests siguen verdes.
- Archivos tocados: solo `src/features/yarns/**` (delete-brand, delete-yarn-type,
  store, in-memory-store, errors, validation, api/index barrel, tests) +
  `src/app/api/brands/**` (params.ts helper + 2 route.ts nuevos + tests).

## Checkpoints
- C1: [x] Arnés completo; `bash ./init.sh` exit 0.
- C2: [x] Solo la feature 8 en `in_progress`; el implementer NO la marcó `done`.
- C3: [x] Capas respetadas (handler fino, lógica en api/, Drizzle en store, zod en
  borde, scoping por userId); feature-first; sin deps nuevas; sin console/TODO/secretos.
- C4: [x] Cada módulo nuevo con test (servicio + ruta); lint/typecheck/tests verdes (219).
- C5: [x] Sin artefactos sospechosos; feature 8 en su estado correcto (`in_progress`).

## Cambios requeridos
Ninguno.

## Notas menores (no bloquean, para la deuda ya conocida)
1. Duplicación menor consciente de `readBrandId`/`brandNotFound` entre
   `src/app/api/brands/params.ts` (nuevo, compartido) y el `types/route.ts`
   existente. El implementer optó por no refactorizar código ya aprobado de #8;
   correcto para el scope. Unificar cuando se toque ese handler.
2. Deuda #6 heredada: el store real (Neon) aún no se ejerce end-to-end; solo el
   doble en memoria. El 409-antes-de-borrar depende de que las FKs sigan NO ACTION
   (lo están). Recomendado cubrir en el smoke real contra Neon antes del cierre de #8.
