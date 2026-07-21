#!/usr/bin/env bash
# init.sh — Verificación e inicialización del entorno
#
# Este script lo ejecuta el agente al COMENZAR una sesión y antes de
# declarar cualquier tarea como `done`. Si falla, la sesión no debe avanzar.
#
# Adaptado a un proyecto Next.js/TypeScript. Mientras no exista package.json
# todavía, los pasos de Node se reportan como [WARN] (pendientes), no como fallo.
#
# Salida esperada: códigos de salida claros y bloques marcados con [OK]/[FAIL].

set -u
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()   { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }

EXIT_CODE=0

echo "── 1. Verificando entorno ─────────────────────────────"

if ! command -v node >/dev/null 2>&1; then
  fail "node no está instalado"
  exit 1
fi
ok "node -> $(node --version)"

if ! command -v pnpm >/dev/null 2>&1; then
  warn "pnpm no está disponible en PATH"
else
  ok "pnpm -> $(pnpm --version)"
fi

echo ""
echo "── 2. Verificando archivos base del arnés ──────────────"

for f in AGENTS.md feature_list.json progress/current.md docs/harness/architecture.md docs/harness/conventions.md docs/harness/verification.md CHECKPOINTS.md; do
  if [ ! -f "$f" ]; then
    fail "Falta archivo base: $f"
    EXIT_CODE=1
  else
    ok "Existe $f"
  fi
done

echo ""
echo "── 3. Validando feature_list.json ──────────────────────"

node - <<'JS'
const fs = require("fs");
try {
  const data = JSON.parse(fs.readFileSync("feature_list.json", "utf8"));
  const valid = new Set(["pending", "in_progress", "done", "blocked"]);
  const features = data.features || [];
  const inProgress = features.filter(f => f.status === "in_progress");
  if (inProgress.length > 1) {
    console.log(`[FAIL]  Hay ${inProgress.length} features en in_progress (máximo 1)`);
    process.exit(1);
  }
  for (const f of features) {
    if (!valid.has(f.status)) {
      console.log(`[FAIL]  Estado inválido en feature ${f.id}: ${f.status}`);
      process.exit(1);
    }
  }
  console.log(`[OK]    feature_list.json válido (${features.length} features)`);
} catch (e) {
  console.log(`[FAIL]  feature_list.json inválido: ${e.message}`);
  process.exit(1);
}
JS

if [ $? -ne 0 ]; then EXIT_CODE=1; fi

echo ""
echo "── 4. Verificación estática y tests (Node) ─────────────"

if [ ! -f "package.json" ]; then
  warn "package.json no existe todavía — pendiente el scaffold (feature 1). Se omiten lint/typecheck/tests."
else
  has_script() { node -e "const s=(require('./package.json').scripts)||{};process.exit(s['$1']?0:1)" 2>/dev/null; }

  if has_script lint; then
    if pnpm run -s lint; then ok "lint verde"; else fail "lint en rojo"; EXIT_CODE=1; fi
  else
    warn "sin script 'lint'"
  fi

  if has_script typecheck; then
    if pnpm run -s typecheck; then ok "typecheck verde"; else fail "typecheck en rojo"; EXIT_CODE=1; fi
  elif command -v pnpm >/dev/null 2>&1 && [ -f "tsconfig.json" ]; then
    if pnpm exec tsc --noEmit; then ok "tsc --noEmit verde"; else fail "typecheck (tsc) en rojo"; EXIT_CODE=1; fi
  else
    warn "sin typecheck configurado"
  fi

  if has_script test; then
    if pnpm test --silent; then ok "tests verdes"; else fail "hay tests rotos"; EXIT_CODE=1; fi
  else
    warn "sin script 'test' todavía"
  fi
fi

echo ""
echo "── 5. Resumen ──────────────────────────────────────────"

if [ $EXIT_CODE -eq 0 ]; then
  ok "Entorno listo. Puedes empezar a trabajar."
else
  fail "Entorno NO está listo. Resuelve los errores antes de avanzar."
fi

exit $EXIT_CODE
