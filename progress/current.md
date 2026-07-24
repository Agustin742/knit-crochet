# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ — #12 `ui_foundation` **CERRADA (done)**.
- **Última tarea:** #12 `ui_foundation` → base del design system portada (tokens `@theme`, fuentes
  `next/font`, `cn()`, primitivos Button/Field·Input/Card). APROBADA a la primera.
- **Agente:** leader → implementer → reviewer.

## Estado del proyecto

- **Fase 1 (PRD-01, features 1-11):** completa (`done`).
- **Fase 2 (UI, features 12-30):** arrancada. **#12 done**; siguiente pendiente por id = **#13 `ui_shell_nav`**.
- `bash ./init.sh` VERDE: **312 passed | 6 skipped** (281 backend + 31 UI). `pnpm build` OK.

## Próximo paso — feature #13 `ui_shell_nav`

AppShell + ArchiveNav (6 rutas, activa por ruta, `aria-current`) + BottomNav mobile + route groups
`(app)`/`(auth)` + consumo de `GET /api/auth/me` y `POST /api/auth/logout`. Sin cambios de backend.
Fuente: RFC-01 §3/§8, SDD §6 (`ArchiveNav`), `template/template-src.html` (`.kc-nav`/`.kc-folder`).

**Antes de arrancar #13:** exponer los breakpoints también en el namespace `--breakpoint-*` (además de
`--bp-*`) para poder usar prefijos responsive de Tailwind en el nav (deuda anotada por #12).

## Notas de #12 (para consumidores del design system)

- Utilidades de color disponibles vía alias `--color-<rol>` (`bg-accent`, `text-fg`, `border-border`…);
  o consumir el token directo con `var(--<rol>)`. Nombres del SDD §5 presentes verbatim.
- **Cero hardcode** enforced por `src/shared/ui/primitives/no-hardcode.test.ts` — cualquier primitivo
  nuevo debe pasar por token (usar `calc()`/`color-mix()` sobre tokens si hace falta un valor derivado).
- Tests de UI: declarar `// @vitest-environment happy-dom` arriba del archivo (el default sigue `node`).
- Gotcha: no usar la secuencia `*/` dentro de comentarios en `globals.css` (cierra el comentario CSS).

## Pendiente operativo (no bloquea)

- Hay bastante trabajo sin commitear en el árbol (features #8-#11 + proceso `informs/` + toda la Fase 2 #12
  + docs/design/rfc + template/). Conviene commit(s) limpios cuando el usuario lo indique.

## Deuda técnica acumulada (heredada, vigente)

1. **Orden de firma de Cloudinary** (#5): `localeCompare` sensible a locale; migrar a comparador binario si
   se añaden más params firmables.
2. **Sanitización al cablear Cloudinary** (#5, PRD §11.7): `folder`/`publicId` desde el `userId` del JWT
   validados con zod, nunca del body crudo. **Aplica en #15 `uploads_image`** (aún no cableado).
3. **`tsconfig.tsbuildinfo` trackeado en git** (pre-existente): añadir a `.gitignore`.
4. **`GET /api/projects/:id` no devuelve las lanas enlazadas** (#6): **la salda #17 `projects_detail_yarns`**.
5. **`sum()`/agregados → `numeric` (string por el driver):** aplicar `Number(...)` en cualquier agregado nuevo.
6. **Breakpoints `--breakpoint-*`** (nuevo, #12): exponerlos para variantes responsive de Tailwind (→ #13).
