import type { ReactNode } from "react";

import { Card } from "@/shared/ui";

export interface AuthPanelProps {
  title: string;
  subtitle: string;
  /** El formulario de la pantalla. */
  children: ReactNode;
  /** Pie con el enlace a la otra pantalla de auth. */
  footer: ReactNode;
}

/**
 * Tarjeta de las dos pantallas de auth: título, formulario y pie.
 *
 * Usa la variante elevada de `Card` **a propósito**: es la única superficie
 * donde el anillo de foco llega al contraste mínimo (3.13:1; sobre las otras dos
 * se queda en 2.95 y 2.41 — deuda 31), y estas pantallas son teclado puro.
 *
 * El ancho máximo sale de la escala de contenedores de Tailwind, no de un número
 * suelto: sin él la tarjeta se estiraría a todo el viewport en desktop.
 */
export function AuthPanel({
  title,
  subtitle,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <Card className="relative flex w-full max-w-sm flex-col gap-(--space-5) z-(--z-base)">
      <header className="flex flex-col gap-(--space-1)">
        <h1 className="font-display text-2xl leading-tight text-fg">{title}</h1>
        <p className="font-body text-sm leading-base text-fg-muted">
          {subtitle}
        </p>
      </header>
      {children}
      <p className="font-body text-sm leading-base text-fg-muted">{footer}</p>
    </Card>
  );
}
