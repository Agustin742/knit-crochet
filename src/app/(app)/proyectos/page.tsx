import { ProjectsView } from "@/features/projects/ui";

/**
 * Lista de proyectos (RFC-03). Ruta **privada** sin tocar nada: `src/proxy.ts`
 * es fail-closed por lista blanca, y sólo `/login` y `/register` son públicas.
 *
 * La página es fina a propósito: rutea y compone. Toda la UI y la costura con
 * los endpoints viven en `features/projects/ui/`.
 */
export default function ProjectsPage() {
  return <ProjectsView />;
}
