"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDate } from "@/shared/lib/format";
import { Dialog, ErrorState, Skeleton, Tabs } from "@/shared/ui";

import type { LinkedYarn } from "@/features/projects/types";

import { ProgressTab } from "./ProgressTab";
import { ProjectPhoto } from "./ProjectCard";
import { SessionsTab } from "./SessionsTab";
import { YarnsTab } from "./YarnsTab";
import { CRAFT_TYPE_LABELS, type YarnChoice } from "./project-filters";
import {
  DETAIL_ERROR_TITLE,
  DETAIL_TABS,
  DETAIL_TAB_LABELS,
  DETAIL_TABS_LABEL,
  type DetailTab,
  GENERAL_FIELD_LABELS,
  NO_END_DATE,
  NO_NEEDLES,
  NO_NOTES,
  PROJECT_STATUS_LABELS,
  UNKNOWN_DATE,
  needlesLabel,
} from "./project-detail";
import { getProjectDetail } from "./projects-client";
import type { ProjectCardData, SerializedProject } from "./types";

export { DETAIL_ERROR_TITLE };

/**
 * Nombre de la región viva del cajón. **Es distinto del de la lista** a
 * propósito (deuda 114): las dos conviven en la misma pantalla, y dos regiones
 * con el mismo nombre —o anónimas— vuelven ambiguo el selector con el que los
 * tests esperan a que termine una carga.
 */
export const DETAIL_LOADING_REGION_LABEL = "Estado del detalle del proyecto";
export const DETAIL_LOADING_MESSAGE = "Cargando el detalle del proyecto.";

export interface ProjectDetailDrawerProps {
  /**
   * El proyecto cuyo detalle se está viendo, **o `null` si el cajón está
   * cerrado**. Llegan los datos que la lista ya tiene —id, nombre, foto y clase
   * de tejido—, así que el título y la foto se pintan **desde el primer
   * fotograma** y no parpadean mientras viaja la petición.
   */
  project: ProjectCardData | null;
  onClose: () => void;
  /**
   * El inventario de lanas del que el tab Lanas puede enlazar, y si se pudo
   * traer. **Llega por prop y no por una petición del cajón**: la página ya pide
   * `GET /api/yarns` para el filtro de "lana usada" del toolbar, y volver a
   * pedirlo al abrir un cajón sería la misma respuesta dos veces en la misma
   * pantalla. Las lanas **enlazadas** son otra cosa y vienen en el detalle.
   */
  yarnInventory?: readonly YarnChoice[];
  yarnInventoryUnavailable?: boolean;
}

/** Lo último que llegó, con la clave de la petición que lo trajo. */
type LoadedDetail = {
  key: string;
  project: SerializedProject | null;
  yarns: LinkedYarn[];
  error: string | null;
};

/**
 * Cajón lateral con el detalle de un proyecto (RFC-03 §1 y §2, enmienda
 * **E3(a)**).
 *
 * **Es el `Dialog` con `placement="side"`** (E3(b)), no un componente nuevo: la
 * jaula de foco, `Escape`, `aria-modal`, el portal al `body`, el bloqueo de
 * scroll y la devolución del foco a quien lo abrió ya estaban escritos y
 * probados. Lo que RFC-03 §5 pide del cajón —"foco atrapado y `aria-modal`"— se
 * cumple **heredándolo**.
 *
 * **Pide el detalle a `GET /api/projects/:id` aunque la lista ya traiga estos
 * campos**, y el motivo es que no son la misma cosa: la lista es una foto vieja
 * del momento en que se cargó, y el detalle es la fuente de verdad —la misma que
 * el modal de edición (#22) va a dejar desactualizada en cuanto guarde—. Además
 * ese endpoint es el único que trae las **lanas enlazadas** (deuda 5, saldada por
 * la feature #17), que es de lo que vive la tanda 2.
 *
 * **Los botones que no tienen destino no se pintan** (E3(d)): "Editar" llega con
 * #22 y "crear patrón" con #26-28. No hay placeholder, ni botón desactivado, ni
 * "próximamente" que alguien tenga que acordarse de quitar.
 *
 * **El cajón es el dueño del proyecto cargado, y los tabs sólo le avisan.** Los
 * tres endpoints que mutan —vueltas, meta y pasos— responden el proyecto entero
 * ya recalculado, y parar el cronómetro responde el tiempo total; todo eso se
 * aplica sobre el mismo estado, así que **cambiar una vuelta en Progreso mueve
 * también el porcentaje que se ve en la tarjeta**, sin que ningún tab tenga que
 * saber de los demás.
 */
export function ProjectDetailDrawer({
  project,
  onClose,
  yarnInventory = [],
  yarnInventoryUnavailable = false,
}: ProjectDetailDrawerProps) {
  const [tab, setTab] = useState<DetailTab>("general");
  /* Cambia para volver a pedir lo mismo. Un booleano no serviría: dos
     reintentos seguidos tienen que disparar dos peticiones. */
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<LoadedDetail | null>(null);

  const projectId = project?.id ?? null;
  const requestKey = `${projectId ?? ""}|${String(reloadToken)}`;
  /* Estar cargando se DERIVA de comparar lo pedido con lo que llegó, igual que
     en la lista. Así abrir OTRO proyecto vuelve a "cargando" sin que nadie se
     acuerde de apagar un booleano, y el detalle del anterior no se queda en
     pantalla haciéndose pasar por el nuevo. */
  const settled = loaded?.key === requestKey;
  const loading = projectId !== null && !settled;
  const detail = settled ? loaded?.project ?? null : null;
  const linkedYarns = settled ? loaded?.yarns ?? [] : [];
  const errorMessage = settled ? loaded?.error ?? null : null;

  useEffect(() => {
    if (projectId === null) {
      return;
    }
    let cancelled = false;

    void getProjectDetail(projectId).then((result) => {
      if (cancelled) {
        return;
      }
      setLoaded(
        result.ok
          ? {
              key: requestKey,
              project: result.data.project,
              yarns: result.data.yarns,
              error: null,
            }
          : { key: requestKey, project: null, yarns: [], error: result.message },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, requestKey]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  /**
   * Aplica el proyecto que devolvió una mutación. **No toca la clave**, y por eso
   * no dispara el estado de carga: lo que llega ya es la verdad del servidor, así
   * que enseñar una silueta mientras se pinta sería un parpadeo gratis.
   */
  const applyProject = useCallback((next: SerializedProject) => {
    setLoaded((previous) =>
      previous === null ? previous : { ...previous, project: next },
    );
  }, []);

  /**
   * Vuelve a pedir el detalle **en silencio**, para lo que un endpoint de acción
   * no puede contar: enlazar una lana responde ids pelados, sin marca ni tipo.
   * Misma clave, así que la pantalla no vuelve a "cargando".
   */
  const refreshDetail = useCallback(async () => {
    if (projectId === null) {
      return;
    }
    const result = await getProjectDetail(projectId);
    if (!result.ok) {
      return;
    }
    setLoaded((previous) =>
      previous === null
        ? previous
        : {
            ...previous,
            project: result.data.project,
            yarns: result.data.yarns,
          },
    );
  }, [projectId]);

  const removeYarn = useCallback((yarnId: string) => {
    setLoaded((previous) =>
      previous === null
        ? previous
        : {
            ...previous,
            yarns: previous.yarns.filter((yarn) => yarn.id !== yarnId),
          },
    );
  }, []);

  if (project === null) {
    return null;
  }

  /**
   * Qué se pinta en cada pestaña. Es un `switch` sobre la unión y no un objeto:
   * **añadir una pestaña sin su contenido no compila**, que es exactamente el
   * error que E3(d) prohíbe cometer.
   */
  function tabContent(name: DetailTab, loadedProject: SerializedProject) {
    switch (name) {
      case "general":
        return <GeneralTab project={loadedProject} />;
      case "progress":
        return (
          <ProgressTab project={loadedProject} onProjectChange={applyProject} />
        );
      case "yarns":
        return (
          <YarnsTab
            projectId={loadedProject.id}
            yarns={linkedYarns}
            inventory={yarnInventory}
            inventoryUnavailable={yarnInventoryUnavailable}
            onRefreshDetail={refreshDetail}
            onUnlinked={removeYarn}
          />
        );
      case "sessions":
        return (
          <SessionsTab
            projectId={loadedProject.id}
            onTimeChange={(time) => {
              applyProject({ ...loadedProject, time });
            }}
          />
        );
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={project.name}
      placement="side"
      size="lg"
    >
      {/* Región viva única del cajón: los bloques de carga son `aria-hidden` y
          no anuncian nada por su cuenta. */}
      <p
        role="status"
        aria-label={DETAIL_LOADING_REGION_LABEL}
        className="sr-only"
      >
        {loading ? DETAIL_LOADING_MESSAGE : ""}
      </p>

      <Tabs
        label={DETAIL_TABS_LABEL}
        value={tab}
        onValueChange={setTab}
        tabs={DETAIL_TABS.map((name) => ({
          value: name,
          label: DETAIL_TAB_LABELS[name],
          content:
            errorMessage !== null ? (
              <ErrorState
                headingLevel={3}
                title={DETAIL_ERROR_TITLE}
                description={errorMessage}
                onRetry={reload}
              />
            ) : detail === null ? (
              <DetailTabSkeleton withPhoto={name === "general"} />
            ) : (
              tabContent(name, detail)
            ),
        }))}
      />
    </Dialog>
  );
}

/**
 * El tab General: **foto, tipo, status, agujas, fechas y notas** (RFC-03 §2). El
 * nombre no se repite acá porque ya es el **título del cajón**, o sea su nombre
 * accesible: escribirlo dos veces obligaría a un lector de pantalla a decirlo
 * dos veces.
 *
 * La foto es **la misma pieza que la tarjeta** (`ProjectPhoto`): mismo marco y
 * el mismo hueco con la inicial cuando no hay imagen (enmienda E2(g)). Reusarla
 * evita que el proyecto se vea de dos maneras según desde dónde se mire. Lo
 * único que cambia es el **encuadre**, que acá es una franja y no un bloque:
 * medido en Chrome, el panorámico de la tarjeta se comía el 47 % del alto de la
 * ventana y dejaba los datos naciendo en el pliegue.
 *
 * Los datos van en una **lista de definiciones**, que es lo que son: pares
 * etiqueta-valor. La jerarquía entre los dos lados se hace con **familia y
 * tamaño** —la etiqueta en monoespaciada chica, el valor en la de texto— y no
 * bajando el contraste de la etiqueta: sobre esta superficie el primer plano
 * apagado no llega al mínimo para texto chico, que es la misma trampa que ya
 * midió la tarjeta.
 */
function GeneralTab({ project }: { project: SerializedProject }) {
  const needles = needlesLabel(project.needles);
  const notes = project.notes.trim();

  return (
    <div className="flex flex-col gap-(--space-5)">
      <ProjectPhoto
        name={project.name}
        image={project.image}
        type={project.type}
        size="detail"
      />

      <dl className="grid grid-cols-2 gap-(--space-4)">
        <DetailField
          label={GENERAL_FIELD_LABELS.type}
          value={CRAFT_TYPE_LABELS[project.type]}
        />
        <DetailField
          label={GENERAL_FIELD_LABELS.status}
          value={PROJECT_STATUS_LABELS[project.status]}
        />
        <DetailField
          label={GENERAL_FIELD_LABELS.startDate}
          value={formatDate(project.startDate) ?? UNKNOWN_DATE}
        />
        <DetailField
          label={GENERAL_FIELD_LABELS.endDate}
          value={
            project.endDate === null
              ? NO_END_DATE
              : (formatDate(project.endDate) ?? UNKNOWN_DATE)
          }
        />
        <DetailField
          label={GENERAL_FIELD_LABELS.needles}
          value={needles ?? NO_NEEDLES}
          wide
        />
        <DetailField
          label={GENERAL_FIELD_LABELS.notes}
          value={notes === "" ? NO_NOTES : notes}
          wide
        />
      </dl>
    </div>
  );
}

/**
 * Un par etiqueta-valor. Va envuelto en un `div` dentro de la `dl` —marcado
 * válido y lo que permite que cada par sea una celda de la rejilla—, y los
 * campos largos ocupan la fila entera: las notas son texto libre y no caben en
 * media columna.
 *
 * El valor conserva los saltos de línea que escribió quien teje: unas notas de
 * proyecto suelen ser una lista, y aplastarlas en un párrafo las vuelve ilegibles.
 */
function DetailField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? WIDE_FIELD_CLASSES : FIELD_CLASSES}>
      <dt className="font-mono text-xs uppercase tracking-label text-fg">
        {label}
      </dt>
      <dd className="m-0 font-body text-base leading-base text-fg whitespace-pre-line">
        {value}
      </dd>
    </div>
  );
}

const FIELD_CLASSES = "flex flex-col gap-(--space-1)";
const WIDE_FIELD_CLASSES = "col-span-2 flex flex-col gap-(--space-1)";

/**
 * Silueta del tab mientras viaja la petición, en el mismo sitio en el que van a
 * caer los datos para que no salte el maquetado al llegar. `Skeleton` es
 * `aria-hidden`: la carga la anuncia una vez la región viva del cajón.
 *
 * El marco de la foto **sólo se dibuja en General**, que es la única pestaña que
 * lleva foto: reservar su hueco en las otras tres haría saltar el maquetado
 * justo al revés de lo que un bloque de carga viene a evitar. Y lleva la misma
 * proporción que la foto de verdad, la del cajón, no la de la tarjeta.
 */
function DetailTabSkeleton({ withPhoto }: { withPhoto: boolean }) {
  return (
    <div className="flex flex-col gap-(--space-5)">
      {withPhoto ? <Skeleton shape="block" className="aspect-3/1 w-full" /> : null}
      <div className="grid grid-cols-2 gap-(--space-4)">
        {[0, 1, 2, 3].map((slot) => (
          <Skeleton key={slot} className="w-full" />
        ))}
      </div>
    </div>
  );
}
