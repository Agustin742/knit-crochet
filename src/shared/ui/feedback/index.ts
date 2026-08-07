/**
 * Capa `feedback/` del design system (SDD §6): qué se enseña cuando no hay
 * contenido que enseñar. `StatePanel` es su implementación compartida y queda
 * deliberadamente fuera de la API pública.
 */
export * from "./empty-state";
export * from "./error-state";
export {
  STATE_PANEL_HEADING_LEVELS,
  type StatePanelHeadingLevel,
} from "./state-panel/StatePanel";
