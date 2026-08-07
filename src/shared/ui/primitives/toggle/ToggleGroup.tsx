import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { toggleGroupVariants } from "./toggle.variants";

export interface ToggleGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
  /** Nombre accesible del conjunto ("Métricas", "Tipo de tejido"). */
  label: string;
}

/**
 * Carril de varios `Toggle` (SDD §6).
 *
 * `role="group"` con nombre, **no** `radiogroup` ni `tablist`: los dos últimos
 * prometen exactamente una opción activa y aquí se pueden combinar. Sin el
 * nombre, un lector de pantalla anuncia tres botones sueltos sin decir de qué
 * conjunto son.
 *
 * **No gestiona estado ni impone exclusividad**: es un contenedor con nombre.
 * Quien lo consume decide qué hay activo, que es justo lo que un control
 * superponible necesita poder decidir.
 */
export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(
  function ToggleGroup({ label, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="toggle-group"
        role="group"
        aria-label={label}
        className={cn(toggleGroupVariants(), className)}
        {...props}
      />
    );
  },
);
