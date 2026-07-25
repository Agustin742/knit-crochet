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
 * Navegación inferior (< tablet). 6 accesos táctiles ≥ --touch-target con la
 * activa determinada por la RUTA actual (`aria-current="page"`).
 */
export function BottomNav({ items = NAV_ITEMS, className }: BottomNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Navegación principal (móvil)"
      className={cn(
        "flex items-stretch tablet:hidden",
        "border-t-[length:var(--border-width)] border-solid border-fg-inverse-muted",
        "bg-bg [background-image:var(--texture-dots-dark)] [background-size:var(--space-4)_var(--space-4)]",
        "[z-index:var(--z-nav)]",
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
