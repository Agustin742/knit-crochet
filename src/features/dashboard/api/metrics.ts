import { pickComparison } from "@/features/dashboard/api/comparison";
import {
  createDashboardStore,
  type DashboardStore,
  type YearRange,
} from "@/features/dashboard/api/store";
import type {
  DashboardMetrics,
  MetricsFilter,
} from "@/features/dashboard/types";

/** Ventana `[year-01-01, (year+1)-01-01)` para filtrar por año (PRD §8). */
export function yearRange(year: number): YearRange {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year + 1, 0, 1),
  };
}

/**
 * Arma las métricas del dashboard scopeadas por `userId`. Feature de solo
 * lectura: no muta nada. Si no llega `year`, usa el año actual del servidor.
 * `yarnMeters` es lifetime (ignora `year`/`type`, PRD §11.2); `comparison` se
 * deriva de él.
 */
export async function getDashboardMetrics(
  userId: string,
  filter: MetricsFilter = {},
  store: DashboardStore = createDashboardStore(),
): Promise<DashboardMetrics> {
  const year = filter.year ?? new Date().getFullYear();
  const range = yearRange(year);

  const [hours, projects, yarnMeters] = await Promise.all([
    store.sumHours(userId, range, filter.type),
    store.countProjects(userId, range, filter.type),
    store.sumYarnMeters(userId),
  ]);

  return {
    hours,
    projects,
    yarnMeters,
    comparison: pickComparison(yarnMeters),
  };
}
