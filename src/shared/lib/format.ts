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

/** "5 de marzo de 2026". Ver `formatDate` para por qué la zona es UTC. */
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "long",
  timeZone: "UTC",
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

/**
 * Fecha larga a partir de la **cadena ISO** con la que las fechas cruzan la red
 * (`SerializedProject`: el Route Handler responde con `NextResponse.json` y
 * `JSON.stringify` invoca `Date.prototype.toJSON`).
 *
 * **Se formatea en UTC, y eso es lo importante.** `startDate`/`endDate` son
 * fechas de calendario —el día que se empezó a tejer—, no instantes: guardadas
 * como medianoche UTC y pintadas en la zona horaria de quien mira, cualquiera al
 * oeste de Greenwich vería **el día anterior**. Para Buenos Aires (UTC-3) eso es
 * el 100% de las fechas, no un caso raro.
 *
 * Devuelve `null` cuando la cadena no es una fecha, en vez de escupir "Invalid
 * Date" en la cara del usuario: **quien la pinta decide el texto de repuesto**,
 * porque el hueco de una fecha que falta no se lee igual en cada pantalla.
 */
export function formatDate(value: string): string | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : dateFormatter.format(parsed);
}

/**
 * Un **instante** legible: "5 de marzo de 2026, 19:30".
 *
 * **No lleva `timeZone`, y ahí está toda la diferencia con `formatDate`.** Las
 * fechas de un proyecto (`startDate`/`endDate`) son fechas de calendario —el día
 * que se empezó a tejer— y por eso se pintan en UTC. El arranque y el fin de una
 * sesión de cronómetro son lo contrario: **momentos**, y un momento hay que
 * leerlo en el reloj de quien mira. Pintar en UTC una sesión de las nueve de la
 * noche de Buenos Aires la mostraría a medianoche del día siguiente.
 *
 * La hora va en formato de 24 horas y no en el de 12 con "p. m." que trae la
 * variante regional por defecto: en una lista de sesiones lo que se compara de
 * un vistazo son las horas, y el sufijo las alarga sin aportar.
 *
 * Devuelve `null` cuando la cadena no es una fecha, por el mismo motivo que
 * `formatDate`: **quien la pinta decide el texto de repuesto**.
 */
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "long",
  timeStyle: "short",
  hourCycle: "h23",
});

export function formatDateTime(value: string): string | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : dateTimeFormatter.format(parsed);
}

/**
 * Cronómetro corriendo: "00:12" hasta la hora y "1:05:30" a partir de ella.
 *
 * **No reusa `formatDuration` y no es un descuido.** Esa función redondea hacia
 * abajo a minutos —"0 min" durante los primeros sesenta segundos—, que es lo
 * correcto para un tiempo acumulado y es exactamente lo que un cronómetro no
 * puede hacer: quien acaba de darle a empezar necesita ver que **algo se mueve**.
 * Aquí los segundos son el dato.
 *
 * Los dos puentes de unidades salen de `shared/config`, igual que en
 * `formatDuration`: no se escribe otro sesenta.
 *
 * Un valor negativo o no finito se trata como cero. No es defensa teórica: el
 * tiempo transcurrido se calcula contra el reloj **del navegador**, que puede ir
 * atrasado respecto al del servidor que selló el arranque, y "-00:03" en la cara
 * del usuario es peor que un cero.
 */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(safe(seconds)));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const rest = total % SECONDS_PER_MINUTE;
  const pad = (value: number) => String(value).padStart(2, "0");

  return hours === 0
    ? `${pad(minutes)}:${pad(rest)}`
    : `${String(hours)}:${pad(minutes)}:${pad(rest)}`;
}
