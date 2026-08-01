"use client";

import { usePathname } from "next/navigation";

import { cn } from "../../lib/cn";
import { isRouteActive, NAV_ITEMS, type NavItem } from "../nav-items";
import { bottomNavItemVariants } from "./bottom-nav.variants";

export interface BottomNavProps {
  /** Rutas del nav; por defecto las 6 páginas de la app (RFC-01 §2). */
  items?: readonly NavItem[];
  className?: string;
}

/**
 * Navegación inferior. 6 accesos táctiles ≥ --touch-target con la activa
 * determinada por la RUTA actual (`aria-current="page"`). Cubre todo lo que
 * queda por debajo de `--bp-archive`, que es donde el archivero puede mostrar
 * sus 6 etiquetas enteras (RFC-01 §3, enmienda E4): sólo cambia el ancho hasta
 * el que se muestra, nada de su interior.
 */
export function BottomNav({ items = NAV_ITEMS, className }: BottomNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Navegación principal (móvil)"
      className={cn(
        "flex items-stretch archive:hidden",
        "border-t-(length:--border-width) border-solid border-fg-inverse-muted",
        "bg-bg bg-(image:--texture-dots-dark) [background-size:var(--space-4)_var(--space-4)]",
        "z-(--z-nav)",
        className,
      )}
    >
      {items.map((item) => {
        const active = isRouteActive(pathname, item.href);
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={bottomNavItemVariants({ active })}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
