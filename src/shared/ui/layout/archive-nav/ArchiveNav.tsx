"use client";

import { usePathname } from "next/navigation";

import { Button } from "@/shared/ui/primitives";

import { cn } from "../../lib/cn";
import { isRouteActive, NAV_ITEMS, type NavItem } from "../nav-items";
import {
  folderSurfaceVariants,
  folderTone,
  folderVariants,
} from "./archive-nav.variants";

export interface ArchiveNavUser {
  name: string;
}

export interface ArchiveNavProps {
  /** Rutas del nav; por defecto las 6 páginas de la app (RFC-01 §2). */
  items?: readonly NavItem[];
  /** Usuario mostrado en los utils (a la derecha). */
  user?: ArchiveNavUser | null;
  /** Callback de cierre de sesión (el fetch real lo cablea la capa de feature). */
  onLogout?: () => void;
  className?: string;
}

/**
 * Navegación archivero (≥ tablet). Carpetas dark-on-dark con la activa
 * determinada por la RUTA actual (`usePathname` → `aria-current="page"`), no por
 * scroll-spy. Presentación pura: recibe `user`/`onLogout`, no hace fetch.
 */
export function ArchiveNav({
  items = NAV_ITEMS,
  user,
  onLogout,
  className,
}: ArchiveNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <header
      className={cn(
        "relative hidden items-end gap-[var(--space-3)] overflow-hidden tablet:flex",
        "h-[var(--nav-height)] px-[var(--space-6)]",
        "bg-bg [background-image:var(--texture-dots-dark)] [background-size:var(--space-4)_var(--space-4)]",
        "[z-index:var(--z-nav)]",
        className,
      )}
    >
      <div className="flex flex-shrink-0 flex-col self-center pr-[var(--space-3)]">
        {/* Anchor plano a propósito: el design system es portable y no depende
            del framework anfitrión (SDD §2). El enrutado SPA lo decide la app. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="font-display text-xl leading-tight text-fg-inverse no-underline"
        >
          Knit<em className="text-accent not-italic">&amp;</em>Crochet
        </a>
        <span className="mt-[var(--space-1)] font-mono text-xs tracking-wide text-fg-inverse-muted">
          KNIT &amp; CROCHET
        </span>
      </div>

      <nav
        aria-label="Navegación principal"
        className="flex min-w-0 flex-1 items-end"
      >
        {items.map((item, index) => {
          const active = isRouteActive(pathname, item.href);
          const surface = folderSurfaceVariants({
            tone: folderTone(index),
            active,
          });
          return (
            <a
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={folderVariants({ active })}
            >
              <span
                className={cn(
                  "relative z-[var(--z-base)] flex w-fit items-baseline gap-[var(--space-1)]",
                  "mx-[var(--space-4)] mb-[calc(-1*var(--border-width))] rounded-[var(--radius-tab)]",
                  "px-[var(--space-4)] pt-[var(--space-3)] pb-[var(--space-2)]",
                  "shadow-[var(--shadow-folder-tab)]",
                  surface,
                )}
              >
                {item.prefix ? (
                  <span
                    aria-hidden="true"
                    className="font-emphasis text-base italic text-[color:var(--folder-prefix)]"
                  >
                    {item.prefix}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "whitespace-nowrap font-body text-sm font-bold uppercase tracking-wide",
                    active ? "text-accent" : "text-fg-inverse",
                  )}
                >
                  {item.label}
                </span>
              </span>
              <span
                className={cn(
                  "self-stretch rounded-[var(--radius-tab)] shadow-[var(--shadow-folder-body)]",
                  active
                    ? "h-[var(--folder-body-height-active)]"
                    : "h-[var(--folder-body-height)]",
                  surface,
                )}
              />
            </a>
          );
        })}
      </nav>

      <div className="flex flex-shrink-0 items-center gap-[var(--space-4)] self-center">
        {user ? (
          <span className="font-mono text-xs tracking-label text-fg-inverse-muted">
            {user.name}
          </span>
        ) : null}
        {onLogout ? (
          <Button variant="ghost" size="md" onClick={onLogout}>
            Salir
          </Button>
        ) : null}
      </div>
    </header>
  );
}
