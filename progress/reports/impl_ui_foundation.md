# Informe de implementación — feature 12 `ui_foundation`

> Base del design system (Fase 2 / UI): tokens → Tailwind v4 `@theme`, fuentes
> `next/font`, `globals.css`, layout raíz, helper `cn()` y los 3 primitivos base
> (Button, Field/Input, Card). Alcance EXACTO del brief; Emphasis, ArchiveNav,
> BottomNav y capa 3D quedan para features 13/14 (no tocados).

## Resultado de verificación

- `bash ./init.sh` → **verde** (exit 0): lint OK, typecheck OK, tests OK.
- Tests: **312 passed | 6 skipped** (35 files). Baseline previo: 281 passed → los
  281 de backend siguen intactos (entorno `node` sin cambios) + **31 nuevos** de UI/guardrail.
- `pnpm build` → **OK** (Next 16 + Turbopack; next/font descargó las 3 familias; Tailwind v4 compiló `@theme`).
- Cero hardcode: enforced por test (`no-hardcode.test.ts`) que escanea los 6 archivos de componente/variantes
  y falla ante hex, `rgb()/rgba()` o `px` crudos.

## Stack instalado (pnpm)

Runtime UI:
- `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3`
- `class-variance-authority@0.7.1`, `tailwind-merge@3.6.0`, `clsx@2.1.1`

Testing (devDeps):
- `@testing-library/react@16.3.2`, `@testing-library/user-event@14.6.1`,
  `@testing-library/jest-dom@7.0.0`, `happy-dom@20.11.1`
- `vitest-axe@0.1.0` (+ `axe-core@4.12.1`) — integración axe elegida y **verificada empíricamente**
  con vitest 4 (ver decisiones).

## Archivos creados

- `postcss.config.mjs` — plugin `@tailwindcss/postcss`. Sin `tailwind.config.*` (v4 = tokens por `@theme`).
- `src/app/globals.css` — `@import "tailwindcss"` + bloque `@theme` con **todos** los tokens de
  `template/tokens.css` (nombres SDD §5) + alias `--color-*` (para utilidades `bg-*/text-*/border-*`) +
  mapeo `--font-*` a las variables de next/font + estilos base (body con `--bg`/`--texture-dots-dark`,
  `::selection`, media `prefers-reduced-motion` global).
- `src/shared/ui/lib/cn.ts` — `cn(...) = twMerge(clsx(...))`.
- `src/shared/ui/primitives/button/{Button.tsx,button.variants.ts,index.ts,Button.test.tsx}`
- `src/shared/ui/primitives/field/{Field.tsx,Input.tsx,index.ts,Field.test.tsx}`
- `src/shared/ui/primitives/card/{Card.tsx,card.variants.ts,index.ts,Card.test.tsx}`
- `src/shared/ui/primitives/index.ts`, `src/shared/ui/index.ts` — API pública (barrels).
- `src/shared/ui/primitives/no-hardcode.test.ts` — guardrail token-first (env node).
- `src/shared/ui/testing/vitest-axe.d.ts` — augment de `vitest` con el matcher `toHaveNoViolations`.
- `vitest.setup.ts` — registra matchers de jest-dom + `toHaveNoViolations`.

## Archivos modificados

- `src/app/layout.tsx` — `next/font/google`: Instrument Serif (400 + normal/italic) → `--font-instrument-serif`;
  Archivo (variable) → `--font-archivo`; IBM Plex Mono (400/500/600) → `--font-ibm-plex-mono`.
  Clases `.variable` aplicadas al `<html>`; `import "./globals.css"`.
- `vitest.config.ts` — añadido `setupFiles: ["./vitest.setup.ts"]`; **default sigue `environment: "node"`**
  (no rompe backend). Los tests de UI declaran `// @vitest-environment happy-dom` por archivo.
- `package.json` / `pnpm-lock.yaml` — dependencias arriba.
- `feature_list.json` — feature 12 → `done` (init.sh + build verdes).

## Decisiones no obvias

1. **Fuentes next/font.** Instrument Serif e IBM Plex Mono son estáticas (verificado en la metadata de
   next/font) → requieren `weight` explícito. Archivo es **variable** (ejes wght+wdth) → se omite `weight`
   para cubrir todo el rango 400–800 sin que next/font falle. La familia real llega por la variable
   generada y el token `--font-*` la antepone al fallback genérico (reconciliando el fallback hardcodeado
   de `tokens.css`).

2. **Alias `--color-*` en `@theme`.** Los tokens de rol del SDD (`--accent`, `--fg`, `--border`, …) no
   viven en el namespace de color de Tailwind, así que **no** generarían utilidades. Se añadió un bloque de
   alias `--color-<rol>: var(--<rol>)` que **no introduce valores nuevos** (solo referencia los tokens de
   arriba) y habilita utilidades limpias (`bg-accent`, `text-fg`, `border-border`) sin ambigüedad de tipo.
   Los nombres SDD §5 siguen presentes verbatim para consumidores vía `var(--token)`.

3. **Adaptación de valores crudos del template a tokens (RFC-01 §Fuente de verdad: template = insumo
   adaptable).** El template hardcodea algunos px (padding `10px 24px`, `font-size 15px`, sombras `1px 1px`,
   `#A8937B` disabled, `rgba(198,67,47,.15)` del anillo de error). Se **snapean al scale de tokens**:
   padding → `--space-6`/`--space-3`; font → `--text-base`/`--text-lg`; offsets de hover/active y outline →
   `--border-width`/`--border-width-heavy` (vía `calc()`); disabled text → `--fg-muted`; anillo de error →
   `color-mix(in srgb, var(--danger) 15%, transparent)`. Diferencias visuales mínimas, cero hardcode.

4. **Integración axe en vitest 4.** `vitest-axe/matchers` **no** arrastra `axe-core` (solo `chalk`), por lo
   que registrarlo en el setup global es seguro también para el entorno `node`. El runner `axe` (que sí
   necesita DOM) se importa **solo** dentro de los tests de UI (happy-dom). El tipo del matcher se augmenta
   con `declare module "vitest"` (el `Vi` namespace del paquete no aplica en vitest 4).

5. **`Field` es Client Component** (`"use client"`): usa `useId` para el cableado a11y
   (`htmlFor`/`id`, `aria-invalid`, `aria-describedby`) clonando el control hijo. Button/Input quedan
   agnósticos (usables en server o client).

## Costura resuelta durante el build

`globals.css` rompía el build con `CssSyntaxError: Unknown word` porque un comentario contenía la secuencia
`bg-*/text-*` — el `*/` cerraba el comentario CSS antes de tiempo. Se reescribió el comentario sin `*/`.
Registrado para no repetirlo en futuros bloques de tokens comentados.

## Deuda / notas para features siguientes

- Breakpoints portados como `--bp-*` (nombres SDD). Para variantes responsive de Tailwind (nav de la
  feature 13) habrá que exponerlos también en el namespace `--breakpoint-*`.
- Quedan primitivos del inventario SDD §6 sin portar (IconButton, Textarea, Select, Toggle, Badge, Tabs,
  Dialog, Tooltip, Toast, Emphasis, Progress, Skeleton, Spinner) — fuera del alcance de esta feature.
