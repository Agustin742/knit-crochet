# RFC-01 — Shell & Navegación

- **Alcance:** el caparazón de la app (layout global, nav, capa de fondo, base de estilos). Todo lo demás cuelga de acá.
- **Estado:** borrador.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`). No se repite acá.
- **Fuente de verdad:** este RFC + el **contrato del template** (SDD-01). La estética sale del template (`template/`) como **insumo adaptable**, no como ley; lo único fijo "tal cual" es el **ovillo ASCII**.

---

## 1. Objetivo

Montar el shell sobre el que viven todas las páginas: base de estilos (tokens → Tailwind + fuentes),
`AppShell`, navegación **archivero** en tablet/desktop, **bottom-nav** en mobile, la **capa de fondo**
(textura + ovillo ASCII) y los **route groups** público/privado.

## 2. Decisiones que fija este RFC (de las 40 respuestas)

- **Nav = 6 páginas** en este orden: Dashboard · Proyectos · Lanas · Patrones · Calculadoras · **Stash** (hub).
- **Tablet + desktop = archivero**; **mobile = bottom-nav** (co-primarios tablet/desktop, mobile secundario).
- **Landing post-login = Dashboard.**
- **Auth = pantalla limpia, sin archivero**; ovillo ASCII de fondo **solo en login** (no en register).
- **Ovillo ASCII** = hero (Dashboard) + loader global. Gira solo **y** se puede arrastrar.

## 3. Estructura y componentes

**Base de estilos**
- Portar `template/tokens.css` a **Tailwind v4** vía `@theme` en `src/app/globals.css` (los tokens son
  la fuente única; los componentes no hardcodean).
- Fuentes self-hosted con `next/font`: **Instrument Serif** (`--font-display`/`--font-emphasis`),
  **Archivo** (`--font-body`), **IBM Plex Mono** (`--font-mono`).
- Fondo app: espresso (`--bg`) + `--texture-dots-dark`; superficies de contenido en crema + `--texture-paper`.

**Componentes (en `src/shared/ui/`)**
- `AppShell` — header (tablet/desktop) + `main` + `BottomNav` (mobile) + slot de capa 3D detrás (`--z-bg-3d`).
- `ArchiveNav` (≥ `--bp-tablet`) — 6 carpetas dark-on-dark (adaptando `.kc-folder`: pestaña+cuerpo,
  emboss, micro-escalones, papel). **La activa se determina por la RUTA actual** (no por scroll-spy como
  el template) y se funde con el contenido. Hover sube ~6px. Wordmark a la izquierda; a la derecha, utils
  (usuario + logout).
- `BottomNav` (< `--bp-tablet`) — 6 accesos táctiles ≥ `--touch-target` (44px), con la activa por ruta.
- `TextureLayer` — capa de textura de fondo por token.
- Helper `cn()` (`twMerge(clsx())`).

**Capa 3D — `<ascii-yarn>` (`src/shared/ui/three/`)**
- Web component client-only (three.js `AsciiEffect`; `dynamic` `ssr:false`). Ovillo + agujas, auto-rota y
  se arrastra. Va detrás del contenido (`--z-bg-3d`), `pointer-events:none` salvo cuando es hero interactivo.
- Congela con `prefers-reduced-motion`. Se usa como **hero** (Dashboard) y **loader** global.

**Route groups (`src/app/`)**
- `(app)/**` privado, envuelto por `AppShell`; `(auth)/**` público (login/register), pantalla limpia sin nav.
  Protegidos por `src/proxy.ts` (ya existe).

## 4. Datos / backend

- Consume `GET /api/auth/me` (usuario para el nav) y `POST /api/auth/logout`. **Sin otros datos.**
- **Cambios de backend: ninguno.**

## 5. Estados

- **Loading global:** el ovillo ASCII como loader.
- El nav es estructural (sin empty/error).

## 6. Accesibilidad

- `nav` como landmark; `aria-current="page"` en la carpeta/ítem activo; foco visible (`--focus`).
- `prefers-reduced-motion` respetado por el hover del nav y por el ovillo.

## 7. Fuera de alcance (va en otros RFC)

- El contenido de cada página (su propio RFC).
- El afinado fino del ovillo 3D (se prototipa acá; se pule aparte si hace falta).

## 8. Adaptación al harness

**Capas / archivos**
- `src/app/globals.css` (`@theme` desde tokens), `src/app/layout.tsx` (fuentes, providers).
- `src/app/(app)/layout.tsx` (AppShell) y `src/app/(auth)/layout.tsx` (limpio).
- Design system en `src/shared/ui/` (`layout/`, `three/`, `primitives/`, `lib/cn.ts`).

**Stack nuevo a instalar** (confirmar): Tailwind v4, `class-variance-authority` + `tailwind-merge` +
`clsx`, `three` (+ `AsciiEffect`), `next/font`. Testing: `@testing-library/react` + `user-event` +
`happy-dom` + `axe`.

**Verificación (definición de done):** RTL (comportamiento/a11y) + smoke de render + `axe` + `bash ./init.sh`
verde + `pnpm build` OK.

## 9. Slices de implementación (→ `feature_list.json`)

Cada slice es una implementación (implementer → reviewer), como el backend. IDs reales en
`feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 12 `ui_foundation`** — tokens → `@theme`, fuentes `next/font`, `globals.css`, `layout.tsx`
  raíz, `cn()`, y los primitivos base portados del template (`Button`, `Field`/`Input`, `Card`).
- **feature 13 `ui_shell_nav`** — `AppShell` + `ArchiveNav` (6 rutas, activa por ruta) + `BottomNav`
  mobile + route groups `(app)`/`(auth)` + consumo de `/auth/me` y logout.
- **feature 14 `ascii_yarn`** — web component `<ascii-yarn>` (three.js `AsciiEffect`, client-only,
  reduced-motion) integrado como hero/loader.
