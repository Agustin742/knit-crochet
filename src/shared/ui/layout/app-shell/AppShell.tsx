import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { ArchiveNav, type ArchiveNavUser } from "../archive-nav";
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
   * RESERVADA para la feature #31 `auth_ui`. Se acepta y se propaga tal cual al
   * `ArchiveNav`, **que hoy la ignora a propósito**: la enmienda E7 de D4 sacó
   * los utils del nav porque ofrecían "Salir" sin ninguna sesión abierta. O sea:
   * pasar un usuario aquí **no pinta nada en pantalla** hasta que #31 monte la
   * pantalla que lo justifica. Está en la firma para no romper el contrato del
   * design system mientras tanto (`ArchiveNav` fija con un test que la ignora).
   */
  user?: ArchiveNavUser | null;
  /** RESERVADA para #31 `auth_ui`, propagada e ignorada hoy: ver `user`. */
  onLogout?: () => void;
  className?: string;
}

/**
 * Caparazón de la app: ArchiveNav (desde `--bp-archive`) + `main` con el
 * contenido + BottomNav (por debajo de ese ancho) + un slot detrás del contenido
 * para la capa 3D
 * (`--z-bg-3d`, feature 14). Presentación pura: recibe datos y callbacks.
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

      <ArchiveNav items={items} user={user} onLogout={onLogout} />

      <main className="relative flex-1 z-(--z-base)">{children}</main>

      <BottomNav items={items} />
    </div>
  );
}
