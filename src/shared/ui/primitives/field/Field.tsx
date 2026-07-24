"use client";

import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId,
} from "react";

import { cn } from "@/shared/ui/lib/cn";

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
  /** El control (p. ej. <Input />). Field le cablea id + aria de accesibilidad. */
  children: ReactElement<ControlProps>;
}

export function Field({
  label,
  hint,
  error,
  id,
  className,
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
    <div className={cn("flex flex-col gap-[var(--space-2)]", className)}>
      <label
        htmlFor={fieldId}
        className="font-body font-semibold text-sm text-fg"
      >
        {label}
      </label>
      {control}
      {hasMessage ? (
        <span
          id={messageId}
          className={cn(
            "font-mono text-xs leading-base",
            hasError ? "text-danger" : "text-fg-muted",
          )}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
