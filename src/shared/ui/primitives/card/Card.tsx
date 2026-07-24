import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { type CardVariants, cardVariants } from "./card.variants";

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    CardVariants {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
});
