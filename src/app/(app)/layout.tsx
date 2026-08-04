import type { ReactNode } from "react";

import { getSessionUser } from "@/features/auth";
import { AppShellClient } from "@/features/auth/ui";

/**
 * Layout del grupo privado. Es un **Server Component**, y es aquí donde se
 * resuelve quién tiene la sesión abierta: el caparazón recibe el usuario por
 * props y no pide nada desde el navegador (ver `AppShellClient`). Un layout
 * compartido no se vuelve a renderizar en cada navegación de cliente, así que el
 * coste es una lectura por carga de página, no una por clic.
 *
 * Cruza a cliente **sólo el nombre**, no el registro entero: todo lo que se pasa
 * a un componente de cliente viaja serializado en la carga de la página, así que
 * el email y las fechas de la cuenta no tienen por qué estar ahí.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <AppShellClient user={user ? { name: user.name } : null}>
      {children}
    </AppShellClient>
  );
}
