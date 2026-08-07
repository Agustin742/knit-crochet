import { cva, type VariantProps } from "class-variance-authority";

/* Ref: .kc-empty / .kc-error. Los dos estados son el MISMO panel centrado
   (título + descripción + acción) y se diferencian en el tono: el vacío es una
   superficie tranquila del sistema; el de error se enmarca en `--danger` para
   que se distinga de un contenido normal sin depender sólo del texto.

   Comparten base a propósito (decisión de #33): son la misma composición y la
   misma a11y cableada. Dos implementaciones paralelas divergirían en el primer
   arreglo —justo lo que pasó con los guardrails de lista fija— y ninguno de los
   dos tiene comportamiento propio: lo específico del error (reintentar, rol de
   alerta) cabe en su envoltorio.

   Los tonos se declaran en un objeto propio para poder derivar de él los NOMBRES
   públicos de la variante (`STATE_PANEL_TONES`), que el ancla de contrato
   compara contra el literal (REGLA 2a).

   Regla de superficies (deudas 17 y 32): las dos declaran fondo Y primer plano,
   porque el slot de acción suele traer un botón fantasma, que hereda el color
   del contexto. */
const statePanelTones = {
  neutral: "border-border bg-surface text-fg shadow-none",
  danger: "border-danger bg-surface text-fg shadow-hard",
} as const;

export type StatePanelTone = keyof typeof statePanelTones;

export const STATE_PANEL_TONES = Object.keys(
  statePanelTones,
) as StatePanelTone[];

export const statePanelVariants = cva(
  [
    "flex flex-col items-center gap-(--space-3) text-center",
    "p-(--space-8)",
    "border-(length:--border-width) border-solid rounded-md",
  ],
  {
    variants: {
      tone: statePanelTones,
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type StatePanelVariants = VariantProps<typeof statePanelVariants>;

export const statePanelTitleVariants = cva([
  "m-0 font-display text-xl/tight text-fg",
]);

export const statePanelDescriptionVariants = cva([
  "m-0 font-body text-sm leading-base text-fg-muted",
]);
