import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { AccountBand, type AccountUser } from "../account-band";
import { ArchiveNav } from "../archive-nav";
import { BottomNav } from "../bottom-nav";
import type { NavItem } from "../nav-items";

/**
 * Columna centrada con tope de ancho (enmienda E13 a). Sale a una constante y
 * no queda suelta en el JSX para que el gate de CSS compilado
 * (`app-shell.classes.test.ts`) la agarre por su nombre y compruebe que las tres
 * piezas —centrado, crecimiento y tope— emiten regla de verdad.
 */
const CONTENT_COLUMN_CLASSES =
  "mx-auto w-full max-w-(--content-max-inline)";

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
 *
 * **El contenido va en una columna centrada con tope de ancho** (enmienda E13 a
 * de RFC-01), declarada acá y sólo acá. Las páginas **no declaran ancho propio**:
 * lo heredan. Si una página vuelve a poner el suyo, está reabriendo la deuda 154.
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

      <main className="relative flex-1 z-(--z-base)">
        {/* LA COLUMNA DE CONTENIDO (RFC-01 §3, enmienda E13 a). Se declara UNA
            sola vez, acá, y no página por página: es lo que separa arreglar lo
            que se ve hoy de cerrar la clase de fallo, porque las cinco rutas que
            faltan nacen acotadas sin volver a decidirlo. Antes no existía
            ningún tope en toda la app y cada página se estiraba hasta el borde
            de la ventana, así que toda fila que reparte sus mitades a los
            extremos las mandaba a mil y pico píxeles de distancia (deuda 154).
            El tope sale del token `--content-max-inline`, que lleva su
            derivación escrita en `globals.css`; acá no hay ningún número.
            El `main` sigue siendo full-bleed a propósito: el caparazón no cambia
            de geometría (E13), sólo gana un contenedor para su contenido. */}
        <div className={CONTENT_COLUMN_CLASSES}>{children}</div>
      </main>

      <BottomNav items={items} />
    </div>
  );
}
