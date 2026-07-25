# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ — #13 `ui_shell_nav` **CERRADA (done)**.
- **Última tarea:** #13 `ui_shell_nav` → shell (AppShell + ArchiveNav + BottomNav + route groups). APROBADA a la primera.
- **Agente:** leader → implementer → reviewer.

## Estado del proyecto

- **Fase 1 (PRD-01, features 1-11):** completa (`done`).
- **Fase 2 (UI, features 12-30):** en curso. **#12 y #13 done**; siguiente pendiente por id = **#14 `ascii_yarn`**.
- `bash ./init.sh` VERDE: **338 passed | 6 skipped**. `pnpm build` OK.

## Próximo paso — feature #14 `ascii_yarn`

Web component `<ascii-yarn>` (three.js `AsciiEffect`, client-only, `dynamic` `ssr:false`): ovillo + agujas,
auto-rota + arrastre, vive en `--z-bg-3d` detrás del contenido, `pointer-events:none` salvo como hero
interactivo, congela con `prefers-reduced-motion`, no bloquea el primer render. Se usa como **hero**
(Dashboard) y **loader** global. **Llena el slot 3D que el AppShell (#13) ya dejó reservado.**
Fuente: RFC-01 §3, SDD §7 y §7.1 (técnica AsciiEffect). Instalar `three` (pnpm). Verificación SDD §9:
smoke de montaje + reduced-motion + init.sh + build (NO se testean píxeles).

## Notas para consumidores del design system (acumulado #12-#13)

- **Layout listo:** `src/shared/ui/layout/` (AppShell, ArchiveNav, BottomNav) — presentación pura, se le pasan
  `user`+`onLogout`. El wiring de auth para el shell está en `src/features/auth/ui/AppShellClient.tsx`.
- **Activa por ruta:** helper `isRouteActive` + `usePathname` (exacto para `/`, prefijo para subrutas).
- **Responsive token-first:** usar variantes `tablet:`/`mobile:`/`desktop:` (namespace `--breakpoint-*` en globals.css).
- **Cero hardcode** enforced por `no-hardcode.test.ts` (cubre primitivos + layout). Tests de UI:
  `// @vitest-environment happy-dom` + mockear `next/navigation` y `fetch`.
- Gotcha vigente: no usar la secuencia de cierre de comentario dentro de `bg-*/text-*` en `globals.css`.

## Deuda técnica acumulada (vigente)

1. ~~**`src/proxy.ts` `/` público vs. Dashboard privado** (#13)~~ → **convertida en trabajo rastreable**:
   nota de scope + criterio de aceptación en la feature **#19 `dashboard_ui`** (quitar `/` de PUBLIC_PAGES,
   Dashboard privado en `/`, test del proxy actualizado). Se resuelve al construir el Dashboard.
2. ~~**Sin feature para páginas login/register** (#13)~~ → **convertida en feature**: nueva **#31 `auth_ui`**
   (login + register en el grupo `(auth)`, consumen los endpoints existentes; build recomendado junto a/antes
   de las páginas de contenido, no al final). `rfc_ref` RFC-01 §2/§3.
3. **Sanitización al cablear Cloudinary** (#5, PRD §11.7): `folder`/`publicId` desde el `userId` del JWT
   validados con zod. **Aplica en #15 `uploads_image`.**
4. **`tsconfig.tsbuildinfo` trackeado en git** (pre-existente): añadir a `.gitignore`.
5. **`GET /api/projects/:id` no devuelve las lanas enlazadas** (#6): **la salda #17 `projects_detail_yarns`**.
6. **Orden de firma de Cloudinary** (#5): `localeCompare`; migrar a comparador binario si se firman más params.
7. **`sum()`/agregados → `numeric` (string por el driver):** `Number(...)` en cualquier agregado nuevo.

## Pendiente operativo (no bloquea)

- Bastante trabajo sin commitear (features #8-#13 + `informs/` + docs/design/rfc + template/). Commit(s) limpios
  cuando el usuario lo indique.
