import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  type ComparisonReference,
  HOURS_REFERENCES,
  pickComparison,
  PROJECTS_REFERENCES,
  YARN_METERS_REFERENCES,
} from "@/features/dashboard/api/comparison";
import {
  HOURS_COMPARISONS,
  PROJECTS_COMPARISONS,
  SECONDS_PER_HOUR,
  YARN_COMPARISONS,
} from "@/shared/config";

/**
 * Regla 2b de `progress/current.md`: estos tests DERIVAN todo de las constantes
 * de `shared/config`. Ninguna etiqueta ni ningún número de referencia se escribe
 * a mano aquí — el ancla de la semilla vive (una sola vez) en
 * `src/shared/config/index.test.ts`. Así, "elige la mayor referencia que cabe"
 * sigue en verde sea cual sea la lista.
 */
function ascending(
  references: readonly ComparisonReference[],
): ComparisonReference[] {
  return [...references].sort((a, b) => a.value - b.value);
}

/** Falla el test (en vez de tipar `!`) si la semilla no da para el caso. */
function at(
  references: readonly ComparisonReference[],
  index: number,
): ComparisonReference {
  const reference = ascending(references)[index];
  if (!reference) {
    throw new Error(
      `La semilla necesita al menos ${index + 1} referencias para este caso.`,
    );
  }
  return reference;
}

const METRICS: ReadonlyArray<{
  metric: string;
  references: readonly ComparisonReference[];
}> = [
  { metric: "hours", references: HOURS_REFERENCES },
  { metric: "projects", references: PROJECTS_REFERENCES },
  { metric: "yarnMeters", references: YARN_METERS_REFERENCES },
];

describe.each(METRICS)(
  "pickComparison · $metric (PRD §8/§8.1 selection)",
  ({ references }) => {
    it("picks the largest reference that fits (times >= 1)", () => {
      const fits = at(references, 1);
      const next = at(references, 2);
      // Un valor estrictamente entre dos referencias: cabe la primera, no la segunda.
      const metric = (fits.value + next.value) / 2;

      const comparison = pickComparison(metric, references);

      expect(comparison.label).toBe(fits.label);
      expect(comparison.referenceValue).toBe(fits.value);
      expect(comparison.times).toBeCloseTo(metric / fits.value);
      expect(comparison.times).toBeGreaterThanOrEqual(1);
    });

    it("returns times = 1 on an exact fit", () => {
      const exact = at(references, 2);

      const comparison = pickComparison(exact.value, references);

      expect(comparison.label).toBe(exact.label);
      expect(comparison.referenceValue).toBe(exact.value);
      expect(comparison.times).toBeCloseTo(1);
    });

    it("falls back to the smallest reference when nothing fits", () => {
      const smallest = at(references, 0);
      const metric = smallest.value / 2;

      const comparison = pickComparison(metric, references);

      expect(comparison.label).toBe(smallest.label);
      expect(comparison.referenceValue).toBe(smallest.value);
      expect(comparison.times).toBeCloseTo(0.5);
      expect(comparison.times).toBeLessThan(1);
    });

    it("returns times = 0 against the smallest reference for a zero metric", () => {
      const smallest = at(references, 0);

      const comparison = pickComparison(0, references);

      expect(comparison.label).toBe(smallest.label);
      expect(comparison.referenceValue).toBe(smallest.value);
      expect(comparison.times).toBe(0);
    });

    it("does not depend on the order in which the list is written", () => {
      const exact = at(references, 1);
      const reversed = [...references].reverse();

      expect(pickComparison(exact.value, reversed)).toEqual(
        pickComparison(exact.value, references),
      );
    });
  },
);

describe("pickComparison · error path", () => {
  it("throws when the configured list is empty", () => {
    expect(() => pickComparison(10, [])).toThrow(/comparativas/i);
  });
});

/**
 * ⚠️ LA TRAMPA DE UNIDADES (PRD §8.1). `DashboardMetrics.hours` está en
 * SEGUNDOS (Σ `craft_sessions.duration`) y `HOURS_COMPARISONS` está en HORAS,
 * que es lo que lee quien edite la lista. Cruzarlas da un `times` equivocado por
 * un factor de 3600 **sin romper ningún tipo**: TypeScript no ve nada. Estos
 * tests están escritos para caer en rojo ante cualquiera de los dos cruces.
 */
describe("hours: metric in SECONDS vs reference list in HOURS", () => {
  const inHours = [...HOURS_COMPARISONS].sort((a, b) => a.hours - b.hours);
  const target = inHours[1];
  if (!target) {
    throw new Error("La semilla de horas necesita al menos 2 referencias.");
  }

  it("exposes the reference list already converted to seconds", () => {
    const expected = HOURS_COMPARISONS.map(
      (reference) => reference.hours * SECONDS_PER_HOUR,
    );

    expect(HOURS_REFERENCES.map((reference) => reference.value)).toEqual(
      expected,
    );
    // La otra mitad del contraste: en segundos NO es el número de la lista.
    expect(HOURS_REFERENCES.map((reference) => reference.value)).not.toEqual(
      HOURS_COMPARISONS.map((reference) => reference.hours),
    );
  });

  it("matches a seconds metric with its own reference in seconds", () => {
    const metricInSeconds = target.hours * SECONDS_PER_HOUR;

    const comparison = pickComparison(metricInSeconds, HOURS_REFERENCES);

    expect(comparison.label).toBe(target.label);
    // Si alguien convirtiera la MÉTRICA a horas en vez de la LISTA a segundos,
    // el label seguiría siendo éste pero `referenceValue` saldría en horas.
    expect(comparison.referenceValue).toBeCloseTo(
      target.hours * SECONDS_PER_HOUR,
    );
    expect(comparison.times).toBeCloseTo(1);
  });

  it("would pick a different reference if the units were crossed", () => {
    // Este test protege al de arriba: comprueba que la semilla ES capaz de
    // distinguir las dos unidades. Si algún día las dos convenciones dieran la
    // misma respuesta, el test anterior pasaría en falso y éste avisaría.
    const metricInSeconds = target.hours * SECONDS_PER_HOUR;
    const referencesInHours: ComparisonReference[] = HOURS_COMPARISONS.map(
      (reference) => ({ label: reference.label, value: reference.hours }),
    );

    const crossed = pickComparison(metricInSeconds, referencesInHours);

    expect(crossed.label).not.toBe(target.label);
    expect(crossed.times).toBeGreaterThan(1);
  });
});

/**
 * Aceptación #2: las listas viven en `shared/config`, **no** en el servicio.
 * Se mide sobre el fuente real: ninguna etiqueta ni ningún valor de referencia
 * puede aparecer escrito a mano en la capa de servicio, ni el puente de unidades
 * como número suelto.
 */
describe("the dashboard service holds no reference data of its own", () => {
  const SERVICE_FILES = ["./comparison.ts", "./metrics.ts"] as const;
  const SEED_LABELS = [
    ...HOURS_COMPARISONS.map((reference) => reference.label),
    ...PROJECTS_COMPARISONS.map((reference) => reference.label),
    ...YARN_COMPARISONS.map((reference) => reference.label),
  ];
  const SEED_VALUES = [
    ...HOURS_COMPARISONS.map((reference) => reference.hours),
    ...HOURS_COMPARISONS.map(
      (reference) => reference.hours * SECONDS_PER_HOUR,
    ),
    ...PROJECTS_COMPARISONS.map((reference) => reference.projects),
    ...YARN_COMPARISONS.map((reference) => reference.meters),
  ];

  function read(relative: string): string {
    return readFileSync(
      fileURLToPath(new URL(relative, import.meta.url)),
      "utf8",
    );
  }

  for (const relative of SERVICE_FILES) {
    const source = read(relative);

    it(`repeats no seed label in ${relative}`, () => {
      for (const label of SEED_LABELS) {
        expect(source.includes(label), `${label} found in ${relative}`).toBe(
          false,
        );
      }
    });

    it(`repeats no seed value in ${relative}`, () => {
      for (const value of SEED_VALUES) {
        const literal = new RegExp(
          `(?<![\\w.])${String(value).replace(".", "\\.")}(?![\\w.])`,
        );
        expect(literal.test(source), `${value} found in ${relative}`).toBe(
          false,
        );
      }
    });

    it(`spells the hour conversion by name, not as a bare number, in ${relative}`, () => {
      const bare = new RegExp(`(?<![\\w.])${SECONDS_PER_HOUR}(?![\\w.])`);
      expect(bare.test(source), `bare ${SECONDS_PER_HOUR} in ${relative}`).toBe(
        false,
      );
    });
  }
});
