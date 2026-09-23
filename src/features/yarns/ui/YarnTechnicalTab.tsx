import type { RefObject } from "react";

import { Field, Input } from "@/shared/ui";

import { NeedleRangeField } from "./NeedleRangeField";
import type { YarnFormErrors, YarnFormValues } from "./yarn-form";

export interface YarnTechnicalTabProps {
  values: YarnFormValues;
  errors: YarnFormErrors;
  onChange: (patch: Partial<YarnFormValues>) => void;
  disabled: boolean;
  lengthRef?: RefObject<HTMLInputElement | null>;
  fiberRef?: RefObject<HTMLInputElement | null>;
  needleMinRef?: RefObject<HTMLInputElement | null>;
  needleMaxRef?: RefObject<HTMLInputElement | null>;
  thicknessRef?: RefObject<HTMLInputElement | null>;
  lotRef?: RefObject<HTMLInputElement | null>;
  quantityRef?: RefObject<HTMLInputElement | null>;
}

const LENGTH_LABEL = "Largo (m)";
const FIBER_LABEL = "Fibra";
const THICKNESS_LABEL = "Grosor (mm)";
const LOT_LABEL = "Lote";
const QUANTITY_LABEL = "Stock (ovillos)";

/**
 * Pestaña «Ficha técnica» del alta/edición de lanas (design D2, D5, D6, D11;
 * RFC-04 §7-quater E3(a)/E3(d)). Controlada desde el shell (`YarnFormDialog`,
 * S5): sin estado propio, así que un valor sobrevive el cambio de pestaña
 * (D2). Nunca ofrece `usedQuantity` — ese campo es exclusivo del stepper del
 * cajón de detalle (spec `yarn-detail-editing`).
 *
 * `lot` es un `Input type="date"` nativo (design D5): el valor
 * `YYYY-MM-DD` es exactamente lo que `z.coerce.date` espera y lo que
 * `lotInputValue`/`yarnPatch` (`yarn-form.ts`) ya construyen y comparan en
 * UTC. Presentacional puro, sin `"use client"` — sólo se monta dentro del
 * shell cliente.
 */
export function YarnTechnicalTab({
  values,
  errors,
  onChange,
  disabled,
  lengthRef,
  fiberRef,
  needleMinRef,
  needleMaxRef,
  thicknessRef,
  lotRef,
  quantityRef,
}: YarnTechnicalTabProps) {
  return (
    <div className="flex flex-col gap-(--space-4)">
      <Field label={LENGTH_LABEL} error={errors.length} className="min-w-0">
        <Input
          ref={lengthRef}
          inputMode="decimal"
          value={values.length}
          disabled={disabled}
          onChange={(event) => {
            onChange({ length: event.target.value });
          }}
        />
      </Field>

      <Field label={FIBER_LABEL} error={errors.fiber} className="min-w-0">
        <Input
          ref={fiberRef}
          value={values.fiber}
          disabled={disabled}
          onChange={(event) => {
            onChange({ fiber: event.target.value });
          }}
        />
      </Field>

      <NeedleRangeField
        min={values.needleMin}
        max={values.needleMax}
        onMinChange={(text) => {
          onChange({ needleMin: text });
        }}
        onMaxChange={(text) => {
          onChange({ needleMax: text });
        }}
        minError={errors.needleMin}
        maxError={errors.needleMax}
        disabled={disabled}
        minRef={needleMinRef}
        maxRef={needleMaxRef}
      />

      <Field
        label={THICKNESS_LABEL}
        error={errors.thickness}
        className="min-w-0"
      >
        <Input
          ref={thicknessRef}
          inputMode="decimal"
          value={values.thickness}
          disabled={disabled}
          onChange={(event) => {
            onChange({ thickness: event.target.value });
          }}
        />
      </Field>

      <Field label={LOT_LABEL} error={errors.lot} className="min-w-0">
        <Input
          ref={lotRef}
          type="date"
          value={values.lot}
          disabled={disabled}
          onChange={(event) => {
            onChange({ lot: event.target.value });
          }}
        />
      </Field>

      <Field
        label={QUANTITY_LABEL}
        error={errors.quantity}
        className="min-w-0"
      >
        <Input
          ref={quantityRef}
          inputMode="numeric"
          value={values.quantity}
          disabled={disabled}
          onChange={(event) => {
            onChange({ quantity: event.target.value });
          }}
        />
      </Field>
    </div>
  );
}
