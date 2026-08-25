"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDate } from "@/shared/lib/format";
import { Dialog, ErrorState, Skeleton, Tabs } from "@/shared/ui";

import { ProjectPhoto } from "./ProjectCard";
import { CRAFT_TYPE_LABELS } from "./project-filters";
import {
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

/**
 * Nombre de la región viva del cajón. **Es distinto del de la lista** a
 * propósito (deuda 114): las dos conviven en la misma pantalla, y dos regiones
 * con el mismo nombre —o anónimas— vuelven ambiguo el selector con el que los
 * tests esperan a que termine una carga.
 */
export const DETAIL_LOADING_REGION_LABEL = "Estado del detalle del proyecto";
export const DETAIL_LOADING_MESSAGE = "Cargando el detalle del proyecto.";

/**
 * Mismo título de error que la lista (RFC-03 §4). Se escribe otra vez en vez de
 * importarlo de `ProjectsView`, que es quien monta este cajón: importarlo haría
 * un ciclo entre los dos módulos por una cadena de texto.
 */
export const DETAIL_ERROR_TITLE = "Se soltó un punto";

export interface ProjectDetailDrawerProps {
  /**
   * El proyecto cuyo detalle se está viendo, **o `null` si el cajón está
   * cerrado**. Llegan los datos que la lista ya tiene —id, nombre, foto y clase
   * de tejido—, así que el título y la foto se pintan **desde el primer
   * fotograma** y no parpadean mientras viaja la petición.
   */
  project: ProjectCardData | null;
  onClose: () => void;
}

/** Lo último que llegó, con la clave de la petición que lo trajo. */
type LoadedDetail = {
  key: string;
  project: SerializedProject | null;
  error: string | null;
};

/**
 * Cajón lateral con el detalle de un proyecto (RFC-03 §1 y §2, enmienda
 * **E3(a)**, tanda 1).
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
 */
export function ProjectDetailDrawer({
  project,
  onClose,
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
          ? { key: requestKey, project: result.data.project, error: null }
          : { key: requestKey, project: null, error: result.message },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, requestKey]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  if (project === null) {
    return null;
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
              <GeneralTabSkeleton />
            ) : (
              <GeneralTab project={detail} />
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
 * La foto es **la misma pieza que la tarjeta** (`ProjectPhoto`): mismo marco,
 * misma proporción y el mismo hueco con la inicial cuando no hay imagen
 * (enmienda E2(g)). Reusarla evita que el proyecto se vea de dos maneras según
 * desde dónde se mire.
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
 * Silueta del tab mientras viaja la petición: el marco de la foto y las filas de
 * datos, en el mismo sitio en el que van a caer, para que no salte el maquetado
 * al llegar. `Skeleton` es `aria-hidden`: la carga la anuncia una vez la región
 * viva del cajón.
 */
function GeneralTabSkeleton() {
  return (
    <div className="flex flex-col gap-(--space-5)">
      <Skeleton shape="block" className="aspect-video w-full" />
      <div className="grid grid-cols-2 gap-(--space-4)">
        {[0, 1, 2, 3].map((slot) => (
          <Skeleton key={slot} className="w-full" />
        ))}
      </div>
    </div>
  );
}
