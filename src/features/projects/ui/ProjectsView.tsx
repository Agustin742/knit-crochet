"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { type CraftType } from "@/shared/config";
import { Button, Card, EmptyState, ErrorState, Skeleton } from "@/shared/ui";

import { ProjectCard } from "./ProjectCard";
import { ProjectDetailDrawer } from "./ProjectDetailDrawer";
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

/**
 * Título **visible** de la sección de la lista (enmienda E2(a)). La página tenía
 * un `h1` suelto y ninguna sección titulada, mientras el Dashboard —la otra
 * página de contenido— usa `<section>` con `<h2>` visible. Sigue habiendo
 * exactamente un `h1`: el gate de composición no se toca.
 */
export const LIST_SECTION_TITLE = "Tus proyectos";
const LIST_SECTION_TITLE_ID = "projects-list-title";

/** Nombre de la región viva de carga. Ver el JSDoc de la vista (deuda 114). */
export const LOADING_REGION_LABEL = "Estado de la lista de proyectos";
export const LOADING_MESSAGE = "Cargando tus proyectos.";

export const QUICK_START_REGION_LABEL = "Cronómetro";

export const ERROR_TITLE = "Se soltó un punto";

/**
 * **Tres vacíos, tres mensajes** (enmienda E2(e)). Antes había uno solo, que le
 * decía *"tu cesto está vacío"* a quien sí tenía proyectos y sólo había filtrado
 * por inactivos, por tipo o por aguja (deuda 138).
 *
 * 1. **Cesto vacío de verdad** — no hay proyectos que mostrar y **no hay ningún
 *    filtro puesto**. Ojo con esto, que es la trampa: el estado por defecto de
 *    la página **ya manda `?active=true`**, y eso **no cuenta como filtrar**. Es
 *    el punto de partida, no una búsqueda sin resultados.
 * 2. **Los filtros no devuelven nada** — hay filtros distintos de los de por
 *    defecto. Ofrece la salida obvia: quitarlos.
 * 3. **La búsqueda no encuentra nada** — se conserva tal cual estaba, porque era
 *    el único de los tres que ya distinguía bien.
 *
 * La descripción del primero **se reescribió** (enmienda E2(f)): la anterior
 * explicaba el andamiaje del proyecto ("…te llevan al inicio, que es donde hoy
 * se crea en dos pasos"), o sea una nota de implementación en la cara del
 * usuario. El copy nuevo no habla de rutas, ni de pasos, ni de lo que todavía no
 * existe.
 */
export const EMPTY_TITLE = "Tu cesto está vacío";
export const EMPTY_DESCRIPTION =
  "Empezá el primero y va a aparecer acá con su foto, su progreso y las horas que le dedicaste.";

export const NO_FILTER_MATCHES_TITLE = "Ningún proyecto pasa esos filtros";
export const NO_FILTER_MATCHES_DESCRIPTION =
  "Probá con otro estado o con otro tipo de tejido, o quitá los filtros para ver todo lo que tenés.";
export const CLEAR_FILTERS_LABEL = "Quitar filtros";

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

/**
 * La marca que queda en la tarjeta que arrancó (enmienda E2(d)).
 *
 * **Las dos frases hablan de lo que ACABA de pasar, no de un estado que la app
 * pueda sostener**, y eso es deliberado: **no hay forma de saber desde la lista
 * si el cronómetro corre** —ni columna, ni filtro, ni endpoint (E1(e), y la
 * enmienda E2.2 del RFC-02 descartó abrir el backend)—, así que la marca **se
 * pierde al recargar**. Un texto como "en marcha" a secas prometería un estado
 * persistente que la aplicación **no puede sostener**, y tras un F5 estaría
 * mintiendo.
 *
 * Son dos y no una porque el servidor sí distingue: **201** = la arrancaste vos
 * ahora, **200** = ya había una sesión abierta y la reutilizó.
 */
export const QUICK_START_NOTES = {
  started: "Lo arrancaste recién",
  resumed: "Ya venía en marcha",
} as const;

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
  const [quickStartFailed, setQuickStartFailed] = useState(false);
  /* Qué tarjeta quedó marcada y con qué texto. Vive SÓLO en memoria y se pierde
     al recargar: es lo único honesto que se puede sostener (ver `QUICK_START_NOTES`). */
  const [quickStartNotes, setQuickStartNotes] = useState<
    Record<string, string>
  >({});
  /* Qué proyecto tiene el cajón abierto. Se guarda el **id** y no el objeto: la
     lista se puede recargar debajo (un filtro, un reintento), y un objeto
     copiado se quedaría con los datos de antes. */
  const [detailId, setDetailId] = useState<string | null>(null);

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
   * multiplicarían los anuncios. Esa región **ya no es sólo para lector de
   * pantalla** (enmienda E2(d)): quien mira la pantalla veía un parpadeo de dos
   * décimas y después nada.
   *
   * Además la tarjeta que arrancó **queda marcada**, porque un aviso lejos del
   * botón es feedback débil en una grilla de N tarjetas iguales.
   */
  async function handleQuickStart(project: SerializedProject) {
    setPendingQuickStart(project.id);
    setQuickStartMessage("");
    setQuickStartFailed(false);

    const result = await startCraftSession(project.id);

    setPendingQuickStart(null);
    setQuickStartFailed(!result.ok);
    setQuickStartMessage(
      result.ok
        ? result.status === SESSION_CREATED_STATUS
          ? quickStartStartedMessage(project.name)
          : quickStartResumedMessage(project.name)
        : result.message,
    );

    if (!result.ok) {
      return;
    }
    const note =
      result.status === SESSION_CREATED_STATUS
        ? QUICK_START_NOTES.started
        : QUICK_START_NOTES.resumed;
    setQuickStartNotes((current) => ({ ...current, [project.id]: note }));
  }

  /**
   * Volver al punto de partida (enmienda E2(e)). Se limpia **todo**, incluido el
   * texto de buscar: el control promete "la vista por defecto", y dejar un
   * filtro de cliente puesto sería prometer de más.
   */
  function clearFilters() {
    setStatus(DEFAULT_STATUS_FILTER);
    setTypes([]);
    setNeedle(null);
    setYarnId(null);
    setSearch("");
  }

  const visible = projects === null ? null : filterByName(projects, search);
  const listIsEmpty = projects !== null && projects.length === 0;
  const searchHidEverything =
    visible !== null && visible.length === 0 && !listIsEmpty;

  /**
   * **El estado por defecto NO es un filtro.** La primera carga manda
   * `?active=true` porque el backend no tiene default (E1(i)), pero eso es el
   * punto de partida de la página: contarlo como "filtraste" haría que un cesto
   * de verdad vacío dijera "ningún proyecto pasa esos filtros".
   */
  const filtersApplied =
    status !== DEFAULT_STATUS_FILTER ||
    types.length > 0 ||
    needle !== null ||
    yarnId !== null;

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

      {/* La lista es una SECCIÓN con título visible, como las dos del Dashboard
          (enmienda E2(a)): antes era una pila plana de bloques colgando de un
          `h1` suelto. El `h1` sigue siendo uno solo. */}
      <section
        aria-labelledby={LIST_SECTION_TITLE_ID}
        className="flex flex-col gap-(--space-4)"
      >
        <h2
          id={LIST_SECTION_TITLE_ID}
          className="font-display text-2xl leading-tight text-fg-inverse"
        >
          {LIST_SECTION_TITLE}
        </h2>

        {/* El resultado del quick-start SE VE (enmienda E2(d)), y se ve **junto
            a la lista**, que es donde están los botones que lo disparan. Tres
            cosas que parecen detalles y no lo son:
            1. La región está montada SIEMPRE, aunque esté vacía, para que el
               lector de pantalla la tenga registrada antes de que llegue el
               texto; si naciera junto al mensaje, parte de los lectores se lo
               pierden.
            2. Vacía se repliega a "sólo para lector de pantalla" en vez de
               dejar un recuadro vacío ocupando sitio, y sin salir del árbol
               accesible.
            3. Dentro del nodo va EL MENSAJE Y NADA MÁS: ni icono, ni prefijo,
               ni botón de cerrar. Cualquier adorno cambiaría su contenido de
               texto, y hay tres tests que lo comparan con el mensaje exacto. */}
        <p
          role="status"
          aria-label={QUICK_START_REGION_LABEL}
          className={quickStartNoticeClasses(quickStartFailed)}
        >
          {quickStartMessage}
        </p>

        {errorMessage !== null ? (
          <ErrorState
            headingLevel={3}
            title={ERROR_TITLE}
            description={errorMessage}
            onRetry={reload}
          />
        ) : visible === null ? (
          <ProjectGridSkeleton />
        ) : listIsEmpty && filtersApplied ? (
          <EmptyState
            headingLevel={3}
            title={NO_FILTER_MATCHES_TITLE}
            description={NO_FILTER_MATCHES_DESCRIPTION}
            action={
              <Button variant="primary" onClick={clearFilters}>
                {CLEAR_FILTERS_LABEL}
              </Button>
            }
          />
        ) : listIsEmpty ? (
          <EmptyState
            headingLevel={3}
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
            headingLevel={3}
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
                  headingLevel={3}
                  onQuickStart={() => void handleQuickStart(project)}
                  quickStartPending={pendingQuickStart === project.id}
                  quickStartNote={quickStartNotes[project.id]}
                  onOpenDetail={() => setDetailId(project.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* El cajón de detalle (RFC-03 §1). Se monta **siempre** y decide por sí
          mismo si hay algo que enseñar: cerrado no pinta nada, y así el estado
          de "qué proyecto estoy mirando" vive en un solo sitio.

          El proyecto se BUSCA en la lista por su id en vez de guardarse una
          copia: si la lista se recarga por debajo, lo que se ve en el cajón es
          lo que hay, no una foto vieja del momento del tap. */}
      <ProjectDetailDrawer
        project={projects?.find((entry) => entry.id === detailId) ?? null}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

/**
 * El aviso del quick-start, con su tono (enmienda E2(d)).
 *
 * **Vacío se repliega a "sólo para lector de pantalla"** en vez de reservar un
 * recuadro vacío: la utilidad de la variante `:empty` gana en especificidad y
 * neutraliza borde, relleno y flujo, así que la región sigue montada y en el
 * árbol accesible pero no ocupa nada.
 *
 * **Se monta sobre la superficie elevada** y no sobre el fondo de la app: es lo
 * que hace legible el color del tono (4.83:1 el de acierto y 4.86:1 el de
 * peligro sobre esa superficie; sobre el espresso, ninguno de los dos llega).
 *
 * `--success` no tenía **ni un solo uso** en toda la aplicación antes de esto
 * (deuda 144): la app sabía decir "esto falló" y no sabía decir "esto salió
 * bien". No se construye un sistema de avisos flotantes — queda fuera de alcance
 * y la deuda 144 sigue viva.
 */
function quickStartNoticeClasses(failed: boolean): string {
  return [
    "empty:sr-only self-start",
    "border-(length:--border-width) border-solid rounded-sm",
    "bg-surface-raised px-(--space-4) py-(--space-3)",
    "font-mono text-sm leading-base",
    failed ? "border-danger text-danger" : "border-success text-success",
  ].join(" ");
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
