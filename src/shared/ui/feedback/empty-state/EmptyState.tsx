import { forwardRef } from "react";

import {
  StatePanel,
  type StatePanelProps,
} from "../state-panel/StatePanel";

export interface EmptyStateProps extends Omit<StatePanelProps, "tone"> {}

/**
 * Estado vacío (SDD §6, RFC-02 §4): no hay nada que mostrar **y no pasa nada**.
 *
 * Tono neutro a propósito: un vacío no es un fallo. La diferencia con
 * `ErrorState` no es sólo el color — éste no interrumpe ni se anuncia solo,
 * porque el usuario acaba de llegar a una lista que todavía no llenó.
 *
 * El `action` es un slot: quien lo monta decide si ofrece "Crear proyecto",
 * dos botones de creación (RFC-02 §4) o nada.
 */
export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(
  function EmptyState(props, ref) {
    return <StatePanel ref={ref} data-slot="empty-state" tone="neutral" {...props} />;
  },
);
