/**
 * API pública de la UI del Dashboard.
 *
 * Barrel APARTE del de la feature (`@/features/dashboard`), que arrastra `./api`
 * → el store → Drizzle. Aquí sólo hay presentación y la costura HTTP de cliente.
 */
export { DashboardView } from "./DashboardView";
