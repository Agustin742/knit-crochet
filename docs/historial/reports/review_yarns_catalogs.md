# Review — feature #8 `yarns_catalogs`

**Veredicto:** APROBADO
**Fecha:** 2026-07-22
**Revisor:** reviewer (verificación propia, no copia del informe del implementer)

## 1. Verificación ejecutada (evidencia real)

### `bash ./init.sh` → exit 0
```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  23 passed (23)
      Tests  204 passed (204)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```
Punto de partida 169/20 → **204 tests / 23 archivos** (+35, 0 rotos). Coincide con lo declarado.

### `pnpm build` → Compiled successfully in 10.9s
Las 4 rutas nuevas quedan registradas:
- `ƒ /api/brands`
- `ƒ /api/brands/[id]/types`
- `ƒ /api/yarns`
- `ƒ /api/yarns/[id]`

### Scans
- Sin `console.log/debug`, sin `TODO/FIXME/HACK` en `src/features/yarns` ni `src/app/api/{brands,yarns}`.
- `package.json` / `pnpm-lock.yaml` sin cambios → cero dependencias nuevas.

## 2. Capas y arquitectura

- **Route handlers finos:** `brands/route.ts`, `brands/[id]/types/route.ts`, `yarns/route.ts`, `yarns/[id]/route.ts` solo parsean, validan con zod (`createBrandSchema`, `createYarnTypeSchema`, `createYarnSchema`, `updateYarnSchema`, `yarnFiltersSchema`, `forceFlagSchema`), delegan en el servicio y serializan. Sin lógica de negocio ni Drizzle en la capa app.
- **Lógica en `features/yarns/api/`:** un servicio por caso de uso; `assert-yarn-refs.ts` centraliza el scoping cruzado (helper legítimo, no duplica el chequeo entre create/update).
- **Drizzle aislado en `store.ts`:** único punto que toca `drizzle-orm`. La UI no toca DB.
- **Scoping por `userId` en TODA query:** `listBrands/findBrand`, `listYarns/findYarn/removeYarn/updateYarn` filtran por `userId`. `yarn_types` no tiene `userId`: el scoping se garantiza con `innerJoin(brands)` + `brands.userId` en `listYarnTypes`/`findYarnType`. Correcto.
- **Validación en el borde:** un esquema zod por endpoint. `colorFamily` con `z.enum(COLOR_FAMILIES)`; `image` como `z.url().nullable().optional()` (solo URL, Cloudinary NO cableado).
- **Sin secretos hardcodeados.**

## 3. Auditoría de las tres costuras

### Costura 1 — `DELETE /api/yarns/:id?force=` (VERIFICADA)
`delete-yarn.ts`: 404 si ajena/inexistente (`findYarn` scopeado) → sin `force` y referenciada → `YarnReferencedError(references)` (409 + `referencedBy`), **no borra nada** → con `force` borra `project_yarns` primero (`removeProjectReferences`) y luego la lana → sin refs, 204 directo.
- El filtrado de enlaces es **solo por `yarnId`**: `countProjectReferences`/`removeProjectReferences` filtran por `link.yarnId === yarnId`. Los tests (`yarn-service.test.ts:267-283` y `yarns-routes.test.ts:381-400`) crean un enlace de OTRA lana y comprueban que sobrevive tras el force. No arrastra enlaces ajenos.
- **El doble comparte de verdad el array:** `in-memory-store.ts:77` `const projectYarns = projects.links;` (misma referencia). `removeProjectReferences` usa `spliceMatching` (splice in-place, no reasigna). El `ProjectStore` doble expone `links` como const estable y `reset()` hace `links.length = 0` (mutación, no reasignación). El test de force es honesto, no mentiría.
- Tests de servicio y de ruta para los **tres** caminos (directo/bloqueado/force).

### Costura 2 — `unique(brandId, colorCode)` → 409 (VERIFICADA)
- Schema: `unique("yarns_brand_color_code_unique").on(brandId, colorCode)` — el nombre coincide con la constante `COLOR_CODE_CONSTRAINT` del store.
- Store real: `createYarn`/`updateYarn` capturan la violación (`isDuplicateColorCode`: SQLSTATE 23505 / constraint / mensaje) → `DuplicateColorCodeError`; `yarnErrorResponse` → 409. Nunca 500.
- Doble: simula unicidad in-memory en create (`some(brandId+colorCode)`) y en update (colisión con otra fila `id !== id`), lanzando el mismo error de dominio.
- Tests de duplicado en **create y update**, a nivel servicio (`:128`, `:210`) y ruta (`:221`, `:309`).

### Costura 3 — scoping cruzado create/update (VERIFICADA)
- `assertBrandAndType`: `brandId` debe ser marca del usuario → `BrandNotFoundError` (404); `typeId` debe existir y pertenecer a esa brand (join por `userId`) → `YarnTypeNotFoundError` (404). En update solo se revalida si cambia `brandId`/`typeId`.
- `POST /api/brands/:id/types` verifica la marca del usuario antes de crear (404 si ajena/inexistente).
- Tests de **rechazo** (no solo camino feliz): marca desconocida (`:100`), type de otra brand (`:113`), update a type inválido (`:187`), type bajo brand ajena/desconocida a nivel ruta (`brands-routes.test.ts:136`), y 404 create con brand/type ajenos (`yarns-routes.test.ts:192`).

## 4. Fuera de scope (respetado)
- **Sin DELETE/PATCH de Brand ni YarnType:** `brands/route.ts` y `brands/[id]/types/route.ts` solo exportan GET/POST; no existe `brands/[id]/route.ts`.
- **Cloudinary no cableado:** `image` es URL string.
- **Ningún `schema.ts` tocado ni migración nueva:** `git status` limpio en `src/features/**/schema.ts` (los cambios de cascada están commiteados en `34663b6`, previos a #8). El diff de trabajo de #8 son exactamente: `src/features/yarns/{api/**,types.ts,validation.ts,index.ts}` + `src/app/api/{brands,yarns}/**`.
- **`projects/api/store.ts` NO modificado:** confirmado por `git diff` vacío. El acceso cross-feature a `project_yarns` lo hace `yarns/api/store.ts` importando `@/features/projects/schema` (import directo del schema, con comentario justificando S1). No hubo ciclo: build + typecheck + 204 tests verdes.

## Checkpoints
- **C1** [x] — Arnés completo; `bash ./init.sh` exit 0.
- **C2** [x] — Feature 8 sigue `in_progress` en `feature_list.json` (única `in_progress`); el implementer NO la marcó `done`. Tests asociados verdes.
- **C3** [x] — Capas respetadas (UI sin DB, lógica en `features/yarns/api`, Drizzle en `store.ts`, handlers finos, scoping por `userId`); feature-first; sin deps nuevas; sin `console.log`/TODOs; sin secretos.
- **C4** [x] — Cada servicio con lógica no trivial tiene test (servicio + ruta); lint + typecheck verdes; 204/204 tests verdes.
- **C5** [x] — Informe del implementer presente; sin artefactos sospechosos entre los archivos de la feature.

## Observaciones no bloqueantes (para el líder)
1. **Deuda #6 (heredada, ya declarada):** la traducción del duplicado a `DuplicateColorCodeError` en el **store real** solo está verificada contra el doble. La ruta Postgres/Neon-http real no se ha ejercido (la app aún no habla con DB real). `isDuplicateColorCode` es defensiva (code/constraint/mensaje). Recomendado cubrir en el smoke test pendiente al integrar DB real.
2. **`tsconfig.tsbuildinfo`** aparece como modificado y trackeado (artefacto de build). No es de esta feature, pero conviene revisar si debería estar en `.gitignore` para no ensuciar los diffs (higiene C5).
3. `assert-yarn-refs.ts` no estaba en la lista literal del brief pero es un helper de servicio razonable; se exporta por el barrel `./api` (inocuo).
