import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatDuration,
  formatInteger,
  secondsToHours,
} from "@/shared/lib/format";
import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/shared/config";

describe("formatDecimal", () => {
  /**
   * El separador decimal es COMA: es el idioma de la interfaz, y es lo que hace
   * falta para el "≈ 2,1 veces …" de la enmienda E1.4. Con punto, el mismo
   * número se lee como otro número distinto.
   */
  it("uses a comma as decimal separator and keeps one decimal", () => {
    expect(formatDecimal(2.1333)).toBe("2,1");
  });

  it("drops the decimal when it does not add anything", () => {
    expect(formatDecimal(2)).toBe("2");
  });

  it("rounds instead of truncating", () => {
    expect(formatDecimal(2.06)).toBe("2,1");
  });

  /** Un `NaN` en pantalla es peor que un cero: no dice nada y parece roto. */
  it("treats a non-finite value as zero", () => {
    expect(formatDecimal(Number.NaN)).toBe("0");
    expect(formatDecimal(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

describe("formatInteger", () => {
  it("rounds to a whole number", () => {
    expect(formatInteger(2.6)).toBe("3");
  });

  it("groups thousands the way the locale does", () => {
    // Agrupación con punto: es la del idioma, y viene de `Intl`, no de un
    // reemplazo a mano.
    expect(formatInteger(1234)).toBe("1.234");
  });
});

describe("secondsToHours", () => {
  /**
   * La métrica `hours` del dashboard viaja en SEGUNDOS (PRD §8.1). El par se
   * deriva de la constante de config, no de un 3600 escrito a mano: si el
   * puente cambiara, el test cambia con él en vez de quedarse mintiendo.
   */
  it("divides by the unit bridge from config", () => {
    expect(secondsToHours(SECONDS_PER_HOUR)).toBe(1);
    expect(secondsToHours(SECONDS_PER_HOUR * 2.5)).toBe(2.5);
  });

  it("treats a non-finite value as zero", () => {
    expect(secondsToHours(Number.NaN)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("shows only minutes below an hour", () => {
    expect(formatDuration(SECONDS_PER_MINUTE * 45)).toBe("45 min");
  });

  it("shows hours and minutes", () => {
    expect(formatDuration(SECONDS_PER_HOUR * 3 + SECONDS_PER_MINUTE * 20)).toBe(
      "3 h 20 min",
    );
  });

  it("drops the minutes when they are zero", () => {
    expect(formatDuration(SECONDS_PER_HOUR * 3)).toBe("3 h");
  });

  /**
   * Se trunca hacia abajo: redondear hacia arriba haría que un proyecto sin
   * ninguna sesión cerrada mostrara "1 min" y afirmara un trabajo que no existe.
   */
  it("truncates the leftover seconds instead of rounding them up", () => {
    expect(formatDuration(59)).toBe("0 min");
    expect(formatDuration(SECONDS_PER_MINUTE + 59)).toBe("1 min");
  });

  it("treats broken or negative input as zero", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(-90)).toBe("0 min");
    expect(formatDuration(Number.NaN)).toBe("0 min");
  });
});

describe("formatDate", () => {
  /**
   * **El año se DERIVA, nunca se escribe a mano** (deuda 164): un fixture con el
   * año en duro empieza a mentir el 1 de enero y el test sigue verde mientras
   * tanto. Lo que se afirma acá es el formato, no qué año es hoy.
   */
  const YEAR = new Date().getUTCFullYear();

  it("writes the date in Spanish, long form", () => {
    expect(formatDate(`${String(YEAR)}-03-05T00:00:00.000Z`)).toBe(
      `5 de marzo de ${String(YEAR)}`,
    );
  });

  /**
   * La trampa que hace obligatorio el UTC: medianoche del día 1 pintada en
   * cualquier zona al oeste de Greenwich es el día ANTERIOR. Sin fijar la zona,
   * este mismo caso da "31 de diciembre" en Buenos Aires y "1 de enero" en
   * Madrid, para el mismo dato.
   */
  it("keeps the calendar day regardless of the reader's time zone", () => {
    expect(formatDate(`${String(YEAR)}-01-01T00:00:00.000Z`)).toBe(
      `1 de enero de ${String(YEAR)}`,
    );
  });

  /** Una fecha rota es `null`: quien la pinta decide el texto de repuesto. */
  it("returns null when the value is not a date", () => {
    expect(formatDate("no soy una fecha")).toBeNull();
    expect(formatDate("")).toBeNull();
  });
});

describe("formatClock (el cronómetro corriendo)", () => {
  /**
   * **Los segundos son el dato.** `formatDuration` redondea hacia abajo a
   * minutos —"0 min" durante el primer minuto entero—, que es correcto para un
   * tiempo acumulado y sería un cronómetro parado a la vista de quien acaba de
   * darle a empezar.
   */
  it("enseña los segundos desde el primero", () => {
    expect(formatClock(7)).toBe("00:07");
    expect(formatDuration(7)).toBe("0 min");
  });

  it("rellena minutos y segundos a dos cifras", () => {
    expect(formatClock(SECONDS_PER_MINUTE * 9 + 5)).toBe("09:05");
  });

  /** Hasta la hora no se pinta el hueco de las horas: ocuparía sitio sin decir nada. */
  it("añade las horas sólo cuando las hay", () => {
    expect(formatClock(SECONDS_PER_MINUTE * 59 + 59)).toBe("59:59");
    expect(formatClock(SECONDS_PER_HOUR)).toBe("1:00:00");
    expect(formatClock(SECONDS_PER_HOUR + SECONDS_PER_MINUTE * 5 + 30)).toBe(
      "1:05:30",
    );
  });

  /**
   * El transcurrido se calcula contra el reloj **del navegador**, que puede ir
   * por detrás del servidor que selló el arranque: un "-00:03" en la cara del
   * usuario es peor que un cero.
   */
  it("un valor negativo o roto se lee como cero, no como un signo menos", () => {
    expect(formatClock(-30)).toBe("00:00");
    expect(formatClock(Number.NaN)).toBe("00:00");
  });
});

describe("formatDateTime (cuándo fue una sesión)", () => {
  /**
   * **El año se DERIVA del reloj y el instante se construye en hora local**
   * (deuda 164): un año escrito a mano empieza a mentir el 1 de enero, y un ISO
   * en UTC daría una hora distinta en cada zona en la que corra la suite.
   */
  const moment = new Date(new Date().getFullYear() - 1, 2, 5, 19, 30);
  const year = String(moment.getFullYear());

  /**
   * **Sin `timeZone` fijo, al revés que `formatDate`.** Las fechas de un
   * proyecto son de calendario y se pintan en UTC; el arranque de una sesión es
   * un **momento**, y un momento se lee en el reloj de quien mira.
   */
  it("dice el día y la hora del reloj de quien mira", () => {
    expect(formatDateTime(moment.toISOString())).toBe(
      `5 de marzo de ${year}, 19:30`,
    );
  });

  /** Reloj de 24 horas: en una lista de sesiones lo que se compara son las horas. */
  it("usa las 24 horas y rellena la hora a dos cifras", () => {
    const morning = new Date(moment.getFullYear(), 2, 5, 9, 5);

    expect(formatDateTime(morning.toISOString())).toBe(
      `5 de marzo de ${year}, 09:05`,
    );
  });

  /** El texto de repuesto lo elige quien la pinta, igual que en `formatDate`. */
  it("devuelve null si la cadena no es una fecha", () => {
    expect(formatDateTime("cuando termine la bufanda")).toBeNull();
  });
});
