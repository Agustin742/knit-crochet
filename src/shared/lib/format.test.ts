import { describe, expect, it } from "vitest";

import {
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
