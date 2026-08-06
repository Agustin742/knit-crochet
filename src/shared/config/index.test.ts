import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  APP_NAME,
  HOURS_COMPARISONS,
  PROJECTS_COMPARISONS,
  SECONDS_PER_HOUR,
  YARN_COMPARISONS,
} from "@/shared/config";

describe("smoke", () => {
  it("exposes the app name constant", () => {
    expect(APP_NAME).toBe("Knit&Crochet");
  });

  it("has zod available and working for validation", () => {
    const schema = z.object({ name: z.string().min(1) });
    const parsed = schema.parse({ name: APP_NAME });
    expect(parsed.name).toBe(APP_NAME);
    expect(schema.safeParse({ name: "" }).success).toBe(false);
  });
});

/**
 * Anclas de semilla (regla 2a de `progress/current.md`): éste es el ÚNICO sitio
 * donde los números se escriben a mano, porque aquí el literal **es** el
 * contrato (PRD §8 y §8.1). El resto de los tests derivan de las constantes.
 *
 * `toEqual` sobre el mapa `label → valor` falla en las DOS direcciones (al
 * añadir una referencia y al quitarla), a diferencia de un `toContain`. La
 * comprobación de longitud cubre el hueco que deja el mapa: una etiqueta
 * duplicada con el mismo valor.
 */
describe("YARN_COMPARISONS (PRD §8 seed)", () => {
  const SEED: Record<string, number> = {
    "Un colectivo": 12,
    "El Obelisco": 67.5,
    "Un campo de fútbol": 105,
    "La Torre Eiffel": 330,
    "El Everest": 8849,
  };

  it("contains the fixed seed with the exact meters", () => {
    const byLabel = Object.fromEntries(
      YARN_COMPARISONS.map((ref) => [ref.label, ref.meters]),
    );
    expect(byLabel).toEqual(SEED);
    expect(YARN_COMPARISONS).toHaveLength(Object.keys(SEED).length);
  });

  it("is ordered ascending by meters (invariant for the selection algorithm)", () => {
    const meters = YARN_COMPARISONS.map((ref) => ref.meters);
    const sorted = [...meters].sort((a, b) => a - b);
    expect(meters).toEqual(sorted);
  });
});

describe("HOURS_COMPARISONS (PRD §8.1 seed, expressed in HOURS)", () => {
  const SEED: Record<string, number> = {
    "Un partido de fútbol": 1.5,
    "Un vuelo a Bariloche": 2.3,
    "El Señor de los Anillos (extendida)": 11.4,
    "Un vuelo a Madrid": 12.5,
    "Una semana laboral": 45,
    "Un mes de trabajo": 180,
  };

  it("contains the fixed seed with the exact hours", () => {
    const byLabel = Object.fromEntries(
      HOURS_COMPARISONS.map((ref) => [ref.label, ref.hours]),
    );
    expect(byLabel).toEqual(SEED);
    expect(HOURS_COMPARISONS).toHaveLength(Object.keys(SEED).length);
  });

  it("is ordered ascending by hours (invariant for the selection algorithm)", () => {
    const hours = HOURS_COMPARISONS.map((ref) => ref.hours);
    const sorted = [...hours].sort((a, b) => a - b);
    expect(hours).toEqual(sorted);
  });
});

describe("PROJECTS_COMPARISONS (PRD §8.1 seed, expressed in projects)", () => {
  const SEED: Record<string, number> = {
    "Un par": 2,
    "Un equipo de fútbol": 11,
    "Una docena": 12,
    "Un aula": 30,
    "Un colectivo lleno": 60,
  };

  it("contains the fixed seed with the exact counts", () => {
    const byLabel = Object.fromEntries(
      PROJECTS_COMPARISONS.map((ref) => [ref.label, ref.projects]),
    );
    expect(byLabel).toEqual(SEED);
    expect(PROJECTS_COMPARISONS).toHaveLength(Object.keys(SEED).length);
  });

  it("is ordered ascending by count (invariant for the selection algorithm)", () => {
    const counts = PROJECTS_COMPARISONS.map((ref) => ref.projects);
    const sorted = [...counts].sort((a, b) => a - b);
    expect(counts).toEqual(sorted);
  });

  it("holds whole projects: half a project is not a thing", () => {
    for (const ref of PROJECTS_COMPARISONS) {
      expect(Number.isInteger(ref.projects), ref.label).toBe(true);
    }
  });
});

describe("SECONDS_PER_HOUR (unit bridge, PRD §8.1)", () => {
  it("is the real number of seconds in an hour", () => {
    expect(SECONDS_PER_HOUR).toBe(60 * 60);
  });
});
