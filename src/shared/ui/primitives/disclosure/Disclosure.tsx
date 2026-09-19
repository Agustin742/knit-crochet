"use client";

import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type ToggleEvent,
  forwardRef,
  useState,
} from "react";

import { cn } from "@/shared/ui/lib/cn";

import {
  type DisclosureVariants,
  disclosureSummaryVariants,
  disclosureVariants,
} from "./disclosure.variants";

export interface DisclosureProps
  extends Omit<HTMLAttributes<HTMLDetailsElement>, "onToggle">,
    DisclosureVariants {
  /** Lo que se ve siempre, cerrado o abierto. Activa expandir/contraer. */
  summary: ReactNode;
  /** Controlado: si se pasa, manda por encima del estado interno. */
  open?: boolean;
  /** Sólo se lee al montar; se ignora en modo controlado. */
  defaultOpen?: boolean;
  /** Recibe el estado al que se pasa, nunca el actual (mismo contrato que `Toggle`). */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Envoltorio de `<details>`/`<summary>` nativos (SDD-01 §9, deuda 142, design
 * D5). Confirmado sobre un `role="tree"` a mano: un treeview APG sustituye las
 * paradas de tabulación por tabindex rotativo, así que los controles de tipo
 * SALEN de la secuencia de tabulación — peor acceso por teclado, no mejor — y
 * lo que la página necesita es selección agrupada, no navegación de un solo
 * ítem (ver `design.md` D5).
 *
 * **El panel sólo se MONTA abierto**, igual que `Tabs` sólo monta la pestaña
 * elegida: no es una preferencia visual, es la garantía de que un panel
 * cerrado no deja ninguna parada de tabulación (invariante de la tarea 4.1).
 * Confiar en que el navegador lo oculte por CSS deja un hueco medido: closed
 * `<details>` no imprime ninguna regla `display:none` sobre sus hijos en el
 * motor de pruebas (ni tampoco el atributo `hidden` a secas), así que Tab
 * seguiría entrando al panel cerrado en la suite aunque en un navegador real
 * no se vea. Montar sólo lo abierto cierra el hueco en los dos sitios a la vez.
 *
 * **El `<summary>` lleva `tabIndex={0}` explícito** y un `onKeyDown` propio
 * que cancela el default nativo (`preventDefault`) y conmuta él mismo con
 * Enter/Espacio. Es redundante en un navegador real (`<summary>` ya es
 * contenido interactivo enfocable con activación por teclado de fábrica), pero
 * no es sólo defensivo: sin él, la suite no puede demostrar la conmutación por
 * teclado porque `user-event` no simula esa activación de fábrica para
 * `<summary>` (sí lo hace para `<button>`), así que sin este handler el
 * contrato quedaría sin test posible, no sólo sin test escrito.
 *
 * **Contraste medido, no teórico** (RFC-03 E2(b), `RFC-03-proyectos.md:275-278`):
 * el `<summary>` nunca usa `text-fg-inverse` por defecto — siempre `text-fg` —
 * porque sobre una superficie elevada esa combinación se lee a 1.14:1. Quien
 * monte este primitivo sobre una superficie clara hereda la decisión ya
 * tomada (`Disclosure.test.tsx` lo comprueba con una aserción, trap #5).
 */
export const Disclosure = forwardRef<HTMLDetailsElement, DisclosureProps>(
  function Disclosure(
    {
      summary,
      open,
      defaultOpen = false,
      onOpenChange,
      size,
      className,
      children,
      ...props
    },
    ref,
  ) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = open !== undefined;
    const resolvedOpen = open !== undefined ? open : uncontrolledOpen;

    function setOpenState(next: boolean) {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    }

    function handleToggle(event: ToggleEvent<HTMLDetailsElement>) {
      setOpenState(event.currentTarget.open);
    }

    function handleSummaryKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      // Cancela la activación nativa (que también conmutaría) para que sólo
      // exista un camino de conmutación, nunca dos disparando a la vez.
      event.preventDefault();
      setOpenState(!resolvedOpen);
    }

    return (
      <details
        ref={ref}
        data-slot="disclosure"
        open={resolvedOpen}
        onToggle={handleToggle}
        className={cn(disclosureVariants({ size }), className)}
        {...props}
      >
        <summary
          tabIndex={0}
          onKeyDown={handleSummaryKeyDown}
          className={disclosureSummaryVariants({ size })}
        >
          {summary}
        </summary>
        {resolvedOpen ? children : null}
      </details>
    );
  },
);
