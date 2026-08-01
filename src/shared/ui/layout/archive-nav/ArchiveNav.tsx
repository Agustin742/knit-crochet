"use client";

import { usePathname } from "next/navigation";

import { cn } from "../../lib/cn";
import { isRouteActive, NAV_ITEMS, type NavItem } from "../nav-items";
import {
  ARCHIVE_SLOTS,
  leafSheetVariants,
  leafVariants,
  navLeafDepth,
  navTabColumn,
  navTrackColumns,
  tabLabelVariants,
  tabTrackVariants,
  tabVariants,
} from "./archive-nav.variants";

export interface ArchiveNavUser {
  name: string;
}

export interface ArchiveNavProps {
  /**
   * Rutas del nav; por defecto las 6 páginas de la app (RFC-01 §2). El cajón
   * tiene `ARCHIVE_SLOTS` ranuras: si llegan más ítems, se montan las primeras
   * (ver el porqué en `archive-nav.variants.ts`).
   */
  items?: readonly NavItem[];
  /**
   * RESERVADO para la feature #31 `auth_ui`. Hoy el nav **no renderiza utils**
   * (enmienda E7 de D4: se ofrecía "Salir" sin ninguna sesión abierta), así que
   * esta prop se acepta y se ignora a propósito, con un test que lo fija. Se
   * mantiene en la firma para no romper a `AppShell` ni al cableado de auth
   * mientras la pantalla que la justifica no existe.
   */
  user?: ArchiveNavUser | null;
  /** RESERVADO para #31 `auth_ui`, ignorada hoy: ver `user`. */
  onLogout?: () => void;
  className?: string;
}

/**
 * Navegación archivero, modelo fichero (RFC-01 §3 D4): un cajón de hojas
 * apiladas en vertical a todo el ancho, de cada una asoma su canto y de cada
 * canto cuelga su pestaña. La activa se determina por la RUTA actual
 * (`usePathname` → `aria-current="page"`), no por scroll-spy.
 *
 * La hoja de la ruta activa es la hoja ABIERTA (enmienda E10, que deroga E1):
 * no dibuja canto y baja al fondo del cajón, de modo que su cara es el área de
 * contenido de la página. Pierde la cara pero NO la ranura de alto, así que los
 * cantos dibujados son 5 sobre 6 ranuras y la escalera sigue siendo monótona.
 * Las otras cinco se apilan encima en el orden de la lista. Lo que NO se mueve
 * es la columna horizontal de cada pestaña, que la fija el índice de la página
 * en la lista: al navegar cambia sólo la altura.
 *
 * Lo único interactivo es la pestaña (enmienda E8): las hojas a todo el ancho
 * son decoración inerte.
 *
 * Sustituye al `BottomNav` a partir de `--bp-archive`, que es el ancho al que
 * las 6 etiquetas entran enteras con el tamaño grande (enmiendas E4/E6). El
 * wordmark vive en la banda superior, por encima de la hoja más alta (E7).
 * Presentación pura: no hace fetch.
 */
export function ArchiveNav({ items = NAV_ITEMS, className }: ArchiveNavProps) {
  const pathname = usePathname() ?? "/";
  const leaves = items.slice(0, ARCHIVE_SLOTS);
  const columns = navTrackColumns(leaves.length);
  // Se resuelve UNA sola hoja abierta: el fondo del cajón es una posición y no
  // puede compartirse. Si ninguna ruta de la lista coincide, el cajón conserva
  // el orden de la lista y dibuja sus seis cantos.
  const openIndex = leaves.findIndex((item) =>
    isRouteActive(pathname, item.href),
  );

  return (
    <header
      className={cn(
        "relative hidden archive:block",
        "h-(--nav-height)",
        "bg-bg bg-(image:--texture-dots-dark) [background-size:var(--space-4)_var(--space-4)]",
        "z-(--z-nav)",
        className,
      )}
    >
      {/* Banda superior. El wordmark entra ENTERO por encima de la hoja más
          alta (enmienda E7): las hojas son full-bleed y eso no se negocia, así
          que quien se aparta es el wordmark, no el cajón. Por eso es una sola
          línea y por eso el bloque no captura el puntero fuera del enlace. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-(--z-nav-band)",
          "flex items-start px-(--nav-tab-inset-start) pt-(--space-2)",
        )}
      >
        {/* Anchor plano a propósito: el design system es portable y no depende
            del framework anfitrión (SDD §2). El enrutado SPA lo decide la app. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="pointer-events-auto font-display text-xl leading-tight text-fg-inverse no-underline"
        >
          Knit<em className="text-accent not-italic">&amp;</em>Crochet
        </a>
      </div>

      {/* El cajón: pegado al contenido y a todo el ancho. En columna invertida,
          el primer elemento del orden de flexión queda ABAJO: por eso la hoja
          abierta baja al fondo con `order-first` sin alterar el orden del DOM,
          que sigue siendo el de la lista (orden de lectura y de tabulación). */}
      <nav
        aria-label="Navegación principal"
        className="absolute inset-x-0 bottom-0 flex flex-col-reverse"
      >
        {leaves.map((item, index) => {
          const open = index === openIndex;
          const column = navTabColumn(index);
          const depth = navLeafDepth(index, openIndex);
          return (
            <div
              key={item.href}
              data-slot="leaf"
              data-column={column}
              data-depth={depth}
              data-open={open ? "true" : undefined}
              className={leafVariants({ depth, open })}
            >
              {/* El canto: decoración inerte (E8). La hoja abierta no lo dibuja
                  (E10) porque su cara ya es el área de contenido, pero sí
                  conserva su ranura de alto: pierde cara, no alto, así que la
                  escalera del fichero no arranca plana. */}
              {open ? null : (
                <span
                  aria-hidden="true"
                  data-slot="sheet"
                  className={leafSheetVariants()}
                />
              )}
              <span
                data-slot="track"
                data-columns={columns}
                className={tabTrackVariants({ columns })}
              >
                <a
                  href={item.href}
                  data-slot="tab"
                  aria-label={item.label}
                  aria-current={open ? "page" : undefined}
                  className={tabVariants({ column, active: open })}
                >
                  {item.prefix ? (
                    <span
                      aria-hidden="true"
                      className="font-emphasis text-sm leading-tight italic text-(color:--nav-tab-prefix)"
                    >
                      {item.prefix}
                    </span>
                  ) : null}
                  <span className={tabLabelVariants({ active: open })}>
                    {item.label}
                  </span>
                </a>
              </span>
            </div>
          );
        })}
      </nav>
    </header>
  );
}
