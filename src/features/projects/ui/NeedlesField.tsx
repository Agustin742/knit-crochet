"use client";

import { useState } from "react";

import { Button, Field, Select } from "@/shared/ui";

import {
  FORM_FIELD_LABELS,
  MAX_NEEDLES,
  NEEDLES_ADD_BUTTON_LABEL,
  NEEDLES_ADD_LABEL,
  NEEDLES_EMPTY,
  NEEDLES_FULL_HINT,
  NEEDLES_LIST_LABEL,
  addNeedle,
  needleChoices,
  removeNeedle,
  removeNeedleLabel,
} from "./project-form";
import { needleOptionLabel } from "./ProjectsToolbar";

export interface NeedlesFieldProps {
  needles: readonly number[];
  onNeedlesChange: (needles: number[]) => void;
  disabled?: boolean;
}

/**
 * El control de agujas del formulario (RFC-03 §2, enmienda **E6 (e)**).
 *
 * **Vive en la feature y no en el design system**, y ésa es la decisión de la
 * enmienda: `needles` es un `number[]` de hasta veinte medidas en milímetros y
 * "aguja" es vocabulario de tejido, no de un sistema de diseño. Misma frontera
 * que la de la subida de la foto (E6 c).
 *
 * **Es un grupo, no un campo.** Un `<fieldset>` con su `<legend>`: lo que hay
 * dentro son varios controles —la lista de lo anotado y el par elegir/añadir— y
 * una sola etiqueta no puede nombrarlos a todos. Cada botón de quitar **nombra
 * su medida**, porque en una fila de N chips "Quitar" a secas no dice cuál.
 *
 * **Se elige de un catálogo cerrado y no se teclea.** Las medidas son un
 * conjunto estándar del dominio (`NEEDLE_SIZES`) y es exactamente el mismo que
 * ofrece el filtro de "más filtros": una medida fuera de esa lista quedaría
 * anotada y **nunca encontrable**. Y lo ya anotado desaparece del desplegable,
 * porque añadir lo que ya está no cambiaría nada.
 *
 * **Con el tope alcanzado el par de añadir desaparece y se dice por qué.**
 * Dejarlo desactivado sería un control que no explica su estado; dejarlo activo
 * mandaría un array de veintiuno que el esquema rechaza con un 400.
 */
export function NeedlesField({
  needles,
  onNeedlesChange,
  disabled = false,
}: NeedlesFieldProps) {
  const [chosen, setChosen] = useState<string>("");
  const choices = needleChoices(needles);
  /* El valor del desplegable se DERIVA en vez de sincronizarse con un efecto:
     al añadir una medida, la elegida desaparece de las opciones y el repliegue
     es la primera que quede. Guardarlo y "corregirlo" después deja un render
     entero con un valor que ya no existe entre las opciones. */
  const pending =
    chosen !== "" && choices.includes(Number(chosen))
      ? Number(chosen)
      : (choices[0] ?? null);

  const full = needles.length >= MAX_NEEDLES || choices.length === 0;

  return (
    <fieldset className="m-0 flex flex-col gap-(--space-3) border-0 p-0">
      <legend className="mb-(--space-2) p-0 font-mono text-xs uppercase tracking-label text-fg">
        {FORM_FIELD_LABELS.needles}
      </legend>

      {needles.length === 0 ? (
        <p className="m-0 font-body text-base leading-base text-fg-muted">
          {NEEDLES_EMPTY}
        </p>
      ) : (
        <ul
          aria-label={NEEDLES_LIST_LABEL}
          className="m-0 flex list-none flex-wrap gap-(--space-2) p-0"
        >
          {needles.map((size) => (
            <li key={size} className={NEEDLE_CHIP_CLASSES}>
              <span className="font-mono text-sm leading-base text-fg">
                {needleOptionLabel(size)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={removeNeedleLabel(size)}
                onClick={() => {
                  onNeedlesChange(removeNeedle(needles, size));
                }}
              >
                <span aria-hidden="true">×</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="m-0 font-body text-base leading-base text-fg-muted">
          {NEEDLES_FULL_HINT}
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-(--space-3)">
          <Field label={NEEDLES_ADD_LABEL} className="min-w-0 flex-1">
            <Select
              value={pending === null ? "" : String(pending)}
              disabled={disabled}
              onChange={(event) => {
                setChosen(event.target.value);
              }}
            >
              {choices.map((size) => (
                <option key={size} value={String(size)}>
                  {needleOptionLabel(size)}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            variant="secondary"
            disabled={disabled || pending === null}
            onClick={() => {
              if (pending !== null) {
                onNeedlesChange(addNeedle(needles, pending));
              }
            }}
          >
            {NEEDLES_ADD_BUTTON_LABEL}
          </Button>
        </div>
      )}
    </fieldset>
  );
}

/**
 * El chip de una medida anotada: caja con borde, la medida en monoespaciada —es
 * un dato, no un título— y su salida al lado. **Secundario en la jerarquía del
 * formulario**: lo primario es guardar, así que el chip no lleva relleno sólido
 * que compita con el botón de envío.
 */
const NEEDLE_CHIP_CLASSES = [
  "inline-flex items-center gap-(--space-2)",
  "border-(length:--border-width) border-solid border-border rounded-sm",
  "bg-surface pl-(--space-3)",
].join(" ");
