"use client";

import { type HTMLAttributes, type ReactNode, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import {
  segmentedControlOptionVariants,
  segmentedControlVariants,
} from "./segmented-control.variants";

export interface SegmentedControlOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "role" | "onChange"> {
  /** Nombre accesible del conjunto ("Estado del proyecto"). */
  label: string;
  /** Las opciones, en el orden en que se pintan. Mínimo dos. */
  options: readonly SegmentedControlOption[];
  /** La elegida. **Es un valor, no una lista**: ahí vive la exclusividad. */
  value: string;
  /** Recibe el valor de la opción tocada, incluso si ya era la elegida. */
  onValueChange: (value: string) => void;
}

/**
 * Segmentado: **se elige exactamente una** opción (enmienda E2(c) del RFC-03).
 *
 * Es el compañero opuesto del `Toggle`, y existe porque **controles que se
 * comportan distinto tienen que verse distinto**. En `/proyectos` convivían
 * cuatro botones idénticos en fila —dos excluyentes y dos acumulables— sin una
 * sola señal visual que los distinguiera, y la decisión anterior (E1(i))
 * justificó reusar el `Toggle` con el coste de tocar un gate del arnés. Eso es
 * exactamente lo que la regla "el template es un SUELO, no un techo" prohíbe:
 * aquí la pieza correcta no existía, así que **se crea y se paga su gate**
 * (`public-api.test.ts` está anclado al literal y se toca a propósito).
 *
 * **La exclusividad es estructural, no una convención del consumidor.** `value`
 * es un escalar: no hay forma de representar "ninguna elegida" ni "dos
 * elegidas", así que ningún consumidor puede romper la promesa por descuido —
 * que es justo lo que un `ToggleGroup` no podía garantizar.
 *
 * **`role="group"` + `aria-pressed`, no `radiogroup` ni `tablist`** (RFC-03 §5 y
 * el JSDoc de `ToggleGroup`): un `radiogroup` promete la navegación por flechas
 * de un grupo de radios y `tablist` promete paneles asociados. Aquí cada opción
 * es un botón que se pulsa y anuncia su estado, y se recorren con el tabulador
 * como cualquier botón.
 *
 * Presentación pura: no guarda estado. Quien lo monta decide qué está elegido,
 * igual que con `Toggle`.
 */
export const SegmentedControl = forwardRef<
  HTMLDivElement,
  SegmentedControlProps
>(function SegmentedControl(
  { label, options, value, onValueChange, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="segmented-control"
      role="group"
      aria-label={label}
      className={cn(segmentedControlVariants(), className)}
      {...props}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          data-slot="segmented-control-option"
          aria-pressed={option.value === value}
          disabled={option.disabled}
          className={segmentedControlOptionVariants({
            position: positionOf(index, options.length),
            divided: index > 0,
          })}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

/** Qué extremo del carril ocupa cada opción: sólo los extremos van redondeados. */
function positionOf(
  index: number,
  total: number,
): "only" | "first" | "middle" | "last" {
  if (total === 1) {
    return "only";
  }
  if (index === 0) {
    return "first";
  }
  return index === total - 1 ? "last" : "middle";
}
