"use client";

import { type ReactNode, useRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import { Button } from "../button/Button";
import { Dialog } from "../dialog/Dialog";

import {
  CONFIRM_DIALOG_BUTTON_VARIANT,
  type ConfirmDialogTone,
  confirmDialogActionsVariants,
} from "./confirm-dialog.variants";

/** Copia por defecto. Exportada para que los tests la importen en vez de reescribirla. */
export const CONFIRM_DIALOG_CONFIRM_LABEL = "Confirmar";
export const CONFIRM_DIALOG_CANCEL_LABEL = "Cancelar";

export interface ConfirmDialogProps {
  open: boolean;
  /** La pregunta. Es el título del diálogo, así que lo nombra `aria-labelledby`. */
  title: ReactNode;
  /** Qué pasa si se confirma. Lo que hace que la pregunta se pueda responder. */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Lo dispara el botón de cancelar, el aspa del encabezado y `Escape`. */
  onCancel: () => void;
  tone?: ConfirmDialogTone;
  /** Acción en vuelo: bloquea el segundo clic y lo anuncia con `aria-busy`. */
  loading?: boolean;
  /** Contenido extra bajo el detalle (p. ej. el error de la acción). */
  children?: ReactNode;
  className?: string;
}

/**
 * Confirmación de una acción (enmienda **E6 (d)** del RFC-03).
 *
 * **Se construye SOBRE `Dialog`, no en paralelo.** Los cuatro invariantes de un
 * modal —foco atrapado, `Escape`, foco devuelto a quien abrió y fondo sin
 * scroll— ya están implementados y probados uno a uno ahí; reescribirlos es como
 * se regalan bugs de accesibilidad. Este componente sólo añade las dos cosas sin
 * las cuales una confirmación no confirma nada:
 *
 * 1. **El clic en el velo no cierra.** `dismissOnScrimClick` va fijado a `false`
 *    y **no se expone como prop**: si se pudiera volver a encender desde fuera,
 *    la garantía sería una sugerencia. La prop existía en `Dialog` desde el
 *    principio, documentada literalmente como *"se puede apagar para un flujo
 *    destructivo"*, y nunca se había usado. Un borrado que se confirma al hacer
 *    clic fuera por accidente **no es una confirmación**.
 * 2. **El foco inicial cae en «Cancelar».** El defecto de `Dialog` es el panel,
 *    que es lo correcto para un aviso; acá lo correcto es la **salida segura**,
 *    para que quien abre esto por teclado y pulsa Enter por inercia no destruya
 *    nada.
 *
 * `Escape` **sigue cerrando** y sale por `onCancel`: apagar el velo no puede
 * llevarse por delante la salida por teclado, que es la que usa quien no puede
 * apuntar con un ratón.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = CONFIRM_DIALOG_CONFIRM_LABEL,
  cancelLabel = CONFIRM_DIALOG_CANCEL_LABEL,
  onConfirm,
  onCancel,
  tone = "danger",
  loading = false,
  children,
  className,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      dismissOnScrimClick={false}
      initialFocusRef={cancelRef}
      className={cn(className)}
    >
      {children}
      <div className={confirmDialogActionsVariants()}>
        <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={CONFIRM_DIALOG_BUTTON_VARIANT[tone]}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
