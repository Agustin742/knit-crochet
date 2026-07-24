import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { type ButtonVariants, buttonVariants } from "./button.variants";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading = false, disabled, type, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="animate-spin font-mono" aria-hidden="true">
          ✳
        </span>
      ) : null}
      {children}
    </button>
  );
});
