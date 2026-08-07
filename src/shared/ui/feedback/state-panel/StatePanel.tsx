import { type HTMLAttributes, type ReactNode, forwardRef, useId } from "react";

import { cn } from "@/shared/ui/lib/cn";

import {
  type StatePanelVariants,
  statePanelDescriptionVariants,
  statePanelTitleVariants,
  statePanelVariants,
} from "./state-panel.variants";

/** Niveles admitidos para el título. Ver `headingLevel` en las props. */
export const STATE_PANEL_HEADING_LEVELS = [2, 3, 4] as const;

export type StatePanelHeadingLevel =
  (typeof STATE_PANEL_HEADING_LEVELS)[number];

export interface StatePanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "title">,
    StatePanelVariants {
  title: ReactNode;
  description?: ReactNode;
  /** Slot de acción: lo decide quien consume (un `Button`, dos, un enlace…). */
  action?: ReactNode;
  /**
   * Nivel del encabezado. El panel no sabe a qué profundidad de la página lo
   * montan, y saltarse un nivel es un defecto de a11y que ningún componente
   * puede adivinar desde dentro.
   */
  headingLevel?: StatePanelHeadingLevel;
}

/**
 * Base común de `EmptyState` y `ErrorState` (SDD §6, carpeta `feedback/`).
 *
 * Es un `section` con nombre —no un `div`—: así el panel es una región que se
 * puede alcanzar y anunciar, y `aria-labelledby` está permitido sobre él (sobre
 * un `div` sin rol sería un atributo prohibido, y `axe` lo marca). Quien
 * necesite otra semántica la pasa por `role`, como hace `ErrorState`.
 *
 * Presentación pura: compone título + descripción + slot de acción y cablea la
 * accesibilidad. **No se exporta desde el barrel**: la API pública son los dos
 * estados con nombre, que es lo que el inventario del SDD nombra; esto es su
 * implementación compartida.
 */
export const StatePanel = forwardRef<HTMLElement, StatePanelProps>(
  function StatePanel(
    {
      title,
      description,
      action,
      headingLevel = 2,
      tone,
      className,
      children,
      ...props
    },
    ref,
  ) {
    const titleId = useId();
    const Heading = `h${headingLevel}` as const;

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        className={cn(statePanelVariants({ tone }), className)}
        {...props}
      >
        <Heading id={titleId} className={statePanelTitleVariants()}>
          {title}
        </Heading>
        {description ? (
          <p className={statePanelDescriptionVariants()}>{description}</p>
        ) : null}
        {children}
        {action}
      </section>
    );
  },
);
