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

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-[var(--space-2)]",
    "min-h-[var(--touch-target)]",
    "font-body font-bold leading-tight",
    "border-[length:var(--border-width)] border-solid",
    "cursor-pointer select-none",
    "transition-[transform,box-shadow] duration-[var(--dur-fast)] ease-standard",
    "focus-visible:outline focus-visible:outline-[length:var(--border-width-heavy)]",
    "focus-visible:outline-[color:var(--focus)] focus-visible:outline-offset-[var(--border-width-heavy)]",
    "disabled:cursor-not-allowed disabled:border-fg-inverse-muted disabled:bg-surface-sunken",
    "disabled:text-fg-muted disabled:shadow-none disabled:[transform:none]",
  ],
  {
    variants: {
      variant: {
        primary: `bg-accent text-accent-fg border-border ${solidInteraction}`,
        secondary: `bg-surface-raised text-fg border-border ${solidInteraction}`,
        danger: `bg-danger text-accent-fg border-border ${solidInteraction}`,
        ghost:
          "bg-transparent text-fg border-transparent shadow-none hover:border-border",
      },
      size: {
        md: "px-[var(--space-6)] py-[var(--space-3)] text-base rounded-md",
        icon: "min-w-[var(--touch-target)] p-0 text-lg rounded-md",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
