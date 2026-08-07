import { type ReactNode, forwardRef } from "react";

import { Button } from "../../primitives/button/Button";
import { StatePanel, type StatePanelProps } from "../state-panel/StatePanel";

/** Etiqueta del reintento. Se puede sobreescribir por prop. */
export const ERROR_STATE_RETRY_LABEL = "Reintentar";

export interface ErrorStateProps extends Omit<StatePanelProps, "tone"> {
  /** Si se pasa, el panel ofrece reintentar. Si no, no monta ningún botón. */
  onRetry?: () => void;
  retryLabel?: ReactNode;
}

/**
 * Estado de error (SDD §6, RFC-02 §4): algo falló y hay que decirlo.
 *
 * Tres diferencias con `EmptyState`, todas deliberadas:
 *
 * 1. **`role="alert"`**: un error que aparece después de una acción del usuario
 *    tiene que anunciarse solo. Un vacío no.
 * 2. **Tono de peligro**: el marco sale de `--danger`, no sólo el texto, para
 *    que no dependa del color de una palabra.
 * 3. **Reintentar**: es el camino de vuelta. Se monta **sólo** si hay `onRetry`
 *    — un botón que no lleva a ninguna parte es la deuda 29 en pequeño.
 *
 * El botón es `type="button"` (el que trae `Button` por defecto): dentro de un
 * formulario, un reintento que enviara el formulario sería la trampa que ya
 * pagaron las deudas 39 y 43.
 *
 * Un `action` propio gana sobre el reintento: quien necesite otra salida
 * ("volver al inicio") no tiene que pelearse con el botón por defecto.
 */
export const ErrorState = forwardRef<HTMLElement, ErrorStateProps>(
  function ErrorState(
    { onRetry, retryLabel = ERROR_STATE_RETRY_LABEL, action, ...props },
    ref,
  ) {
    const retry =
      onRetry === undefined ? null : (
        <Button variant="primary" onClick={onRetry}>
          {retryLabel}
        </Button>
      );

    return (
      <StatePanel
        ref={ref}
        data-slot="error-state"
        role="alert"
        tone="danger"
        action={action ?? retry}
        {...props}
      />
    );
  },
);
