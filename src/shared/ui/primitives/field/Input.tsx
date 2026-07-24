import { type InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

/* Estilos del control de texto (ref: .kc-input). El estado de error se dispara
   por aria-invalid (lo cablea Field), no por una clase manual. Todo por token:
   el anillo de error deriva de --danger vía color-mix. */
export const inputClasses = [
  "box-border w-full min-h-[var(--touch-target)]",
  "px-[var(--space-4)] py-[var(--space-2)]",
  "font-body text-base leading-base",
  "border-[length:var(--border-width)] border-solid border-border rounded-sm",
  "bg-surface-raised text-fg",
  "focus-visible:outline focus-visible:outline-[length:var(--border-width-heavy)]",
  "focus-visible:outline-[color:var(--focus)] focus-visible:outline-offset-[var(--border-width)]",
  "aria-[invalid=true]:border-danger",
  "aria-[invalid=true]:shadow-[0_0_0_var(--border-width-heavy)_color-mix(in_srgb,var(--danger)_15%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted",
].join(" ");

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputClasses, className)} {...props} />;
});
