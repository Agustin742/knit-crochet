import { cva, type VariantProps } from "class-variance-authority";

/* Ref: RFC-03 E1(g) ("más filtros" inline) / E2(b) (la trampa de contraste),
   ahora subido al design system (design D5, deuda 142): un `<details>` que se
   repite una vez por marca es la estructura primaria de la página, no un
   detalle de una sola pantalla.

   Los tamaños viven en un objeto propio para derivar de él los NOMBRES
   públicos (`DISCLOSURE_SIZES`, REGLA 2a), igual que `swatchVariants`. */
const disclosureSizes = {
  sm: "gap-(--space-2)",
  md: "gap-(--space-3)",
} as const;

export type DisclosureSize = keyof typeof disclosureSizes;

export const DISCLOSURE_SIZES = Object.keys(disclosureSizes) as DisclosureSize[];

/**
 * El envoltorio (`<details>`). `flex flex-col` + el hueco del tamaño separan el
 * `<summary>` del panel sin una `<div>` intermedia; cuando está cerrado, el
 * propio navegador deja de pintar todo lo que no sea el `summary` (no hace
 * falta ocultarlo a mano).
 */
export const disclosureVariants = cva(["flex flex-col"], {
  variants: {
    size: disclosureSizes,
  },
  defaultVariants: {
    size: "sm",
  },
});

export type DisclosureVariants = VariantProps<typeof disclosureVariants>;

const disclosureSummarySizes = {
  sm: "text-sm/tight",
  md: "text-base/tight",
} as const;

/**
 * El `<summary>`. **Contraste medido, no teórico** (RFC-03 E2(b),
 * `RFC-03-proyectos.md:275-278`): un `<summary>` sobre una superficie elevada
 * con el primer plano inverso se lee a 1.14:1. Por eso este primitivo nunca usa
 * `text-fg-inverse` por defecto — siempre `text-fg` — y
 * `Disclosure.test.tsx` lo comprueba con una aserción, no con un comentario
 * (trap #5, tarea 4.3): quien lo use sobre una superficie clara hereda la
 * decisión ya tomada, en vez de volver a medirla a mano.
 */
export const disclosureSummaryVariants = cva(
  [
    "inline-flex min-h-(--touch-target) cursor-pointer items-center gap-(--space-2)",
    "font-body font-semibold text-fg",
    "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
    "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
  ],
  {
    variants: {
      size: disclosureSummarySizes,
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

export type DisclosureSummaryVariants = VariantProps<
  typeof disclosureSummaryVariants
>;
