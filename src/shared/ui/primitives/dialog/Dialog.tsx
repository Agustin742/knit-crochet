"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
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
import { lockRootScroll } from "./root-scroll-lock";

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
  /**
   * Qué enfocar al abrir (deuda 90). **Por defecto, el panel**, que es lo
   * correcto para un modal de aviso: quien lo abre quiere oír el título antes
   * que nada. Un modal que es un FORMULARIO quiere lo contrario —el primer
   * campo—, y sin esta prop no había forma de pedirlo.
   *
   * **Repliegue:** si el elemento apuntado no está montado, o no es una parada
   * de tabulación de las que la trampa de foco reconoce dentro del panel, se
   * enfoca el panel. Nunca se queda sin enfocar nada: eso dejaría a quien navega
   * por teclado tirado al principio del documento, que es exactamente el fallo
   * que el invariante 3 existe para evitar.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Modal (SDD §6, §8).
 *
 * **Se monta en un portal al `body`**, no en el flujo, y eso es OBLIGATORIO, no
 * una preferencia. Los tokens `--z-overlay` y `--z-modal` sólo significan algo
 * si el diálogo comparte contexto de apilamiento con el nav, y dentro del
 * `AppShell` no lo comparte: **el `main` es la jaula**. Lleva posición relativa
 * y `z-index: var(--z-base)` (`AppShell.tsx`), o sea que abre un contexto de
 * apilamiento propio en el escalón **1**; `ArchiveNav` y `BottomNav` pintan en
 * `--z-nav` = **100** FUERA de él. Todo lo que se renderice dentro del `main`
 * queda techado por ese 1, así que el panel iría por debajo del nav **aunque
 * `--z-modal` valga 300**. El portal lo saca de la jaula y deja que los tokens
 * signifiquen lo que dicen.
 *
 * Ojo con la explicación equivocada, que ya se escribió una vez (deuda 94): el
 * archivero **no** tiene `transform`. Crea su contexto de apilamiento con
 * `filter: drop-shadow(...)` y, sobre todo, sus hojas son **hermanas** del
 * `main`, no ancestros suyas: un contexto de apilamiento sólo encierra a sus
 * descendientes. Quien lea eso, compruebe que no hay ningún `transform` y
 * concluya que la razón ya no aplica, quitará el portal y mandará el modal
 * detrás del nav. Por eso el razonamiento no vive sólo en este párrafo: está
 * atado a los tokens en `dialog.portal.tokens.test.ts`.
 *
 * Los cuatro invariantes que un modal roto incumple, y que están testeados uno a
 * uno (no supuestos):
 *
 * 1. **El foco queda atrapado dentro** mientras está abierto — si no, el resto
 *    de la página sigue siendo tabulable por detrás del velo.
 * 2. **`Escape` cierra.**
 * 3. **Al cerrar, el foco vuelve al elemento que lo abrió** — sin esto, quien
 *    navega por teclado queda tirado al principio del documento y tiene que
 *    recorrerlo entero para volver a donde estaba.
 * 4. **El fondo no hace scroll** mientras está abierto (ver `root-scroll-lock`).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  closeLabel = DIALOG_CLOSE_LABEL,
  dismissOnScrimClick = true,
  initialFocusRef,
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

    const panel = panelRef.current;
    const requested = initialFocusRef?.current ?? null;
    /* La condición se DERIVA de la misma lista que usa la trampa de foco: el
       foco inicial sólo puede caer donde el ciclo de `Tab` ya para. Así no hay
       dos criterios de "enfocable" que se puedan desincronizar, y de paso cubre
       de una vez los tres casos malos —no montado, no enfocable y fuera del
       panel— sin depender de si el DOM del test deja enfocar lo que no debería
       (REGLA 7: lo que se mide es la decisión, no la buena voluntad del doble). */
    const target =
      requested && panel && focusableWithin(panel).includes(requested)
        ? requested
        : panel;

    target?.focus();

    return () => {
      if (trigger?.isConnected) {
        trigger.focus();
      }
    };
  }, [open, container, initialFocusRef]);

  useEffect(() => {
    if (!open || !container) {
      return;
    }

    /* El soltador ES la limpieza del efecto (invariante 4): si el diálogo se
       desmonta estando abierto, el bloqueo se suelta igual. Ver `root-scroll-lock`. */
    return lockRootScroll();
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
