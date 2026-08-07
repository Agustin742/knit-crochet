import { cva, type VariantProps } from "class-variance-authority";

/* Ref: .kc-skeleton. Bloque de carga: una superficie hundida del sistema que
   ocupa el sitio del contenido que todavía no llegó. Todo por token; las formas
   son las tres que pide una card de la app (renglón de texto, bloque grande y
   avatar redondo).

   Las formas se declaran en un objeto propio para poder derivar de él los
   NOMBRES públicos de la variante (`SKELETON_SHAPES`), que el ancla de contrato
   compara contra el literal (REGLA 2a). */
const skeletonShapes = {
  text: "h-(--space-4) w-full rounded-sm",
  block: "h-(--space-12) w-full rounded-md",
  circle: "size-(--touch-target) rounded-full",
} as const;

export type SkeletonShape = keyof typeof skeletonShapes;

export const SKELETON_SHAPES = Object.keys(skeletonShapes) as SkeletonShape[];

/* El movimiento NO se decide sólo en CSS. La media query global de
   `globals.css` ya recorta la animación, pero eso es invisible desde el DOM: un
   test no puede distinguir "animado" de "quieto" sin hojas de estilo aplicadas,
   y lo que no se puede ver no se puede vigilar. Por eso la clase de animación se
   pone o no se pone en JS (`usePrefersReducedMotion`), y el gate mide el DOM
   renderizado, no el string de `cva` (REGLA 7 aplicada a UI). */
export const SKELETON_ANIMATED_CLASS = "animate-pulse";
export const SKELETON_STILL_CLASS = "animate-none";

export const skeletonVariants = cva(["block bg-surface-sunken text-fg"], {
  variants: {
    shape: skeletonShapes,
  },
  defaultVariants: {
    shape: "text",
  },
});

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
