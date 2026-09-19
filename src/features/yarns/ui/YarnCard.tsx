import { yarnSwatchClass } from "@/shared/config";
import { Card, Swatch } from "@/shared/ui";

import { stockLabel } from "./yarn-copy";
import type { SerializedYarnListItem } from "./types";

export interface YarnCardProps {
  yarn: SerializedYarnListItem;
  className?: string;
}

function yarnCardLabel(yarn: SerializedYarnListItem): string {
  return `${yarn.brandName} · ${yarn.typeName} · ${yarn.colorName}`;
}

/**
 * El tap todavía no hace nada (deuda 192): el cajón de detalle es la entrada
 * 24 (`yarns_detail_catalogs_ui`). Va como control real, no un `div`
 * decorado, para que sea alcanzable por teclado desde ya y para que
 * activarlo no dispare navegación, cajón ni cambio de estado por accidente.
 */
function noOpTap(): void {
  // Intencional — ver deuda 192 / entrada 24.
}

/**
 * Tarjeta de lana (RFC-04 §2/§4): la muestra genérica teñida por la familia
 * de color, `marca · tipo · colorName` y el stock. Compone `Swatch` (tamaño
 * de tarjeta) con `yarnSwatchClass` — ninguno de los dos es nuevo, los dos
 * llegaron con S2.
 */
export function YarnCard({ yarn, className }: YarnCardProps) {
  const swatchClass = yarnSwatchClass(yarn.colorFamily);

  return (
    <Card className={className}>
      <button
        type="button"
        onClick={noOpTap}
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
