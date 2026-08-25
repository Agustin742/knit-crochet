import { type CraftType } from "@/shared/config";
import { Button, Card, ProgressBar } from "@/shared/ui";
import { formatDuration, formatInteger } from "@/shared/lib/format";

import { CRAFT_TYPE_LABELS } from "./project-filters";
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

/**
 * Nombre accesible del tap al detalle. Lleva el nombre del proyecto por lo mismo
 * que el del quick-start: en una grilla hay N tarjetas iguales y "Ver detalle" a
 * secas no dice de cuál habla.
 */
export function openDetailLabel(projectName: string): string {
  return `Ver detalle de ${projectName}`;
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
  /**
   * Marca corta de lo que acaba de pasar con el cronómetro de este proyecto
   * (enmienda E2(d)). Es **presentación pura**: la tarjeta no sabe de dónde sale
   * el texto ni cuánto dura, sólo lo pinta si se lo dan.
   *
   * **No monta ningún control**, y eso no es un detalle: la invariante de la
   * deuda 132 —sin `onQuickStart`, cero controles— tiene que seguir en pie,
   * porque el Dashboard monta esta misma tarjeta sin la acción. Marcar "en
   * marcha" tampoco es ofrecer "parar": el quick-start **sólo arranca** (E1(e)).
   *
   * Va **fuera del encabezado** a propósito: el nombre accesible de la tarjeta
   * es el nombre del proyecto y nada más.
   */
  quickStartNote?: string;
  /**
   * Abre el cajón de detalle (RFC-03 §2: *"Tap → drawer"*). **Es opt-in, igual
   * que el quick-start**, así que el Dashboard —que monta esta misma tarjeta sin
   * pasarla— sigue sin montar ningún control (deuda 132).
   *
   * **Por qué NO es la tarjeta entera un enlace ni un botón, que es lo que uno
   * escribiría primero:** dentro ya vive el quick-start, y un `button` dentro de
   * un `a` —o dentro de otro `button`— es marcado inválido que `axe` marca. Es
   * exactamente el motivo por el que **E1(f)** dejó el tap pendiente hasta que
   * existiera el cajón.
   *
   * La salida es una **capa transparente hermana** del contenido: cubre la
   * tarjeta, lleva el nombre accesible, y el quick-start se pinta por encima de
   * ella. Son dos controles hermanos, no anidados, así que el marcado es válido
   * y los dos son alcanzables por teclado.
   */
  onOpenDetail?: () => void;
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
  quickStartNote,
  onOpenDetail,
}: ProjectCardProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <Card className={className}>
      <div className="relative flex flex-col gap-(--space-3)">
        {/* La capa va PRIMERA en el DOM y sin z-index propio: el quick-start
            viene después y se posiciona, así que se pinta encima de ella sin
            necesidad de escalones. Su nombre accesible es texto de verdad
            (oculto), no un `aria-label` sobre un botón vacío. */}
        {onOpenDetail === undefined ? null : (
          <button
            type="button"
            className={DETAIL_TAP_CLASSES}
            onClick={onOpenDetail}
          >
            <span className="sr-only">{openDetailLabel(project.name)}</span>
          </button>
        )}

        <ProjectPhoto
          name={project.name}
          image={project.image}
          type={project.type}
        />

        <div className="flex items-start justify-between gap-(--space-3)">
          <div className="flex min-w-0 flex-col items-start gap-(--space-2)">
            <Heading className="font-display text-xl leading-tight text-fg">
              {project.name}
            </Heading>

            {quickStartNote === undefined ? null : (
              <span className={QUICK_START_NOTE_CLASSES}>{quickStartNote}</span>
            )}
          </div>

          {/* El botón NO envuelve la tarjeta ni vive dentro de un enlace, y
              tampoco dentro de la capa del tap: un control dentro de otro es
              marcado inválido que `axe` marca. Son hermanos, y el orden del DOM
              (más el `relative` de acá) es lo que deja este por encima. */}
          {onQuickStart === undefined ? null : (
            <Button
              size="icon"
              className="relative"
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
 * La capa que hace tocable la tarjeta (RFC-03 §2, enmienda **E1(f)**, resuelta
 * en #21).
 *
 * **No pinta nada**: es una superficie transparente del tamaño del contenido. Al
 * pasar el ratón se tiñe apenas —con el primer plano a baja opacidad, o sea un
 * token, no un color nuevo— para que se lea como algo que se puede tocar, y al
 * llegar por teclado dibuja el anillo de foco **por fuera de su caja**, que cae
 * sobre el relleno de la tarjeta y por eso se ve entero.
 *
 * **Cubre el contenido, no el relleno de la tarjeta**: la franja de relleno de la
 * `Card` no dispara el tap. Alcanzarla obligaría a que la tarjeta se posicionara
 * a sí misma, y eso es de la `Card` del design system, no de esta pieza.
 */
const DETAIL_TAP_CLASSES = [
  "absolute inset-0 rounded-sm",
  "cursor-pointer bg-transparent",
  "transition-colors duration-(--dur-fast) ease-standard",
  "hover:bg-fg/5",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");

/**
 * Marca de "esto acaba de pasar" en la tarjeta (enmienda E2(d)).
 *
 * Usa el color de **acierto** del sistema, que hasta ahora no tenía **ni un solo
 * uso** en toda la app (deuda 144): la aplicación sabía decir "esto falló" y no
 * sabía decir "esto salió bien". Se lee a 4.83:1 sobre la superficie elevada de
 * la tarjeta, que es donde se monta.
 *
 * Es un `span`, no un botón ni un enlace: la tarjeta sin `onQuickStart` sigue
 * sin montar ningún control (deuda 132).
 */
const QUICK_START_NOTE_CLASSES = [
  "inline-flex items-center",
  "border-(length:--border-width) border-solid border-success rounded-sm",
  "px-(--space-2) py-(--space-1)",
  "font-mono text-xs leading-base text-success",
].join(" ");

/**
 * La foto es **decorativa**: el nombre del proyecto está justo debajo, así que
 * un texto alternativo que lo repitiera sólo haría que un lector de pantalla lo
 * dijera dos veces. Por eso `alt=""` y no una descripción.
 *
 * Sin foto se pinta un hueco con la misma silueta en vez de colapsar el bloque:
 * si no, las tarjetas de una misma fila tendrían alturas distintas según quién
 * subió imagen.
 *
 * **La proporción NO cambia** (enmienda E2(g)): el marco es el mismo con foto y
 * sin ella, para que la rejilla no quede dentada cuando convivan las dos. Lo que
 * cambia es lo que hay **dentro**: era el bloque más grande de la tarjeta y no
 * decía nada —un rectángulo liso con una letra diminuta (deuda 140)—, y ahora se
 * lee como algo puesto a propósito: la inicial en tamaño de titular y la clase
 * de tejido nombrada debajo.
 *
 * **Los dos textos usan el primer plano normal, no el apagado**, y no es una
 * preferencia: sobre la superficie hundida del marco, el apagado da 4.09:1 —vale
 * para texto grande y **no** para texto chico—, y la clase de tejido es texto
 * chico. La jerarquía entre los dos se hace con **familia, tamaño y espaciado**,
 * que es lo que la convención pide ("énfasis por tipografía"), no bajando el
 * contraste.
 *
 * Los dos siguen siendo **decorativos**: con foto no se anuncia nada y sin foto
 * tampoco, así que lo que oye un lector de pantalla no depende de quién subió
 * imagen.
 */
export function ProjectPhoto({
  name,
  image,
  type,
}: {
  name: string;
  image: string | null;
  type: CraftType;
}) {
  const frame =
    "aspect-video w-full overflow-hidden rounded-sm border-(length:--border-width) border-solid border-border bg-surface-sunken";

  if (image === null) {
    return (
      <div
        className={`${frame} flex flex-col items-center justify-center gap-(--space-1)`}
      >
        <span
          aria-hidden="true"
          className="font-display text-3xl leading-tight text-fg"
        >
          {initialOf(name)}
        </span>
        <span
          aria-hidden="true"
          className="font-mono text-xs uppercase tracking-label text-fg"
        >
          {CRAFT_TYPE_LABELS[type]}
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
