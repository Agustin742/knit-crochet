import type {
  Comparison,
  MetricComparisons,
} from "@/features/dashboard/types";
import {
  HOURS_COMPARISONS,
  PROJECTS_COMPARISONS,
  SECONDS_PER_HOUR,
  YARN_COMPARISONS,
} from "@/shared/config";

/**
 * Referencia normalizada: etiqueta + valor **en la unidad de la métrica** que
 * compara. Las listas de `shared/config` nombran su campo por su unidad
 * (`hours`, `projects`, `meters`); aquí se traducen a una forma única para que
 * el criterio de selección se escriba una sola vez.
 */
export type ComparisonReference = {
  label: string;
  value: number;
};

/**
 * Referencias de horas **en SEGUNDOS**: la lista de config está en horas (es lo
 * que lee un humano al editarla) pero `DashboardMetrics.hours` es
 * Σ `craft_sessions.duration`, es decir segundos. Cruzar las dos unidades da un
 * `times` equivocado por un factor de `SECONDS_PER_HOUR` sin romper ningún tipo
 * (PRD §8.1). El guardrail de `comparison-service.test.ts` exige que esa cifra
 * no aparezca escrita aquí, ni siquiera en un comentario.
 */
export const HOURS_REFERENCES: readonly ComparisonReference[] =
  HOURS_COMPARISONS.map((reference) => ({
    label: reference.label,
    value: reference.hours * SECONDS_PER_HOUR,
  }));

/** Referencias de proyectos, en unidades (misma unidad que la métrica). */
export const PROJECTS_REFERENCES: readonly ComparisonReference[] =
  PROJECTS_COMPARISONS.map((reference) => ({
    label: reference.label,
    value: reference.projects,
  }));

/** Referencias de lana, en metros (misma unidad que la métrica). */
export const YARN_METERS_REFERENCES: readonly ComparisonReference[] =
  YARN_COMPARISONS.map((reference) => ({
    label: reference.label,
    value: reference.meters,
  }));

/**
 * Elige la comparativa más relatable para una métrica (PRD §8 / §8.1).
 *
 * Criterio (idéntico para las tres métricas, por eso hay una sola función
 * parametrizada por lista): la **mayor** referencia cuyo `value ≤ metric` (para
 * que `times ≥ 1`). Si ninguna cabe (métrica menor que la referencia más
 * pequeña, incluido `metric = 0`), se usa la **menor** referencia; en ese caso
 * `times < 1` (y exactamente `0` cuando no se ha tejido nada).
 *
 * `metric` y `references` tienen que venir en la MISMA unidad.
 */
export function pickComparison(
  metric: number,
  references: readonly ComparisonReference[],
): Comparison {
  const sorted = [...references].sort((a, b) => a.value - b.value);
  const smallest = sorted[0];
  if (!smallest) {
    throw new Error("No hay comparativas configuradas para esta métrica.");
  }

  const fitting = sorted.filter((reference) => reference.value <= metric);
  const chosen = fitting.at(-1) ?? smallest;

  return {
    label: chosen.label,
    referenceValue: chosen.value,
    times: metric / chosen.value,
  };
}

/** Comparativa de cada una de las tres métricas del dashboard (PRD §8.1). */
export function pickMetricComparisons(metrics: {
  hours: number;
  projects: number;
  yarnMeters: number;
}): MetricComparisons {
  return {
    hours: pickComparison(metrics.hours, HOURS_REFERENCES),
    projects: pickComparison(metrics.projects, PROJECTS_REFERENCES),
    yarnMeters: pickComparison(metrics.yarnMeters, YARN_METERS_REFERENCES),
  };
}
