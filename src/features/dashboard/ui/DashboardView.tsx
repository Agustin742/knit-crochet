"use client";

import { useCallback, useEffect, useState } from "react";

import type { DashboardMetrics } from "@/features/dashboard/types";
import type { SerializedProject } from "@/features/projects/ui";
import { type CraftType } from "@/shared/config";
import {
  Button,
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

/**
 * El vacío del año **cuenta qué va a haber acá**, no cómo funciona la app
 * (deuda 147, el hermano vivo de la 139).
 *
 * La copia anterior decía *"los botones de arriba lo crean en dos pasos"*: le
 * explicaba la mecánica interna del proyecto —dónde están los controles y por
 * cuántas pantallas pasa el alta— a alguien que sólo quiere tejer, y además
 * envejece sola en cuanto el alta cambie de forma. Mismo criterio que **E2(f)**
 * aplicó al `EMPTY_DESCRIPTION` de `/proyectos`: nada de rutas, ni de pasos, ni
 * de lo que todavía no existe.
 */
export const EMPTY_STATE_DESCRIPTION =
  "Empezá el primero y acá van a estar tus horas, tus proyectos y lo que llevás tejido de cada uno.";

/**
 * La MISMA pantalla vacía, para quien **sí** tiene algo en las agujas
 * (enmienda E4 e).
 *
 * Desde E4 (b) el vacío del año se alcanza también con proyectos activos —año
 * recién estrenado, proyecto abierto el anterior—, y desde E4 (d) ese proyecto
 * se sigue viendo en el panel de abajo. Con una sola copia, la pantalla le decía
 * *"empezá el primero"* a alguien que tiene uno **a la vista**: una afirmación
 * de por vida dentro de un estado que es del AÑO. Es la familia de la deuda 153
 * un piso más arriba —la condición ya se arregló, la frase seguía prometiendo lo
 * que la condición dejó de exigir—.
 *
 * Esta habla **sólo del año** y no presupone que no hayas tejido nunca. El
 * TÍTULO no cambia: sigue siendo el de §4 y es cierto en los dos caminos.
 */
export const EMPTY_STATE_WITH_ACTIVE_DESCRIPTION =
  "El año todavía está en blanco. En cuanto le dediques un rato a lo que tenés en curso, acá van a aparecer tus horas y tus proyectos.";

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
      /* SIN año (E4 a): los proyectos en curso son del presente. La petición
         se repite igual al cambiar de año porque va en el mismo `Promise.all`
         que las métricas, y eso está bien: cuesta una petición y mantiene la
         lista fresca. */
      getActiveProjects({ type }),
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

  /* "Vacío" es del AÑO, y sólo del año: se juzga con las métricas del año y con
     nada más.
     Quedan fuera DOS cosas por el MISMO motivo. Los metros, porque son un
     agregado lifetime que no se mueve con los filtros (enmienda E1.5): con ellos
     dentro, quien hubiera cargado una lana alguna vez no vería nunca el estado
     vacío. Y la lista de proyectos en curso, porque tampoco es del año
     (enmienda E4 b): es del presente, así que quien tenga un proyecto en las
     agujas lo tiene abierto en todos los años a la vez, y con `projects` dentro
     el vacío era literalmente inalcanzable en pantalla (deuda 153). El título
     promete algo sobre el año; la condición no puede pedir hechos que no sean
     del año. */
  const isEmpty =
    data !== null && data.metrics.hours === 0 && data.metrics.projects === 0;

  /* E4 (d): el vacío del año NO puede esconder un proyecto vivo. Con E4 (b) el
     vacío se alcanza TENIENDO proyectos activos —año recién estrenado, proyecto
     abierto el anterior y todavía en curso—, así que lo que sustituye es el
     panel de métricas, que es lo que juzga el año. La lista de en curso se
     queda; si además está vacía no hay panel que pintar y la página queda en el
     vacío puro, que es el caso de quien todavía no tejió nada. */
  const hasActiveProjects = (data?.projects.length ?? 0) > 0;
  const showActiveProjects = !isEmpty || hasActiveProjects;

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
          {/* SIN `Card` (enmienda E13 c): `Card` es para CONTENIDO —una tarjeta
              de métrica, una de proyecto—, no para envolver un control. El marco
              blanco alrededor del stepper de año lo hacía leerse como un panel
              aparte flotando en medio de una fila cuyos vecinos van sueltos
              sobre el fondo; no era un defecto de posición, era de categoría
              (deuda 154, misma familia que la 142).
              Lo que la tarjeta sí resolvía se resuelve ahora donde toca: la
              etiqueta y el mensaje del campo salen en tono inverso
              (`tone="inverse"`), y el anillo de foco MEJORA al perder la
              tarjeta — `--focus` mide 4.68:1 sobre el fondo oscuro contra 2.95:1
              sobre la superficie clara (deuda 31). */}
          <div className="flex items-end gap-(--space-2)">
            <Button
              size="icon"
              aria-label={PREVIOUS_YEAR_LABEL}
              onClick={() => stepYear(-1)}
            >
              −
            </Button>
            <Field
              tone="inverse"
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
          </div>

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
      ) : (
        <>
          {isEmpty ? (
            <EmptyState
              title={emptyStateTitle(year)}
              /* E4 (e): la descripción la decide EXACTAMENTE el mismo hecho que
                 decide si hay panel de proyectos debajo, así que la frase no
                 puede contradecir lo que se ve en la misma pantalla. */
              description={
                hasActiveProjects
                  ? EMPTY_STATE_WITH_ACTIVE_DESCRIPTION
                  : EMPTY_STATE_DESCRIPTION
              }
            />
          ) : (
            <MetricsPanel
              metrics={data?.metrics ?? null}
              selected={metricKeys}
              onToggleMetric={toggleMetric}
              loading={loading}
            />
          )}
          {showActiveProjects ? (
            <ActiveProjectsPanel
              projects={data?.projects ?? null}
              order={order}
              onOrderChange={setOrder}
              loading={loading}
            />
          ) : null}
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
