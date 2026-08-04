"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useCallback } from "react";

import { AppShell, type AccountUser, AsciiYarn } from "@/shared/ui";

import { postLogout } from "./auth-client";
import { LOGOUT_REDIRECT } from "./next-path";

export interface AppShellClientProps {
  children: ReactNode;
  /**
   * Sesión abierta, **resuelta en el layout servidor** de `(app)` y entregada
   * por props. No se pide desde aquí a propósito: ver el JSDoc del componente.
   */
  user?: AccountUser | null;
}

/**
 * Costura entre el design system (presentación pura) y la app: monta el
 * caparazón de las páginas del grupo `(app)`, le inyecta la capa 3D y le cablea
 * el cierre de sesión.
 *
 * **El usuario NO se pide desde aquí.** Lo resuelve `getSessionUser()` en
 * `src/app/(app)/layout.tsx`, que es un Server Component, y baja por props. Esto
 * no es un detalle de estilo: la versión anterior pedía `GET /api/auth/me` en un
 * `useEffect` en **cada carga de cada página** del grupo para alimentar una prop
 * que nadie consumía, y guardaba el resultado en estado, o sea una petición HTTP
 * y un re-render del shell entero —ovillo ASCII incluido— por navegación
 * (deuda 21). Resolverlo en el servidor devuelve la funcionalidad **sin volver a
 * pagar ese coste**: montar el caparazón sigue sin disparar ni una petición de
 * cliente, y el gate que lo vigila sigue siendo verdad en vez de tener que
 * invertirse (deuda 29).
 *
 * Lo único que este módulo hace en el navegador es el logout, que es una acción
 * explícita de la persona: `POST /api/auth/logout` y, **sólo si el servidor
 * confirma** que borró la cookie, `replace` a la pantalla de acceso. Si la
 * petición falla, la sesión sigue viva y no se navega: mandar a `/login` con la
 * cookie puesta acabaría en un rebote al Dashboard (el proxy ya no deja entrar
 * ahí con sesión) y se leería como un botón errático. `replace` y no `push` para
 * que "atrás" no devuelva al caparazón de una sesión ya cerrada, y `refresh`
 * para que los Server Components dejen de ver la sesión anterior.
 */
export function AppShellClient({ children, user }: AppShellClientProps) {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    if (!(await postLogout())) {
      return;
    }
    router.replace(LOGOUT_REDIRECT);
    router.refresh();
  }, [router]);

  return (
    <AppShell user={user} onLogout={handleLogout} background={<AsciiYarn />}>
      {children}
    </AppShell>
  );
}
