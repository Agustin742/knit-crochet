import { YarnsView } from "@/features/yarns/ui";

/**
 * Lista de lanas (RFC-04). Ruta **privada** sin tocar nada: `src/proxy.ts`
 * es fail-closed por lista blanca, y sólo `/login` y `/register` son públicas.
 *
 * La página es fina a propósito: rutea y compone. Toda la UI y la costura con
 * el endpoint viven en `features/yarns/ui/`.
 */
export default function YarnsPage() {
  return <YarnsView />;
}
