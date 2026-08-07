import type { Comparison, DashboardMetrics } from "@/features/dashboard/types";
import {
  formatDecimal,
  formatInteger,
  secondsToHours,
} from "@/shared/lib/format";

/**
 * Las tres métricas conmutables del Dashboard (RFC-02 §1). Las claves son
 * **exactamente** las del payload y las del mapa `comparison`, así que la UI
 * pide la comparativa de la métrica que está mostrando sin ninguna traducción
 * intermedia.
 */
export const METRIC_KEYS = ["hours", "projects", "yarnMeters"] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

/** Default: horas (RFC-02 §1). Es una lista porque el selector es superponible. */
export const DEFAULT_METRIC_KEYS: readonly MetricKey[] = ["hours"];

export const METRIC_LABELS: Record<MetricKey, string> = {
  hours: "Horas",
  projects: "Proyectos",
  yarnMeters: "Metros",
};

/** Unidad que acompaña al número grande. Se lee, no se abrevia. */
export const METRIC_UNITS: Record<MetricKey, string> = {
  hours: "horas tejidas",
  projects: "proyectos",
  yarnMeters: "metros de lana",
};

/**
 * ENMIENDA E1.5. Los metros son un agregado **lifetime**: no se mueven con el
 * año ni con el tipo, mientras las otras dos sí (PRD §11.2). Sin decirlo, el
 * usuario cambia de año, ve moverse dos tarjetas y quedarse una, y parece un
 * bug. Se resuelve en la UI y no en el payload: el contrato de
 * `/api/dashboard/metrics` está cerrado desde #16.
 */
export const LIFETIME_METRIC_NOTE = "Total histórico: no cambia con los filtros";

export function isLifetimeMetric(key: MetricKey): boolean {
  return key === "yarnMeters";
}

/**
 * El número grande de cada tarjeta, ya en la unidad que se lee.
 *
 * ⚠️ `hours` **viaja en segundos** (Σ `craft_sessions.duration`, PRD §8.1). La
 * conversión es de la UI y el puente sale de `SECONDS_PER_HOUR` vía
 * `secondsToHours`, nunca de un `3600` escrito a mano.
 */
export function formatMetricValue(
  key: MetricKey,
  metrics: DashboardMetrics,
): string {
  switch (key) {
    case "hours":
      return formatDecimal(secondsToHours(metrics.hours));
    case "projects":
      return formatInteger(metrics.projects);
    case "yarnMeters":
      return formatDecimal(metrics.yarnMeters);
  }
}

/**
 * ENMIENDA E1.4 — formato de la comparativa graciosa.
 *
 * Las etiquetas de `shared/config` están escritas como frases con artículo
 * ("El Obelisco", "Un colectivo"), así que pegarles un número delante produce
 * texto roto ("≈ 2,1 El Obelisco"). Anteponer "veces" funciona con las once
 * etiquetas de las tres listas y **no toca ni un dato**.
 *
 * Tres ramas, las tres cerradas por la enmienda:
 * - `times === 0` (exactamente cuando la métrica vale 0) → **no se pinta nada**.
 *   El número grande ya dice cero, y tres comparativas en cero serían la primera
 *   impresión de una cuenta recién creada.
 * - `times < 1` (la métrica no llega ni a la referencia más chica) → frase
 *   propia, porque "≈ 0,4 veces X" no se entiende.
 * - resto → `≈ N veces <etiqueta>`.
 *
 * Detalle de implementación, no una decisión nueva: la palabra se concuerda con
 * el número **ya formateado**, no con el crudo. `times = 1.04` se pinta como
 * "1", y "≈ 1 veces El Obelisco" sería justo el texto roto que la enmienda salió
 * a evitar. Mirando el string, el número y la palabra no pueden discrepar.
 */
export function formatComparison(comparison: Comparison): string | null {
  const { label, times } = comparison;

  if (!Number.isFinite(times) || times <= 0) {
    return null;
  }
  if (times < 1) {
    return `Todavía no llegás a ${label}`;
  }

  const amount = formatDecimal(times);
  return `≈ ${amount} ${amount === "1" ? "vez" : "veces"} ${label}`;
}
