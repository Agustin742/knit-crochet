"use client";

import { useEffect, useState } from "react";

import { MILLISECONDS_PER_SECOND, type CraftType } from "@/shared/config";
import { Button, Card, ProgressBar } from "@/shared/ui";
import {
  formatClock,
  formatDuration,
  formatInteger,
} from "@/shared/lib/format";

import { sessionElapsedSeconds } from "./project-detail";
import { CRAFT_TYPE_LABELS } from "./project-filters";
import type { ProjectCardData, SerializedActiveSession } from "./types";

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
 * Nombre accesible del **mismo** control con el cronómetro en marcha (enmienda
 * **E7 (b1)**). Es la mitad accesible de "el botón se transforma": quien no ve
 * la pantalla se entera de que la acción cambió porque cambia el nombre, no
 * porque cambie un icono.
 */
export function quickStopLabel(projectName: string): string {
  return `Parar el cronómetro de ${projectName}`;
}

/**
 * Lo que se lee del reloj en grano de **minuto** (enmienda **E4 (a)**).
 *
 * Los dígitos de segundos son decoración: dichos en voz alta cambiarían sesenta
 * veces por minuto sin decir nada nuevo. Este texto dice **el estado y el
 * tiempo**, y **no** vive en una región viva —no se anuncia solo—, así que se
 * lee cuando quien navega llega a la tarjeta.
 */
export function runningTimerLabel(elapsedSeconds: number): string {
  return `Cronómetro en marcha: ${formatDuration(elapsedSeconds)}`;
}

/**
 * Nombre accesible del tap al detalle. Lleva el nombre del proyecto por lo mismo
 * que el del quick-start: en una grilla hay N tarjetas iguales y "Ver detalle" a
 * secas no dice de cuál habla.
 */
export function openDetailLabel(projectName: string): string {
  return `Ver detalle de ${projectName}`;
}

/**
 * El cronómetro de la tarjeta: **su estado y sus dos acciones, en un solo
 * objeto** (RFC-03, enmienda **E7 (b1)** y **(b2)**).
 *
 * **Por qué un objeto y no props sueltas.** El control es **uno**: con el
 * cronómetro parado ofrece empezar y con el cronómetro en marcha ofrece parar,
 * en el mismo sitio y con la misma caja táctil. Con `session` y `onStop` como
 * props opcionales independientes existiría el estado *"corriendo y sin forma de
 * pararlo"*, que es **exactamente el defecto que E7 vino a arreglar** (ficha
 * 186). Así, ese estado no se puede ni escribir.
 *
 * **Sigue siendo opt-in, y eso conserva la invariante de la deuda 132:** sin
 * esta prop la tarjeta no monta **ningún** control ni ningún reloj, que es como
 * la monta el Dashboard.
 */
export interface ProjectCardTimer {
  /**
   * La sesión abierta del proyecto, o `null` si está parado. Llega del servidor
   * con la lista (E7 b3), así que **sobrevive a recargar la página**: es la
   * diferencia con la marca en memoria que E7 (b4) retira.
   *
   * Se pide sólo el arranque porque es lo único que la tarjeta pinta; el objeto
   * entero encaja igual.
   */
  session: Pick<SerializedActiveSession, "start"> | null;
  /**
   * Petición en vuelo. Va acá y no en `ProjectCardData` por la deuda 109: "hay
   * una petición en marcha" no es un dato del proyecto.
   */
  pending?: boolean;
  onStart: () => void;
  onStop: () => void;
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
   * Quick-start del cronómetro (RFC-03 §2, reescrito por la enmienda **E7 (b)**).
   * **Es opt-in y por eso el añadido sigue siendo aditivo**: sin esta prop la
   * tarjeta no monta NINGÚN control, que es la invariante que su consumidor de
   * #19 —el Dashboard, que no la pasa— conserva intacta.
   *
   * **Ahora es un toggle, y antes no podía serlo.** E1(e) razonó que un
   * start/stop *"tendría que adivinar qué icono pintar"* porque **no había forma
   * de saber desde la lista si el cronómetro corría**. Con **E7 (b3)** el dato
   * llega del servidor con cada proyecto, así que ya no se adivina nada: el
   * botón sabe en qué estado está y ofrece la acción que corresponde.
   */
  timer?: ProjectCardTimer;
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
 * **El cronómetro es opcional y entra por una sola prop** (`timer`): la versión
 * de RFC-02 —la que monta el Dashboard— es un subconjunto estricto de la de
 * RFC-03, así que se extiende de forma aditiva sin reescribir nada, y sin la
 * prop no hay ni control ni reloj. Tampoco hay un slot "preparado" esperando: un
 * slot que ningún consumidor usa no se puede probar contra un consumidor real, y
 * es código muerto.
 *
 * Es un `div` (lo que `Card` sabe ser) y **no** un `li` ni un `article`: quien la
 * monte en una lista la envuelve. Así la misma tarjeta sirve en una grilla, en
 * una lista y suelta.
 */
export function ProjectCard({
  project,
  headingLevel = 3,
  className,
  timer,
  onOpenDetail,
}: ProjectCardProps) {
  const Heading = `h${headingLevel}` as const;
  const running = timer?.session ?? null;

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
          {/* `min-w-0` para que un nombre largo **se parta** en vez de empujar
              al cronómetro fuera de la tarjeta. */}
          <Heading className="min-w-0 font-display text-xl leading-tight text-fg">
            {project.name}
          </Heading>

          {/* El bloque del cronómetro NO envuelve la tarjeta ni vive dentro de
              un enlace, y tampoco dentro de la capa del tap: un control dentro
              de otro es marcado inválido que `axe` marca. Son hermanos, y el
              orden del DOM (más el `relative` de acá) es lo que deja este por
              encima.

              El reloj va **pegado al botón** y no bajo el nombre: es el estado
              de ese control, así que se lee junto a él de una sola mirada. */}
          {timer === undefined ? null : (
            <div className="relative flex shrink-0 items-center gap-(--space-2)">
              {running === null ? null : (
                <SessionClock start={running.start} />
              )}
              {/* UN botón, no dos (E7 b1): cambia de variante, de icono, de
                  nombre accesible y de acción, y se queda donde estaba. */}
              <Button
                size="icon"
                variant={running === null ? "secondary" : "primary"}
                aria-label={
                  running === null
                    ? quickStartLabel(project.name)
                    : quickStopLabel(project.name)
                }
                loading={timer.pending ?? false}
                onClick={running === null ? timer.onStart : timer.onStop}
              >
                {timer.pending === true ? null : (
                  <span aria-hidden="true">{running === null ? "▶" : "■"}</span>
                )}
              </Button>
            </div>
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
 * Cada cuánto se redibuja el reloj. Un segundo: es la unidad que muestra, así
 * que un intervalo más corto redibujaría sin cambiar nada y uno más largo
 * dejaría saltos visibles. Mismo criterio que el cronómetro del cajón.
 */
const TICK_MS = MILLISECONDS_PER_SECOND;

/**
 * El tiempo transcurrido en la tarjeta, mientras el cronómetro corre (enmienda
 * **E7 (b2)**).
 *
 * **Empieza en el segundo real.** El arranque lo pone el servidor y llega con la
 * lista, así que una sesión que venía de antes no se pinta en cero: se calcula
 * contra el reloj del navegador con `sessionElapsedSeconds`, la misma función
 * que usa el cajón —incluida su acotación a cero, que evita el negativo cuando
 * el reloj local va por detrás del servidor—.
 *
 * **El intervalo vive acá, en la pieza que corre, y no en la vista.** Así sólo
 * tickan las tarjetas que tienen algo que contar, y cada tick repinta esa
 * tarjeta en vez de la rejilla entera. Se limpia al desmontar, y desmontar pasa
 * también cuando la sesión se cierra: el padre deja de pintar este componente.
 *
 * **No es una región viva, y es deliberado** (enmienda **E4 (a)**): un aviso por
 * segundo convierte un lector de pantalla en un metrónomo, y acá pesa el doble
 * que en el cajón porque puede haber **varios cronómetros a la vez** en la misma
 * rejilla. Lo que se puede leer es el texto de grano de minuto; los cambios de
 * estado los anuncia la **única** región viva de la página, que vive en la vista.
 *
 * El color de **acierto** marca "esto está vivo" — se lee a 4.83:1 sobre la
 * superficie elevada de la tarjeta, que es donde se monta.
 */
function SessionClock({ start }: { start: string }) {
  /* Sólo lo mueve el intervalo, nunca un render: si cada render lo actualizara,
     el tiempo saltaría al pulsar cualquier cosa de la página. */
  const [now, setNow] = useState(() => Date.now());

  /* La dependencia es el ARRANQUE, no el objeto de la sesión: cada recarga de la
     lista trae uno nuevo desde la red, y depender del objeto reiniciaría el
     intervalo aunque siguiera corriendo la misma sesión. */
  useEffect(() => {
    const ticker = setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);

    return () => {
      clearInterval(ticker);
    };
  }, [start]);

  const elapsed = sessionElapsedSeconds(start, now);

  return (
    <span className="inline-flex items-center">
      <span
        aria-hidden="true"
        className="font-mono text-base leading-base text-success"
      >
        {formatClock(elapsed)}
      </span>
      <span className="sr-only">{runningTimerLabel(elapsed)}</span>
    </span>
  );
}

/**
 * Dónde se está montando la foto, que es lo único que decide su encuadre.
 *
 * `card` es el marco panorámico de la rejilla; `detail` es el del cajón, más
 * bajo, porque ahí la foto **acompaña** a los datos en vez de encabezar una
 * tarjeta. Son dos valores **nombrados** y no dos medidas: quien la monta dice
 * dónde está, no cuánto mide, así que el encuadre se puede reajustar de una vez
 * para todas las pantallas sin ir consumidor por consumidor.
 */
export const PROJECT_PHOTO_SIZES = ["card", "detail"] as const;
export type ProjectPhotoSize = (typeof PROJECT_PHOTO_SIZES)[number];

/** Silueta compartida: mismo borde, mismo radio y misma superficie hundida. */
const PHOTO_FRAME_CLASSES =
  "w-full overflow-hidden rounded-sm border-(length:--border-width) border-solid border-border bg-surface-sunken";

const CARD_PHOTO_RATIO = "aspect-video";
/**
 * En el cajón la foto es una **franja**, no un bloque. El número no es de ojo:
 * el panel deja ~612 px de ancho útil, donde el panorámico de la tarjeta se
 * dibuja a 344 px de alto —casi la mitad de una ventana de portátil— y empuja la
 * lista de datos hasta el pliegue. A tres a uno el mismo ancho mide ~204 px, así
 * que los datos nacen dentro de la ventana incluso en pantallas bajas.
 */
const DETAIL_PHOTO_RATIO = "aspect-3/1";

/** Ternario y no un objeto indexado: es lo que el gate de clases sabe seguir. */
function photoFrameClasses(size: ProjectPhotoSize): string {
  return `${size === "detail" ? DETAIL_PHOTO_RATIO : CARD_PHOTO_RATIO} ${PHOTO_FRAME_CLASSES}`;
}

/**
 * La foto es **decorativa**: el nombre del proyecto está justo debajo, así que
 * un texto alternativo que lo repitiera sólo haría que un lector de pantalla lo
 * dijera dos veces. Por eso `alt=""` y no una descripción.
 *
 * Sin foto se pinta un hueco con la misma silueta en vez de colapsar el bloque:
 * si no, las tarjetas de una misma fila tendrían alturas distintas según quién
 * subió imagen.
 *
 * **La proporción NO cambia con foto y sin ella** (enmienda E2(g)), para que la
 * rejilla no quede dentada cuando convivan las dos. Lo que cambia es lo que hay
 * **dentro**: era el bloque más grande de la tarjeta y no decía nada —un
 * rectángulo liso con una letra diminuta (deuda 140)—, y ahora se lee como algo
 * puesto a propósito: la inicial en tamaño de titular y la clase de tejido
 * nombrada debajo.
 *
 * **Sí cambia según DÓNDE se monta** (`size`), y eso no contradice a E2(g): el
 * motivo que esa enmienda da para congelar la proporción es *"para que la
 * rejilla no quede dentada"*, o sea un motivo **de la rejilla**. En el cajón de
 * detalle no hay rejilla —hay una foto y una sola—, así que ahí la razón no
 * aplica y sí aplica la contraria: medido en Chrome, el marco de tarjeta dentro
 * del cajón ocupaba el **47 % del alto de la ventana** y empujaba los datos de
 * verdad a 3 px del borde inferior. Lo que E2(g) exige y aquí **se conserva
 * intacto** es que el hueco vacío se lea como algo puesto a propósito, y eso
 * vive en el contenido, no en la proporción.
 *
 * **El tamaño se pide por NOMBRE, no por clases sueltas.** Una prop de clases
 * libres metería en la tarjeta un valor que viene de fuera del archivo: el gate
 * de clases compiladas de `/proyectos` dejaría de poder seguirlo y las
 * utilidades del marco pasarían a no comprobarse contra el CSS real.
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
  size = "card",
}: {
  name: string;
  image: string | null;
  type: CraftType;
  size?: ProjectPhotoSize;
}) {
  const frame = photoFrameClasses(size);

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
