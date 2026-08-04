import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { AccountBand, type AccountUser } from "../account-band";
import { ArchiveNav } from "../archive-nav";
import { BottomNav } from "../bottom-nav";
import type { NavItem } from "../nav-items";

export interface AppShellProps {
  /** Contenido de la página, por encima de la capa 3D. */
  children: ReactNode;
  /**
   * Capa de fondo decorativa (feature 14: el ovillo ASCII). Se inyecta desde
   * fuera para que este módulo siga siendo presentación pura y no importe
   * `three` (SDD §7: sólo `shared/ui/three/**` lo hace).
   */
  background?: ReactNode;
  /** Rutas del nav; por defecto las 6 páginas de la app (RFC-01 §2). */
  items?: readonly NavItem[];
  /**
   * Sesión abierta. Se pinta en la **banda de cuenta**, una superficie propia
   * del shell que va por encima del cajón y **fuera del elemento `nav`**
   * (enmienda E11 de D4). No vuelve al `ArchiveNav`, que ya no tiene ancho que
   * ceder; ver `AccountBand`. Sin `user` la banda no se monta.
   */
  user?: AccountUser | null;
  /** Cierre de sesión, cableado por la app. Sin él tampoco hay banda. */
  onLogout?: () => void;
  className?: string;
}

/**
 * Caparazón de la app: banda de cuenta (a todos los anchos) + ArchiveNav (desde
 * `--bp-archive`) + `main` con el contenido + BottomNav (por debajo de ese
 * ancho) + un slot detrás del contenido para la capa 3D (`--z-bg-3d`, feature
 * 14). Presentación pura: recibe datos y callbacks.
 */
export function AppShell({
  children,
  background,
  items,
  user,
  onLogout,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn("relative flex min-h-dvh flex-col bg-bg", className)}
    >
      {/* Slot de la capa 3D (feature 14 monta aquí el AsciiYarn). Detrás del
          contenido y sin capturar eventos. */}
      <div
        aria-hidden="true"
        data-slot="bg-3d"
        className="pointer-events-none fixed inset-0 z-(--z-bg-3d)"
      >
        {background}
      </div>

      {/* La banda va en el FLUJO y por delante del cajón en orden de lectura:
          no se superpone al archivero, lo empuja. Ver `AccountBand` y el gate
          de `account-band.tokens.test.ts`. */}
      <AccountBand user={user} onLogout={onLogout} />

      <ArchiveNav items={items} />

      <main className="relative flex-1 z-(--z-base)">{children}</main>

      <BottomNav items={items} />
    </div>
  );
}
