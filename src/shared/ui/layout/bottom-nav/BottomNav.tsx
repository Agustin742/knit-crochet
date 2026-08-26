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
 *
 * **Se pega al borde INFERIOR DE LA PANTALLA (enmienda E14 a, deuda 165).**
 * Antes declaraba su escalón de apilamiento y **ninguna posición**, y un
 * `z-index` sobre un elemento estático no hace nada: como es el último hijo de
 * la columna del caparazón y el `main` crece, la barra quedaba al final del
 * DOCUMENTO y no de la pantalla — en un teléfono, la única navegación de la app
 * sólo aparecía scrolleando hasta el fondo.
 *
 * Se pega **sin salir del flujo**, que es la mitad que se decide y no se
 * hereda: así el caparazón no tiene que compensar con relleno inferior y la
 * barra **no puede tapar el final del contenido** —al llegar abajo del todo se
 * apoya en su sitio, detrás no queda nada escondido—. Con la barra fija sí
 * aparecería esa clase de fallo.
 *
 * Anclado en `bottom-nav.classes.test.ts`, que lo mide sobre el **CSS
 * compilado**: un nombre de clase que Tailwind no genera es una cadena inerte
 * en el atributo, y así fue como nació la 165 con la suite entera en verde.
 */
export function BottomNav({ items = NAV_ITEMS, className }: BottomNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Navegación principal (móvil)"
      className={cn(
        "flex items-stretch archive:hidden",
        /* E14 (a): pegajosa y anclada abajo. Las dos mitades hacen falta —una
           posición pegajosa sin desplazamiento se queda donde estaba— y ninguna
           lleva variante: las de este repo son de ancho MÍNIMO, así que una
           regla escrita "sólo hacia abajo" no compilaría a nada justo donde
           vive la barra. */
        "sticky bottom-0",
        /* E14 (b): lo que el sistema se reserva abajo, descontado por token.
           Sin esto, en un teléfono con barra de gestos los accesos caen bajo el
           gesto del sistema y los toques no llegan a la app. */
        "pb-(--safe-area-bottom)",
        "border-t-(length:--border-width) border-solid border-fg-inverse-muted",
        "bg-bg bg-(image:--texture-dots-dark) [background-size:var(--space-4)_var(--space-4)]",
        /* Ahora sí significa algo: sobre un elemento estático era inerte. */
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
