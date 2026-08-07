import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import {
  type ProgressFillVariants,
  progressFillVariants,
  progressTrackVariants,
} from "./progress-bar.variants";

/** El contrato del primitivo es una escala 0-100 (porcentaje), no una razón. */
export const PROGRESS_MIN = 0;
export const PROGRESS_MAX = 100;

/**
 * Qué pasa con un valor fuera de rango (decisión de #33): **se acota, no se
 * lanza**. El progreso de un proyecto lo calcula el backend a partir de datos
 * que el usuario edita a mano (`rounds` / `targetRounds`, PRD §4.2), así que un
 * 140% o un `NaN` —una división por cero— son entradas realistas, y una barra
 * que rompe la página por un dato feo es peor que una barra llena.
 *
 * - Fuera de rango → al extremo más cercano (`-20` → 0, `140` → 100).
 * - No finito (`NaN`, ±`Infinity`) → **0**. `NaN` no tiene extremo cercano, y 0
 *   es el único valor que no afirma un progreso que nadie midió; `Infinity` cae
 *   en la misma rama por coherencia de "valor no medible" (llenar la barra ante
 *   un dato roto diría "terminado", que es la mentira cara).
 *
 * Lo que se acota es **lo que se muestra Y lo que se anuncia**: `aria-valuenow`
 * lleva el valor acotado, nunca el crudo, para que el lector de pantalla y el
 * píxel cuenten lo mismo.
 */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return PROGRESS_MIN;
  }
  return Math.min(PROGRESS_MAX, Math.max(PROGRESS_MIN, value));
}

export interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    ProgressFillVariants {
  /** Porcentaje 0-100. Fuera de rango se acota (ver `clampProgress`). */
  value: number;
  /**
   * Nombre accesible. Es **obligatorio**: una barra de progreso sin nombre es
   * una violación de `axe` (`aria-progressbar-name`) y no dice nada de qué mide.
   * Quien prefiera apuntar a un elemento existente puede pasar además
   * `aria-labelledby`, que gana sobre `aria-label`.
   */
  label: string;
}

/**
 * Barra de progreso (SDD §6). `role="progressbar"` sobre elementos propios en
 * vez de `<progress>`: el carril y el relleno son dos superficies con borde y
 * sombra propios del brutalismo, y `<progress>` sólo se estila de forma portable
 * con pseudo-elementos por motor.
 */
export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  function ProgressBar({ value, label, tone, className, ...props }, ref) {
    const current = clampProgress(value);

    return (
      <div
        ref={ref}
        data-slot="progress-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={PROGRESS_MIN}
        aria-valuemax={PROGRESS_MAX}
        aria-valuenow={current}
        className={cn(progressTrackVariants(), className)}
        {...props}
      >
        <span
          data-slot="progress-bar-fill"
          aria-hidden="true"
          className={progressFillVariants({ tone })}
          style={{ width: `${current}%` }}
        />
      </div>
    );
  },
);
