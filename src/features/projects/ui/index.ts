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
} from "./ProjectCard";
export type {
  ProjectCardHeadingLevel,
  ProjectCardProps,
} from "./ProjectCard";
export { ProjectsView } from "./ProjectsView";
export type {
  ProjectCardData,
  ProjectListPayload,
  SerializedProject,
  YarnListPayload,
  YarnOption,
} from "./types";
