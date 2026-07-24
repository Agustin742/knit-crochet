import { describe, expect, it } from "vitest";

import { InvalidCalculatorInputError } from "@/features/calculators/errors";
import { calculateIncreases } from "@/features/calculators/increases";

describe("calculateIncreases", () => {
  it("resuelve el caso canónico del PRD §7 (P=40, A=6) con el string exacto", () => {
    expect(
      calculateIncreases({ currentStitches: 40, stitchesToAdd: 6 }),
    ).toBe(
      "Teje 7 p, aumenta 1 (×4); luego teje 6 p, aumenta 1 (×2). Total: 46 p.",
    );
  });

  it("usa el símbolo × (U+00D7), no la letra x", () => {
    const result = calculateIncreases({ currentStitches: 40, stitchesToAdd: 6 });
    expect(result).toContain("×");
    expect(result).not.toContain("(x");
  });

  it("remainder=0 (P múltiplo de A): un solo tramo, sin (base+1) ni (×0)", () => {
    // P=42, A=6 → base=7, remainder=0, total=48
    const result = calculateIncreases({ currentStitches: 42, stitchesToAdd: 6 });
    expect(result).toBe("Teje 7 p, aumenta 1 (×6). Total: 48 p.");
    expect(result).not.toContain("×0");
    expect(result).not.toContain("luego");
  });

  it("P < A (base=0): fraseo sin 'teje 0 p', aumentos consecutivos", () => {
    // P=4, A=6 → base=0, remainder=4, total=10
    const result = calculateIncreases({ currentStitches: 4, stitchesToAdd: 6 });
    expect(result).toBe(
      "Teje 1 p, aumenta 1 (×4); luego aumenta 1 (×2). Total: 10 p.",
    );
    expect(result).not.toContain("teje 0 p");
  });

  it("mantiene '(×1)' cuando remainder=1 (no lo pluraliza ni lo elide)", () => {
    // P=7, A=6 → base=1, remainder=1, total=13
    expect(
      calculateIncreases({ currentStitches: 7, stitchesToAdd: 6 }),
    ).toBe(
      "Teje 2 p, aumenta 1 (×1); luego teje 1 p, aumenta 1 (×5). Total: 13 p.",
    );
  });

  it("mantiene '(×1)' cuando A-remainder=1", () => {
    // P=41, A=6 → base=6, remainder=5, total=47
    expect(
      calculateIncreases({ currentStitches: 41, stitchesToAdd: 6 }),
    ).toBe(
      "Teje 7 p, aumenta 1 (×5); luego teje 6 p, aumenta 1 (×1). Total: 47 p.",
    );
  });

  it("lanza InvalidCalculatorInputError si A <= 0", () => {
    expect(() =>
      calculateIncreases({ currentStitches: 40, stitchesToAdd: 0 }),
    ).toThrow(InvalidCalculatorInputError);
    expect(() =>
      calculateIncreases({ currentStitches: 40, stitchesToAdd: -3 }),
    ).toThrow(InvalidCalculatorInputError);
  });

  it("lanza InvalidCalculatorInputError si P <= 0", () => {
    expect(() =>
      calculateIncreases({ currentStitches: 0, stitchesToAdd: 6 }),
    ).toThrow(InvalidCalculatorInputError);
    expect(() =>
      calculateIncreases({ currentStitches: -10, stitchesToAdd: 6 }),
    ).toThrow(InvalidCalculatorInputError);
  });

  it("lanza InvalidCalculatorInputError si P o A no son enteros", () => {
    expect(() =>
      calculateIncreases({ currentStitches: 40.5, stitchesToAdd: 6 }),
    ).toThrow(InvalidCalculatorInputError);
    expect(() =>
      calculateIncreases({ currentStitches: 40, stitchesToAdd: 2.5 }),
    ).toThrow(InvalidCalculatorInputError);
  });
});
