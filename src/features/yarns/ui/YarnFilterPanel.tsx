import { ColorFamilyFilter } from "./ColorFamilyFilter";
import { YarnBrandTree } from "./YarnBrandTree";
import type { YarnFilters } from "./types";

export interface YarnFilterPanelProps {
  filters: YarnFilters;
  onFiltersChange: (filters: YarnFilters) => void;
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
}: YarnFilterPanelProps) {
  return (
    <div className="flex flex-col gap-(--space-4)">
      <YarnBrandTree
        value={scopeOf(filters)}
        onValueChange={(next) =>
          onFiltersChange({
            ...parseScope(next),
            colorFamily: filters.colorFamily,
          })
        }
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
    </div>
  );
}
