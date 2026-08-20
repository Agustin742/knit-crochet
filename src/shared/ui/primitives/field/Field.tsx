"use client";

import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId,
} from "react";

import { cn } from "@/shared/ui/lib/cn";

import {
  type FieldTone,
  fieldLabelVariants,
  fieldMessageVariants,
} from "./field.variants";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;
  className?: string;
  /**
   * Sobre qué superficie se dibuja el campo (enmienda E13 c de RFC-01).
   * `inverse` es el fondo oscuro de la app, donde vive todo control que ya no
   * lleva `Card`. Por defecto, superficie clara.
   */
  tone?: FieldTone;
  /** El control (p. ej. <Input />). Field le cablea id + aria de accesibilidad. */
  children: ReactElement<ControlProps>;
}

export function Field({
  label,
  hint,
  error,
  id,
  className,
  tone = "default",
  children,
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  const hasError = error !== undefined && error !== null && error !== "";
  const message = hasError ? error : hint;
  const hasMessage = message !== undefined && message !== null && message !== "";

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: fieldId,
        "aria-invalid": hasError ? true : undefined,
        "aria-describedby": hasMessage ? messageId : undefined,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-(--space-2)", className)}>
      <label
        htmlFor={fieldId}
        className={fieldLabelVariants({ tone })}
      >
        {label}
      </label>
      {control}
      {hasMessage ? (
        <span
          id={messageId}
          className={fieldMessageVariants({ tone, invalid: hasError })}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
