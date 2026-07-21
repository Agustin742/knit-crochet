# Bitácora histórica (append-only)

> Cada vez que se cierra una sesión, su resumen se añade aquí.
> No edites entradas anteriores. Solo añades al final.

---

## 2026-07-20 — Bootstrap del arnés
- **Agente:** Claude (setup del sistema multi-agente)
- **Cambios:** estructura del arnés adaptada a Next.js/TS (AGENTS.md, CLAUDE.md,
  CHECKPOINTS.md, init.sh, feature_list.json, docs/harness/{architecture,
  conventions,verification}.md, .claude/agents/, .claude/settings.json).
- **Estado del proyecto:** greenfield, sin código todavía (feature 1 = scaffold pendiente).
- **Próximo:** implementar feature 1 (`project_scaffold`).

## 2026-07-20 — Reorganización de docs + alineación con el PRD
- **Agente:** Claude.
- **Cambios:** `docs/` reorganizado en `docs/harness/` (architecture, conventions,
  verification) y `docs/product/` (PRD-01). Docs del arnés alineados a la
  arquitectura feature-first del PRD (src/{app,features,shared}, proxy.ts, zod,
  Next 16). `feature_list.json` reconstruido con 11 features derivadas del §12 del
  PRD (con `prd_ref`). PRD ampliado con §0 (proceso de agentes) y §12 mapeado a
  feature IDs. Todas las referencias de rutas actualizadas; `bash ./init.sh` verde.
- **Próximo:** implementar feature 1 (`project_scaffold`).

## 2026-07-20 — Feature #1 `project_scaffold` (DONE)
- **Agente:** leader (orquesta) → implementer → reviewer (APROBADO).
- **Cambios:** scaffold Next.js 16 (App Router, TS strict); scripts
  dev/build/lint/typecheck/test; estructura feature-first
  `src/{app,features,shared/{db,lib,config,ui}}` versionada con `.gitkeep`; Zod
  instalado; **Vitest** como runner (2 smoke tests verdes); `.gitignore` +
  `.env.example`. `eslint-config-next` v16 usa flat config nativo (FlatCompat
  rompía). `bash ./init.sh` y `npm run build` verdes.
- **Informes:** `progress/reports/impl_project_scaffold.md`,
  `progress/reports/review_project_scaffold.md`.
- **Cambio de proceso:** los informes de subagentes ahora viven en
  `progress/reports/`; se añade entrada a `history.md` al cerrar **cada feature**,
  no solo al cerrar sesión.
- **Próximo:** feature #2 `db_setup_drizzle_neon`.

## 2026-07-20 — Corrección de tooling: migración npm → pnpm (DONE)
- **Agente:** leader → implementer → reviewer (APROBADO).
- **Motivo:** regla dura del usuario — el proyecto usa SIEMPRE **pnpm**, NUNCA
  npm/npx. El scaffold (#1) se hizo con npm por error. Guardado en memoria.
- **Cambios:** borrado `package-lock.json`; `pnpm install` → `pnpm-lock.yaml`;
  `package.json` con `"packageManager": "pnpm@11.9.0"`. Migrados a pnpm:
  `init.sh`, `docs/harness/verification.md`, `CHECKPOINTS.md`,
  `.claude/settings.json` y el `acceptance` de la feature #1 en `feature_list.json`
  (status de #1 intacto = done). Workarounds: override `postcss: 8.4.31` en
  `pnpm-workspace.yaml` (vite 8 exigía postcss no publicado en el registry del
  entorno) y aprobación de build scripts `sharp` + `unrs-resolver`.
- **Informes:** `progress/reports/impl_pnpm_migration.md`,
  `progress/reports/review_pnpm_migration.md`. `bash ./init.sh` verde.
- **Próximo:** feature #2 `db_setup_drizzle_neon`.

## 2026-07-20 — Feature #2 `db_setup_drizzle_neon` (DONE)
- **Agente:** leader (research con context7) → implementer → reviewer (APROBADO).
- **Research:** el leader consultó **context7** (`/drizzle-team/drizzle-orm-docs` +
  `/neondatabase/serverless`) contra el stack real (Next 16.2, TS 5.9, ESM, pnpm) →
  `progress/reports/research_drizzle_neon.md`, usado como fuente por el implementer.
- **Cambios:** deps `drizzle-orm` + `@neondatabase/serverless`, dev `drizzle-kit`
  (todo con pnpm). Cliente Drizzle `neon-http` en `src/shared/db` (lazy Proxy +
  `MissingDatabaseUrlError` si falta `DATABASE_URL`), barrel `shared/db/schema.ts`
  vacío (entidades reales = #3), `drizzle.config.ts` (dialect postgresql, schema
  feature-first, out `./drizzle` versionado), `DATABASE_URL` en `.env.example`,
  scripts `db:generate`/`db:migrate`. Test Vitest (init con env + error nombrado).
  Workaround: `onlyBuiltDependencies`/`allowBuilds` en `pnpm-workspace.yaml` para
  el build script de esbuild bajo pnpm 11.
- **Verificación:** `bash ./init.sh` verde (6 tests); `pnpm exec drizzle-kit
  generate` EXIT 0; aislamiento de Drizzle confirmado (nada fuera de shared/db lo
  importa). Sin invadir #3.
- **Informes:** `progress/reports/impl_db_setup_drizzle_neon.md`,
  `progress/reports/review_db_setup_drizzle_neon.md`.
- **Próximo:** feature #3 `db_schemas`.
