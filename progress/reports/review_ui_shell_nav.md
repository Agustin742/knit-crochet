# Review — feature #13 `ui_shell_nav`

**Veredicto:** APROBADO

Caparazón AppShell + ArchiveNav + BottomNav + route groups `(app)`/`(auth)`.
Revisión objetiva contra acceptance (feature_list #13), RFC-01 §3/§4/§6/§8,
SDD-01 §2/§6/§9, architecture/conventions y CHECKPOINTS.

## Verificación ejecutable (corrida por el revisor)

- `bash ./init.sh` → **VERDE**. lint verde, typecheck verde.
  Tests: **338 passed | 6 skipped (344 total, 37 files)** — coincide con el reporte y supera el umbral ≥ 312.
- `pnpm build` → **OK**. Route groups válidos; `/` se prerenderiza estático dentro de `(app)`;
  23 endpoints `ƒ` dinámicos + Proxy (Middleware) presentes. Límites client/server de Next 16 respetados.
- `git diff HEAD -- src/proxy.ts` → **vacío** (proxy intacto).
- `git diff HEAD --stat -- src/app/api` → **vacío** (cero cambios de backend).
- `git status` → `src/app/page.tsx` en estado `D` (borrado); `src/app/(app)/page.tsx` creado. Movimiento correcto.

## Acceptance punto por punto

1. **layout/ con AppShell + ArchiveNav + BottomNav; activa por ruta [x]**
   - `src/shared/ui/layout/{app-shell,archive-nav,bottom-nav}` presentes con barrels.
   - ArchiveNav ≥ tablet (`hidden tablet:flex`); BottomNav < tablet (`tablet:hidden`).
   - `aria-current="page"` en la activa (ArchiveNav.tsx:82, BottomNav.tsx:39).

2. **Route groups [x]**
   - `(app)/layout.tsx` envuelve con `AppShellClient`; `(app)/page.tsx` (home movido); `src/app/page.tsx` eliminado.
   - `(auth)/layout.tsx` limpio, sin nav. `/` sigue funcionando (build lo prerenderiza).

3. **Nav = 6 rutas en orden [x]**
   - `NAV_ITEMS` (nav-items.ts:16-23): Dashboard `/` · Proyectos `/proyectos` · Lanas `/lanas` · Patrones `/patrones` · Calculadoras `/calculadoras` · Stash `/stash`.

4. **Consumo /auth/me + /auth/logout, cero backend [x]**
   - `AppShellClient.tsx`: `GET /api/auth/me` → `{ user }` (contrato del endpoint me/route.ts:9); `POST /api/auth/logout` + `router.push("/login")`.
   - Diffs de `proxy.ts` y `src/app/api` vacíos.

## Costura arquitectónica (crítica) [x]

- **Pureza del design system confirmada:** grep de `@/features|features/|fetch\(|/api/` sobre `src/shared/ui/layout` → **sin coincidencias**. El shell no hace fetch ni conoce rutas/endpoints.
- El fetch de `me`, el logout y `useRouter` viven en `src/features/auth/ui/AppShellClient.tsx` (capa de feature). AppShell/ArchiveNav reciben `user` + `onLogout` por props (AppShell.tsx:13-17).
- ArchiveNav importa `Button` de `@/shared/ui/primitives` (dentro de shared): no rompe la capa.

## Activa por ruta [x]

- `isRouteActive` (nav-items.ts:29-34): `/` exacto; resto por igualdad o subruta (`startsWith(href + "/")`).
- Sin falsos positivos: verificado por tests — `/` no marca Dashboard en `/lanas`; `/proyectos/42` marca Proyectos y no Dashboard (layout.test.tsx casos 79-103).

## Token-first / cero hardcode [x]

- `no-hardcode.test.ts` extendido: `COMPONENT_FILES` incluye los 5 archivos nuevos de `layout/` (AppShell, ArchiveNav+variants, BottomNav+variants) y los escanea realmente (hex/rgb/px).
- `globals.css`: solo **añade** tokens (`--folder-tone-6`, `--folder-prefix`, dims/sombras de nav, namespace `--breakpoint-*`). Ningún token existente de #12 redefinido/pisado. Los valores rgba viven en globals (config permitido), no en componentes.

## A11y (SDD §9) [x]

- Dos `nav` con nombres accesibles distintos ("Navegación principal" / "Navegación principal (móvil)") → sin violar `landmark-unique`.
- `aria-current="page"` en la activa; foco visible por `--focus`; targets BottomNav `min-h/min-w: --touch-target`.
- Prefijo `.knit` `aria-hidden` → nombre accesible limpio. Hover/transiciones son CSS por token (degradan con la media global de reduced-motion; sin animación JS).
- Tests `axe` sin violaciones en ArchiveNav, BottomNav y AppShell (layout.test.tsx 131-150).

## Arquitectura / convenciones [x]

- Feature-first respetado; barrels de API pública; TS strict sin `any` injustificado.
- Nombres: PascalCase componentes, `<name>.variants.ts`, carpetas kebab-case, alias `@/`, comillas dobles.
- Anchors planos `<a>` (design system portable, SDD §2); único warning de lint silenciado con justificación puntual → lint 0 errores.

## Checkpoints (CHECKPOINTS.md)

- C1 — Arnés completo: [x] (archivos base + 3 docs + init.sh exit 0).
- C2 — Estado coherente: [x] (#13 la única con avance; done tiene tests; current.md describe la sesión activa).
- C3 — Arquitectura: [x] (UI sin DB; pureza de shared/ui; sin deps nuevas; sin console.log/TODOs sueltos; sin secretos).
- C4 — Verificación real: [x] (26 tests nuevos; lint+typecheck+tests verdes).
- C5 — Cierre: [x] (sin artefactos sospechosos salvo `tsconfig.tsbuildinfo` regenerado; history.md existe).

## Notas (NO bloquean)

- `proxy.ts` lista `/` como público mientras el Dashboard es privado: fuera de alcance por diseño (acceptance: "proxy existente", "sin cambios de backend"). Se resolverá al cablear auth/dashboard.
- Grupo `(auth)` con layout listo pero sin páginas login/register: fuera de alcance.
- Diferencias visuales por adaptar el template a tokens: aceptables.

## Cambios requeridos

Ninguno.
