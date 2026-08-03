import type { RefObject } from "react";

export interface FocusableField<Key extends string> {
  key: Key;
  ref: RefObject<HTMLElement | null>;
}

/**
 * Mueve el foco al primer control inválido, en el orden visual del formulario.
 *
 * Por qué hace falta (deuda 38): el mensaje que pinta `Field` es un `span`
 * asociado por `aria-describedby`, **no** una región viva, así que un error que
 * aparece DESPUÉS del envío no se anuncia. Enfocar el control es lo que hace que
 * el lector de pantalla lea la etiqueta, el estado de invalidez y el mensaje, sin
 * duplicar el texto en otra región ni tocar el design system.
 *
 * Devuelve si movió el foco, para que el llamador pueda decidir qué hacer cuando
 * el error no pertenece a ningún campo (ahí es `AuthFormError` quien anuncia).
 */
export function focusFirstInvalid<Key extends string>(
  fields: readonly FocusableField<Key>[],
  errors: Partial<Record<Key, string>>,
): boolean {
  for (const { key, ref } of fields) {
    if (errors[key] !== undefined && ref.current !== null) {
      ref.current.focus();
      return true;
    }
  }

  return false;
}
