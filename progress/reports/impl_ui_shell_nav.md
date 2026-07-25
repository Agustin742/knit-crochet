# Impl report — feature #13 `ui_shell_nav`

**AppShell + ArchiveNav + BottomNav + route groups `(app)`/`(auth)`.** Fase 2 / UI.
Design system (feature #12) reusado; nada reimplementado.

## Resultado de verificación

- `bash ./init.sh` → **TODO VERDE** (lint verde, typecheck verde, tests verdes).
- Tests: **338 passed | 6 skipped (344 total, 37 files)** — antes 312; +26 nuevos, previos intactos.
- `pnpm build` → **OK** (Next 16 valida route groups + client/server boundaries + next/font + Tailwind v4).
  `/` queda estático dentro del `(app)` layout (envuelto por `AppShellClient`).
- Cero hardcode confirmado: `no-hardcode.test.ts` extendido para escanear los 5 archivos
  nuevos de `layout/` (AppShell, ArchiveNav(+variants), BottomNav(+variants)).

## Archivos creados

**Design system — `src/shared/ui/layout/` (presentación PURA):**
- `nav-items.ts` — tipo `NavItem`, `NAV_ITEMS` (6 rutas en orden) y helper `isRouteActive(pathname, href)`
  (raíz `/` sólo exacta; resto coincide con la ruta o subruta).
- `app-shell/AppShell.tsx` (+ `index.ts`) — header (ArchiveNav) + `<main>` + BottomNav + slot 3D
  `aria-hidden` en `--z-bg-3d` (placeholder de feature 14; NO monta `<ascii-yarn>`). Contenido sobre `--z-base`.
- `archive-nav/ArchiveNav.tsx` + `archive-nav.variants.ts` (+ `index.ts`) — Client Component, `usePathname`.
  6 carpetas `.kc-folder` (pestaña+cuerpo, emboss, micro-escalones tonales `--folder-tone-1..6`, sombra de
  papel, hover sube `--folder-lift`, activa se funde con `--bg`). Wordmark izq. + utils der. (nombre usuario
  + botón "Salir"). Visible `≥ tablet` (`hidden tablet:flex`).
- `bottom-nav/BottomNav.tsx` + `bottom-nav.variants.ts` (+ `index.ts`) — Client Component, `usePathname`.
  6 accesos táctiles `≥ --touch-target`. Visible `< tablet` (`tablet:hidden`).
- `layout/index.ts` (barrel) + export desde `shared/ui/index.ts`.
- `layout/layout.test.tsx` — smoke, activa-por-ruta (4 casos: `/`, `/proyectos`, subruta `/proyectos/42`,
  `/lanas`), user+logout callback, motion degrada (transición CSS, sin JS), axe en AppShell/ArchiveNav/BottomNav.

**Wiring (costura pura↔fetch) — `src/features/auth/ui/` (nuevo; auth sólo tenía `api/`):**
- `AppShellClient.tsx` (+ `index.ts`) — Client Component que SÍ conoce rutas/backend: `GET /api/auth/me`
  → puebla `user` del nav; `onLogout` = `POST /api/auth/logout` → `useRouter().push("/login")`.
  Consume el design system por `@/shared/ui`. El shell NO hace fetch.
- `AppShellClient.test.tsx` — me puebla el nombre, logout llama POST + redirige, y el shell sobrevive si `me` falla.

**Route groups — `src/app/`:**
- `(app)/layout.tsx` — envuelve `children` con `AppShellClient`.
- `(app)/page.tsx` — **movido** desde `src/app/page.tsx` (sigue en `/`, ahora dentro del shell).
- `(auth)/layout.tsx` — limpio, sin nav. (Sin páginas login/register: fuera de alcance.)
- `src/app/page.tsx` — **eliminado**.

## Archivos modificados

- `src/app/globals.css` (config, permitido): añadido `--folder-tone-6` (6ª carpeta), `--folder-prefix`,
  tokens de dimensión/sombra del nav (`--nav-height`, `--folder-overlap`, `--folder-lift`,
  `--folder-body-height[-active]`, `--shadow-folder-tab/body/hover`) y **namespace `--breakpoint-mobile/
  tablet/desktop`** (deuda de #12: habilita variantes responsive `tablet:` token-first; literales porque las
  media queries no resuelven `var()`; comparten valores con `--bp-*`). No se redefinió ningún token existente.
- `src/shared/ui/index.ts` — export de `./layout`.
- `src/shared/ui/primitives/no-hardcode.test.ts` — `COMPONENT_FILES` extendido con los 5 archivos de layout
  (rutas relativas `../layout/...`).

## Decisiones no obvias

- **Pureza del design system:** el fetch de `/auth/me` y el logout viven en `features/auth/ui/AppShellClient`,
  NO en `shared/ui/**`. AppShell/ArchiveNav reciben `user` + `onLogout` como datos/callbacks (SDD §2).
- **Activa por RUTA (no scroll-spy):** el `<script>` scrollspy del template se descartó; los navs usan
  `usePathname()` → `aria-current="page"`. Helper `isRouteActive` con match exacto para `/` y prefijo de
  subruta para el resto.
- **Anchors planos, no `next/link`:** los componentes del design system son portables por contrato (SDD §2);
  usan `<a>`. El único warning de lint (`no-html-link-for-pages` en el wordmark `href="/"`) se silencia
  puntualmente con justificación. Lint queda en **0 errores** (init.sh verde).
- **Nombres accesibles:** la carpeta del archivero lleva `aria-label={label}` y el prefijo `.knit` es
  `aria-hidden` (decorativo) → nombre accesible limpio ("Dashboard", no ".knit Dashboard").
- **Landmarks únicos:** ArchiveNav `nav` = "Navegación principal"; BottomNav `nav` = "Navegación principal
  (móvil)" → sin violación `landmark-unique` de axe (ambos existen en el DOM, sólo cambia display por bp).
- **reduced-motion:** el hover/transiciones del nav son CSS por token (`transition-[...] duration-[var(--dur-*)]`),
  degradados por la media global ya presente en `globals.css`; no hay animación JS.

## Deuda / notas conocidas (NO tocadas en #13, como pide el brief)

- **`src/proxy.ts` con `/` público:** el Dashboard vive en `/` y es privado por RFC, pero `proxy.ts` lista
  `/` como público. **No se toca** (acceptance: "proxy existente", "sin cambios de backend"). Se resolverá
  al cablear el flujo real de auth/dashboard, fuera del alcance de esta feature.
- **Sin páginas login/register:** el grupo `(auth)` queda con su layout listo pero sin páginas (fuera de alcance).
- **Las 5 páginas de contenido** (`/proyectos`, `/lanas`, `/patrones`, `/calculadoras`, `/stash`) aún no
  existen; el nav las linkea igualmente (correcto — features 19-30).
