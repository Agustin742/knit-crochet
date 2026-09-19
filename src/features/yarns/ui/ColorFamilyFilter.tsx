import {
  COLOR_FAMILIES,
  COLOR_FAMILY_LABELS,
  type ColorFamily,
  yarnSwatchClass,
} from "@/shared/config";
import { Swatch, Toggle } from "@/shared/ui";

export interface ColorFamilyFilterProps {
  value?: ColorFamily;
  onValueChange: (value: ColorFamily | undefined) => void;
}

/**
 * Fila de swatches de familia de color (RFC-04 §2/§5, design D5). Botones
 * `aria-pressed`, no un radio: es a propósito una forma distinta de la lista
 * vertical de marca→tipo, porque acá "volver a tocar la activa" la limpia —
 * la regla de "controles que se comportan distinto se ven distinto". Cada
 * `Toggle` es controlado desde `value`, así que elegir una familia nueva
 * apaga la anterior sola, sin que ningún botón se entere del otro.
 */
export function ColorFamilyFilter({
  value,
  onValueChange,
}: ColorFamilyFilterProps) {
  return (
    <div
      role="group"
      aria-label="Familia de color"
      className="flex flex-wrap gap-(--space-2)"
    >
      {COLOR_FAMILIES.map((family) => {
        const swatchClass = yarnSwatchClass(family);
        return (
          <Toggle
            key={family}
            aria-label={COLOR_FAMILY_LABELS[family]}
            pressed={value === family}
            onPressedChange={(pressed) =>
              onValueChange(pressed ? family : undefined)
            }
          >
            <Swatch size="sm" className={swatchClass} />
          </Toggle>
        );
      })}
    </div>
  );
}
