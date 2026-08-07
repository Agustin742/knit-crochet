"use client";

import { useCallback, useEffect, useState } from "react";

import type { DashboardMetrics } from "@/features/dashboard/types";
import type { SerializedProject } from "@/features/projects/ui";
import { type CraftType } from "@/shared/config";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Toggle,
  ToggleGroup,
} from "@/shared/ui";

import { ActiveProjectsPanel } from "./ActiveProjectsPanel";
import { DashboardHero } from "./DashboardHero";
import { MetricsPanel } from "./MetricsPanel";
import { NewProjectDialog } from "./NewProjectDialog";
import { getActiveProjects, getMetrics } from "./dashboard-client";
import {
  CRAFT_TYPE_LABELS,
  CRAFT_TYPE_ORDER,
  CREATE_PROJECT_LABELS,
  DEFAULT_SORT_ORDER,
  type SortOrder,
  YEAR_RANGE_MESSAGE,
  clampYear,
  parseYear,
  toTypeFilter,
} from "./filters";
import { DEFAULT_METRIC_KEYS, type MetricKey } from "./metrics-display";

export const YEAR_LABEL = "Año";
export const PREVIOUS_YEAR_LABEL = "Año anterior";
export const NEXT_YEAR_LABEL = "Año siguiente";
export const TYPE_GROUP_LABEL = "Tipo de tejido";
export const LOADING_MESSAGE = "Cargando tu resumen.";
export const ERROR_TITLE = "Se enredó la madeja";

export function emptyStateTitle(year: number): string {
  return `Todavía no tejiste nada en ${year}`;
}

export const EMPTY_STATE_DESCRIPTION =
  "Estrená el año con un proyecto: los botones de arriba lo crean en dos pasos.";

type DashboardData = {
  metrics: DashboardMetrics;
  projects: SerializedProject[];
};

/** Lo último que llegó, con la clave de la petición que lo trajo. */
type LoadedState = {
  key: string;
  data: DashboardData | null;
  error: string | null;
};

/**
 * La página Dashboard entera (RFC-02).
 *
 * **Los datos se piden desde el navegador**, no en el Server Component de la
 * ruta, y es una decisión con motivo: los filtros de año y tipo cambian sin
 * navegar, así que la pantalla tiene que poder recargarse sola, y el RFC §4 pide
 * un estado de carga con bloques de carga, que sólo existe si hay una carga que
 * mostrar. El estado es `useState` local: **Zustand no está instalado** en el
 * repo (aunque el stack lo nombre), y añadirlo sería una decisión nueva.
 *
 * El caparazón sigue sin costar ninguna petición al montar: quien pide es esta
 * página, no `AppShellClient`.
 */
export function DashboardView() {
  /* El año arranca en el actual (RFC-02 §1). Se toma del reloj del cliente, que
     es el del usuario; el servidor sólo pondría el suyo si no mandáramos el
     parámetro, y siempre se manda. */
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [yearInput, setYearInput] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [types, setTypes] = useState<readonly CraftType[]>([]);
  const [metricKeys, setMetricKeys] =
    useState<readonly MetricKey[]>(DEFAULT_METRIC_KEYS);
  const [order, setOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [newProjectType, setNewProjectType] = useState<CraftType | null>(null);

  /* Cambia para volver a pedir los mismos datos: reintentar tras un error y
     recargar tras un alta. Un booleano no serviría — dos reintentos seguidos
     tienen que disparar dos peticiones. */
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<LoadedState | null>(null);

  const type = toTypeFilter(types);
  const yearIsValid = parseYear(yearInput) !== null;

  /* "Estar cargando" se DERIVA de comparar lo pedido con lo que ya llegó, en vez
     de guardarse en su propio booleano. Con un booleano hay que encenderlo en
     cada sitio que cambia un filtro, y el día que uno se olvide la pantalla se
     queda cargando para siempre — o peor, se enciende sin que salga ninguna
     petición. Aquí es imposible que se desincronicen: si la clave pedida no es
     la que llegó, hay algo en vuelo. */
  const requestKey = `${year}|${type ?? ""}|${reloadToken}`;
  const loading = loaded?.key !== requestKey;
  /* Los datos VIEJOS sobreviven al cambio de filtro: se sigue viendo el año
     anterior mientras llega el nuevo, en vez de parpadear a vacío en cada tecla. */
  const data = loaded?.data ?? null;
  const errorMessage = loaded?.key === requestKey ? loaded.error : null;

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      getMetrics({ year, type }),
      getActiveProjects({ year, type }),
    ]).then(([metrics, projects]) => {
      if (cancelled) {
        return;
      }
      setLoaded((previous) => {
        const kept = previous?.data ?? null;
        if (!metrics.ok) {
          return { key: requestKey, data: kept, error: metrics.message };
        }
        if (!projects.ok) {
          return { key: requestKey, data: kept, error: projects.message };
        }
        return {
          key: requestKey,
          data: { metrics: metrics.data, projects: projects.data },
          error: null,
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [year, type, requestKey]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  function handleYearInput(value: string) {
    setYearInput(value);
    const parsed = parseYear(value);
    if (parsed !== null) {
      setYear(parsed);
    }
  }

  function stepYear(delta: number) {
    const next = clampYear(year + delta);
    setYear(next);
    setYearInput(String(next));
  }

  function toggleType(candidate: CraftType) {
    setTypes((current) =>
      current.includes(candidate)
        ? current.filter((entry) => entry !== candidate)
        : [...current, candidate],
    );
  }

  function toggleMetric(candidate: MetricKey) {
    setMetricKeys((current) =>
      current.includes(candidate)
        ? current.filter((entry) => entry !== candidate)
        : [...current, candidate],
    );
  }

  /* "Vacío" es del AÑO, así que los metros no cuentan: son un agregado lifetime
     y no se mueven con los filtros (enmienda E1.5). Con ellos dentro, quien
     hubiera cargado una lana alguna vez no vería nunca el estado vacío. */
  const isEmpty =
    data !== null &&
    data.metrics.hours === 0 &&
    data.metrics.projects === 0 &&
    data.projects.length === 0;

  return (
    <div className="flex flex-col gap-(--space-8) p-(--space-6)">
      <DashboardHero />

      {/* Región viva única de la página: los bloques de carga son `aria-hidden`
          y no anuncian nada por su cuenta. */}
      <p role="status" className="sr-only">
        {loading ? LOADING_MESSAGE : ""}
      </p>

      <section
        aria-label="Filtros y creación"
        className="flex flex-col gap-(--space-4) desktop:flex-row desktop:items-end desktop:justify-between"
      >
        <div className="flex flex-wrap items-end gap-(--space-4)">
          {/* La tarjeta no es decoración: `Field` pinta su etiqueta con el
              primer plano oscuro, ilegible sobre el fondo de la app, y la
              variante elevada es la única donde el anillo de foco llega al
              contraste mínimo (deuda 31). */}
          <Card className="flex items-end gap-(--space-2) p-(--space-3)">
            <Button
              size="icon"
              aria-label={PREVIOUS_YEAR_LABEL}
              onClick={() => stepYear(-1)}
            >
              −
            </Button>
            <Field
              label={YEAR_LABEL}
              error={yearIsValid ? undefined : YEAR_RANGE_MESSAGE}
            >
              <Input
                type="text"
                inputMode="numeric"
                name="year"
                autoComplete="off"
                value={yearInput}
                onChange={(event) => handleYearInput(event.target.value)}
                className="field-sizing-content"
              />
            </Field>
            <Button
              size="icon"
              aria-label={NEXT_YEAR_LABEL}
              onClick={() => stepYear(1)}
            >
              +
            </Button>
          </Card>

          <ToggleGroup
            label={TYPE_GROUP_LABEL}
            className="flex flex-wrap gap-(--space-2)"
          >
            {CRAFT_TYPE_ORDER.map((candidate) => (
              <Toggle
                key={candidate}
                pressed={types.includes(candidate)}
                onPressedChange={() => toggleType(candidate)}
              >
                {CRAFT_TYPE_LABELS[candidate]}
              </Toggle>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap gap-(--space-3)">
          {CRAFT_TYPE_ORDER.map((candidate) => (
            <Button
              key={candidate}
              variant="primary"
              onClick={() => setNewProjectType(candidate)}
            >
              {CREATE_PROJECT_LABELS[candidate]}
            </Button>
          ))}
        </div>
      </section>

      {errorMessage !== null ? (
        <ErrorState
          title={ERROR_TITLE}
          description={errorMessage}
          onRetry={reload}
        />
      ) : isEmpty ? (
        <EmptyState
          title={emptyStateTitle(year)}
          description={EMPTY_STATE_DESCRIPTION}
        />
      ) : (
        <>
          <MetricsPanel
            metrics={data?.metrics ?? null}
            selected={metricKeys}
            onToggleMetric={toggleMetric}
            loading={loading}
          />
          <ActiveProjectsPanel
            projects={data?.projects ?? null}
            order={order}
            onOrderChange={setOrder}
            loading={loading}
          />
        </>
      )}

      {newProjectType === null ? null : (
        <NewProjectDialog
          type={newProjectType}
          onClose={() => setNewProjectType(null)}
          onCreated={() => {
            setNewProjectType(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
