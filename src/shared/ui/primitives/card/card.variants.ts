import { cva, type VariantProps } from "class-variance-authority";

/* Ref: .kc-card / .kc-card--flat. Borde grueso + radio chico (brutalismo).
   raised = superficie elevada con sombra dura; flat = superficie plana sin sombra.

   La tarjeta declara su PRIMER PLANO junto a su fondo (deuda 32). Las dos
   variantes son superficies claras, pero la app es oscura: `globals.css` pone el
   crema en el `body`, así que todo lo que no declare primer plano lo hereda —
   incluida esta tarjeta, que pintaba crema sobre crema (1.14:1, invisible). Una
   superficie que decide su fondo tiene que decidir también qué se lee encima:
   es la contrapartida de que la variante fantasma del botón HEREDE su color
   (deuda 17), porque lo que hereda es justamente esto. */
export const cardVariants = cva(
  [
    "border-(length:--border-width) border-solid border-border rounded-md",
    "p-(--space-5) text-fg",
  ],
  {
    variants: {
      variant: {
        raised: "bg-surface-raised shadow-hard-lg",
        flat: "bg-surface shadow-none",
      },
    },
    defaultVariants: {
      variant: "raised",
    },
  },
);

export type CardVariants = VariantProps<typeof cardVariants>;
