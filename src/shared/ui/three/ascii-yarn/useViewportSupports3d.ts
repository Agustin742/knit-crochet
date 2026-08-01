"use client";

import { useSyncExternalStore } from "react";

const MIN_WIDTH_TOKEN = "--bp-tablet";

/**
 * El breakpoint se lee del token en lugar de literalizarlo porque las media
 * queries no resuelven `var()`. Si el token no está disponible se devuelve
 * `null` y se falla abierto (se monta la escena igual).
 */
function readMinWidthQuery(): string | null {
  const minWidth = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(MIN_WIDTH_TOKEN)
    .trim();

  return minWidth === "" ? null : `(min-width: ${minWidth})`;
}

function subscribe(onStoreChange: () => void) {
  const mediaQuery = readMinWidthQuery();
  if (mediaQuery === null) {
    return () => {};
  }

  const query = window.matchMedia(mediaQuery);
  query.addEventListener("change", onStoreChange);
  return () => {
    query.removeEventListener("change", onStoreChange);
  };
}

function getSnapshot(): boolean {
  const mediaQuery = readMinWidthQuery();
  return mediaQuery === null || window.matchMedia(mediaQuery).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Degradación en mobile (SDD §7: "menos densidad, fondo estático, o se omite").
 * Elegimos omitir: por debajo de `--bp-tablet` la escena no se monta, así que
 * three.js ni siquiera se descarga en el dispositivo más débil.
 */
export function useViewportSupports3d(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
