import { type SelectHTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { inputClasses } from "../field/Input";

/**
 * Piel del desplegable (enmienda **E6 (b)** del RFC-03).
 *
 * **Se DERIVA de `inputClasses`, no se copia.** `Select` y `Input` son el mismo
 * control con otra caja: mismo borde, misma superficie, mismo objetivo táctil y
 * el mismo anillo de error disparado por `aria-invalid` (que cablea `Field`).
 * Clonar la lista sería garantizar que dentro de tres meses el borde de uno y el
 * del otro no coincidan.
 *
 * Lo único propio es el **cursor**: un desplegable se abre, y el puntero es la
 * primera señal de que esto no es una caja donde escribir.
 *
 * **La flecha la pinta el navegador, a propósito.** Quitarla (`appearance-none`)
 * obliga a redibujar la única señal que dice "esto despliega" y a mantenerla
 * sincronizada con el estado abierto/cerrado, que el CSS no ve. Mientras la
 * decisión de diseño sea la caja del control, la flecha nativa es la afordancia
 * correcta y gratis. Un indicador propio es una decisión de RFC, no de este
 * archivo.
 */
export const selectClasses = [inputClasses, "cursor-pointer"].join(" ");

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(selectClasses, className)} {...props}>
      {children}
    </select>
  );
});
