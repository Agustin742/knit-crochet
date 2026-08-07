import { DashboardView } from "@/features/dashboard/ui";

/**
 * Dashboard, la página de inicio post-login (RFC-02).
 *
 * Es una ruta **privada** desde la enmienda E1.1: `src/proxy.ts` ya no la lista
 * como pública, así que sin sesión rebota a `/login?next=/`. No hay landing.
 *
 * La página es fina a propósito: rutea y compone. Toda la UI y la costura con
 * los endpoints viven en `features/dashboard/ui/`.
 */
export default function DashboardPage() {
  return <DashboardView />;
}
