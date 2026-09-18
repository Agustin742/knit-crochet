# Review — feature #3 `db_schemas`

**Veredicto: APROBADO**

Revisado contra `docs/harness/architecture.md`, `conventions.md`, `verification.md`,
`CHECKPOINTS.md` y `docs/product/PRD-01-estructura-funcional.md` §4 y §5.

## Checklist del acceptance (punto por punto)

### 1. Enums en `shared/config` con valores EXACTOS del PRD §4 — [x]
`src/shared/config/index.ts`:
- `CRAFT_TYPES` = `["knitting", "crochet"]` ✓ (§4)
- `PROJECT_STATUSES` = `["in_progress", "paused", "finished", "abandoned"]` ✓ (§4)
- `COLOR_FAMILIES` = 13 valores exactos y en orden: red, orange, yellow, green,
  blue, violet, pink, brown, gray, black, white, neutral, multicolor ✓ (§4)
- Extra correcto: `ACTIVE_PROJECT_STATUSES` = `["in_progress","paused"]`, el
  subconjunto "activo" del PRD §4. Tipos TS derivados con `as const`.
- Fuente única: los `pgEnum` (`src/shared/db/enums.ts`) se construyen desde esos
  arrays, sin duplicar strings ni meter Drizzle en `config` (TS puro). Correcto.

### 2. Los 8 schemas existen, feature-first y fieles al PRD §4.1–§4.7 — [x]
- `User` → `features/auth/schema.ts`: id uuid pk, email unique/notNull,
  passwordHash, name, createdAt/updatedAt notNull defaultNow. ✓ (§4.1)
- `Project` → `features/projects/schema.ts`: todos los campos §4.2 incl.
  `needles`/`completedSteps` como `jsonb $type<number[]>` default `'[]'`,
  `image`/`endDate`/`patternId` nullables, `status` default `in_progress`,
  contadores/time integer default 0, `notes` default "". ✓ (§4.2)
- `ProjectYarn` → `features/projects/schema.ts`: PK COMPUESTA `(project_id, yarn_id)`,
  sin columna de cantidad. ✓ (§4.6)
- `Pattern` → `features/patterns/schema.ts`: instructions/metadata como
  `jsonb $type<{key,value}[]>` notNull default `'[]'`, `inLibrary` boolean
  default false, `image` nullable. ✓ (§4.3)
- `Brand` + `YarnType` + `Yarn` → `features/yarns/schema.ts`: Brand(id,userId,name);
  YarnType(id,brandId,name); Yarn con todos los campos §4.5 incl.
  `recommendedNeedle` como `jsonb $type<{min,max}>` notNull, `length`/`thickness`
  como `real` (decimales), `lot` timestamp, `image` nullable, quantity/usedQuantity
  integer default 0. ✓ (§4.4/§4.5)
- `CraftSession` → `features/time-tracking/schema.ts`: id,userId,projectId,
  start defaultNow, `end` nullable, duration integer. ✓ (§4.7)

### 3. Relaciones y constraints §5/§4 — [x]
- FKs por `userId` en patterns, brands, yarns, projects, craft_sessions → users. ✓
- `ProjectYarn` PK compuesta `(projectId, yarnId)`, sin cantidad. ✓
- `Yarn` único `(brandId, colorCode)` → `yarns_brand_color_code_unique`. ✓
- `User.email` único → `users_email_unique`. ✓
- `patternId` nullable FK → patterns. ✓
- Cadena Brand→YarnType→Yarn: yarnTypes.brandId→brands; yarns.brandId→brands,
  yarns.typeId→yarnTypes. ✓
- Project→CraftSession: craft_sessions.projectId→projects. ✓
- Cross-feature FKs importadas por `index.ts` público (no rutas internas),
  respetando `conventions.md`. Sin ciclos.
- Nota (no bloqueante): no hay `ON DELETE CASCADE` (drizzle usa `no action`). La
  regla de borrado de lana referenciada (409 + `?force=true`) es lógica de
  servicio de la feature #8, no un constraint de DB. Consistente con el PRD.

### 4. Migración inicial generada y aplicable, sin drift — [x]
- `drizzle/0000_cold_marrow.sql` presente + snapshot en `drizzle/meta/`.
- `pnpm db:generate` ejecutado por el reviewer → **"8 tables ... No schema changes,
  nothing to migrate"** (sin drift, sin errores; no requiere DATABASE_URL).
- SQL contiene 3 `CREATE TYPE` (enums), `users_email_unique`,
  `project_yarns_project_id_yarn_id_pk` (PK compuesta),
  `yarns_brand_color_code_unique`, y las 12 FKs con `pattern_id` nullable.

### 5. Tests de forma/constraints — [x]
- `src/shared/config/enums.test.ts`: valores exactos de los 3 enums + subconjunto activo.
- `src/shared/db/schema.test.ts`: barrel exporta las 8 tablas + 3 pgEnums, pgEnums
  espejan config, email único, FKs por userId, patternId nullable, PK compuesta de
  ProjectYarn (y ausencia de columnas extra), único (brandId,colorCode), nullables
  (end_date, image, craftSessions.end). Estilo consistente (`getTableConfig`).

### 6. Aislamiento Drizzle (ningún componente importa Drizzle) — [x]
Grep de `drizzle-orm` en `src/`: solo aparece en `shared/db/*` y en los 5
`features/<x>/schema.ts` (+ el test). Cero imports en `src/app/**`. ✓

## Verificación ejecutada por el reviewer
- `bash ./init.sh` → **VERDE**: lint OK, typecheck OK, **26 tests passed (4 files)**.
- `pnpm db:generate` → **8 tables, sin drift** ("nothing to migrate").
- pnpm usado en todo momento (nunca npm/npx).

## Estado de la feature
- `feature_list.json` #3 sigue en `in_progress` (NO marcada `done` por el
  implementer). Correcto — el cierre lo decide el leader tras esta aprobación.

## Checkpoints (CHECKPOINTS.md)
- C1: [x] arnés completo, init.sh exit 0.
- C2: [x] una sola feature in_progress (#3); features done con tests verdes; current.md describe la sesión activa.
- C3: [x] feature-first respetado; Drizzle aislado en shared/db + features; sin deps nuevas; sin console.log/secretos. (Route handlers no aplican a esta feature de solo-schema.)
- C4: [x] módulos con lógica tienen test; lint + typecheck + 26 tests verdes.
- C5: [x] sin artefactos sospechosos; estado reflejado correctamente.

## Cambios requeridos
Ninguno.
