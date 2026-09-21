import { yarnSwatchClass } from "@/shared/config";
import { Card, Swatch } from "@/shared/ui";

import { stockLabel } from "./yarn-copy";
import type { SerializedYarnListItem } from "./types";

export interface YarnCardProps {
  yarn: SerializedYarnListItem;
  /** Abre el cajón de detalle para esta lana (deuda 192 saldada, backlog 24). */
  onOpen: () => void;
  className?: string;
}

function yarnCardLabel(yarn: SerializedYarnListItem): string {
  return `${yarn.brandName} · ${yarn.typeName} · ${yarn.colorName}`;
}

/**
 * Tarjeta de lana (RFC-04 §2/§4): la muestra genérica teñida por la familia
 * de color, `marca · tipo · colorName` y el stock. Compone `Swatch` (tamaño
 * de tarjeta) con `yarnSwatchClass` — ninguno de los dos es nuevo, los dos
 * llegaron con S2. El tap abre el cajón de detalle (deuda 192, backlog 24);
 * la tarjeta no sabe nada de cómo se abre, sólo avisa hacia arriba.
 */
export function YarnCard({ yarn, onOpen, className }: YarnCardProps) {
  const swatchClass = yarnSwatchClass(yarn.colorFamily);

  return (
    <Card className={className}>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-(--space-3) text-left"
      >
        <Swatch size="md" className={swatchClass} />
        <span className="flex flex-col gap-(--space-1)">
          <span className="font-body text-base leading-base text-fg">
            {yarnCardLabel(yarn)}
          </span>
          <span className="font-mono text-sm leading-base text-fg-muted">
            {stockLabel(yarn.quantity)}
          </span>
        </span>
      </button>
    </Card>
  );
}
