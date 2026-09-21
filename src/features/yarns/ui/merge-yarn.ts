import type { SerializedYarnListItem, SerializedYarnRecord } from "./types";

/**
 * Mezcla campo por campo el resultado de `PATCH /api/yarns/:id` en el item de
 * lista ya cargado (design D2). `patched` es la fila cruda del servidor: no
 * trae `brandName`/`typeName`, así que `...patched` nunca puede pisarlos —el
 * re-pin explícito es lo que vuelve la garantía LEGIBLE y lo que el test de
 * arriba afirma, no sólo el efecto del spread.
 *
 * **El tipo de retorno es `SerializedYarnListItem`, no
 * `SerializedYarnRecord`**: `return patched;` no compilaría, porque a
 * `patched` le faltan `brandName`/`typeName`. Esa es la única jugada
 * prohibida del cambio — ver `design.md` D2.
 */
export function mergeYarnPatch(
  current: SerializedYarnListItem,
  patched: SerializedYarnRecord,
): SerializedYarnListItem {
  return {
    ...current,
    ...patched,
    brandName: current.brandName,
    typeName: current.typeName,
  };
}
