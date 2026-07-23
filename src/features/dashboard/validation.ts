import { z } from "zod";

import { CRAFT_TYPES } from "@/shared/config";

/**
 * Query de `GET /api/dashboard/metrics`. `year` y `type` son opcionales: un
 * parámetro ausente (`readQuery` descarta los vacíos) significa "sin filtro".
 * `year` no numérico o `type` fuera del enum → error → el handler responde 400.
 * Si falta `year`, el servicio usa el año actual del servidor.
 */
export const metricsFiltersSchema = z.object({
  year: z.coerce
    .number("El año debe ser numérico.")
    .int("El año debe ser un entero.")
    .min(1970, "El año está fuera de rango.")
    .max(9999, "El año está fuera de rango.")
    .optional(),
  type: z.enum(CRAFT_TYPES, "El tipo debe ser knitting o crochet.").optional(),
});

export type MetricsFiltersQuery = z.infer<typeof metricsFiltersSchema>;
