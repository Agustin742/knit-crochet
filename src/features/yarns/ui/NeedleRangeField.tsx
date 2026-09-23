import type { RefObject } from "react";

import { Field, Input } from "@/shared/ui";

export interface NeedleRangeFieldProps {
  min: string;
  max: string;
  onMinChange: (text: string) => void;
  onMaxChange: (text: string) => void;
  minError?: string;
  maxError?: string;
  disabled?: boolean;
  minRef?: RefObject<HTMLInputElement | null>;
  maxRef?: RefObject<HTMLInputElement | null>;
}

const LEGEND = "Aguja recomendada (mm)";
const MIN_LABEL = "Mínimo";
const MAX_LABEL = "Máximo";

/**
 * Rango de aguja de Ficha técnica (design D6). Feature-local y no
 * `NeedlesField`: `{min,max}` es un par de esta lana, no la lista abierta de
 * agujas de un proyecto — comparten el patrón `fieldset`+`legend`, no el
 * dato. Cada borde es texto (design D11): se parsea una sola vez al enviar,
 * en `yarn-form.ts`, así que acá sólo reenvía el texto crudo. Presentacional
 * puro, sin `"use client"` — sólo se monta dentro del shell cliente.
 */
export function NeedleRangeField({
  min,
  max,
  onMinChange,
  onMaxChange,
  minError,
  maxError,
  disabled = false,
  minRef,
  maxRef,
}: NeedleRangeFieldProps) {
  return (
    <fieldset className="m-0 flex flex-col gap-(--space-3) border-0 p-0">
      <legend className="mb-(--space-2) p-0 font-mono text-xs uppercase tracking-label text-fg">
        {LEGEND}
      </legend>
      <div className="flex flex-wrap gap-(--space-3)">
        <Field label={MIN_LABEL} error={minError} className="min-w-0 flex-1">
          <Input
            ref={minRef}
            inputMode="decimal"
            value={min}
            disabled={disabled}
            onChange={(event) => {
              onMinChange(event.target.value);
            }}
          />
        </Field>
        <Field label={MAX_LABEL} error={maxError} className="min-w-0 flex-1">
          <Input
            ref={maxRef}
            inputMode="decimal"
            value={max}
            disabled={disabled}
            onChange={(event) => {
              onMaxChange(event.target.value);
            }}
          />
        </Field>
      </div>
    </fieldset>
  );
}
