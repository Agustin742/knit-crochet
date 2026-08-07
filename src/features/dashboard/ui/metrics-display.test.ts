import { describe, expect, it } from "vitest";

import type { Comparison, DashboardMetrics } from "@/features/dashboard/types";
import { SECONDS_PER_HOUR } from "@/shared/config";

import {
  METRIC_KEYS,
  formatComparison,
  formatMetricValue,
  isLifetimeMetric,
} from "./metrics-display";

function comparison(patch: Partial<Comparison> = {}): Comparison {
  return { label: "El Obelisco", referenceValue: 67.5, times: 2, ...patch };
}

function metrics(patch: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    hours: 0,
    projects: 0,
    yarnMeters: 0,
    comparison: {
      hours: comparison(),
      projects: comparison(),
      yarnMeters: comparison(),
    },
    ...patch,
  };
}

describe("formatMetricValue", () => {
  /**
   * La trampa de unidades del contrato: `hours` viaja en SEGUNDOS. El par se
   * DERIVA de `SECONDS_PER_HOUR`, no de un 3600 escrito a mano, para que el test
   * siga midiendo la conversión y no el número.
   */
  it("converts the hours metric from seconds", () => {
    expect(formatMetricValue("hours", metrics({ hours: SECONDS_PER_HOUR * 12.5 }))).toBe(
      "12,5",
    );
  });

  it("does not treat the raw seconds as hours", () => {
    const seconds = SECONDS_PER_HOUR * 3;
    expect(formatMetricValue("hours", metrics({ hours: seconds }))).not.toBe(
      String(seconds),
    );
  });

  it("shows projects as a whole count", () => {
    expect(formatMetricValue("projects", metrics({ projects: 7 }))).toBe("7");
  });

  it("shows yarn meters with at most one decimal", () => {
    expect(formatMetricValue("yarnMeters", metrics({ yarnMeters: 1350.44 }))).toBe(
      "1.350,4",
    );
  });
});

describe("isLifetimeMetric (enmienda E1.5)", () => {
  it("marks yarn meters, and only yarn meters, as lifetime", () => {
    const lifetime = METRIC_KEYS.filter(isLifetimeMetric);
    expect(lifetime).toEqual(["yarnMeters"]);
  });
});

describe("formatComparison (enmienda E1.4)", () => {
  it("reads as '≈ N veces <etiqueta>'", () => {
    expect(formatComparison(comparison({ times: 2.1333 }))).toBe(
      "≈ 2,1 veces El Obelisco",
    );
  });

  /**
   * La etiqueta se pinta ENTERA y sin tocar: las de config son frases con
   * artículo, y pluralizarlas fue descartado en la enmienda.
   */
  it("never rewrites the label", () => {
    const label = "El Señor de los Anillos (extendida)";
    expect(formatComparison(comparison({ label, times: 3 }))).toContain(label);
  });

  it("agrees the word with the number that is actually printed", () => {
    // 1.04 se pinta como "1": "1 veces" sería el texto roto que E1.4 evita.
    expect(formatComparison(comparison({ times: 1.04 }))).toBe(
      "≈ 1 vez El Obelisco",
    );
    expect(formatComparison(comparison({ times: 2 }))).toBe(
      "≈ 2 veces El Obelisco",
    );
  });

  it("uses a sentence of its own when the metric does not reach the reference", () => {
    expect(formatComparison(comparison({ times: 0.4 }))).toBe(
      "Todavía no llegás a El Obelisco",
    );
  });

  /** `times === 0` es exactamente "la métrica vale 0": no se pinta comparativa. */
  it("paints nothing at all when the metric is zero", () => {
    expect(formatComparison(comparison({ times: 0 }))).toBeNull();
  });

  it("paints nothing for a broken quotient", () => {
    expect(formatComparison(comparison({ times: Number.NaN }))).toBeNull();
    expect(formatComparison(comparison({ times: -1 }))).toBeNull();
  });
});
