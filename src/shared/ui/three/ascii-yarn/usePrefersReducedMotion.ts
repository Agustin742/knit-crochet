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
 * La media query global de `globals.css` mata animaciones y transiciones CSS,
 * pero no un render loop de three.js: la capa 3D necesita detección en JS
 * (SDD §7, RFC-01 §3 D3). `useSyncExternalStore` es la suscripción correcta a
 * `matchMedia`: sin `setState` en efectos y con snapshot de servidor propio.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
