"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/shared/ui/lib/cn";

import { Button } from "../button/Button";
import {
  type DialogVariants,
  dialogDescriptionVariants,
  dialogHeaderVariants,
  dialogPanelVariants,
  dialogScrimVariants,
  dialogTitleVariants,
} from "./dialog.variants";

/** Etiqueta del control de cierre. Se puede sobreescribir por prop. */
export const DIALOG_CLOSE_LABEL = "Cerrar";

/**
 * Lo que el navegador considera parada de tabulación. El propio panel no entra
 * (lleva `tabindex="-1"`: es enfocable por programa, no por teclado).
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * `false` en el render de servidor y en la hidratación, `true` a partir de ahí.
 * Es la forma de saber que ya hay `document` sin llamar a `setState` dentro de
 * un efecto (que dispara renders en cascada y el lint lo rechaza) y sin leer
 * `typeof document` en el render (que desincronizaría servidor y cliente).
 */
const NEVER_CHANGES = () => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

function focusableWithin(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hasAttribute("hidden"),
  );
}

export interface DialogProps extends DialogVariants {
  open: boolean;
  /** Lo dispara `Escape`, el botón de cierre y el clic en el velo. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  /** Clic en el velo = cerrar. Se puede apagar para un flujo destructivo. */
  dismissOnScrimClick?: boolean;
  className?: string;
}

/**
 * Modal (SDD §6, §8).
 *
 * **Se monta en un portal al `body`**, no en el flujo. Los tokens `--z-overlay`
 * y `--z-modal` sólo sirven si el diálogo comparte contexto de apilamiento con
 * el resto de la página, y en el flujo no lo comparte: el archivero apila hojas
 * con `transform` y `z-index` propios, y cualquier ancestro transformado crea un
 * contexto nuevo que encierra al panel por debajo del nav aunque valga 300
 * contra 100. El portal lo saca de esa jaula y deja que los tokens signifiquen
 * lo que dicen.
 *
 * Los tres invariantes que un modal roto incumple, y que están testeados uno a
 * uno (no supuestos):
 *
 * 1. **El foco queda atrapado dentro** mientras está abierto — si no, el resto
 *    de la página sigue siendo tabulable por detrás del velo.
 * 2. **`Escape` cierra.**
 * 3. **Al cerrar, el foco vuelve al elemento que lo abrió** — sin esto, quien
 *    navega por teclado queda tirado al principio del documento y tiene que
 *    recorrerlo entero para volver a donde estaba.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  closeLabel = DIALOG_CLOSE_LABEL,
  dismissOnScrimClick = true,
  size,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  /* El portal necesita `document`, que no existe en el render de servidor:
     hasta que el componente vive en el navegador, no hay diálogo que montar. */
  const container = useIsClient() ? document.body : null;

  useEffect(() => {
    if (!open || !container) {
      return;
    }

    /* Quién tenía el foco ANTES de abrir. Se lee antes de mover nada; al cerrar
       se le devuelve (invariante 3). */
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    panelRef.current?.focus();

    return () => {
      if (trigger?.isConnected) {
        trigger.focus();
      }
    };
  }, [open, container]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusables = focusableWithin(panel);
    if (focusables.length === 0) {
      // Sin paradas dentro, tabular sacaría el foco fuera del velo.
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === panel) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last || active === panel) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleScrimClick(event: MouseEvent<HTMLDivElement>) {
    if (dismissOnScrimClick && event.target === event.currentTarget) {
      onClose();
    }
  }

  if (!open || !container) {
    return null;
  }

  return createPortal(
    <div
      data-slot="dialog-scrim"
      className={dialogScrimVariants()}
      onKeyDown={handleKeyDown}
      onClick={handleScrimClick}
    >
      <div
        ref={panelRef}
        data-slot="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(dialogPanelVariants({ size }), className)}
      >
        <div className={dialogHeaderVariants()}>
          <h2 id={titleId} className={dialogTitleVariants()}>
            {title}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
        {description ? (
          <p id={descriptionId} className={dialogDescriptionVariants()}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>,
    container,
  );
}
