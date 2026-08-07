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
   y lo que no se puede ver no se puede vigilar. Por eso las clases de animación
   se ponen o no se ponen en JS (`usePrefersReducedMotion`), y el gate mide el
   DOM renderizado, no el string de `cva` (REGLA 7 aplicada a UI).

   QUÉ ANIMA (deuda 86): un degradado que se DESPLAZA —el shimmer de
   `.kc-skeleton` del template—, no un latido de opacidad. Antes esto era la
   utilidad de latido que trae Tailwind de fábrica, que compila una duración y
   una curva que NO son tokens de este sistema y que el guardrail de no-hardcode
   no puede ver (no lleva ni `px` ni color). Ahora los tres valores —banda,
   duración y curva— viven en `globals.css` y aquí sólo se nombran.

   QUIETO ≠ INVISIBLE: al apagarse, el degradado se quita entero en vez de
   congelarse a mitad de recorrido. La superficie hundida de la base sigue ahí,
   así que el bloque se sigue leyendo como un bloque de carga; congelarlo dejaría
   franjas repetidas del degradado, que es ruido, no un hueco de carga. */
export const SKELETON_ANIMATED_CLASSES: string[] = [
  "animate-skeleton",
  "bg-(image:--skeleton-gradient)",
  "bg-size-(--skeleton-band-size)",
];

export const SKELETON_STILL_CLASSES: string[] = ["animate-none", "bg-none"];

export const skeletonVariants = cva(["block bg-surface-sunken text-fg"], {
  variants: {
    shape: skeletonShapes,
  },
  defaultVariants: {
    shape: "text",
  },
});

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
