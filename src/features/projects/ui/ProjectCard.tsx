import { Button, Card, ProgressBar } from "@/shared/ui";
import { formatDuration, formatInteger } from "@/shared/lib/format";

import type { ProjectCardData } from "./types";

/** Niveles admitidos para el nombre. Mismo criterio que `StatePanel`. */
export const PROJECT_CARD_HEADING_LEVELS = [2, 3, 4] as const;

export type ProjectCardHeadingLevel =
  (typeof PROJECT_CARD_HEADING_LEVELS)[number];

/**
 * Nombre accesible del quick-start. Lleva el nombre del proyecto porque en una
 * grilla hay N botones iguales y "Empezar a tejer" a secas no dice de cuál
 * habla. Se exporta para que los tests lo importen en vez de reescribirlo.
 */
export function quickStartLabel(projectName: string): string {
  return `Empezar a tejer ${projectName}`;
}

export interface ProjectCardProps {
  project: ProjectCardData;
  /**
   * Nivel del nombre. La tarjeta no sabe a qué profundidad la montan, y
   * saltarse un nivel es un defecto de accesibilidad que no se puede adivinar
   * desde dentro. Por defecto `3`, que es el sitio natural: dentro de una
   * sección con su `h2`.
   */
  headingLevel?: ProjectCardHeadingLevel;
  className?: string;
  /**
   * Quick-start del cronómetro (RFC-03 §2). **Es opt-in y por eso el añadido es
   * aditivo**: sin esta prop la tarjeta no monta NINGÚN control, que es la
   * invariante que su consumidor de #19 —el Dashboard, que no pasa la acción—
   * conserva intacta.
   *
   * **Sólo arranca. No es un toggle** (enmienda E1(e)): `POST
   * /:id/sessions/start` es idempotente (201 si crea, 200 si reutiliza una
   * sesión abierta, nunca 409) y **no hay forma de saber desde la lista si el
   * cronómetro corre** —ni columna, ni filtro, ni endpoint—, así que un
   * start/stop tendría que adivinar qué icono pintar. El estado "corriendo" se
   * aprende al tocar, no antes.
   */
  onQuickStart?: () => void;
  /**
   * Petición en vuelo. Va como prop **propia** y no como campo del proyecto: el
   * `Pick` de `ProjectCardData` no tiene por qué crecer para esto (deuda 109),
   * y "hay una petición en marcha" no es un dato del proyecto.
   */
  quickStartPending?: boolean;
}

/**
 * Tarjeta de proyecto: **foto, nombre, barra de progreso y tiempo** (RFC-02 §2,
 * enmienda E2.1 del RFC-02).
 *
 * Vive en `features/projects/ui/` y no en `features/dashboard/ui/` aunque la
 * cree la slice del Dashboard: es la tarjeta *de proyecto*, y la lista de
 * proyectos (#20) la va a buscar aquí.
 *
 * **NO lleva quick-start de cronómetro, y no es un olvido.** La versión de
 * RFC-02 es un subconjunto estricto de la de RFC-03, así que #20 la extiende de
 * forma aditiva sin reescribir nada. Tampoco hay un slot de acción "preparado"
 * esperándolo: un slot que ningún consumidor usa no se puede probar contra un
 * consumidor real, y es código muerto.
 *
 * Es un `div` (lo que `Card` sabe ser) y **no** un `li` ni un `article`: quien la
 * monte en una lista la envuelve. Así la misma tarjeta sirve en una grilla, en
 * una lista y suelta.
 */
export function ProjectCard({
  project,
  headingLevel = 3,
  className,
  onQuickStart,
  quickStartPending = false,
}: ProjectCardProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <Card className={className}>
      <div className="flex flex-col gap-(--space-3)">
        <ProjectPhoto name={project.name} image={project.image} />

        <div className="flex items-start justify-between gap-(--space-3)">
          <Heading className="font-display text-xl leading-tight text-fg">
            {project.name}
          </Heading>

          {/* El botón NO envuelve la tarjeta ni vive dentro de un enlace: en #20
              la tarjeta no es tocable (E1(f)), y un `button` dentro de un `a`
              es marcado inválido que `axe` marca. El tap al detalle lo añade
              #21, cuando el drawer exista. */}
          {onQuickStart === undefined ? null : (
            <Button
              size="icon"
              aria-label={quickStartLabel(project.name)}
              loading={quickStartPending}
              onClick={onQuickStart}
            >
              {quickStartPending ? null : <span aria-hidden="true">▶</span>}
            </Button>
          )}
        </div>

        {/* El nombre del proyecto entra en la etiqueta de la barra: con varias
            tarjetas en pantalla, "Progreso" a secas se repite N veces y no
            distingue de cuál habla. */}
        <ProgressBar
          value={project.progress}
          label={`Progreso de ${project.name}`}
        />

        <p className="flex items-baseline justify-between font-mono text-sm leading-base text-fg-muted">
          <span>{`${formatInteger(project.progress)}%`}</span>
          <span>
            <span className="sr-only">Tiempo tejido: </span>
            {formatDuration(project.time)}
          </span>
        </p>
      </div>
    </Card>
  );
}

/**
 * La foto es **decorativa**: el nombre del proyecto está justo debajo, así que
 * un texto alternativo que lo repitiera sólo haría que un lector de pantalla lo
 * dijera dos veces. Por eso `alt=""` y no una descripción.
 *
 * Sin foto se pinta un hueco con la misma silueta en vez de colapsar el bloque:
 * si no, las tarjetas de una misma fila tendrían alturas distintas según quién
 * subió imagen.
 */
function ProjectPhoto({ name, image }: { name: string; image: string | null }) {
  const frame =
    "aspect-video w-full overflow-hidden rounded-sm border-(length:--border-width) border-solid border-border bg-surface-sunken";

  if (image === null) {
    return (
      <div className={`${frame} flex items-center justify-center`}>
        <span aria-hidden="true" className="font-mono text-lg text-fg-muted">
          {initialOf(name)}
        </span>
      </div>
    );
  }

  /* Etiqueta `img` y no `next/image`: las fotos son URLs de Cloudinary, o sea un
     host remoto arbitrario, y `next/image` exigiría declarar
     `images.remotePatterns` en `next.config.ts`. Eso es una decisión de la
     canalización de imágenes —quién optimiza, con qué presupuesto y contra qué
     hosts— y no de esta tarjeta. Cuando exista esa configuración, el cambio es
     de un solo sitio. */
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver el comentario de arriba
    <img
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      className={`${frame} object-cover`}
    />
  );
}

/** Inicial del proyecto, como marca del hueco. Vacío si el nombre no da ninguna. */
function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}
