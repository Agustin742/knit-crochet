import { cva, type VariantProps } from "class-variance-authority";

/* Ref: la muestra de color decorativa de RFC-03 §2, ahora genérica (deuda 168).
   El borde del sistema se conserva: una muestra blanca o cruda sigue
   teniendo silueta sobre una superficie clara en vez de desaparecer.

   Los tamaños viven en un objeto propio para derivar de él los NOMBRES
   públicos (`SWATCH_SIZES`, REGLA 2a). `sm` es el tamaño de fila de filtro
   que ya usaba `YarnsTab`; `md` es el de tarjeta (#23-#25). */
const swatchSizes = {
  sm: "size-(--space-5)",
  md: "size-(--space-8)",
} as const;

export type SwatchSize = keyof typeof swatchSizes;

export const SWATCH_SIZES = Object.keys(swatchSizes) as SwatchSize[];

export const swatchVariants = cva(
  [
    "inline-block shrink-0 rounded-full",
    "border-(length:--border-width) border-solid border-border",
  ],
  {
    variants: {
      size: swatchSizes,
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

export type SwatchVariants = VariantProps<typeof swatchVariants>;
