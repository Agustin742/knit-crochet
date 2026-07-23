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

/** Comparativa graciosa elegida para `yarnMeters` (PRD §8). */
export type Comparison = {
  label: string;
  referenceMeters: number;
  /** `yarnMeters / referenceMeters`. `0` cuando no se ha tejido nada. */
  times: number;
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
  comparison: Comparison;
};
