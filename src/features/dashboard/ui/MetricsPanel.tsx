"use client";

import type { DashboardMetrics } from "@/features/dashboard/types";
import { Card, Skeleton, Toggle, ToggleGroup } from "@/shared/ui";

import {
  LIFETIME_METRIC_NOTE,
  METRIC_KEYS,
  METRIC_LABELS,
  METRIC_UNITS,
  type MetricKey,
  formatComparison,
  formatMetricValue,
  isLifetimeMetric,
} from "./metrics-display";

export const METRICS_SECTION_TITLE = "Tu año en números";
export const METRICS_GROUP_LABEL = "Métricas visibles";
export const NO_METRIC_SELECTED_MESSAGE =
  "Elegí al menos una métrica para ver el resumen.";

export interface MetricsPanelProps {
  /** `null` mientras la primera carga está en vuelo. */
  metrics: DashboardMetrics | null;
  selected: readonly MetricKey[];
  onToggleMetric: (key: MetricKey) => void;
  loading: boolean;
}

/**
 * Selector de métrica + panel de tarjetas (RFC-02 §1/§2).
 *
 * El selector es **conmutable Y superponible**: son `Toggle` con `aria-pressed`,
 * no un `Tabs`, porque un `Tabs` promete exactamente uno activo y aquí se
 * combinan. El estado vive arriba porque `Toggle` es controlado a propósito.
 *
 * Las tarjetas se pintan siempre en el orden de `METRIC_KEYS`, no en el orden en
 * que se fueron marcando: el panel no puede reordenarse solo mientras el usuario
 * enciende y apaga métricas.
 */
export function MetricsPanel({
  metrics,
  selected,
  onToggleMetric,
  loading,
}: MetricsPanelProps) {
  const visible = METRIC_KEYS.filter((key) => selected.includes(key));

  return (
    <section
      aria-labelledby="dashboard-metrics-title"
      className="flex flex-col gap-(--space-4)"
    >
      <div className="flex flex-col gap-(--space-3) tablet:flex-row tablet:items-center tablet:justify-between">
        <h2
          id="dashboard-metrics-title"
          className="font-display text-2xl leading-tight text-fg-inverse"
        >
          {METRICS_SECTION_TITLE}
        </h2>

        <ToggleGroup
          label={METRICS_GROUP_LABEL}
          className="flex flex-wrap gap-(--space-2)"
        >
          {METRIC_KEYS.map((key) => (
            <Toggle
              key={key}
              pressed={selected.includes(key)}
              onPressedChange={() => onToggleMetric(key)}
            >
              {METRIC_LABELS[key]}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>

      {visible.length === 0 ? (
        <p className="font-body leading-base text-fg-inverse-muted">
          {NO_METRIC_SELECTED_MESSAGE}
        </p>
      ) : (
        /* Los bloques de carga son para la PRIMERA carga (`metrics === null`).
           Al recargar por un cambio de filtro se mantienen los números viejos y
           sólo se marca `aria-busy`: vaciar la pantalla en cada tecleo del año
           haría parpadear el panel entero. */
        <ul
          aria-busy={loading}
          className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-3"
        >
          {visible.map((key) => (
            <li key={key}>
              {metrics === null ? (
                <MetricCardSkeleton label={METRIC_LABELS[key]} />
              ) : (
                <MetricCard metricKey={key} metrics={metrics} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MetricCard({
  metricKey,
  metrics,
}: {
  metricKey: MetricKey;
  metrics: DashboardMetrics;
}) {
  const comparison = formatComparison(metrics.comparison[metricKey]);

  return (
    <Card className="flex h-full flex-col gap-(--space-2)">
      <h3 className="font-body font-semibold text-sm tracking-label text-fg-muted uppercase">
        {METRIC_LABELS[metricKey]}
      </h3>

      <p className="font-display text-3xl leading-tight text-fg">
        {formatMetricValue(metricKey, metrics)}{" "}
        <span className="font-body text-base text-fg-muted">
          {METRIC_UNITS[metricKey]}
        </span>
      </p>

      {/* ENMIENDA E1.5: los metros son lifetime y no se mueven con los filtros.
          Sin la marca, cambiar de año enseña dos tarjetas moviéndose y una
          quieta, y se lee como un bug. */}
      {isLifetimeMetric(metricKey) ? (
        <p className="font-mono text-xs leading-base text-fg-muted">
          {LIFETIME_METRIC_NOTE}
        </p>
      ) : null}

      {comparison === null ? null : (
        <p className="font-mono text-sm leading-base text-accent">
          {comparison}
        </p>
      )}
    </Card>
  );
}

/**
 * `Skeleton` es `aria-hidden`, así que un bloque de carga no anuncia nada por su
 * cuenta: quien monta varios anuncia la carga UNA vez desde fuera. Aquí lo hace
 * el `aria-busy` de la lista, más la región viva de la página.
 */
function MetricCardSkeleton({ label }: { label: string }) {
  return (
    <Card className="flex h-full flex-col gap-(--space-3)">
      <h3 className="font-body font-semibold text-sm tracking-label text-fg-muted uppercase">
        {label}
      </h3>
      <Skeleton shape="block" className="h-(--space-10) w-full" />
      <Skeleton className="w-full" />
    </Card>
  );
}
