import { cva, type VariantProps } from "class-variance-authority";

/* Interacción brutalista compartida por las variantes sólidas: sombra dura con
   offset sólido; hover levanta el bloque (offset = --border-width) y agranda la
   sombra; active lo hunde. Sin blur, todo por token. */
const solidInteraction = [
  "shadow-hard",
  "hover:[transform:translate(calc(-1*var(--border-width)),calc(-1*var(--border-width)))]",
  "hover:shadow-hard-lg",
  "active:[transform:translate(var(--border-width),var(--border-width))]",
  "active:shadow-[var(--border-width)_var(--border-width)_0_var(--border)]",
].join(" ");

/* El INTERLINEADO viaja pegado al tamaño, en la misma clase (deuda 13). Estuvo
   declarado aquí abajo, en las clases base, y no llegaba a aplicarse nunca: el
   tamaño de la variante entra DESPUÉS y en Tailwind cada tamaño de texto trae su
   propio `line-height`, así que `twMerge` —que resuelve ese conflicto a favor de
   lo último— descartaba el interlineado declarado y el botón se pintaba con el
   del tamaño (1.5 en vez de 1.1). La forma con barra fija las dos cosas de una
   vez y no se puede separar por reordenación. Gate: `button.variants.test.ts`,
   que asierta sobre la salida real de `cn()`, no sobre el string de `cva`. */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-(--space-2)",
    "min-h-(--touch-target)",
    "font-body font-bold",
    "border-(length:--border-width) border-solid",
    "cursor-pointer select-none",
    "transition-[transform,box-shadow] duration-(--dur-fast) ease-standard",
    "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
    "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width-heavy)",
    "disabled:cursor-not-allowed disabled:border-fg-inverse-muted disabled:bg-surface-sunken",
    "disabled:text-fg-muted disabled:shadow-none disabled:[transform:none]",
  ],
  {
    variants: {
      variant: {
        primary: `bg-accent text-accent-fg border-border ${solidInteraction}`,
        secondary: `bg-surface-raised text-fg border-border ${solidInteraction}`,
        danger: `bg-danger text-accent-fg border-border ${solidInteraction}`,
        /* La variante fantasma NO fija primer plano: lo HEREDA de la superficie
           que la contiene (deuda 17). Fijaba el primer plano claro, que es el
           mismo color que el fondo de la app, así que sobre el espresso del
           shell el botón era literalmente invisible (contraste 1.0). Heredar lo
           resuelve en el primitivo y para cualquier superficie futura, en vez de
           obligar a cada llamador a pasarle el color contrario desde fuera. El
           borde que aparece al pasar el puntero hereda igual, para no repetir el
           mismo defecto en el borde. */
        ghost:
          "bg-transparent text-current border-transparent shadow-none hover:border-current",
      },
      size: {
        md: "px-(--space-6) py-(--space-3) text-base/tight rounded-md",
        icon: "min-w-(--touch-target) p-0 text-lg/tight rounded-md",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
