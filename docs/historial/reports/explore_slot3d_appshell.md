# Explore — Punto de enchufe del `<ascii-yarn>` en lo construido por #12 y #13

> Informe del subagente `Explore` (solo lectura). Persistido por el leader porque el
> agente no tenía herramientas de escritura.

## 1. El slot 3D reservado

`src/shared/ui/layout/app-shell/AppShell.tsx:36-46` (literal):

```tsx
      {/* Slot de la capa 3D (feature 14 monta aquí el <ascii-yarn>). Detrás del
          contenido y sin capturar eventos. */}
      <div
        aria-hidden="true"
        data-slot="bg-3d"
        className="pointer-events-none fixed inset-0 [z-index:var(--z-bg-3d)]"
      />

      <ArchiveNav items={items} user={user} onLogout={onLogout} />

      <main className="relative flex-1 [z-index:var(--z-base)]">{children}</main>
```

- Raíz (l.34): `cn("relative flex min-h-dvh flex-col bg-bg", className)`.
- Props actuales (l.8-18): `children`, `items`, `user`, `onLogout`, `className`. **No hay prop
  para inyectar el 3D**; el div está vacío.
- Gancho de query para el test: `data-slot="bg-3d"` (no hay `id` ni `test-id`).

**Cómo se enchufaría** (ninguno implementado):
1. Añadir `background?: ReactNode` a `AppShellProps` y renderizarlo dentro del div del slot,
   pasándolo desde `AppShellClient` (ya es `'use client'`). Ojo: `AppShell.tsx` está en la lista
   del test de no-hardcode.
2. Reemplazar el div por el host 3D directamente — rompe "presentación pura" salvo que el host
   viva en `shared/ui/three/`.

Cadena de montaje: `src/app/layout.tsx:38-47` (RootLayout, server, fuentes) →
`src/app/(app)/layout.tsx:5-7` → `src/features/auth/ui/AppShellClient.tsx:53-57` → `AppShell`.
`AppShell` no lleva `'use client'` pero solo se consume desde un client component, así que
`dynamic(..., { ssr: false })` es legal ahí (no lo sería desde un Server Component).

## 2. Tokens en `src/app/globals.css` (todo dentro de `@theme`)

**Z-index (l.163-169)**: `--z-bg-3d: 0`, `--z-base: 1`, `--z-nav: 100`, `--z-overlay: 200`,
`--z-modal: 300`, `--z-toast: 400`. Uso siempre por arbitrary property:
`[z-index:var(--z-nav)]` (AppShell.tsx:41,46; ArchiveNav.tsx:48; BottomNav.tsx:30).

**Tipografía / ASCII (l.83-102)**: `--font-mono: var(--font-ibm-plex-mono), "Courier New",
monospace` (utilidad `font-mono`); `--font-display`, `--font-body`, `--font-emphasis`;
`--text-xs 11px` … `--text-hero 76px`; **`--leading-ascii: 1`** (l.100, token dedicado);
`--leading-tight 1.1`, `--leading-base 1.55`; `--tracking-wide 2px`, `--tracking-label 1px`.

**Color (l.12-33 crudos, 62-81 alias `--color-*`)**: rol `--bg` (= `--brand-espresso`),
`--fg-inverse` (= `--brand-cream`), `--fg-inverse-muted`, `--accent` (= `--brand-pink` `#e4649b`),
`--accent-fg`, `--focus`; marca `--brand-pink|green|yellow|brown|cream|espresso`; alias
`--color-accent`, `--color-bg`, … (→ `text-accent`, `bg-bg`). Glow: `--shadow-glow:
0 0 18px rgba(228,100,155,.6)`, `--shadow-glow-lg` (l.129-130). Texturas: `--texture-dots-dark`,
`--texture-paper`, `--texture-lace`.

**Movimiento (l.155-161)**: `--dur-fast 120ms`, `--dur-base 200ms`, `--dur-slow 320ms`,
`--ease-standard|entrance|exit`.

**Breakpoints (l.171-181)**, dos familias con valores idénticos: `--bp-mobile|tablet|desktop` =
640/768/1180px y `--breakpoint-mobile|tablet|desktop` (namespace Tailwind v4 → variantes
`mobile:`/`tablet:`/`desktop:`, usadas en ArchiveNav.tsx:45 `tablet:flex` y BottomNav.tsx:27
`tablet:hidden`). Comentario l.176-178: deben ser literales porque las media queries no resuelven
`var()`. Para degradar el 3D en mobile: variantes `tablet:`/`desktop:` o `--bp-*` en `matchMedia`.

Otros: `--touch-target: 44px`, `--radius-*`, `--border-width: 2px` / `--border-width-heavy: 3px`.

## 3. Regla de cero hardcode

Archivo único: `src/shared/ui/primitives/no-hardcode.test.ts` (50 líneas, entorno `node`).

Patrones prohibidos (l.26-28):
```ts
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_COLOR = /\brgba?\(/;
const PX_LITERAL = /\b\d+(?:\.\d+)?px\b/;
```
Mecanismo: `readFileSync` del texto crudo de cada archivo de una **lista fija** (l.12-24):
`button/Button.tsx`, `button/button.variants.ts`, `card/Card.tsx`, `card/card.variants.ts`,
`field/Field.tsx`, `field/Input.tsx`, `../layout/app-shell/AppShell.tsx`,
`../layout/archive-nav/ArchiveNav.tsx`, `archive-nav.variants.ts`,
`../layout/bottom-nav/BottomNav.tsx`, `bottom-nav.variants.ts`.

Conclusiones para #14:
- **`src/shared/ui/three/**` NO está cubierto hoy** (lista explícita, no glob). Lo esperable es
  que el review de #14 exija añadirlo.
- **Sí cubre estilos inline** (chequeo textual): `style={{ color: "#E4649B" }}` o
  `fontSize: "12px"` fallarían. Un host 3D típico (width/height px, color hex) rompería el test.
- Escapes viables: números sin unidad (`fontSize: 12`), custom properties
  (`style={{ ["--x"]: "var(--space-4)" }}`), leer el color con `getComputedStyle(el)
  .getPropertyValue("--accent")`. `rgba(...)` también prohibido → nada de `new THREE.Color("rgb(...)")`.
- **Si se toca `AppShell.tsx` para la prop del slot, ese archivo ya está en la lista**.
- Sin regla ESLint equivalente (`eslint.config.mjs` = `eslint-config-next` + ignores).

## 4. Patrón de componentes cliente

- `src/features/auth/ui/AppShellClient.tsx:1-58`: `"use client"` en l.1, sufijo **`Client`**, vive
  en `features/<x>/ui/`, hace el fetch (`/api/auth/me` l.27, `/api/auth/logout` l.47) y el routing
  (`useRouter().push("/login")` l.50). Docblock l.13-18: "costura entre el design system
  (presentación pura) y el backend… `AppShell` sólo recibe datos y callbacks".
- `shared/ui` es presentación pura pero **puede** ser `'use client'` cuando necesita hooks:
  `ArchiveNav.tsx:1` y `BottomNav.tsx:1` lo llevan por `usePathname`. `AppShell.tsx` no.
- `cn()` obligatorio: `src/shared/ui/lib/cn.ts:4` (`twMerge(clsx(inputs))`), reexportado en
  `src/shared/ui/index.ts:1`; se fusiona último.
- Variantes `cva` en `<name>.variants.ts` aparte.
- Barrels `index.ts` por carpeta, agregados en `layout/index.ts` y `shared/ui/index.ts`. Un
  `three/index.ts` debería seguir el patrón, **pero exportarlo desde el barrel raíz arrastraría
  three.js a todo importador** — evaluar.
- `docs/harness/conventions.md:82-87`: "Solo `shared/ui/three/**` importa `three`/R3F, siempre
  client-only (`dynamic`, `ssr:false`)… congela con `prefers-reduced-motion`. Nunca bloquea el
  primer render."

## 5. Plantilla de test de UI

Config: `vitest.config.ts` → `include: ["src/**/*.{test,spec}.{ts,tsx}"]`, `environment: "node"`
por defecto, `setupFiles: ["./vitest.setup.ts"]` (registra `toHaveNoViolations` de vitest-axe +
`@testing-library/jest-dom/vitest`), alias `@` → `./src`.

Ejemplos: `src/shared/ui/layout/layout.test.tsx` (151 l.), `src/features/auth/ui/
AppShellClient.test.tsx` (92), `src/shared/ui/primitives/button/Button.test.tsx` (90).

```tsx
// @vitest-environment happy-dom            // ← obligatorio, línea 1
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: pushMock }) }));
// fetch: vi.stubGlobal("fetch", mockFetch()) en beforeEach + vi.unstubAllGlobals() en afterEach
afterEach(cleanup);
```

Convenciones: aserciones sobre roles/aria (`getByRole`, `aria-current`), `describe("a11y (axe)")`
final con `expect(await axe(container)).toHaveNoViolations()`. Patrón de motion
(`layout.test.tsx:122-129`): **no se testea animación**, se testea que las clases son token-based
y que la media global degrada.

## 6. `prefers-reduced-motion`

**No existe hook ni helper JS**; `matchMedia` no aparece en ningún archivo de `src/`. Lo único es
la media global `src/app/globals.css:208-217`:

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Mata CSS animations/transitions pero **no** un loop `requestAnimationFrame` → #14 necesita
detección JS propia (`window.matchMedia("(prefers-reduced-motion: reduce)")` + listener).
