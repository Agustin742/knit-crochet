"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { toggleVariants } from "./toggle.variants";

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-pressed"> {
  /** Estado actual. El control es **controlado**: no guarda estado propio. */
  pressed: boolean;
  /** Recibe el estado al que se pasa, no el actual. */
  onPressedChange?: (pressed: boolean) => void;
}

/**
 * Control conmutable y **superponible** (SDD §6, RFC-02 §1/§5).
 *
 * Es un `button` con `aria-pressed`, no un `Tabs` ni un `radiogroup`: varios
 * pueden estar activos **a la vez**, que es lo que piden sus dos consumidores
 * reales — el selector de métrica (horas / proyectos / metros, combinables) y
 * los dos botones de tipo (agujas / crochet, combinables).
 *
 * **Controlado a propósito.** Un estado interno por botón obligaría a cada
 * consumidor a espiar N `onPressedChange` para reconstruir la selección que ya
 * es suya (qué métricas se ven, qué tipos filtran), y abriría la puerta a que la
 * pantalla y el botón discrepen tras un reset o una carga desde la URL. Con el
 * estado arriba hay una sola verdad y el primitivo queda de presentación pura.
 *
 * `type="button"` fijo: dentro de un formulario, un toggle que enviara el
 * formulario al conmutarse sería el defecto que ya pagó la deuda 39 en otro
 * disfraz. Quien necesite enviar usa `Button` con `type="submit"`.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { pressed, onPressedChange, className, onClick, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-slot="toggle"
      aria-pressed={pressed}
      className={cn(toggleVariants(), className)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        onPressedChange?.(!pressed);
      }}
      {...props}
    />
  );
});
