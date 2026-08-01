"use client";

import type { ReactNode } from "react";

import { AppShell, AsciiYarn } from "@/shared/ui";

export interface AppShellClientProps {
  children: ReactNode;
}

/**
 * Costura entre el design system (presentación pura) y la app: monta el
 * caparazón de las páginas del grupo `(app)` y le inyecta la capa 3D.
 *
 * NO pide el usuario ni cablea el logout, **a propósito**. Los pedía —
 * `GET /api/auth/me` en un `useEffect` en cada carga de cualquier página del
 * grupo— pero desde la enmienda E7 de D4 el `ArchiveNav` no renderiza utils, así
 * que ese usuario no lo consumía nadie: era una petición HTTP y un re-render del
 * shell entero (ovillo ASCII incluido) por navegación, a cambio de nada. El
 * `handleLogout` que lo acompañaba era, por el mismo motivo, código inalcanzable
 * (deuda 21).
 *
 * La feature **#31 `auth_ui`** es la que vuelve a cablear las dos cosas, con la
 * pantalla que las justifica ya construida y decidiendo entonces DÓNDE vive el
 * menú de cuenta: `GET /api/auth/me` para el usuario (el endpoint sigue vivo y
 * con sus tests) y `POST /api/auth/logout` + redirección a `/login` para el
 * cierre de sesión, que se pasan al shell por `user`/`onLogout` — props que
 * `AppShell` conserva en su firma esperándolas (deuda 29).
 */
export function AppShellClient({ children }: AppShellClientProps) {
  return <AppShell background={<AsciiYarn />}>{children}</AppShell>;
}
