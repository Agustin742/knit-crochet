"use client";

import { useCallback, useEffect, useState } from "react";

import { type CraftType } from "@/shared/config";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/shared/ui";

import { ActionError } from "./DetailTabParts";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailDrawer } from "./ProjectDetailDrawer";
import {
  ProjectFormDialog,
  type ProjectFormTarget,
} from "./ProjectFormDialog";
import { ProjectsToolbar } from "./ProjectsToolbar";
import {
  DELETE_PROJECT_CONFIRM_LABEL,
  DELETE_PROJECT_DESCRIPTION,
  deleteProjectTitle,
} from "./project-detail";
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
  deleteProject,
  getProjects,
  getYarnOptions,
  startCraftSession,
  stopCraftSession,
} from "./projects-client";
import type {
  SerializedActiveSession,
  SerializedProject,
  SerializedProjectListItem,
} from "./types";

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

/**
 * Los dos botones de creación rápida (RFC-03 §4, enmienda **E6**), uno por clase
 * de tejido. **Preseleccionan el tipo**: es la única diferencia entre los dos, y
 * por eso son dos y no uno con un desplegable dentro.
 *
 * Son **los mismos rótulos que los del Dashboard** (`dashboard/ui/filters.ts`)
 * porque son la misma acción; se duplica la constante y no se importa entre
 * features, que es lo que `conventions.md` manda para el copy de cada pantalla.
 *
 * **Aparecen en un sitio o en el otro, nunca en los dos**: con el cesto vacío la
 * llamada a la acción es la del panel vacío —es de lo que vive ese panel— y con
 * proyectos viven en la cabecera. Cuatro botones iguales repartidos por la misma
 * pantalla es el defecto que dejó fichado la deuda 142.
 */
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
 * Lo que se anuncia al parar desde la tarjeta (enmienda **E7 (b1)**).
 *
 * **Acá NO hay marca efímera que dejar** (E7 b4): la que había —*"Lo arrancaste
 * recién"* / *"Ya venía en marcha"*— existía **porque el estado no era
 * persistente** y se perdía al recargar, así que hablaba de lo que acababa de
 * pasar en vez de lo que estaba pasando. Con el dato del servidor (E7 b3) el
 * estado lo comunica **el propio botón**, que es donde se actúa.
 *
 * Lo que sigue en pie es el aviso de acción: informa de que la pulsación surtió
 * efecto, y eso es otra cosa distinta del estado.
 */
export function quickStopMessage(projectName: string): string {
  return `Paraste el cronómetro de ${projectName}.`;
}

/** Lo último que llegó, con la clave de la petición que lo trajo. */
type LoadedState = {
  key: string;
  projects: SerializedProjectListItem[] | null;
  error: string | null;
};

/**
 * Qué le está pidiendo la página al formulario. **Editar guarda el id y no el
 * proyecto**, igual que el cajón de #21 (ver `detailId`): la lista se puede
 * recargar por debajo mientras el modal está abierto, y una copia se quedaría
 * editando datos viejos. El alta no tiene id todavía, así que lleva el tipo, que
 * es lo único que la distingue.
 */
type FormRequest =
  | { mode: "create"; type: CraftType }
  | { mode: "edit"; id: string };

/**
 * El pedido resuelto contra la lista de ahora mismo. Devuelve `null` —o sea, el
 * modal cerrado— si el proyecto a editar ya no está en la lista: es lo que pasa
 * si se lo borra desde otra pestaña, y editar algo que no existe respondería 404
 * después de rellenar el formulario entero.
 */
function toFormTarget(
  request: FormRequest | null,
  projects: readonly SerializedProject[] | null,
): ProjectFormTarget | null {
  if (request === null) {
    return null;
  }
  if (request.mode === "create") {
    return { mode: "create", type: request.type };
  }
  const project = projects?.find((entry) => entry.id === request.id);
  return project === undefined ? null : { mode: "edit", project };
}

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
  /* Que el inventario NO se pudo traer, que no es lo mismo que estar vacío. Al
     toolbar le da igual —su desplegable se queda con "Todas"—, pero el tab Lanas
     del cajón ofrece enlazar desde esta misma lista, y ahí decir "no tenés
     lanas" a quien tiene cincuenta es la mentira que E2(e) vino a corregir. */
  const [yarnChoicesFailed, setYarnChoicesFailed] = useState(false);

  /* Cambia para volver a pedir los mismos datos. Un booleano no serviría: dos
     reintentos seguidos tienen que disparar dos peticiones. */
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<LoadedState | null>(null);

  const [pendingQuickStart, setPendingQuickStart] = useState<string | null>(
    null,
  );
  const [quickStartMessage, setQuickStartMessage] = useState("");
  const [quickStartFailed, setQuickStartFailed] = useState(false);
  /* Qué proyecto tiene el cajón abierto. Se guarda el **id** y no el objeto: la
     lista se puede recargar debajo (un filtro, un reintento), y un objeto
     copiado se quedaría con los datos de antes. */
  const [detailId, setDetailId] = useState<string | null>(null);
  /* Cambia cuando el cajón tiene que volver a pedir su detalle. Hoy hay un solo
     caso: el modal de edición acaba de guardar. Número y no booleano por lo
     mismo que `reloadToken`: dos guardados seguidos son dos peticiones. */
  const [detailRefreshToken, setDetailRefreshToken] = useState(0);

  /* Qué le estamos pidiendo al formulario, y qué proyecto está esperando
     confirmación de borrado. Los dos guardan **el id**, no el objeto. */
  const [formRequest, setFormRequest] = useState<FormRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      if (cancelled) {
        return;
      }
      setYarnChoicesFailed(!result.ok);
      if (result.ok) {
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
   * Cambia el cronómetro de UN proyecto en la lista que ya está en pantalla, sin
   * volver a pedirla (enmienda **E7 (b)**).
   *
   * **Se parchea en el sitio y no se recarga**, por lo mismo que la edición del
   * formulario: una recarga puede devolver una lista distinta —basta con tener
   * un filtro puesto— y la tarjeta que se acaba de tocar podría desaparecer
   * debajo del dedo. El servidor ya dijo qué pasó con esa sesión; pedir la lista
   * entera para enterarse de algo que ya se sabe es una petición de más.
   *
   * `time` viaja aparte porque **sólo lo devuelve parar**: es el total del
   * proyecto ya recalculado por el servidor, y sin él la tarjeta seguiría
   * enseñando el tiempo de antes de la sesión que se acaba de cerrar.
   */
  function patchSession(
    projectId: string,
    activeSession: SerializedActiveSession | null,
    time?: number,
  ) {
    setLoaded((previous) =>
      previous === null
        ? previous
        : {
            ...previous,
            projects:
              previous.projects?.map((entry) =>
                entry.id === projectId
                  ? { ...entry, activeSession, time: time ?? entry.time }
                  : entry,
              ) ?? null,
          },
    );
  }

  /**
   * El quick-start **arranca y para** (enmiendas E1(e) y **E7 (b1)**). El start
   * es idempotente, así que un doble toque no puede duplicar ni reiniciar nada;
   * lo único que distingue "arranqué yo" de "ya estaba corriendo" es el **201
   * frente al 200**, y por eso el cliente devuelve el status también en el camino
   * OK.
   *
   * El resultado se anuncia en **una sola región viva de página** y no en un
   * `role="alert"` por tarjeta: en una grilla hay N botones y N alertas
   * multiplicarían los anuncios. Esa región **ya no es sólo para lector de
   * pantalla** (enmienda E2(d)): quien mira la pantalla veía un parpadeo de dos
   * décimas y después nada.
   *
   * Y la tarjeta **cambia de estado**: el botón pasa a ofrecer parar y aparece
   * el tiempo, contado desde el arranque que devuelve el servidor —que en el 200
   * es el de antes, no el de ahora—.
   */
  async function handleQuickStart(project: SerializedProjectListItem) {
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

    if (result.ok) {
      patchSession(project.id, {
        id: result.data.id,
        start: result.data.start,
      });
    }
  }

  /**
   * Parar desde la tarjeta (enmienda **E7 (b1)**). Antes esto sólo se podía
   * hacer abriendo el cajón: la información y el control existían, bien hechos,
   * y estaban encerrados.
   *
   * **Ojo con la asimetría del backend, que es la contraria a la que uno
   * supone:** arrancar dos veces es gratis (200 reutilizando la sesión abierta),
   * pero **parar dos veces responde 409**. Por eso un fallo no toca el estado de
   * la tarjeta: si el servidor no paró nada, el botón no puede decir que sí.
   */
  async function handleQuickStop(project: SerializedProjectListItem) {
    setPendingQuickStart(project.id);
    setQuickStartMessage("");
    setQuickStartFailed(false);

    const result = await stopCraftSession(project.id);

    setPendingQuickStart(null);
    setQuickStartFailed(!result.ok);
    setQuickStartMessage(
      result.ok ? quickStopMessage(project.name) : result.message,
    );

    if (result.ok) {
      patchSession(project.id, null, result.data.time);
    }
  }

  /**
   * Volver al punto de partida (enmienda E2(e)). Se limpia **todo**, incluido el
   * texto de buscar: el control promete "la vista por defecto", y dejar un
   * filtro de cliente puesto sería prometer de más.
   */
  /**
   * El formulario acaba de guardar. **Los dos caminos son distintos a propósito:**
   *
   * - **Alta → se vuelve a pedir la lista.** Dónde cae un proyecto nuevo lo
   *   decide el servidor (el orden) y los filtros puestos (si entra o no), y
   *   nada de eso se puede adivinar desde acá: meterlo a mano en la rejilla lo
   *   pondría en el sitio equivocado, o lo enseñaría bajo un filtro que no pasa.
   * - **Edición → se reemplaza en el sitio y NO se recarga.** El cajón sigue
   *   abierto detrás del modal, y una recarga puede devolver una lista en la que
   *   el proyecto ya no entra —basta con cambiarle el tipo teniendo el filtro de
   *   tipo puesto—; entonces el cajón se cerraría solo justo después de guardar,
   *   echando al usuario de lo que estaba mirando. Se paga a cambio que un
   *   proyecto que dejó de pasar el filtro siga en la rejilla hasta la próxima
   *   carga, que es exactamente lo que esta lista ya hace mientras llega un
   *   cambio de filtro. Queda escrito en el informe como límite conocido.
   *
   * El cajón sí se entera: `detailRefreshToken` le hace pedir su detalle otra vez
   * —tiene sesiones, pasos y lanas que la lista no trae—, y sin eso seguiría
   * enseñando el nombre viejo del proyecto que se acaba de renombrar.
   */
  function handleSaved(saved: SerializedProject) {
    const creating = formRequest?.mode === "create";
    setFormRequest(null);

    if (creating) {
      reload();
      return;
    }

    /* El cronómetro de la tarjeta **se conserva**: `PATCH /:id` devuelve el
       proyecto sin `activeSession` —ese dato lo cuelga sólo la lista (E7 b3)— y
       editar el nombre no para ninguna sesión. Sin esto, guardar apagaría en
       pantalla un cronómetro que sigue corriendo en el servidor. */
    setLoaded((previous) =>
      previous === null
        ? previous
        : {
            ...previous,
            projects:
              previous.projects?.map((entry) =>
                entry.id === saved.id
                  ? { ...saved, activeSession: entry.activeSession }
                  : entry,
              ) ?? null,
          },
    );
    setDetailRefreshToken((token) => token + 1);
  }

  /**
   * Borrar de verdad, ya confirmado.
   *
   * **La lista queda coherente sin volver a pedirla**: se quita la tarjeta del
   * estado local. Acá sí se puede, y en el alta no, porque quitar un elemento no
   * necesita saber ni el orden ni si pasa los filtros — ya estaba en la lista.
   *
   * Si falla, **no se toca nada**: el cajón sigue abierto sobre el proyecto y el
   * motivo se lee dentro de la propia confirmación, que es donde está mirando
   * quien acaba de pulsar. Cerrar el diálogo y avisar en otro sitio dejaría al
   * usuario buscando qué pasó.
   */
  async function confirmDelete() {
    if (deleteId === null) {
      return;
    }
    setDeletePending(true);
    setDeleteError(null);

    const result = await deleteProject(deleteId);

    setDeletePending(false);
    if (!result.ok) {
      setDeleteError(result.message);
      return;
    }

    setLoaded((previous) =>
      previous === null
        ? previous
        : {
            ...previous,
            projects:
              previous.projects?.filter((entry) => entry.id !== deleteId) ??
              null,
          },
    );
    setDeleteId(null);
    setDetailId(null);
  }

  function cancelDelete() {
    setDeleteId(null);
    setDeleteError(null);
  }

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

  /* Las mismas cuatro condiciones que abajo eligen el panel del cesto vacío. Se
     calculan una vez porque deciden DOS cosas que no pueden discrepar: qué panel
     se pinta y dónde va la pareja de botones de crear. */
  const emptyBasketShown =
    errorMessage === null && listIsEmpty && !filtersApplied;

  const formTarget = toFormTarget(formRequest, projects);
  const deleteTarget = projects?.find((entry) => entry.id === deleteId) ?? null;

  const createButtons = CRAFT_TYPE_ORDER.map((candidate) => (
    <Button
      key={candidate}
      variant="primary"
      onClick={() => setFormRequest({ mode: "create", type: candidate })}
    >
      {CREATE_PROJECT_LABELS[candidate]}
    </Button>
  ));

  return (
    <div className="flex flex-col gap-(--space-8) p-(--space-6)">
      {/* La cabecera de la página: el título y, con el cesto lleno, la acción
          primaria. Va en un `div` y no en un `<header>` a propósito: esta vista
          se monta suelta en varios tests y un `<header>` fuera de `<main>` se
          convierte en un landmark `banner`, que ya tiene dueño en el shell.

          Los dos botones son **primarios y del mismo peso** porque son la misma
          acción con distinta clase de tejido: la elección es entre iguales, no
          entre principal y alternativa. Es además la forma exacta que ya usa el
          Dashboard para esta misma pareja. */}
      <div className="flex flex-wrap items-center justify-between gap-(--space-4)">
        <h1 className="font-display text-3xl leading-tight text-fg-inverse">
          {PAGE_TITLE}
        </h1>
        {emptyBasketShown ? null : (
          <div className="flex flex-wrap gap-(--space-3)">{createButtons}</div>
        )}
      </div>

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
                {createButtons}
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
                  timer={{
                    session: project.activeSession,
                    pending: pendingQuickStart === project.id,
                    onStart: () => void handleQuickStart(project),
                    onStop: () => void handleQuickStop(project),
                  }}
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
        yarnInventory={yarnChoices}
        yarnInventoryUnavailable={yarnChoicesFailed}
        refreshToken={detailRefreshToken}
        onEdit={() => {
          if (detailId !== null) {
            setFormRequest({ mode: "edit", id: detailId });
          }
        }}
        onDelete={() => {
          if (detailId !== null) {
            setDeleteError(null);
            setDeleteId(detailId);
          }
        }}
        /* Arrancar o parar DENTRO del cajón tiene que llegar a la tarjeta de
           detrás: si no, cerrar el cajón dejaría el botón de la tarjeta
           ofreciendo lo contrario de lo que pasa en el servidor — la ficha 186
           otra vez, por otra puerta (E7 b). */
        onRunningChange={(session) => {
          if (detailId !== null) {
            patchSession(detailId, session);
          }
        }}
      />

      {/* El modal de alta y edición. Mismo trato que el cajón: se monta siempre
          y decide solo si hay algo que enseñar, así que el estado de "qué estoy
          editando" vive en un sitio y nada más. */}
      <ProjectFormDialog
        target={formTarget}
        onClose={() => setFormRequest(null)}
        onSaved={handleSaved}
      />

      {/* La confirmación del borrado. Esta SÍ se monta sólo cuando hay algo que
          borrar, porque su pregunta nombra el proyecto y sin proyecto no hay
          pregunta que hacer. Desmontarla devuelve el foco igual: `Dialog` lo
          restituye en la limpieza del efecto, que corre también al desmontar. */}
      {deleteTarget === null ? null : (
        <ConfirmDialog
          open
          title={deleteProjectTitle(deleteTarget.name)}
          description={DELETE_PROJECT_DESCRIPTION}
          confirmLabel={DELETE_PROJECT_CONFIRM_LABEL}
          loading={deletePending}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelDelete}
        >
          <ActionError message={deleteError} />
        </ConfirmDialog>
      )}
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
