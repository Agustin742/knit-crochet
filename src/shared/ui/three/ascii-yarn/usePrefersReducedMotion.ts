/**
 * La implementación se promovió a `shared/ui/lib/` en #33: desde que `Skeleton`
 * también decide en JS si anima, el hook dejó de ser de la capa 3D. Aquí queda
 * la re-exportación para que la escena siga importándolo por su ruta de siempre
 * y no haya dos copias del mismo `matchMedia`.
 */
export { usePrefersReducedMotion } from "../../lib/usePrefersReducedMotion";
