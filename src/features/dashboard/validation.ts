import { z } from "zod";

import { CRAFT_TYPES } from "@/shared/config";

/**
 * Rango admitido para el filtro de año. Se exporta porque el filtro de la UI
 * (RFC-02 §1, "rango libre") tiene que acotar **lo mismo** que acepta el
 * endpoint: si cada capa se inventara sus topes, el usuario escribiría un año
 * que la pantalla da por bueno y el servidor rechaza con un 400.
 */
export const METRICS_YEAR_MIN = 1970;
export const METRICS_YEAR_MAX = 9999;

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
    .min(METRICS_YEAR_MIN, "El año está fuera de rango.")
    .max(METRICS_YEAR_MAX, "El año está fuera de rango.")
    .optional(),
  type: z.enum(CRAFT_TYPES, "El tipo debe ser knitting o crochet.").optional(),
});

export type MetricsFiltersQuery = z.infer<typeof metricsFiltersSchema>;
