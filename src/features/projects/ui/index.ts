/**
 * API pública de la UI de proyectos.
 *
 * Es un barrel APARTE del de la feature (`@/features/projects`) a propósito: ese
 * arrastra `./api` → el store → Drizzle, y traerlo a un componente de cliente
 * metería el ORM en el bundle del navegador. Éste sólo tiene presentación.
 */
export {
  PROJECT_CARD_HEADING_LEVELS,
  ProjectCard,
  quickStartLabel,
  quickStopLabel,
} from "./ProjectCard";
export type {
  ProjectCardHeadingLevel,
  ProjectCardProps,
  ProjectCardTimer,
} from "./ProjectCard";
/**
 * El modal de alta y edición sale del feature (RFC-03, enmienda **E7 (a)**): el
 * Dashboard crea proyectos con **este mismo** formulario, porque el alta de una
 * entidad es una y no una por pantalla desde la que se llega.
 *
 * La copia viaja con él para que quien lo monta pueda referirse a sus campos sin
 * reescribir los textos.
 */
export {
  ProjectFormDialog,
  type ProjectFormTarget,
} from "./ProjectFormDialog";
export {
  CREATE_SUBMIT_LABEL,
  EDIT_SUBMIT_LABEL,
  FORM_CANCEL_LABEL,
  FORM_FIELD_LABELS,
  NEEDLES_ADD_BUTTON_LABEL,
  createFormTitle,
  editFormTitle,
} from "./project-form";
/**
 * El endpoint de la biblioteca de patrones, que el formulario pide al abrirse.
 * Se expone por el mismo motivo que el resto de constantes de la costura HTTP:
 * **para que quien lo monta lo importe en vez de reescribirlo** — y quien lo
 * monta desde otro feature tiene que doblar esa petición en sus tests.
 */
export { PATTERNS_ENDPOINT } from "./projects-client";
export { ProjectsView } from "./ProjectsView";
export type {
  ProjectCardData,
  ProjectListPayload,
  SerializedActiveSession,
  SerializedProject,
  SerializedProjectListItem,
  YarnListPayload,
  YarnOption,
} from "./types";
