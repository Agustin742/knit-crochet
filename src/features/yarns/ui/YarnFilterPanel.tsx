import { Card } from "@/shared/ui";

import { ColorFamilyFilter } from "./ColorFamilyFilter";
import { YarnBrandTree } from "./YarnBrandTree";
import { YarnCatalogPanel } from "./YarnCatalogPanel";
import type { YarnFilters } from "./types";

export interface YarnFilterPanelProps {
  filters: YarnFilters;
  onFiltersChange: (filters: YarnFilters) => void;
  /** Reenviado tal cual al árbol marca→tipo (design D5): sube en cada alta. */
  catalogToken?: number;
  /** Reenviado tal cual desde el panel de catálogo (design D5). */
  onCatalogChange?: () => void;
}

/** El valor exclusivo del árbol, derivado de `filters` (design D5-bis). */
export function scopeOf(filters: YarnFilters): string {
  if (filters.brandId === undefined) {
    return "all";
  }
  return filters.typeId === undefined
    ? filters.brandId
    : `${filters.brandId}:${filters.typeId}`;
}

/** El inverso de `scopeOf`: lo que el árbol emite, de vuelta a brandId/typeId. */
export function parseScope(
  scope: string,
): Pick<YarnFilters, "brandId" | "typeId"> {
  if (scope === "all") {
    return {};
  }
  const [brandId, typeId] = scope.split(":");
  return typeId === undefined ? { brandId } : { brandId, typeId };
}

/**
 * Compone el árbol marca→tipo y la fila de color (RFC-04 §2/§5, design D6):
 * un solo objeto `YarnFilters` de estado, que vive arriba en `YarnsView`.
 * Este componente sólo traduce entre esa forma y la codificación propia de
 * cada hijo — las tres selecciones combinan con AND porque las tres viven en
 * el mismo objeto que sube por `onFiltersChange`.
 */
export function YarnFilterPanel({
  filters,
  onFiltersChange,
  catalogToken,
  onCatalogChange,
}: YarnFilterPanelProps) {
  /* La superficie NO es decoración (deuda 196): sobre el fondo de la página
     `text-fg` y `--bg` son el mismo color —1.00 de contraste, invisible—, y
     `axe` no lo gatea. Es la misma decisión que RFC-03 E2(b) tomó para el
     toolbar de `/proyectos`: todo el filtro vive sobre UNA superficie. El
     panel de catálogo (RFC-04 §7-ter E2(c)) es el último hijo del MISMO
     `Card`, no una superficie aparte. */
  return (
    <Card data-slot="yarn-filter-panel" className="flex flex-col gap-(--space-4)">
      <YarnBrandTree
        value={scopeOf(filters)}
        onValueChange={(next) =>
          onFiltersChange({
            ...parseScope(next),
            colorFamily: filters.colorFamily,
          })
        }
        catalogToken={catalogToken}
      />
      <ColorFamilyFilter
        value={filters.colorFamily}
        onValueChange={(next) =>
          onFiltersChange({
            brandId: filters.brandId,
            typeId: filters.typeId,
            colorFamily: next,
          })
        }
      />
      <YarnCatalogPanel onCatalogChange={onCatalogChange} />
    </Card>
  );
}
