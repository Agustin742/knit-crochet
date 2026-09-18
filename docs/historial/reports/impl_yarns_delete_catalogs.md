# Informe de implementación — #8 `yarns_catalogs` (ampliación: DELETE marca/tipo)

**Estado:** implementada, lista para review. NO marcada `done` (la cierra el reviewer).
**Fecha:** 2026-07-22
**Alcance:** SOLO los dos DELETE de catálogos que faltaban en el acceptance original.
Nada del resto de #8 se tocó.

## Semántica de los dos DELETE (decisión de producto 2026-07-22)

**Bloquear con 409, SIN `?force`, SIN cascada.** Distinto del DELETE de lana
(que sí tiene `?force=true`). El conteo de hijos ocurre SIEMPRE antes del
`delete`, porque las FKs `yarn_types→brands`, `yarns→brands`, `yarns→yarn_types`
son `ON DELETE no action` a propósito (borrar con hijos daría 500 de Postgres).
`schema.ts` NO se tocó y no se generó migración.

### `DELETE /api/brands/:id` (`src/app/api/brands/[id]/route.ts`)
- 404 si la marca no existe o es de otro usuario (`findBrand` scopeado por `userId`;
  404 nunca 403). Id malformado → 404 (no 400), igual que el resto.
- Con hijos (algún `yarn_type` con ese `brandId` **O** alguna `yarn` con ese
  `brandId`) → **409** `BrandReferencedError`, cuerpo `{ error, types: N, yarns: M }`.
  **No borra nada.**
- Sin hijos → borra la marca → **204**.

### `DELETE /api/brands/:id/types/:typeId` (`src/app/api/brands/[id]/types/[typeId]/route.ts`)
- 404 si el tipo no existe, no pertenece a esa `:id` de marca, o la marca no es del
  usuario (`findYarnType` valida la cadena tipo→marca→usuario con el join existente).
- Con hijos (alguna `yarn` con ese `typeId`) → **409** `YarnTypeReferencedError`,
  cuerpo `{ error, yarns: M }`. **No borra nada.**
- Sin hijos → borra el tipo → **204**.

## Archivos creados

- `src/features/yarns/api/delete-brand.ts` — servicio fino (verifica propiedad,
  cuenta tipos y lanas, lanza 409 o borra), calcado de `delete-yarn.ts`.
- `src/features/yarns/api/delete-yarn-type.ts` — ídem para el tipo (cuenta lanas).
- `src/app/api/brands/params.ts` — helper de capa app compartido por las 2 rutas
  nuevas: `readBrandId`, `readBrandTypeIds`, `brandNotFound`, `yarnTypeNotFound` y
  `brandErrorResponse` (traductor de dominio → 404/409, análogo a `yarnErrorResponse`).
- `src/app/api/brands/[id]/route.ts` — `DELETE` fino.
- `src/app/api/brands/[id]/types/[typeId]/route.ts` — `DELETE` fino.

## Archivos modificados

- `src/features/yarns/api/errors.ts` — añadidos `BrandReferencedError` (con
  `types`/`yarns`) y `YarnTypeReferencedError` (con `yarns`). `BrandNotFoundError`
  y `YarnTypeNotFoundError` REUTILIZADOS para los 404.
- `src/features/yarns/api/store.ts` — añadidos al `YarnStore` (interfaz + impl
  Drizzle): `countBrandTypes`, `countBrandYarns`, `removeBrand`, `countTypeYarns`,
  `removeYarnType`. Conteos scopeados por `userId` donde la tabla lo tiene
  (`yarns`); `countBrandTypes`/`removeYarnType` van por `brandId` (la marca ya se
  verificó como del usuario en el servicio; `yarn_types` no tiene `userId`).
- `src/features/yarns/api/testing/in-memory-store.ts` — mismos 5 métodos replicados
  en memoria (conteo y splice) para que los tests no dependan de Postgres.
- `src/features/yarns/api/index.ts` — barrel: exporta `delete-brand` y `delete-yarn-type`.
- `src/features/yarns/validation.ts` — añadido `yarnTypeIdSchema = z.uuid()` para
  parsear `:typeId` (id inválido → 404, no 400), junto a `brandIdSchema` reutilizado.
- `src/features/yarns/api/yarn-service.test.ts` — nuevos `describe` para `deleteBrand`
  y `deleteYarnType` (7 tests de servicio).
- `src/app/api/brands/brands-routes.test.ts` — nuevos `describe` para los 2 DELETE
  (8 tests de ruta), con helpers `deleteRequest`, `typeContext`, `seedYarn`.

## Tests (los tres caminos por endpoint)

- **409 bloqueado:** marca con tipo → `types:1,yarns:0`; marca con tipo+lana →
  `types:1,yarns:1`; tipo con lana → `yarns:1`. En todos, la fila sobrevive.
- **204 limpio:** marca sin hijos → 204, desaparece; tipo sin lanas → 204, desaparece.
- **404:** marca ajena/inexistente/malformada; tipo que no pertenece a la marca de
  la URL; tipo bajo marca ajena. Nada se borra.

## Verificación (salida real)

`bash ./init.sh`:
```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  23 passed (23)
      Tests  219 passed (219)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```
**Conteo: 204 → 219 (+15; 7 servicio + 8 ruta). 0 tests rotos.** Sigue en 23 archivos
(los tests nuevos se sumaron a `yarn-service.test.ts` y `brands-routes.test.ts`).

`pnpm build`: `✓ Compiled successfully in 9.9s`. Rutas nuevas registradas:
`ƒ /api/brands/[id]` y `ƒ /api/brands/[id]/types/[typeId]`.

## Decisiones no obvias / notas para el reviewer

1. **`src/app/api/brands/params.ts` es nuevo** (antes brands no tenía capa params:
   el `types/route.ts` maneja `BrandNotFoundError` inline con su propio `readBrandId`).
   NO refactoricé ese handler existente (fuera de scope); las 2 rutas nuevas usan el
   helper compartido. Queda una duplicación menor de `readBrandId`/`brandNotFound`
   entre el helper y `types/route.ts` — dejarlo así evita tocar código aprobado de #8.
2. **Scoping del conteo:** `countBrandYarns`/`countTypeYarns` filtran por `userId`
   (la tabla `yarns` lo tiene) además de por `brandId`/`typeId`. `countBrandTypes`
   va solo por `brandId` porque `yarn_types` no tiene `userId` y la marca ya se
   validó como del usuario antes de contar (mismo patrón que `listYarnTypes`).
3. **`removeYarnType(brandId, typeId)`** borra por `(brandId, id)`: como el servicio
   ya validó la cadena con `findYarnType`, el `brandId` extra es defensa en profundidad.
4. **Deuda #6 heredada:** los conteos/borrados del store real solo se ejercen contra
   el doble en memoria (que los imita); la ruta Neon real aún no se ha probado. El
   409-antes-de-borrar depende de que las FKs sigan siendo `no action` (lo están en
   `schema.ts`). Recomendado cubrir en el smoke real contra Neon.
