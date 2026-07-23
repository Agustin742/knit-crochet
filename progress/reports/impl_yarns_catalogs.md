# Informe de implementación — #8 `yarns_catalogs`

**Estado:** implementada, lista para review. NO marcada `done` (la cierra el reviewer).
**Fecha:** 2026-07-22

## Alcance cubierto (contra el acceptance)

| Acceptance | Cubierto | Dónde |
|---|---|---|
| `GET/POST /api/brands` y `GET/POST /api/brands/:id/types` (jerárquico, por usuario) | ✅ | `src/app/api/brands/route.ts`, `src/app/api/brands/[id]/types/route.ts` |
| CRUD `/api/yarns` con filtros `?brandId=&typeId=&colorFamily=` | ✅ | `src/app/api/yarns/route.ts`, `src/app/api/yarns/[id]/route.ts` |
| `(brandId, colorCode)` único; `colorFamily` de la lista fija | ✅ | Costura 2 (abajo); `colorFamily` con `z.enum(COLOR_FAMILIES)` |
| DELETE de lana referenciada → 409 + advertencia; requiere `?force=true` | ✅ | Costura 1 (abajo) |
| `quantity` la gestiona el usuario; enlazar a proyecto NO descuenta stock | ✅ | `quantity`/`usedQuantity` enteros ≥ 0, default 0; el enlace no toca stock |
| Tests: CRUD, filtros, unicidad de colorCode, borrado con/sin force | ✅ | 35 tests nuevos (servicio + ruta) |

**Fuera de scope (respetado):** sin DELETE/PATCH de Brand ni YarnType; sin cablear
Cloudinary (`image` es `z.url().nullable().optional()`); sin tocar `schema.ts` ni
generar migración.

## Archivos creados

Feature `yarns`:
- `src/features/yarns/types.ts` — records ($infer), inputs, `YarnFilters`, `YarnPatch`.
- `src/features/yarns/validation.ts` — zod por endpoint (brand, type, yarn create/update, filtros, `forceFlagSchema`).
- `src/features/yarns/api/errors.ts` — `BrandNotFoundError`, `YarnTypeNotFoundError`, `YarnNotFoundError`, `DuplicateColorCodeError`, `YarnReferencedError` (con `referencedBy`).
- `src/features/yarns/api/store.ts` — `YarnStore` + `createYarnStore` (Drizzle).
- `src/features/yarns/api/assert-yarn-refs.ts` — scoping cruzado brand/type (reutilizado por create y update).
- `src/features/yarns/api/create-brand.ts`, `list-brands.ts`, `create-yarn-type.ts`, `list-yarn-types.ts`, `create-yarn.ts`, `list-yarns.ts`, `get-yarn.ts`, `update-yarn.ts`, `delete-yarn.ts`.
- `src/features/yarns/api/index.ts` — barrel de `./api`.
- `src/features/yarns/api/testing/in-memory-store.ts` — doble `createInMemoryYarnStore(projects?)`.
- `src/features/yarns/api/yarn-service.test.ts` — tests a nivel servicio.

Route handlers:
- `src/app/api/brands/route.ts`, `src/app/api/brands/[id]/types/route.ts`.
- `src/app/api/yarns/route.ts`, `src/app/api/yarns/[id]/route.ts`, `src/app/api/yarns/params.ts`.
- `src/app/api/brands/brands-routes.test.ts`, `src/app/api/yarns/yarns-routes.test.ts`.

## Archivos modificados

- `src/features/yarns/index.ts` — añadido `export * from "./api" | "./types" | "./validation"` (antes solo `./schema`).

**NO** se modificó `src/features/projects/api/store.ts` ni ningún otro archivo de projects
(ver "Ciclo de imports" abajo).

## Las tres costuras

**Costura 1 — `DELETE /api/yarns/:id?force=`** (`delete-yarn.ts`):
- 404 si no existe / es de otro usuario (`findYarn` scopeado por `userId`).
- `countProjectReferences(yarnId)` cuenta filas de `project_yarns`. Con referencias y
  sin `force` → `YarnReferencedError` (409, cuerpo `{ error, referencedBy: N }`), no
  borra nada. Con `force` → `removeProjectReferences(yarnId)` primero y luego
  `removeYarn`. Sin referencias → borra directo (204).
- Acceso cross-feature: `store.ts` importa `{ projectYarns } from "@/features/projects/schema"`
  (import directo del schema, con comentario; S1 restringe la capa de schema, no el store).
- Doble en memoria: `createInMemoryYarnStore(projects?)` comparte el array `projectYarns`
  con `projects.links` (misma referencia); `removeProjectReferences` hace `splice` in-place.

**Costura 2 — `unique(brandId, colorCode)` → 409** (`store.ts` + doble):
- `createYarn`/`updateYarn` del store real capturan la violación (SQLSTATE `23505` /
  constraint `yarns_brand_color_code_unique` / match en el mensaje) → `DuplicateColorCodeError`.
  `yarnErrorResponse` la traduce a 409. Nunca sube a 500.
- El doble simula la unicidad in-memory (rechaza insert/update que repita `(brandId, colorCode)`)
  lanzando el mismo error de dominio. Tests de duplicado en create y update, a nivel servicio y ruta.

**Costura 3 — scoping cruzado en create/update** (`assert-yarn-refs.ts`):
- `brandId` debe ser marca del usuario → `BrandNotFoundError` (404).
- `typeId` debe existir y pertenecer a esa `brandId` (join `yarn_types`⨝`brands` por `userId`)
  → `YarnTypeNotFoundError` (404). En update solo se revalida si cambia `brandId`/`typeId`.
- `POST /api/brands/:id/types` verifica la marca del usuario antes de crear (404 si no).

## Ciclo de imports (verificado empíricamente)

Añadir `export * from "./api"` a `yarns/index.ts` hace que `projects/api/store.ts`
(que importa `{ yarns } from "@/features/yarns"`) arrastre `yarns/api`, y `yarns/api/store`
importa `projects/schema`. **`pnpm build` (Compiled successfully), typecheck y los 204 tests
pasan sin cambios.** Los FK de Drizzle son closures perezosas y `projects/schema` no importa
`projects/api/store`, así que no hay ciclo que rompa. **No hizo falta** cambiar el import de
`projects/api/store.ts` a `@/features/yarns/schema`.

## Verificación

`bash ./init.sh` (final):
```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  23 passed (23)
      Tests  204 passed (204)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

`pnpm build`: `✓ Compiled successfully in 17.0s`. Rutas nuevas registradas:
`/api/brands`, `/api/brands/[id]/types`, `/api/yarns`, `/api/yarns/[id]`.

**Conteo de tests: 169 → 204** (+35 nuevos; 20 → 23 archivos). Cero tests rotos de los 169 de partida.

## Decisiones no obvias / notas para el reviewer

1. **`assert-yarn-refs.ts`** es un helper de servicio (no en la lista literal del brief)
   para no duplicar el scoping brand+type entre create y update. Se exporta por el barrel
   `./api` (inocuo). Alternativa era duplicar ~5 líneas.
2. **`yarns/params.ts`** (capa app) concentra `readYarnId`, `readQuery` (filtro de query
   vacío = sin filtro, calcado del `readFilters` de projects) y `yarnErrorResponse`
   (traductor de errores de dominio a 404/409). Los route handlers de brands NO importan
   de ahí: manejan `BrandNotFoundError` inline para quedar self-contained.
3. **`listYarns` ordena por `createdAt desc`** (no hay `startDate`); el doble replica ese orden.
4. **Detección de duplicado en el store real** es defensiva (código/constraint/mensaje) porque
   el driver Neon-http no está tipado para el shape del error. **Solo verificada contra el doble**
   (que imita la unicidad); la ruta Postgres real hereda la deuda #6 del proyecto (la app aún no
   ha hablado con una DB real). Recomendable incluirlo en el smoke test pendiente.
5. **`recommendedNeedle`** validado como `{ min, max }` con `max >= min`. `lot` con `z.coerce.date`.
6. `image` es URL string (`z.url().nullable().optional()`), consistente con `Project.image`;
   la deuda 3 (sanitización Cloudinary) **no aplica** porque no se cableó upload en esta feature.
