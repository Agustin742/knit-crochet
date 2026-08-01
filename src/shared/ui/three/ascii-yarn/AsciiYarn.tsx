"use client";

import dynamic from "next/dynamic";

import { cn } from "../../lib/cn";
import { useViewportSupports3d } from "./useViewportSupports3d";

/**
 * `ssr: false` sigue prohibido dentro de Server Components en Next 16, así que
 * la llamada vive en este módulo `"use client"`: el consumidor puede ser un
 * Server Component sin romper el build. `loading: null` porque la escena es
 * decorativa — no debe reservar espacio ni bloquear el primer render.
 */
const AsciiYarnScene = dynamic(() => import("./AsciiYarnScene"), {
  ssr: false,
  loading: () => null,
});

export interface AsciiYarnProps {
  /**
   * Hero interactivo (Dashboard): recibe puntero y se puede arrastrar. Por
   * defecto es decorativo (fondo del shell, fondo del login, loader), no
   * captura eventos y queda fuera del árbol accesible.
   */
  interactive?: boolean;
  /** Halo rosa sobre el ASCII (`--shadow-glow`). Apagado como en el template. */
  glow?: boolean;
  /** Columnas de la retícula ASCII (1 columna = 1 carácter). */
  cols?: number;
  /** Filas de la retícula ASCII (1 fila = 1 línea del `<pre>`). */
  rows?: number;
  /** Tamaño y posición los decide el consumidor; el host llena su contenedor. */
  className?: string;
}

/**
 * Ovillo de lana con agujas renderizado en ASCII (SDD §6/§7, RFC-01 §3
 * **D2-bis**: `three` puro portando `template/ascii-yarn.js`). Auto-rota y se
 * arrastra; con `prefers-reduced-motion` se dibuja un único frame y no arranca
 * el `requestAnimationFrame`, pero el arrastre sigue disponible y redibuja (D3).
 *
 * El color sale de `currentColor`: el host fija el token (`text-accent`) y el
 * `<pre>` lo hereda, así que cambiar la identidad es cambiar el token.
 *
 * Es puramente decorativo: siempre `aria-hidden`. Un loader que lo use debe
 * poner su propio `role="status"` con texto alrededor.
 */
export function AsciiYarn({
  interactive = false,
  glow = false,
  cols,
  rows,
  className,
}: AsciiYarnProps) {
  const supports3d = useViewportSupports3d();

  return (
    <div
      aria-hidden="true"
      data-slot="ascii-yarn"
      data-interactive={String(interactive)}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden text-accent",
        interactive ? "pointer-events-auto" : "pointer-events-none",
        glow && "text-shadow-(--shadow-glow)",
        className,
      )}
    >
      {supports3d ? (
        <AsciiYarnScene interactive={interactive} cols={cols} rows={rows} />
      ) : null}
    </div>
  );
}
