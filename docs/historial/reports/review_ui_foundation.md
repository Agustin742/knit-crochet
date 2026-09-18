# Review — feature 12 `ui_foundation`

**Veredicto:** APROBADO

Base del design system (tokens → `@theme`, fuentes `next/font`, `cn()`,
primitivos Button/Field/Input/Card). Acceptance cumplido punto por punto,
cero hardcode real, `init.sh` y `pnpm build` verdes, a11y y arquitectura OK.

## Verificación ejecutable (corrida por el revisor)

- `bash ./init.sh` → **VERDE (exit 0)**: lint OK, typecheck OK.
  - Tests: **312 passed | 6 skipped (318)** en 34 files + 1 skipped.
    Baseline backend (281) intacto; +31 nuevos de UI/guardrail. ≥ 281 ✓.
- `pnpm build` → **OK**: Next 16 compila `@theme`, `next/font` resuelve las 3
  familias, tabla de rutas generada sin errores.

## Acceptance (feature 12)

1. **Tokens portados a `globals.css` vía `@theme`** ✓ — verificado categoría por
   categoría contra `template/tokens.css`, ninguna falta:
   marca (6), roles (14), folder tones (5 + 2 emboss), tipografía
   (`--font-display/body/mono/emphasis`, `--text-xs..--text-hero` incl.
   `--text-hero`), leading (tight/base/ascii), tracking (wide/label), espaciado
   (`--space-1..12`), radios (none/sm/md + `--radius-tab`), bordes
   (width/heavy/color), sombras (hard/hard-lg/glow/glow-lg/paper), texturas
   (paper/lace/dots-dark), movimiento (dur + ease), z-index (bg-3d..toast),
   breakpoints (mobile/tablet/desktop), `--touch-target`. Nombres SDD §5 verbatim.
   El bloque alias `--color-*` NO introduce valores nuevos (solo referencia los
   tokens de rol/marca para generar utilidades `bg-*/text-*/border-*`): aceptable.
2. **Fuentes `next/font`** ✓ — `layout.tsx` usa `next/font/google` (Instrument
   Serif → display/emphasis, Archivo variable → body, IBM Plex Mono → mono).
   Variables mapeadas en `@theme` (`--font-* : var(--font-instrument-serif)…`).
   Sin `@import` ni requests externos de fuentes.
3. **`cn()` = `twMerge(clsx(...))`** ✓ — `src/shared/ui/lib/cn.ts` exacto.
4. **Primitivos** ✓ — Button y Card con `cva` en `<name>.variants.ts`; Field
   (wrapper a11y con `useId`) + Input (`inputClasses`, sin eje de variante →
   `cva` no aplica, aceptable). Estados focus-visible y disabled presentes en
   Button e Input (outline por `--focus`, disabled con `--surface-sunken`/`--fg-muted`).
5. **Verificación SDD §9** ✓ — RTL + `user-event` + smoke + `axe` sin violaciones
   en los 3 primitivos; guardrail `no-hardcode.test.ts`; init.sh + build verdes.

## Token-first / cero hardcode (regla dura)

- `no-hardcode.test.ts` escanea los **6** archivos de componente/variantes
  (Button.tsx, button.variants.ts, Card.tsx, card.variants.ts, **Field.tsx**,
  **Input.tsx**) contra hex, `rgb()/rgba()` y `px` crudos. Cobertura completa,
  ningún archivo de componente queda fuera.
- Revisión manual: no hay hex/rgb/px/z-index numérico suelto. Los offsets de
  hover/active y el anillo de error usan `calc()`/`color-mix()` **sobre tokens**
  (`--border-width`, `--danger`) — adaptación válida, no valores inventados.
- Adaptaciones de valores crudos del template a la escala de tokens
  (padding→`--space-*`, disabled→`--fg-muted`, anillo error→`color-mix`) son
  ACEPTABLES por RFC-01 (template = insumo adaptable) y SDD (manda token-first).

## No romper lo existente

- `vitest.config.ts` mantiene `environment: "node"` por defecto; los tests de UI
  declaran `// @vitest-environment happy-dom` por archivo. `setupFiles` global
  solo registra matchers jest-dom + `toHaveNoViolations` (vitest-axe/matchers no
  arrastra axe-core); el runner `axe` se importa solo en tests happy-dom. Sin
  contaminación del entorno node. 281 tests de backend siguen verdes.

## A11y (SDD §9)

- Field asocia `label htmlFor` ↔ control `id` (clon con `cloneElement`),
  `aria-invalid` y `aria-describedby` con el mensaje de error/hint ✓.
- Foco visible por token `--focus` en Button e Input ✓.
- Targets ≥ `--touch-target` (`min-h-[var(--touch-target)]`) ✓.
- `axe` sin violaciones en Button (5 variantes), Field (valid+error), Card ✓.

## Arquitectura feature-first

- Design system en `src/shared/ui/` (lib/primitives/testing). Presentación pura:
  sin fetch, sin rutas, sin backend, no importa de `features/`. API pública por
  barrels (`index.ts` por carpeta + `primitives/index.ts` + `shared/ui/index.ts`) ✓.

## Convenciones

- PascalCase componentes, `<name>.variants.ts`, carpetas kebab-case, comillas
  dobles, imports con alias `@/`, TS strict sin `any`. Todo conforme.

## Checkpoints (CHECKPOINTS.md)

- C1 — El arnés está completo: [x] (archivos base presentes, init.sh exit 0)
- C2 — El estado es coherente: [x] (0 features in_progress; feature 12 `done` con
  tests que pasan; `progress/current.md` describe la sesión)
- C3 — El código respeta la arquitectura: [x] (UI pura sin DB; feature-first;
  deps nuevas justificadas en el informe; sin console.log/TODO; sin secretos)
- C4 — La verificación es real: [x] (tests por primitivo + guardrail; lint +
  typecheck + 312 tests verdes)
- C5 — La sesión se cerró bien: [x] (sin artefactos sospechosos; feature 12 en
  `done`. Nota menor no bloqueante: falta entrada en `progress/history.md` de esta
  sesión — corresponde al cierre del leader, no al implementer)

## Cambios requeridos

Ninguno. Aprobado.
