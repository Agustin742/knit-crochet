"use client";

import { formatDate } from "@/shared/lib/format";
import { COLOR_FAMILY_LABELS } from "@/shared/config";
import { Button, Dialog, Stepper } from "@/shared/ui";

import {
  DETAIL_FIELD_LABELS,
  EDIT_YARN_LABEL,
  NO_PHOTO_LABEL,
  USED_QUANTITY_LABEL,
  lengthLabel,
  needleLabel,
  stockLabel,
  thicknessLabel,
} from "./yarn-copy";
import type { SerializedYarnListItem } from "./types";

export interface YarnDetailDrawerProps {
  /** La lana cuyo detalle se está viendo, o `null` si el cajón está cerrado. */
  yarn: SerializedYarnListItem | null;
  onClose: () => void;
  onUsedQuantityChange: (next: number) => void;
  /** Bloquea el stepper mientras el `PATCH` está en vuelo (design D2: sin
   * actualización optimista, así que mostrar un número que el servidor no
   * confirmó sería la misma mentira que blanquear marca/tipo). */
  usedQuantityPending?: boolean;
  /** Mensaje en línea bajo el stepper cuando el `PATCH` falla. */
  usedQuantityError?: string | null;
  /**
   * «Editar» ya es un control real (deuda 199, RFC-04 §7-ter E2(b)), pero su
   * destino —el modal de entrada 25— no existe todavía: sin esta prop, el
   * botón queda como un no-op documentado y no un `div` a la espera.
   */
  onEdit?: () => void;
}

function yarnDrawerTitle(yarn: SerializedYarnListItem): string {
  return `${yarn.brandName} · ${yarn.typeName} · ${yarn.colorName}`;
}

/**
 * Cajón de detalle de una lana (RFC-04 §2, backlog 24, slice S1).
 *
 * **Prop-driven, sin fetch propio.** La lista (`YarnsView`) ya tiene todos
 * los campos que este cajón necesita; pedirlos de nuevo sería la misma
 * respuesta dos veces en la misma pantalla (mismo criterio que
 * `ProjectDetailDrawer` para lo que ya trae la tarjeta).
 *
 * **Es el `Dialog` con `placement="side"`**, no un componente nuevo: hereda
 * los cuatro invariantes de foco/`Escape`/scroll ya probados ahí.
 */
export function YarnDetailDrawer({
  yarn,
  onClose,
  onUsedQuantityChange,
  usedQuantityPending = false,
  usedQuantityError = null,
  onEdit,
}: YarnDetailDrawerProps) {
  if (yarn === null) {
    return null;
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={yarnDrawerTitle(yarn)}
      placement="side"
      size="lg"
    >
      <div className="flex flex-col gap-(--space-5)">
        {yarn.image === null ? (
          <p className="font-body text-sm leading-base text-fg-muted">
            {NO_PHOTO_LABEL}
          </p>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- mismo motivo
             que `ProjectCard.tsx:446-453`: la foto es una URL de Cloudinary, o
             sea un host remoto arbitrario, y `next/image` exigiría declarar
             `remotePatterns`. */
          <img
            src={yarn.image}
            alt={yarn.colorName}
            className="aspect-3/1 w-full rounded-md object-cover"
          />
        )}

        <dl className="grid grid-cols-2 gap-(--space-4)">
          <DetailField
            label={DETAIL_FIELD_LABELS.colorName}
            value={yarn.colorName}
          />
          <DetailField
            label={DETAIL_FIELD_LABELS.colorCode}
            value={yarn.colorCode}
          />
          <DetailField
            label={DETAIL_FIELD_LABELS.colorFamily}
            value={COLOR_FAMILY_LABELS[yarn.colorFamily]}
          />
          <DetailField
            label={DETAIL_FIELD_LABELS.length}
            value={lengthLabel(yarn.length)}
          />
          <DetailField label={DETAIL_FIELD_LABELS.fiber} value={yarn.fiber} />
          <DetailField
            label={DETAIL_FIELD_LABELS.recommendedNeedle}
            value={needleLabel(yarn.recommendedNeedle)}
          />
          <DetailField
            label={DETAIL_FIELD_LABELS.thickness}
            value={thicknessLabel(yarn.thickness)}
          />
          <DetailField
            label={DETAIL_FIELD_LABELS.lot}
            value={formatDate(yarn.lot) ?? yarn.lot}
          />
          <DetailField
            label={DETAIL_FIELD_LABELS.quantity}
            value={stockLabel(yarn.quantity)}
          />
        </dl>

        <div className="flex flex-col gap-(--space-2)">
          <Stepper
            value={yarn.usedQuantity}
            onValueChange={onUsedQuantityChange}
            label={USED_QUANTITY_LABEL}
            min={0}
            disabled={usedQuantityPending}
          />
          {usedQuantityError === null ? null : (
            <p
              role="alert"
              className="font-body text-sm leading-base text-danger"
            >
              {usedQuantityError}
            </p>
          )}
        </div>

        {/* `secondary` y no `primary` mientras el manejador sea un no-op
            (deuda 199, con la medición del navegador anotada allí): como
            primario era el control más ancho del cajón con diferencia, o sea
            la llamada a la acción más prominente del panel era la única que no
            hacía nada. El control se monta igual, real y alcanzable por
            teclado; lo que no corresponde todavía es su jerarquía. La entrada
            25 lo sube a `primary` cuando lo cablee. */}
        <Button variant="secondary" onClick={() => onEdit?.()}>
          {EDIT_YARN_LABEL}
        </Button>
      </div>
    </Dialog>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-(--space-1)">
      <dt className="font-mono text-xs uppercase tracking-label text-fg">
        {label}
      </dt>
      <dd className="m-0 font-body text-base leading-base text-fg">
        {value}
      </dd>
    </div>
  );
}
