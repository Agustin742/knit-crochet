import { cva, type VariantProps } from "class-variance-authority";

/* Ref: RFC-04 §1/§7-bis E2(a) — un incrementador/decrementador GENÉRICO
   (deuda 168 desde su nacimiento, no saldada acá): el design system no sabe
   qué es una lana ni un "usedQuantity", sólo un `value` numérico con piso y
   techo opcionales. `sm`/`md` sólo cambian el hueco entre controles y el
   tamaño del número, igual que `disclosureSizes`. */
const stepperSizes = {
  sm: "gap-(--space-2) text-sm/tight",
  md: "gap-(--space-3) text-base/tight",
} as const;

export type StepperSize = keyof typeof stepperSizes;

export const STEPPER_SIZES = Object.keys(stepperSizes) as StepperSize[];

/** Copia por defecto de los dos controles. Exportada para que los tests la
 * importen en vez de reescribirla, y para que un consumidor la sobrescriba. */
export const STEPPER_DECREMENT_LABEL = "Restar";
export const STEPPER_INCREMENT_LABEL = "Sumar";

export const stepperVariants = cva(["inline-flex items-center"], {
  variants: {
    size: stepperSizes,
  },
  defaultVariants: {
    size: "md",
  },
});

export type StepperVariants = VariantProps<typeof stepperVariants>;
