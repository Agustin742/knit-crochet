"use client";

import Link from "next/link";

import { ProjectCard, type SerializedProject } from "@/features/projects/ui";
import { Card, EmptyState, Field, Skeleton, inputClasses } from "@/shared/ui";

import {
  MAX_ACTIVE_PROJECTS,
  SORT_HINT,
  SORT_ORDERS,
  type SortOrder,
  sortProjects,
} from "./filters";

export const ACTIVE_SECTION_TITLE = "Proyectos en curso";
export const SORT_LABEL = "Ordenar por";
export const SEE_ALL_LABEL = "Ver todos";
export const PROJECTS_ROUTE = "/proyectos";
export const NO_ACTIVE_PROJECTS_TITLE = "No tenés proyectos en curso";
export const NO_ACTIVE_PROJECTS_DESCRIPTION =
  "Cuando empieces uno, aparece acá con su progreso y su tiempo.";

export interface ActiveProjectsPanelProps {
  /** `null` mientras la primera carga está en vuelo. */
  projects: SerializedProject[] | null;
  order: SortOrder;
  onOrderChange: (order: SortOrder) => void;
  loading: boolean;
}

/**
 * Lista de proyectos activos (RFC-02 §1/§2): tope de `MAX_ACTIVE_PROJECTS`,
 * orden cambiable desde la UI y "ver todos" hacia la página de proyectos.
 *
 * **El orden y el tope son de cliente**: el contrato de `GET /api/projects`
 * devuelve `startDate` descendente y no acepta `limit`, `offset` ni criterio de
 * ordenación (RFC-02 §3). La lista es chica (~15 activos), así que recortarla
 * aquí no cuesta nada.
 *
 * La etiqueta del orden por defecto dice "Actividad reciente" y **no** "último
 * tejido" (enmienda E2.2): el dato que la sostiene es `updatedAt`, que es
 * "último toque". El texto de ayuda del campo lo dice con todas las letras, para
 * que nadie lea el orden como algo que el dato no mide.
 */
export function ActiveProjectsPanel({
  projects,
  order,
  onOrderChange,
  loading,
}: ActiveProjectsPanelProps) {
  const visible =
    projects === null
      ? null
      : sortProjects(projects, order).slice(0, MAX_ACTIVE_PROJECTS);

  return (
    <section
      aria-labelledby="dashboard-active-title"
      className="flex flex-col gap-(--space-4)"
    >
      <div className="flex flex-col gap-(--space-3) tablet:flex-row tablet:items-end tablet:justify-between">
        <h2
          id="dashboard-active-title"
          className="font-display text-2xl leading-tight text-fg-inverse"
        >
          {ACTIVE_SECTION_TITLE}
        </h2>

        <div className="flex flex-col gap-(--space-3) tablet:flex-row tablet:items-end">
          {/* El campo va DENTRO de una tarjeta y no suelto sobre el fondo:
              `Field` pinta su etiqueta con el primer plano oscuro, que sobre el
              espresso de la app sería ilegible. Y sobre la variante elevada
              porque es la única superficie donde el anillo de foco llega al
              contraste mínimo (deuda 31). */}
          <Card className="p-(--space-3)">
            <Field label={SORT_LABEL} hint={SORT_HINT}>
              <select
                className={inputClasses}
                value={order}
                onChange={(event) =>
                  onOrderChange(event.target.value as SortOrder)
                }
              >
                {SORT_ORDERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </Card>

          <Link href={PROJECTS_ROUTE} className={SEE_ALL_CLASSES}>
            {SEE_ALL_LABEL}
          </Link>
        </div>
      </div>

      {visible === null ? (
        <ProjectListSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          headingLevel={3}
          title={NO_ACTIVE_PROJECTS_TITLE}
          description={NO_ACTIVE_PROJECTS_DESCRIPTION}
        />
      ) : (
        <>
          <ul
            aria-busy={loading}
            className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3"
          >
            {visible.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
          {projects !== null && projects.length > visible.length ? (
            <p className="font-mono text-sm leading-base text-fg-inverse-muted">
              {`Mostrando ${visible.length} de ${projects.length}.`}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

/** Enlace de texto: no hay primitivo de enlace en el design system todavía. */
const SEE_ALL_CLASSES = [
  "inline-flex min-h-(--touch-target) items-center",
  "font-body font-semibold text-fg-inverse underline",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");

/**
 * Tres bloques de carga con la silueta de una tarjeta. `Skeleton` es
 * `aria-hidden`, así que no anuncian nada solos: la carga la anuncia una vez la
 * región viva de la página.
 */
function ProjectListSkeleton() {
  return (
    <ul
      aria-busy="true"
      className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3"
    >
      {[0, 1, 2].map((slot) => (
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
