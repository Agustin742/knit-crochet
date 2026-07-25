import { cva, type VariantProps } from "class-variance-authority";

/* Acceso táctil del bottom-nav (< tablet). Target ≥ --touch-target; la
   activa se marca por color de acento. Todo por token. */
export const bottomNavItemVariants = cva(
  [
    "flex min-h-[var(--touch-target)] min-w-[var(--touch-target)] flex-1 flex-col items-center justify-center gap-[var(--space-1)]",
    "px-[var(--space-1)] py-[var(--space-2)] no-underline",
    "font-body text-xs font-bold uppercase tracking-label",
    "transition-colors duration-[var(--dur-fast)] ease-standard",
    "focus-visible:outline focus-visible:outline-[length:var(--border-width-heavy)]",
    "focus-visible:outline-[color:var(--focus)] focus-visible:[outline-offset:calc(-1*var(--border-width-heavy))]",
  ],
  {
    variants: {
      active: {
        true: "text-accent",
        false: "text-fg-inverse-muted hover:text-fg-inverse",
      },
    },
    defaultVariants: { active: false },
  },
);

export type BottomNavItemVariants = VariantProps<typeof bottomNavItemVariants>;
