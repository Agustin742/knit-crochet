"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { type CraftType } from "@/shared/config";
import { Card, EmptyState, ErrorState, Skeleton } from "@/shared/ui";

import { ProjectCard } from "./ProjectCard";
import { ProjectsToolbar } from "./ProjectsToolbar";
import {
  CRAFT_TYPE_ORDER,
  DEFAULT_STATUS_FILTER,
  type StatusFilter,
  type YarnChoice,
  filterByName,
  isActiveFilter,
  toTypeFilter,
  toYarnChoices,
} from "./project-filters";
import {
  SESSION_CREATED_STATUS,
  getProjects,
  getYarnOptions,
  startCraftSession,
} from "./projects-client";
import type { SerializedProject } from "./types";

export const PAGE_TITLE = "Proyectos";

/** Nombre de la región viva de carga. Ver el JSDoc de la vista (deuda 114). */
export const LOADING_REGION_LABEL = "Estado de la lista de proyectos";
export const LOADING_MESSAGE = "Cargando tus proyectos.";

export const QUICK_START_REGION_LABEL = "Cronómetro";

export const ERROR_TITLE = "Se soltó un punto";

export const EMPTY_TITLE = "Tu cesto está vacío";
export const EMPTY_DESCRIPTION =
  "Empezá un proyecto: los dos botones de acá abajo te llevan al inicio, que es donde hoy se crea en dos pasos.";

export const NO_MATCHES_TITLE = "Ningún proyecto coincide con la búsqueda";
export const NO_MATCHES_DESCRIPTION =
  "Probá con otro nombre o vaciá el campo de búsqueda.";

export const DASHBOARD_ROUTE = "/";

/** Los dos botones de crear del estado vacío (RFC-03 §4), uno por craft. */
export const CREATE_PROJECT_LABELS: Record<CraftType, string> = {
  knitting: "Nuevo dos agujas",
  crochet: "Nuevo crochet",
};

export function quickStartStartedMessage(projectName: string): string {
  return `Empezaste a tejer ${projectName}.`;
}

export function quickStartResumedMessage(projectName: string): string {
  return `${projectName} ya tenía el cronómetro en marcha.`;
}

/** Lo último que llegó, con la clave de la petición que lo trajo. */
type LoadedState = {
  key: string;
  projects: SerializedProject[] | null;
  error: string | null;
};

/**
 * La lista de proyectos entera (RFC-03 §2 y §4).
 *
 * **Los datos se piden desde el navegador**, como en el Dashboard y por el mismo
 * motivo: el toolbar cambia los filtros sin navegar, así que la pantalla tiene
 * que poder recargarse sola, y el estado de carga sólo existe si hay una carga
 * que mostrar. El estado es `useState` local (Zustand no está instalado).
 *
 * **Estar cargando se DERIVA** de comparar la clave pedida con la que llegó, en
 * vez de guardarse en un booleano que hay que acordarse de encender en cada
 * filtro. El texto de búsqueda **no entra en la clave**: se filtra en memoria
 * (E1(a)) y no dispara ninguna petición.
 *
 * La región viva de carga **lleva nombre** (deuda 114): la del Dashboard es
 * anónima y el helper `settle()` de tres archivos de test depende de que sea
 * única en la pantalla; dos regiones anónimas convierten esos selectores en
 * ambiguos, y la ambigüedad de un selector no falla limpio, falla raro.
 */
export function ProjectsView() {
  const [status, setStatus] = useState<StatusFilter>(DEFAULT_STATUS_FILTER);
  const [types, setTypes] = useState<readonly CraftType[]>([]);
  const [needle, setNeedle] = useState<number | null>(null);
  const [yarnId, setYarnId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [yarnChoices, setYarnChoices] = useState<readonly YarnChoice[]>([]);

  /* Cambia para volver a pedir los mismos datos. Un booleano no serviría: dos
     reintentos seguidos tienen que disparar dos peticiones. */
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<LoadedState | null>(null);

  const [pendingQuickStart, setPendingQuickStart] = useState<string | null>(
    null,
  );
  const [quickStartMessage, setQuickStartMessage] = useState("");

  const active = isActiveFilter(status);
  const type = toTypeFilter(types);

  const requestKey = `${String(active)}|${type ?? ""}|${needle ?? ""}|${yarnId ?? ""}|${reloadToken}`;
  const loading = loaded?.key !== requestKey;
  /* Los datos VIEJOS sobreviven al cambio de filtro: se sigue viendo la lista
     anterior mientras llega la nueva, en vez de parpadear a vacío. */
  const projects = loaded?.projects ?? null;
  const errorMessage = loaded?.key === requestKey ? loaded.error : null;

  useEffect(() => {
    let cancelled = false;

    void getProjects({
      active,
      type,
      needle: needle ?? undefined,
      yarnId: yarnId ?? undefined,
    }).then((result) => {
      if (cancelled) {
        return;
      }
      setLoaded((previous) => {
        const kept = previous?.projects ?? null;
        return result.ok
          ? { key: requestKey, projects: result.data, error: null }
          : { key: requestKey, projects: kept, error: result.message };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [active, type, needle, yarnId, requestKey]);

  /* Las opciones de "lana usada" no dependen de los filtros: se piden una vez.
     Si la petición falla, el desplegable se queda con su opción "Todas" y la
     pantalla sigue siendo usable — un filtro secundario roto no es motivo para
     tapar la lista con un estado de error. */
  useEffect(() => {
    let cancelled = false;

    void getYarnOptions().then((result) => {
      if (!cancelled && result.ok) {
        setYarnChoices(toYarnChoices(result.data));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  function toggleType(candidate: CraftType) {
    setTypes((current) =>
      current.includes(candidate)
        ? current.filter((entry) => entry !== candidate)
        : [...current, candidate],
    );
  }

  /**
   * El quick-start **sólo arranca** (E1(e)). El start es idempotente, así que un
   * doble toque no puede duplicar ni reiniciar nada; lo único que distingue
   * "arranqué yo" de "ya estaba corriendo" es el **201 frente al 200**, y por eso
   * el cliente devuelve el status también en el camino OK.
   *
   * El resultado se anuncia en **una sola región viva de página** y no en un
   * `role="alert"` por tarjeta: en una grilla hay N botones y N alertas
   * multiplicarían los anuncios.
   */
  async function handleQuickStart(project: SerializedProject) {
    setPendingQuickStart(project.id);
    setQuickStartMessage("");

    const result = await startCraftSession(project.id);

    setPendingQuickStart(null);
    setQuickStartMessage(
      result.ok
        ? result.status === SESSION_CREATED_STATUS
          ? quickStartStartedMessage(project.name)
          : quickStartResumedMessage(project.name)
        : result.message,
    );
  }

  const visible = projects === null ? null : filterByName(projects, search);
  const listIsEmpty = projects !== null && projects.length === 0;
  const searchHidEverything =
    visible !== null && visible.length === 0 && !listIsEmpty;

  return (
    <div className="flex flex-col gap-(--space-8) p-(--space-6)">
      <h1 className="font-display text-3xl leading-tight text-fg-inverse">
        {PAGE_TITLE}
      </h1>

      {/* Región viva única de la carga: los bloques de carga son `aria-hidden`
          y no anuncian nada por su cuenta. */}
      <p role="status" aria-label={LOADING_REGION_LABEL} className="sr-only">
        {loading ? LOADING_MESSAGE : ""}
      </p>
      <p
        role="status"
        aria-label={QUICK_START_REGION_LABEL}
        className="sr-only"
      >
        {quickStartMessage}
      </p>

      <ProjectsToolbar
        status={status}
        onStatusChange={setStatus}
        types={types}
        onToggleType={toggleType}
        search={search}
        onSearchChange={setSearch}
        needle={needle}
        onNeedleChange={setNeedle}
        yarnId={yarnId}
        onYarnChange={setYarnId}
        yarnChoices={yarnChoices}
      />

      {errorMessage !== null ? (
        <ErrorState
          title={ERROR_TITLE}
          description={errorMessage}
          onRetry={reload}
        />
      ) : visible === null ? (
        <ProjectGridSkeleton />
      ) : listIsEmpty ? (
        <EmptyState
          title={EMPTY_TITLE}
          description={EMPTY_DESCRIPTION}
          action={
            <div className="flex flex-wrap justify-center gap-(--space-3)">
              {CRAFT_TYPE_ORDER.map((candidate) => (
                <Link
                  key={candidate}
                  href={DASHBOARD_ROUTE}
                  className={CREATE_LINK_CLASSES}
                >
                  {CREATE_PROJECT_LABELS[candidate]}
                </Link>
              ))}
            </div>
          }
        />
      ) : searchHidEverything ? (
        <EmptyState
          title={NO_MATCHES_TITLE}
          description={NO_MATCHES_DESCRIPTION}
        />
      ) : (
        <ul
          aria-busy={loading}
          className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3"
        >
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                headingLevel={2}
                onQuickStart={() => void handleQuickStart(project)}
                quickStartPending={pendingQuickStart === project.id}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Enlace de texto: sigue sin haber primitivo de enlace en el design system
 * (mismo ad-hoc que `ActiveProjectsPanel`). Va **dentro** del panel vacío, que
 * es una superficie clara, así que usa el primer plano normal y no el `inverse`.
 *
 * Son enlaces y no botones porque **el formulario de alta es la feature #22**:
 * hoy la única creación que existe vive en el inicio, y un botón que no lleva a
 * ninguna parte sería la deuda 29 en pequeño. Cuando #22 exista, esto se cambia
 * por el modal sin tocar nada más.
 */
const CREATE_LINK_CLASSES = [
  "inline-flex min-h-(--touch-target) items-center",
  "font-body font-semibold text-fg underline",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");

/**
 * Seis bloques de carga con la silueta de una tarjeta, en la misma rejilla que
 * la lista real para que no salte el maquetado al llegar los datos. `Skeleton`
 * es `aria-hidden`: la carga la anuncia una vez la región viva de la página.
 */
function ProjectGridSkeleton() {
  return (
    <ul
      aria-busy="true"
      className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3"
    >
      {[0, 1, 2, 3, 4, 5].map((slot) => (
        <li key={slot}>
          <Card className="flex flex-col gap-(--space-3)">
            <Skeleton shape="block" className="aspect-video w-full" />
            <Skeleton className="w-full" />
            <Skeleton shape="block" className="h-(--space-3) w-full" />
          </Card>
        </li>
      ))}
    </ul>
  );
}
