import { cva, type VariantProps } from "class-variance-authority";

/* Ref: .kc-card / .kc-card--flat. Borde grueso + radio chico (brutalismo).
   raised = superficie elevada con sombra dura; flat = superficie plana sin sombra. */
export const cardVariants = cva(
  [
    "border-(length:--border-width) border-solid border-border rounded-md",
    "p-(--space-5)",
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
