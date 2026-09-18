import { type CSSProperties, type HTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { type SwatchVariants, swatchVariants } from "./swatch.variants";

export interface SwatchProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    SwatchVariants {
  /** Un color CSS o `var(--...)`. Opcional: quien ya tiene una clase de
   * utilidad para su fondo (un mapa app-side) no necesita pasarlo. */
  color?: string;
  /** Nombre accesible. Sin él, la muestra es decorativa (`aria-hidden`). */
  label?: string;
}

/**
 * Muestra de color genérica (design system, deuda 168). Props únicamente,
 * sin hooks, sin `"use client"` (mirror de `EmptyState`): no sabe qué es una
 * familia de color de la app ni conoce su módulo de configuración.
 */
export const Swatch = forwardRef<HTMLSpanElement, SwatchProps>(
  function Swatch({ color, label, size, className, style, ...props }, ref) {
    const hasLabel = label !== undefined && label !== "";
    const withColor: CSSProperties | undefined =
      color === undefined ? style : { ...style, backgroundColor: color };

    return (
      <span
        ref={ref}
        data-slot="swatch"
        role={hasLabel ? "img" : undefined}
        aria-label={hasLabel ? label : undefined}
        aria-hidden={hasLabel ? undefined : "true"}
        style={withColor}
        className={cn(swatchVariants({ size }), className)}
        {...props}
      />
    );
  },
);
