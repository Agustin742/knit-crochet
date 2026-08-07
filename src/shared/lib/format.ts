import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/shared/config";

/**
 * Formato de números y duraciones para la UI (en español rioplatense, que es el
 * idioma de la interfaz según `docs/harness/conventions.md`).
 *
 * Vive en `shared/lib` y no dentro de un feature porque lo consumen dos:
 * el Dashboard (el número grande de cada métrica y el "≈ N veces …" de la
 * comparativa) y la tarjeta de proyecto (el tiempo acumulado). Es lógica pura:
 * no toca red, ni DOM, ni Next, así que corre igual en servidor y en navegador.
 *
 * El separador decimal es **coma**, que es lo que pide el idioma; se obtiene de
 * `Intl` y no concatenando comas a mano, para no reimplementar la agrupación de
 * miles ni el redondeo.
 */
const LOCALE = "es-AR";

/**
 * Un decimal como máximo, y **ninguno** cuando no aporta: `2,13` → `"2,1"`,
 * pero `2` → `"2"`, no `"2,0"`. Es el formato del "≈ 2,1 veces …" de la
 * enmienda E1.4 y el del número grande de las métricas.
 */
const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

/**
 * Se DERIVA de los dos puentes de config en vez de escribir otro `60`: así hay
 * un solo sitio del que salen las unidades de tiempo y no puede quedar uno
 * desincronizado del otro.
 */
const MINUTES_PER_HOUR = SECONDS_PER_HOUR / SECONDS_PER_MINUTE;

/**
 * Un dato no finito no se pinta como `NaN` en la cara del usuario: se trata como
 * cero, que es la única lectura que no afirma una cantidad que nadie midió. Es
 * el mismo criterio que `clampProgress` toma en `ProgressBar`.
 */
function safe(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function formatDecimal(value: number): string {
  return decimalFormatter.format(safe(value));
}

export function formatInteger(value: number): string {
  return integerFormatter.format(Math.round(safe(value)));
}

/** Segundos → horas. El puente de unidades sale de config, nunca de un literal. */
export function secondsToHours(seconds: number): number {
  return safe(seconds) / SECONDS_PER_HOUR;
}

/**
 * Duración legible a partir de **segundos**, que es la unidad en la que el
 * dominio guarda el tiempo (`craft_sessions.duration` y su cache
 * `Project.time`).
 *
 * Horas y minutos en vez de horas decimales: "0,3 h" no se lee como un rato de
 * tejido. Los segundos sueltos se descartan (se trunca hacia abajo): una sesión
 * de tejido no se mide en segundos y redondear hacia arriba haría que un
 * proyecto sin ninguna sesión mostrara "1 min".
 *
 * Un tiempo negativo —que la base no puede producir, pero un payload roto sí—
 * se trata como cero por el mismo motivo que un `NaN`.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(safe(seconds) / SECONDS_PER_MINUTE));
  const hours = Math.floor(total / MINUTES_PER_HOUR);
  const minutes = total % MINUTES_PER_HOUR;

  if (hours === 0) {
    return `${formatInteger(minutes)} min`;
  }
  if (minutes === 0) {
    return `${formatInteger(hours)} h`;
  }
  return `${formatInteger(hours)} h ${formatInteger(minutes)} min`;
}
