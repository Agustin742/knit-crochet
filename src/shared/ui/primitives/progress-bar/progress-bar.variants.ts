import { cva, type VariantProps } from "class-variance-authority";

/* Ref: .kc-progress / .kc-progress__fill. Carril de borde grueso y radio chico
   (brutalismo) con el relleno a ras. Todo por token: el alto es un escalón de
   espaciado, no una medida suelta.

   El carril declara fondo Y primer plano en la misma capa (la regla de
   superficies que dejó escrita la deuda 32): es una superficie clara dentro de
   una app oscura, y cualquier texto que un llamador ponga encima —o un botón
   fantasma, que hereda `currentColor`— quedaría invisible si sólo declarase el
   fondo. */
export const progressTrackVariants = cva([
  "w-full overflow-hidden",
  "h-(--space-4)",
  "border-(length:--border-width) border-solid border-border rounded-sm",
  "bg-brand-cream text-fg",
]);

/* Los tonos del relleno se declaran en un objeto propio para poder derivar de
   él los NOMBRES públicos de la variante (`PROGRESS_TONES`). El ancla de
   contrato de `ProgressBar.test.tsx` compara esa lista contra el literal, así
   que añadir o quitar un tono se ve en rojo (REGLA 2a). */
const progressFillTones = {
  accent: "bg-accent",
  success: "bg-success",
} as const;

export type ProgressTone = keyof typeof progressFillTones;

export const PROGRESS_TONES = Object.keys(progressFillTones) as ProgressTone[];

export const progressFillVariants = cva(
  ["block h-full", "transition-[width] duration-(--dur-base) ease-standard"],
  {
    variants: {
      tone: progressFillTones,
    },
    defaultVariants: {
      tone: "accent",
    },
  },
);

export type ProgressFillVariants = VariantProps<typeof progressFillVariants>;
