"use client";

import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";
import { usePrefersReducedMotion } from "@/shared/ui/lib/usePrefersReducedMotion";

import {
  SKELETON_ANIMATED_CLASS,
  SKELETON_STILL_CLASS,
  type SkeletonVariants,
  skeletonVariants,
} from "./skeleton.variants";

export interface SkeletonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    SkeletonVariants {}

/**
 * Bloque de carga (SDD §6, RFC-02 §4).
 *
 * Dos decisiones que lo definen:
 *
 * 1. **`aria-hidden`**: no tiene contenido, sólo ocupa sitio. Anunciarlo sería
 *    leerle a alguien una caja vacía. Quien monte varios debe anunciar la carga
 *    UNA vez desde fuera (`aria-busy` o una región `aria-live` en el contenedor).
 * 2. **`prefers-reduced-motion` se resuelve en JS, no sólo en CSS.** La media
 *    query global de `globals.css` ya recorta la animación, pero eso no se ve
 *    desde el DOM y no se puede vigilar con un test; aquí la clase de animación
 *    directamente no se emite, así que el gate mide el elemento renderizado.
 *    Es la misma decisión que tomó la capa 3D en D3 por el mismo motivo (allí un
 *    `requestAnimationFrame` tampoco lo para ninguna hoja de estilo).
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton({ shape, className, ...props }, ref) {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
      <div
        ref={ref}
        data-slot="skeleton"
        aria-hidden="true"
        className={cn(
          skeletonVariants({ shape }),
          prefersReducedMotion ? SKELETON_STILL_CLASS : SKELETON_ANIMATED_CLASS,
          className,
        )}
        {...props}
      />
    );
  },
);
