import { useId, type RefObject } from "react";

import {
  COLOR_FAMILIES,
  COLOR_FAMILY_LABELS,
  type ColorFamily,
  yarnSwatchClass,
} from "@/shared/config";
import { Swatch, Toggle } from "@/shared/ui";

export interface ColorFamilyPickerProps {
  value: ColorFamily | null;
  /** Nunca emite "ninguna": re-presionar la activa es un no-op (design D4). */
  onValueChange: (value: ColorFamily) => void;
  error?: string;
  disabled?: boolean;
  focusRef?: RefObject<HTMLButtonElement | null>;
}

const GROUP_LABEL = "Familia de color";

/**
 * Selector de familia de color de Identidad, obligatorio (design D4, RFC-04
 * §7-quater E3(c)). No es `ColorFamilyFilter` con un flag: el filtro puede
 * quedar en "ninguna" y ésta no — las dos formas comparten look (mismos
 * primitivos) pero no comportamiento, y "un control que se comporta distinto
 * se ve distinto" ya está resuelto porque nunca conviven en la misma
 * pantalla (el modal cubre la página).
 *
 * `<fieldset>` + `<legend>` en vez de un `role="group"` a mano: mismo patrón
 * que `NeedlesField`. Presentacional puro — sin `"use client"` — porque sólo
 * se monta dentro del `Dialog` de alta/edición, que ya es la frontera de
 * cliente.
 */
export function ColorFamilyPicker({
  value,
  onValueChange,
  error,
  disabled = false,
  focusRef,
}: ColorFamilyPickerProps) {
  const hasError = error !== undefined && error !== "";
  const errorId = useId();

  return (
    <fieldset
      className="m-0 flex flex-col gap-(--space-3) border-0 p-0"
      aria-describedby={hasError ? errorId : undefined}
      aria-invalid={hasError ? true : undefined}
    >
      <legend className="mb-(--space-2) p-0 font-mono text-xs uppercase tracking-label text-fg">
        {GROUP_LABEL}
        {value !== null ? (
          <span
            aria-hidden="true"
            className="ml-(--space-2) font-body text-sm normal-case tracking-normal text-fg-muted"
          >
            {COLOR_FAMILY_LABELS[value]}
          </span>
        ) : null}
      </legend>
      <div className="flex flex-wrap gap-(--space-2)">
        {COLOR_FAMILIES.map((family, index) => {
          const pressed = value === family;
          const isFocusTarget = value === null ? index === 0 : pressed;
          return (
            <Toggle
              key={family}
              ref={isFocusTarget ? focusRef : undefined}
              aria-label={COLOR_FAMILY_LABELS[family]}
              pressed={pressed}
              disabled={disabled}
              onPressedChange={(next) => {
                if (next) {
                  onValueChange(family);
                }
              }}
            >
              <Swatch size="sm" className={yarnSwatchClass(family)} />
            </Toggle>
          );
        })}
      </div>
      {hasError ? (
        <span id={errorId} className="font-mono text-xs leading-base text-danger">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}
