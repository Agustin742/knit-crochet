/**
 * Ítems de navegación del shell. Son datos de presentación (etiqueta + destino
 * de un enlace): NO son fetch ni conocimiento del backend, por lo que viven en
 * el design system. Quien consume el shell puede pasar sus propios `items`;
 * `NAV_ITEMS` es el default de esta app (RFC-01 §2: 6 páginas en este orden).
 */
export interface NavItem {
  /** Etiqueta visible (UI en español). */
  label: string;
  /** Ruta destino del enlace. */
  href: string;
  /** Prefijo del lockup del archivero (serif itálica), p. ej. ".knit". */
  prefix?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/", prefix: ".knit" },
  { label: "Proyectos", href: "/proyectos", prefix: ".knit" },
  { label: "Lanas", href: "/lanas", prefix: ".knit" },
  { label: "Patrones", href: "/patrones", prefix: ".knit" },
  { label: "Calculadoras", href: "/calculadoras", prefix: ".knit" },
  { label: "Stash", href: "/stash", prefix: ".knit" },
];

/**
 * Determina si `href` corresponde a la ruta activa. La raíz ("/") sólo coincide
 * exactamente; el resto coincide con la ruta o con cualquier subruta suya.
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
