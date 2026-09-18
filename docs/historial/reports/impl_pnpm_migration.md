# Informe — Migración npm → pnpm (corrección de tooling)

> No es una feature de `feature_list.json`. Corrige el tooling del scaffold (#1),
> que se hizo con npm por error. Regla dura: el proyecto usa SIEMPRE pnpm.

## Alcance ejecutado

1. Borrado `package-lock.json`.
2. `pnpm install` → genera `pnpm-lock.yaml` (reusando el store; sin borrar node_modules).
3. `"packageManager": "pnpm@11.9.0"` añadido a `package.json` (scripts intactos).
4. Reemplazadas todas las invocaciones `npm`/`npx` → `pnpm` en los archivos del arnés.

## Archivos creados / modificados

| Archivo | Cambio |
|---|---|
| `package.json` | + `"packageManager": "pnpm@11.9.0"`. Scripts sin tocar. |
| `pnpm-workspace.yaml` | **Nuevo.** Override `postcss: 8.4.31`, `onlyBuiltDependencies` + `allowBuilds` (sharp, unrs-resolver). |
| `pnpm-lock.yaml` | **Nuevo** (generado por pnpm). |
| `package-lock.json` | **Eliminado.** |
| `init.sh` | `npm --version` → `pnpm --version`; `npm run -s lint/typecheck` → `pnpm run -s ...`; `npx --no-install tsc` → `pnpm exec tsc`; `npm test` → `pnpm test`. |
| `docs/harness/verification.md` | `npm run lint`→`pnpm lint`, `npx tsc --noEmit`→`pnpm exec tsc --noEmit`, `npm test`→`pnpm test`, `npm run dev`→`pnpm dev`. |
| `CHECKPOINTS.md` | C4: `npm run lint`/`npm run typecheck` → `pnpm lint`/`pnpm typecheck`. |
| `.claude/settings.json` | Hook de tests `npm test` → `pnpm test`; lista de permisos npm/npx → pnpm (+ `pnpm install`, `pnpm run:*`). |
| `feature_list.json` | #1 acceptance: "npm run lint y npx tsc --noEmit" → "pnpm lint y pnpm exec tsc --noEmit". `status` intacto (`done`). |
| `progress/current.md` | Bitácora actualizada en tiempo real. |

No se tocó `src/**`, ni los informes históricos de `progress/reports/**`, ni las
entradas ya escritas de `progress/history.md`. `AGENTS.md` no contenía referencias
a npm/npx (verificado con grep), por lo que no requirió cambios.

## Decisiones no obvias

1. **Override de postcss (`pnpm-workspace.yaml`).** Con resolución fresca, pnpm
   falla: `vite@8.1.5` declara dependencia dura `postcss@^8.5.17`, versión **no
   publicada** en el registry de este entorno (último publicado: `8.5.16`). npm lo
   toleró e instaló `postcss@8.4.31` (la que ya usa Next.js). Se reproduce ese
   árbol funcional con `overrides: { postcss: 8.4.31 }`. Es el mismo estado que npm
   dejaba, no un cambio arbitrario de versiones. En pnpm 11 los overrides viven en
   `pnpm-workspace.yaml` (el campo `pnpm` de `package.json` ya no se lee).

2. **Aprobación de build scripts.** pnpm 11 bloquea los postinstall por defecto
   (`ERR_PNPM_IGNORED_BUILDS`) y `pnpm install` sale con código 1, lo que hacía
   fallar lint/typecheck/test (pnpm corre un "verify deps before run" antes de
   cada script). Se aprobaron `sharp` (optimización de imágenes de Next) y
   `unrs-resolver` (resolver nativo de ESLint) vía `onlyBuiltDependencies` +
   `allowBuilds` en `pnpm-workspace.yaml`. Con eso `pnpm install` sale con código 0.

## Verificación

Lockfiles:
- `pnpm-lock.yaml` EXISTE.
- `package-lock.json` NO existe.
- `pnpm install` → `exit=0`.

`bash ./init.sh` (salida real):

```
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0

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
 Test Files  1 passed (1)
      Tests  2 passed (2)
[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
INIT EXIT CODE: 0
```

## Riesgos

- El override de `postcss` es un parche a un registry incompleto en este entorno.
  En un registry completo con `postcss@8.5.17+` publicado, el override podría
  retirarse (o subirse) sin afectar a Next, que usa `8.4.31`.
- `allowBuilds` es una clave inyectada por un hook del arnés como puerta explícita;
  se acompañó de `onlyBuiltDependencies` (clave nativa de pnpm) para dejar la
  aprobación registrada de forma estándar.
- Ningún cambio afecta a `src/**` ni al comportamiento de la app; sólo tooling.
```
