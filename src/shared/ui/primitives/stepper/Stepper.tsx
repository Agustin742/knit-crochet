"use client";

import { type ReactNode, forwardRef, useId } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { Button } from "../button/Button";
import {
  STEPPER_DECREMENT_LABEL,
  STEPPER_INCREMENT_LABEL,
  type StepperVariants,
  stepperVariants,
} from "./stepper.variants";

/** El número visible, dentro del `<output>`. Ancho mínimo fijo para que no
 * jitteree la fila cuando la cifra gana o pierde un dígito. No es pública. */
const OUTPUT_CLASSES = "min-w-(--space-8) text-center font-mono text-current";

export interface StepperProps extends StepperVariants {
  /** Estado actual. El control es **controlado**: no guarda estado propio. */
  value: number;
  /** Recibe el valor al que se pasa, nunca el actual (mismo contrato que
   * `Toggle`/`Disclosure`). */
  onValueChange: (value: number) => void;
  /** Nombra el `role="group"`. El primitivo no sabe qué está contando. */
  label: ReactNode;
  /** Piso. Sin él, decrementar no tiene límite. */
  min?: number;
  /** Techo. Su ausencia es la ausencia de un techo — decisión de quien
   * consume, no del primitivo (SDD-01 §1, deuda 168). */
  max?: number;
  /** Cuánto mueve cada activación. */
  step?: number;
  /** Cómo se pinta el número. Por defecto, `String(value)`. */
  formatValue?: (value: number) => string;
  decrementLabel?: string;
  incrementLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Incrementador/decrementador genérico (RFC-04 §7-bis E2(a), design D1).
 *
 * **Controlado a propósito, sin modo dual.** Un `value` que es estado
 * PERSISTIDO en el servidor no puede tener una segunda fuente de verdad: un
 * `PATCH` rechazado dejaría el número mostrando algo que el servidor nunca
 * aceptó. `Disclosure` puede permitirse dual porque abierto/cerrado es
 * efímero; esto no.
 *
 * **Sin manejo de teclado propio.** Los dos controles son `<button>` nativos:
 * `Enter`/`Espacio` ya los activan de fábrica, y a diferencia de `<summary>`
 * (`Disclosure.tsx`), `user-event` sí simula esa activación nativa. Añadir
 * flechas inventaría una convención que el `role="group"` no promete.
 *
 * **El número vive en `<output>`**, cuyo rol implícito es `status`: pulsar
 * `+` (el foco queda en el botón, no en el número) se anuncia solo, sin
 * fabricar una región viva a mano.
 */
export const Stepper = forwardRef<HTMLDivElement, StepperProps>(
  function Stepper(
    {
      value,
      onValueChange,
      label,
      min,
      max,
      step = 1,
      formatValue = String,
      decrementLabel = STEPPER_DECREMENT_LABEL,
      incrementLabel = STEPPER_INCREMENT_LABEL,
      disabled = false,
      size,
      className,
    },
    ref,
  ) {
    const labelId = useId();
    const atMin = min !== undefined && value <= min;
    const atMax = max !== undefined && value >= max;

    function decrement() {
      if (disabled || atMin) {
        return;
      }
      onValueChange(value - step);
    }

    function increment() {
      if (disabled || atMax) {
        return;
      }
      onValueChange(value + step);
    }

    return (
      <div
        ref={ref}
        data-slot="stepper"
        role="group"
        aria-labelledby={labelId}
        className={cn(stepperVariants({ size }), className)}
      >
        <span id={labelId}>{label}</span>
        <Button
          variant="secondary"
          size="icon"
          aria-label={decrementLabel}
          disabled={disabled || atMin}
          onClick={decrement}
        >
          −
        </Button>
        {/* El `<output>` apunta a la MISMA etiqueta que el grupo: su rol
            implícito es `status`, así que al cambiar se anuncia solo — y sin
            nombre anunciaría un número pelado en vez de decir de qué. Es el
            mismo agujero que la deuda 194 encontró en otra pantalla: el valor
            sin lo que lo identifica. Qué se está contando lo sabe `label`, que
            lo pone quien consume; este primitivo no. */}
        <output aria-labelledby={labelId} className={OUTPUT_CLASSES}>
          {formatValue(value)}
        </output>
        <Button
          variant="secondary"
          size="icon"
          aria-label={incrementLabel}
          disabled={disabled || atMax}
          onClick={increment}
        >
          +
        </Button>
      </div>
    );
  },
);
