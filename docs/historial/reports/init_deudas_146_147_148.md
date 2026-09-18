# Salida real de `bash ./init.sh` — deudas 146/147/148 (2026-08-18)

Redirigida a archivo, no por tubería. `EXIT_CODE=0`. Extensión `.md` y no `.log`
porque `.gitignore:32` ignora `*.log` y esta salida es la evidencia, así que tiene
que quedar versionada.

```
── 1. Verificando entorno ─────────────────────────────
[0;32m[OK][0m    node -> v24.11.1
[0;32m[OK][0m    pnpm -> 11.9.0

── 2. Verificando archivos base del arnés ──────────────
[0;32m[OK][0m    Existe AGENTS.md
[0;32m[OK][0m    Existe feature_list.json
[0;32m[OK][0m    Existe progress/current.md
[0;32m[OK][0m    Existe docs/harness/architecture.md
[0;32m[OK][0m    Existe docs/harness/conventions.md
[0;32m[OK][0m    Existe docs/harness/verification.md
[0;32m[OK][0m    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (33 features)

── 4. Verificación estática y tests (Node) ─────────────
[0;32m[OK][0m    lint verde
[0;32m[OK][0m    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  78 passed | 3 skipped (81)
      Tests  1347 passed | 13 skipped (1360)
   Start at  21:37:03
   Duration  74.18s (transform 5.63s, setup 55.25s, import 62.67s, tests 42.94s, environment 24.74s)

[0;32m[OK][0m    tests verdes

── 5. Resumen ──────────────────────────────────────────
[0;32m[OK][0m    Entorno listo. Puedes empezar a trabajar.
```
