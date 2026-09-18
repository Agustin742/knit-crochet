# Informe de implementación — Feature #1 `project_scaffold`

Scaffold Next.js 16 (App Router, TS strict) con estructura feature-first y tooling
de verificación (lint + typecheck + test) en verde.

## Archivos creados / modificados

### Configuración raíz
- `package.json` — scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`.
  Deps: `next ^16.2.10`, `react/react-dom ^19.2.0`, `zod ^4.4.3`.
  DevDeps: `typescript ^5.9.3`, `eslint ^9`, `eslint-config-next ^16.2.10`,
  `vitest ^4.1.10`, `@types/{node,react,react-dom}`.
- `tsconfig.json` — `strict: true`, `noUncheckedIndexedAccess`, alias `@/*` → `./src/*`,
  plugin `next`. (Next reconfiguró automáticamente `jsx: react-jsx` en el primer build;
  cambio estándar y esperado.)
- `next.config.ts` — config vacía tipada (`NextConfig`).
- `eslint.config.mjs` — flat config consumiendo el array nativo de `eslint-config-next` v16.
- `vitest.config.ts` — entorno `node`, alias `@`, include `src/**/*.{test,spec}.{ts,tsx}`.
- `next-env.d.ts` — generado por Next (no editar).
- `.env.example` — plantilla de variables (DATABASE_URL, JWT_SECRET, Cloudinary) para
  features posteriores. `.gitignore` ya cubría `node_modules`, `.next`, `.env*`
  (con excepción `!.env.example`), no requirió cambios.

### Estructura feature-first (`src/`)
- `src/app/layout.tsx` — RootLayout (`lang="es"`, metadata en español).
- `src/app/page.tsx` — HomePage mínima que consume `@/shared/config`.
- `src/shared/config/index.ts` — `APP_NAME` (primer módulo compartido real).
- `src/shared/config/index.test.ts` — **smoke test**: valida `APP_NAME` y que Zod
  parsea/rechaza correctamente (cubre acceptance "Zod disponible" con evidencia).
- `src/features/.gitkeep`, `src/shared/{db,lib,ui}/.gitkeep` — carpetas estructurales
  versionadas (se poblarán en features #2+).

## Decisiones no obvias

1. **Test runner: Vitest 4.** Encaja con Next 16 + TS strict + ESM sin `ts-node`,
   arranque rápido y `vitest run` no-watch ideal para `init.sh`/CI. Se prefirió a
   Jest (menor fricción de config ESM/TS).
2. **ESLint flat config nativo.** El intento inicial con `FlatCompat` +
   `compat.extends("next/...")` rompía con `TypeError: Converting circular structure
   to JSON` porque `eslint-config-next` v16 ya exporta un flat config array. Se pasó a
   `import next from "eslint-config-next"` y `...next`. Se eliminó `@eslint/eslintrc`
   por quedar sin uso (scaffold mínimo).
3. **Scope respetado.** No se añadió Drizzle/Neon, auth, Cloudinary ni endpoints
   (features #2+). `.env.example` solo documenta variables futuras; no hay código
   que las consuma todavía.

## Verificación — `bash ./init.sh` (salida real)

```
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.11.1
[OK]    npm -> 11.6.2

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (11 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde

 RUN  v4.1.10 C:/_dev/projects/knit-crochet
 Test Files  1 passed (1)
      Tests  2 passed (2)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
FINAL EXIT: 0
```

Adicional: `npm run build` termina en verde (rutas `/` y `/_not-found` prerenderizadas).

## Riesgos / pendientes

- `next-env.d.ts` (committeado) importa `./.next/types/routes.d.ts`, que vive bajo
  `.next/` (gitignored). En un checkout limpio sin `.next`, un `tsc --noEmit` directo
  podría fallar hasta que se ejecute `next dev`/`next build` (que regenera esos tipos).
  Comportamiento estándar de Next 16; en este árbol de trabajo `.next` existe y
  `init.sh` pasa. A tener en cuenta si el reviewer parte de un clon limpio: correr
  `npm install && npm run build` (o `next dev`) antes del typecheck.
- `npm audit`: 2 vulnerabilidades moderadas transitivas (heredadas del toolchain de
  Next/ESLint). No se aplicó `audit fix --force` para no forzar cambios breaking en
  el scaffold; revisar en una tarea de mantenimiento.
- Mapeo acceptance → evidencia:
  1. Scripts dev/build/lint/typecheck/test → `package.json`. ✅
  2. Next 16 App Router + `strict: true` → `tsconfig.json` + `src/app/`. ✅
  3. Estructura `src/{app,features,shared/{db,lib,config,ui}}` → creada y versionada. ✅
  4. Zod instalado y disponible → dep + smoke test que lo ejercita. ✅
  5. lint + `tsc --noEmit` pasan + test de humo verde → `init.sh` exit 0. ✅
  6. `.gitignore` cubre node_modules/.next/.env* + `.env.example` → verificado. ✅
```
