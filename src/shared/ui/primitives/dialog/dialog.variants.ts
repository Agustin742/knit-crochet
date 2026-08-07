import { cva, type VariantProps } from "class-variance-authority";

/* Ref: .kc-scrim / .kc-dialog. El velo cubre la ventana y centra el panel; el
   panel es una superficie elevada con borde pesado y sombra dura.

   Z-INDEX: velo en `--z-overlay` y panel en `--z-modal`, los dos escalones que
   el SDD §5 reserva justo por encima de `--z-nav` y por debajo de `--z-toast`.
   Que existan esos tokens es también la razón de montar el diálogo en un portal
   al `body` (ver `Dialog.tsx`): dentro del árbol de la página, un ancestro con
   `transform` —el archivero tiene varios— crea contexto de apilamiento y deja al
   panel por debajo del nav por mucho que su `z-index` sea 300.

   El panel usa la superficie ELEVADA a propósito: es la única del sistema donde
   el anillo de foco llega al contraste mínimo (deuda 31), y un diálogo es todo
   navegación por teclado. */
export const dialogScrimVariants = cva([
  "fixed inset-0 flex items-center justify-center",
  "p-(--space-4)",
  "bg-fg/50",
  "z-(--z-overlay)",
]);

/* Los anchos se declaran en un objeto propio para poder derivar de él los
   NOMBRES públicos de la variante (`DIALOG_SIZES`), que el ancla de contrato
   compara contra el literal (REGLA 2a). */
const dialogSizes = {
  md: "max-w-md",
  lg: "max-w-2xl",
} as const;

export type DialogSize = keyof typeof dialogSizes;

export const DIALOG_SIZES = Object.keys(dialogSizes) as DialogSize[];

export const dialogPanelVariants = cva(
  [
    "relative flex w-full flex-col gap-(--space-3)",
    "max-h-full overflow-auto",
    "p-(--space-5)",
    "border-(length:--border-width-heavy) border-solid border-border rounded-md",
    "bg-surface-raised text-fg shadow-hard-lg",
    "z-(--z-modal)",
    "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
    "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width-heavy)",
  ],
  {
    variants: {
      size: dialogSizes,
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type DialogVariants = VariantProps<typeof dialogPanelVariants>;

export const dialogHeaderVariants = cva([
  "flex items-start justify-between gap-(--space-3)",
]);

export const dialogTitleVariants = cva([
  "m-0 font-display text-xl/tight text-fg",
]);

export const dialogDescriptionVariants = cva([
  "m-0 font-body text-sm leading-base text-fg-muted",
]);
