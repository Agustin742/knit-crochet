import type { CraftType } from "@/shared/config";

/**
 * Filtros del dashboard. `year` es opcional en el borde (si falta, el servicio
 * usa el año actual del servidor). `type` restringe `hours`/`projects` a un
 * craft type; `yarnMeters` los ignora (agregado lifetime, PRD §11.2).
 */
export type MetricsFilter = {
  year?: number;
  type?: CraftType;
};

/**
 * Comparativa graciosa elegida para **una** métrica (PRD §8.1).
 *
 * `referenceValue` viaja en la MISMA unidad que la métrica que compara
 * (segundos para `hours`, unidades para `projects`, metros para `yarnMeters`),
 * de forma que `times` es un cociente puro y adimensional.
 */
export type Comparison = {
  label: string;
  referenceValue: number;
  /** `métrica / referenceValue`. `0` cuando la métrica vale 0. */
  times: number;
};

/**
 * Una comparativa por métrica (PRD §8.1). Las claves son exactamente las de las
 * métricas de `DashboardMetrics`, para que la UI pueda pedir la comparativa de
 * la métrica que esté mostrando.
 */
export type MetricComparisons = {
  hours: Comparison;
  projects: Comparison;
  yarnMeters: Comparison;
};

export type DashboardMetrics = {
  /**
   * Σ `craft_sessions.duration` (en **segundos**, la unidad almacenada del
   * dominio, igual que `Project.time`). El nombre `hours` sigue el contrato de
   * respuesta del PRD §9; la conversión a horas para mostrar es de la UI, fuera
   * del alcance de este PRD.
   */
  hours: number;
  projects: number;
  /** Σ (`usedQuantity` × `length`) en metros. Agregado lifetime. */
  yarnMeters: number;
  /** Mapa por métrica, no una comparativa suelta (PRD §8.1, feature #16). */
  comparison: MetricComparisons;
};
