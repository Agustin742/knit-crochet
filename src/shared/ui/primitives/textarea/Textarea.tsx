import { type TextareaHTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { inputClasses } from "../field/Input";

/**
 * Altura de partida, **en líneas**.
 *
 * Se pide con `rows` y no con una altura mínima en CSS a propósito: el sistema
 * no tiene un token de "alto de área de texto", y **inventar una longitud suelta
 * sería justo el número crudo que la regla token-first prohíbe**. `rows` cuenta
 * líneas, así que la caja crece con la tipografía y el interlineado del sistema
 * sin que este archivo sepa cuánto miden.
 *
 * Cuatro líneas es lo que hace que la caja se lea como "acá va un párrafo" en
 * vez de como un `Input` estirado. El llamador puede subirlo o bajarlo.
 */
export const TEXTAREA_DEFAULT_ROWS = 4;

/**
 * Piel del área de texto (enmienda **E6 (b)** del RFC-03).
 *
 * **Derivada de `inputClasses`, no copiada** — mismo motivo que en `Select`: es
 * el mismo control con otra caja, y el anillo de error lo sigue disparando
 * `aria-invalid`, que cablea `Field`.
 *
 * Lo propio es el **redimensionado sólo vertical**: las notas de un proyecto
 * pueden ser largas y quien escribe necesita ver más de una vez; dejar crecer
 * también a lo ancho rompería la columna del formulario y el tope de contenido
 * de la app (RFC-01, E13).
 */
export const textareaClasses = [inputClasses, "resize-y"].join(" ");

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, rows, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows ?? TEXTAREA_DEFAULT_ROWS}
        className={cn(textareaClasses, className)}
        {...props}
      />
    );
  },
);
