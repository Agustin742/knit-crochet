import { describe, expect, it } from "vitest";

import { InvalidCalculatorInputError } from "@/features/calculators/errors";
import { calculateRuleOfThree } from "@/features/calculators/rule-of-three";

describe("calculateRuleOfThree", () => {
  it("calcula skeinsB = ceil(skeinsA × lengthB / lengthA) exacto", () => {
    // 10 × 100 / 100 = 10 (entero exacto)
    expect(
      calculateRuleOfThree({ skeinsA: 10, lengthA: 100, lengthB: 100 }),
    ).toBe(10);
  });

  it("redondea hacia arriba cuando el resultado no es entero", () => {
    // 5 × 100 / 120 = 4.166… → ceil → 5
    expect(
      calculateRuleOfThree({ skeinsA: 5, lengthA: 120, lengthB: 100 }),
    ).toBe(5);
    // 3 × 250 / 200 = 3.75 → ceil → 4
    expect(
      calculateRuleOfThree({ skeinsA: 3, lengthA: 200, lengthB: 250 }),
    ).toBe(4);
  });

  it("admite metrajes no enteros y redondea hacia arriba", () => {
    // 4 × 250.5 / 200 = 5.01 → ceil → 6
    expect(
      calculateRuleOfThree({ skeinsA: 4, lengthA: 200, lengthB: 250.5 }),
    ).toBe(6);
  });

  it("lanza InvalidCalculatorInputError si lengthA <= 0 (división por cero)", () => {
    expect(() =>
      calculateRuleOfThree({ skeinsA: 5, lengthA: 0, lengthB: 100 }),
    ).toThrow(InvalidCalculatorInputError);
    expect(() =>
      calculateRuleOfThree({ skeinsA: 5, lengthA: -100, lengthB: 100 }),
    ).toThrow(InvalidCalculatorInputError);
  });

  it("lanza InvalidCalculatorInputError si lengthB <= 0", () => {
    expect(() =>
      calculateRuleOfThree({ skeinsA: 5, lengthA: 100, lengthB: 0 }),
    ).toThrow(InvalidCalculatorInputError);
  });

  it("lanza InvalidCalculatorInputError si skeinsA <= 0 o no es entero", () => {
    expect(() =>
      calculateRuleOfThree({ skeinsA: 0, lengthA: 100, lengthB: 100 }),
    ).toThrow(InvalidCalculatorInputError);
    expect(() =>
      calculateRuleOfThree({ skeinsA: -2, lengthA: 100, lengthB: 100 }),
    ).toThrow(InvalidCalculatorInputError);
    expect(() =>
      calculateRuleOfThree({ skeinsA: 2.5, lengthA: 100, lengthB: 100 }),
    ).toThrow(InvalidCalculatorInputError);
  });
});
