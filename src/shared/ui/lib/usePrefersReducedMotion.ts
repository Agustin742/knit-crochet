"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => {
    query.removeEventListener("change", onStoreChange);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Detección en JS de `prefers-reduced-motion` (SDD §7/§8).
 *
 * La media query global de `globals.css` mata animaciones y transiciones CSS,
 * pero hay dos cosas que no alcanza: un render loop de three.js (RFC-01 §3 D3) y
 * cualquier decisión que quiera **verse desde el DOM** — una clase de animación
 * que se aplica o no. Por eso vive aquí, en `shared/ui/lib/`, y no dentro de la
 * capa 3D: desde #33 lo consumen también primitivos 2D (`Skeleton`).
 *
 * `useSyncExternalStore` es la suscripción correcta a `matchMedia`: sin
 * `setState` en efectos y con snapshot de servidor propio.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
