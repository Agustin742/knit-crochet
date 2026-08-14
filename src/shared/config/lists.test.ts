import { describe, expect, it } from "vitest";

import {
  COLOR_FAMILIES,
  COLOR_FAMILY_LABELS,
  NEEDLE_SIZES,
} from "@/shared/config";

/**
 * ANCLA DE CONTRATO de la enmienda E1(c) del RFC-03: las opciones de aguja son
 * una **lista fija**, no un dato derivado.
 *
 * El literal se escribe a mano **aquí y sólo aquí** —igual que las semillas de
 * las comparativas en `index.test.ts`— porque en este archivo el literal *es* el
 * contrato. `toEqual` sobre el array completo falla en las **dos direcciones**:
 * al añadir una medida y al quitarla. Un `toContain` no distinguiría.
 *
 * Que la lista sea fija es lo que evita la circularidad que E1(c) descarta:
 * derivar las medidas de los proyectos ya cargados haría que elegir 4 mm
 * redujera la lista y dejara 4 mm como única opción.
 */
describe("NEEDLE_SIZES (RFC-03 E1(c): lista fija de medidas en mm)", () => {
  it("has the exact fixed list, in order", () => {
    expect([...NEEDLE_SIZES]).toEqual([
      2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8, 9, 10, 12, 15, 20,
    ]);
  });

  it("is strictly ascending (the dropdown is read top to bottom)", () => {
    const sizes = [...NEEDLE_SIZES];
    const sorted = [...sizes].sort((a, b) => a - b);
    expect(sizes).toEqual(sorted);
    expect(new Set(sizes).size).toBe(sizes.length);
  });

  /** `?needle=` exige un número positivo: un 0 o un negativo serían un 400. */
  it("holds only positive measures, as the endpoint demands", () => {
    for (const size of NEEDLE_SIZES) {
      expect(size, `medida ${size}`).toBeGreaterThan(0);
    }
  });
});

/**
 * Las etiquetas **se derivan** del enum en vez de anclarse al literal: el enum ya
 * tiene su ancla en `enums.test.ts` y aquí lo que importa es que no quede
 * ninguna familia sin nombre visible ni ningún nombre huérfano. La comparación
 * de conjuntos falla en las dos direcciones.
 */
describe("COLOR_FAMILY_LABELS (etiqueta visible de cada familia)", () => {
  it("names every color family and nothing else", () => {
    expect(Object.keys(COLOR_FAMILY_LABELS).sort()).toEqual(
      [...COLOR_FAMILIES].sort(),
    );
  });

  it("has no empty label", () => {
    for (const family of COLOR_FAMILIES) {
      expect(COLOR_FAMILY_LABELS[family].trim(), family).not.toBe("");
    }
  });
});
