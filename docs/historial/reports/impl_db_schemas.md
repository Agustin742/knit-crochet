# Informe implementer — Feature #3 `db_schemas`

Estado: implementada, lista para review (NO marcada `done`).

## Alcance cubierto (acceptance)

- [x] Enums en `shared/config`: `CraftType`, `ProjectStatus`, `ColorFamily` con los valores EXACTOS del PRD §4.
- [x] Schemas Drizzle de las 8 entidades: `User`, `Project`, `ProjectYarn`, `Pattern`, `Brand`, `YarnType`, `Yarn`, `CraftSession`.
- [x] Relaciones/constraints: FKs por `userId`, PK compuesta de `ProjectYarn`, único `(brandId, colorCode)`, `patternId` nullable, `User.email` único.
- [x] Migración inicial generada con `pnpm db:generate` → `drizzle/0000_cold_marrow.sql`.
- [x] Tests de forma/constraints (vitest) usando `getTableConfig`.

## Archivos creados

- `src/shared/db/enums.ts` — `pgEnum` (`craftTypeEnum`, `projectStatusEnum`, `colorFamilyEnum`) construidos desde los arrays de `shared/config`.
- `src/features/auth/schema.ts` (`users`) + `src/features/auth/index.ts`
- `src/features/patterns/schema.ts` (`patterns`) + `index.ts`
- `src/features/yarns/schema.ts` (`brands`, `yarnTypes`, `yarns`) + `index.ts`
- `src/features/projects/schema.ts` (`projects`, `projectYarns`) + `index.ts`
- `src/features/time-tracking/schema.ts` (`craftSessions`) + `index.ts`
- `src/shared/config/enums.test.ts` — valores exactos de los enums.
- `src/shared/db/schema.test.ts` — barrel, pgEnums, FKs por userId, PK compuesta, único (brandId,colorCode), nullables.
- `drizzle/0000_cold_marrow.sql` + snapshot en `drizzle/meta/` (generado por drizzle-kit).

## Archivos modificados

- `src/shared/config/index.ts` — añadidos arrays `as const` + tipos TS (`CRAFT_TYPES`/`CraftType`, `PROJECT_STATUSES`/`ProjectStatus`, `ACTIVE_PROJECT_STATUSES`, `COLOR_FAMILIES`/`ColorFamily`). Se conserva `APP_NAME`.
- `src/shared/db/schema.ts` — barrel: re-exporta enums + los 5 `schema.ts` de features (fuente única para drizzle-kit).

NO se tocó `src/shared/db/index.ts` (cliente) ni `drizzle.config.ts`.

## Decisiones de diseño (no obvias)

- **Fuente única de valores de enum**: los strings viven una sola vez en `shared/config` (arrays `as const`). Los `pgEnum` de Drizzle se construyen a partir de esos arrays en `shared/db/enums.ts`. Se separó `pgEnum` de `config` para no meter dependencia de Drizzle en `config` (que es TS puro) y porque un mismo enum (`craft_type`) lo usan dos features (Project y Pattern): definirlo una vez evita colisión de nombre de tipo en Postgres.
- **Cross-schema FKs vía `index.ts`**: cada feature expone su schema por `index.ts`; las referencias FK importan `@/features/<x>` (no rutas internas), respetando `conventions.md`. Sin ciclos (auth ← todos; projects → auth/patterns/yarns; time-tracking → auth/projects).
- **Tipos JSON**: `needles`/`completedSteps` como `jsonb $type<number[]>` (needles admiten decimales en mm; steps son índices); `instructions`/`metadata` como `jsonb $type<{key,value}[]>`; `recommendedNeedle` como `jsonb $type<{min,max}>` notNull. Default `'[]'::jsonb` en arrays.
- **Tipos numéricos**: `quantity`/`usedQuantity`/`rounds`/`targetRounds`/`progress`/`time`/`duration` como `integer`; `length`/`thickness` como `real` (admiten decimales). `progress` es columna (el cálculo/clamp lo hará el servicio de la feature #6, fuera de scope aquí).
- **Defaults sensatos** para no romper inserciones futuras: `status` default `in_progress`, contadores a 0, `notes` a `""`, `inLibrary` false. `startDate`/`start`/`createdAt`/`updatedAt` con `defaultNow()`.
- **drizzle-kit resuelve el alias `@/`**: `db:generate` siguió los imports con alias sin config extra. Verificado (8 tablas, SQL válido).

## Verificación — `bash ./init.sh`

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
 Test Files  4 passed (4)
      Tests  26 passed (26)
[OK]    tests verdes
── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

`pnpm db:generate`: `8 tables` → `drizzle/0000_cold_marrow.sql` generado sin errores. SQL contiene: 3 `CREATE TYPE` (enums), `users_email_unique`, `project_yarns_project_id_yarn_id_pk` (PK compuesta), `yarns_brand_color_code_unique`, y FKs `*_user_id_users_id_fk` en patterns/brands/yarns/projects/craft_sessions + `pattern_id` nullable.

## Notas para el reviewer / riesgos

- La migración no se aplicó contra una DB real (no requerido; `generate` no necesita conexión). Aplicabilidad validada por la forma del SQL, no por ejecución en Postgres.
- `progress` se persiste como columna pero su recálculo/clamp pertenece a la feature #6 (CRUD Project); aquí solo se define el schema.
- No hay `ON DELETE`/`ON CASCADE` explícito (drizzle usa `no action`). La regla de borrado de lana referenciada (409 + `?force=true`) es lógica de servicio de la feature #8, no un constraint de DB.
