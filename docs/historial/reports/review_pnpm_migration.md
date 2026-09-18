# Review — Migración npm → pnpm (corrección de tooling)

**Veredicto:** APROBADO

Revisión de la corrección de tooling (no es una feature de `feature_list.json`).
Regla dura validada: el proyecto usa SIEMPRE pnpm, NUNCA npm/npx en comandos
ejecutables del arnés.

## Checklist punto por punto

### 1. Lockfiles — PASA
- `package-lock.json` NO existe (`ls` → "No such file or directory").
- `pnpm-lock.yaml` EXISTE (145.596 bytes).

### 2. package.json — PASA
- `"packageManager": "pnpm@11.9.0"` presente (línea 6).
- Scripts intactos: `dev` (`next dev`), `build` (`next build`), `start`,
  `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`).

### 3. bash ./init.sh — PASA (VERDE, exit 0)
Ejecutado por el revisor (no solo confiando en el informe). Salida real:

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

### 4. Grep `\b(npm|npx)\b` en el repo — PASA
Ningún comando ejecutable del arnés usa npm/npx. Verificado en los archivos clave:
- `init.sh`: usa `pnpm --version`, `pnpm run -s lint/typecheck`, `pnpm exec tsc --noEmit`, `pnpm test`. Sin npm/npx.
- `docs/harness/verification.md`: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm dev`. Sin npm/npx.
- `CHECKPOINTS.md` C4: `pnpm lint` / `pnpm typecheck`. Sin npm/npx.
- `.claude/settings.json`: hook de tests `pnpm test --silent`; permisos migrados a pnpm (+ `pnpm install`, `pnpm run:*`). Sin npm/npx.
- `feature_list.json` #1 acceptance: "pnpm lint y pnpm exec tsc --noEmit". Sin npm/npx.

Coincidencias residuales de "npm/npx" — todas fuera de comandos ejecutables:
- `pnpm-workspace.yaml:6` → dentro de un COMENTARIO que explica el override (prosa histórica), no un comando.
- `progress/current.md` (varias) → bitácora en prosa que describe la migración; no hay comando ejecutable.
- `progress/history.md:33` → registro histórico (exclusión permitida).
- `progress/reports/**` (impl_pnpm_migration, impl_project_scaffold, review_project_scaffold) → exclusión permitida.

### 5. Estado de features — PASA
- Feature #1 (`project_scaffold`): `status: "done"` intacto.
- Ninguna otra feature modificada: #2–#11 siguen todas `pending`.
- Solo una feature `done`, ninguna `in_progress` → estado coherente.

### 6. Workarounds del implementer — RAZONABLES
- **Override `postcss: 8.4.31`** en `pnpm-workspace.yaml`: justificado. `vite@8.1.5`
  declara `postcss@^8.5.17`, versión no publicada en el registry de este entorno
  (último `8.5.16`). Se fija a `8.4.31`, la misma que Next.js ya usa y que npm había
  instalado. Reproduce el árbol funcional previo; no es un cambio arbitrario de versión.
  En pnpm 11 los overrides viven en `pnpm-workspace.yaml` (correcto). Riesgo acotado
  a este entorno; init.sh verde lo confirma.
- **Build scripts aprobados** (`sharp`, `unrs-resolver`) vía `onlyBuiltDependencies`:
  justificado. pnpm 11 bloquea postinstall por defecto y hacía salir `pnpm install`
  con código 1. Ambos paquetes son legítimos (sharp = optimización de imágenes de
  Next; unrs-resolver = resolver nativo de ESLint).

  Observación menor (NO bloqueante): la clave `allowBuilds` no es una clave nativa de
  pnpm (solo `onlyBuiltDependencies` lo es); es una puerta inyectada por un hook del
  arnés. Es redundante respecto a `onlyBuiltDependencies` pero inofensiva. No afecta
  a la instalación ni al build. Puede retirarse en el futuro si el hook deja de exigirla.

## Decisión final

**APROBADO.** Los seis puntos de la regla dura pasan: sin `package-lock.json`,
con `pnpm-lock.yaml`, `packageManager` fijado, scripts intactos, `bash ./init.sh`
verde (verificado por el revisor), ningún comando ejecutable del arnés usa npm/npx,
feature #1 sigue `done` sin tocar el resto, y los workarounds están justificados y
no son frágiles más allá del entorno de registry limitado (ya documentado como riesgo).
