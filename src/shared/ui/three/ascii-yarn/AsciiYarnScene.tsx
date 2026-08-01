"use client";

import { useEffect, useRef } from "react";
import { WebGLRenderer, WebGLRenderTarget } from "three";

import { cn } from "../../lib/cn";
import { asciiFromPixels } from "./asciiFromPixels";
import { createYarnScene } from "./createYarnScene";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/** Retícula del template: 1 píxel del render = 1 carácter del `<pre>`. */
export const DEFAULT_COLS = 96;
export const DEFAULT_ROWS = 44;

const CHANNELS_PER_PIXEL = 4;
const AUTO_ROTATION_STEP = 0.006;
const DRAG_SENSITIVITY_X = 0.01;
const DRAG_SENSITIVITY_Y = 0.008;
const MAX_TILT = 1.2;
/** Pose única que se dibuja con `prefers-reduced-motion` (un solo frame). */
const STILL_ROTATION_Y = 0.7;

export interface AsciiYarnSceneProps {
  /** Hero interactivo: el `<pre>` recibe puntero y se puede arrastrar. */
  interactive?: boolean;
  /** Columnas de la retícula ASCII (= ancho del render en píxeles). */
  cols?: number;
  /** Filas de la retícula ASCII (= alto del render en píxeles). */
  rows?: number;
}

/**
 * Motor ASCII portado de `template/ascii-yarn.js` (RFC-01 §3 **D2-bis**):
 * `three` puro, render a un `WebGLRenderTarget` de `cols × rows`,
 * `readRenderTargetPixels`, luminancia → rampa y escritura a un `<pre>`. No usa
 * `AsciiEffect` (promedia bloques y emite su propia `<table>`), ni `drei`, ni R3F.
 *
 * Export por defecto porque es lo que carga el `dynamic(..., { ssr: false })` de
 * `AsciiYarn`; nadie debería importarla directamente (arrastraría `three` al
 * chunk del consumidor).
 */
export default function AsciiYarnScene({
  interactive = false,
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
}: AsciiYarnSceneProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const pre = preRef.current;
    if (pre === null) {
      return;
    }

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        antialias: false,
        powerPreference: "low-power",
      });
      renderer.setSize(cols, rows);
    } catch {
      // Sin WebGL la capa es decorativa: se queda vacía en vez de romper la página.
      return;
    }

    const { scene, camera, group, dispose } = createYarnScene({ cols, rows });
    const target = new WebGLRenderTarget(cols, rows);
    const pixels = new Uint8Array(cols * rows * CHANNELS_PER_PIXEL);

    const draw = () => {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, cols, rows, pixels);
      pre.textContent = asciiFromPixels(pixels, cols, rows);
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const handlePointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      pre.dataset["dragging"] = "true";
      // happy-dom (y navegadores viejos) no implementan la Pointer Capture API.
      if (typeof pre.setPointerCapture === "function") {
        pre.setPointerCapture(event.pointerId);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      group.rotation.y += (event.clientX - lastX) * DRAG_SENSITIVITY_X;
      group.rotation.x = Math.max(
        -MAX_TILT,
        Math.min(
          MAX_TILT,
          group.rotation.x + (event.clientY - lastY) * DRAG_SENSITIVITY_Y,
        ),
      );
      lastX = event.clientX;
      lastY = event.clientY;
      // Con movimiento reducido no hay loop: el arrastre redibuja él mismo (D3).
      if (prefersReducedMotion) {
        draw();
      }
    };

    const handlePointerStop = () => {
      dragging = false;
      delete pre.dataset["dragging"];
    };

    pre.addEventListener("pointerdown", handlePointerDown);
    pre.addEventListener("pointermove", handlePointerMove);
    pre.addEventListener("pointerup", handlePointerStop);
    pre.addEventListener("pointercancel", handlePointerStop);

    let frame = 0;
    if (prefersReducedMotion) {
      group.rotation.y = STILL_ROTATION_Y;
      draw();
    } else {
      const loop = () => {
        if (!dragging) {
          group.rotation.y += AUTO_ROTATION_STEP;
        }
        draw();
        frame = requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      pre.removeEventListener("pointerdown", handlePointerDown);
      pre.removeEventListener("pointermove", handlePointerMove);
      pre.removeEventListener("pointerup", handlePointerStop);
      pre.removeEventListener("pointercancel", handlePointerStop);
      target.dispose();
      dispose();
      renderer.dispose();
    };
  }, [cols, rows, prefersReducedMotion]);

  return (
    <pre
      ref={preRef}
      data-testid="ascii-yarn-pre"
      className={cn(
        // Reglas duras del ASCII (SDD §7.1): monoespaciada, interlineado 1 y
        // sin tracking, o la retícula deja de ser cuadrada.
        "m-0 font-mono text-xs leading-ascii tracking-normal whitespace-pre select-none",
        interactive &&
          "cursor-grab touch-none data-[dragging=true]:cursor-grabbing",
      )}
    />
  );
}
