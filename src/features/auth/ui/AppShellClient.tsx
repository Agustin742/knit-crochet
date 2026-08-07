"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback } from "react";

import { AppShell, type AccountUser, AsciiYarn } from "@/shared/ui";

import { postLogout } from "./auth-client";
import { LOGOUT_REDIRECT } from "./next-path";

/**
 * Ruta que monta su PROPIO ovillo como hero (el Dashboard, RFC-02 §2). Se
 * declara aquí y **no se importa `HOME_PATH` de `src/proxy.ts`**: ese módulo es
 * el middleware, y traerlo al grafo de un componente de cliente por una cadena
 * de un carácter no sale a cuenta.
 */
const HERO_PATHS = ["/"];

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
 * **El fondo 3D lo decide la RUTA** (RFC-02 §7-bis, enmienda E1.2). En `/` el
 * Dashboard monta su propio ovillo como hero, interactivo y arrastrable, así que
 * el caparazón NO monta el suyo: dos efectos ASCII simultáneos duplicarían el
 * coste de CPU del bucle de asciificación justo en la página que más se abre.
 * `background` ya era un slot opcional de `AppShell`, así que apagarlo no toca el
 * design system. Se lee con `usePathname()` —el mismo mecanismo con el que
 * `ArchiveNav` y `BottomNav` derivan su ruta activa—, que lee del contexto del
 * router y **no abre red**: el gate de "cero petición al montar" sigue intacto.
 * La decisión se toma en el render del padre, antes de que el hijo exista, así
 * que nunca llega a instanciarse un `WebGLRenderer` que después haya que tirar.
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
  const pathname = usePathname();

  const handleLogout = useCallback(async () => {
    if (!(await postLogout())) {
      return;
    }
    router.replace(LOGOUT_REDIRECT);
    router.refresh();
  }, [router]);

  const ownsItsYarn = HERO_PATHS.includes(pathname ?? "");

  return (
    <AppShell
      user={user}
      onLogout={handleLogout}
      background={ownsItsYarn ? undefined : <AsciiYarn />}
    >
      {children}
    </AppShell>
  );
}
