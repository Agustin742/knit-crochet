import { describe, expect, it } from "vitest";
import { z } from "zod";
import { APP_NAME, YARN_COMPARISONS } from "@/shared/config";

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

describe("YARN_COMPARISONS (PRD §8 seed)", () => {
  it("contains the fixed seed with the exact meters", () => {
    const byLabel = Object.fromEntries(
      YARN_COMPARISONS.map((ref) => [ref.label, ref.meters]),
    );
    expect(byLabel).toEqual({
      "Un colectivo": 12,
      "El Obelisco": 67.5,
      "Un campo de fútbol": 105,
      "La Torre Eiffel": 330,
      "El Everest": 8849,
    });
  });

  it("is ordered ascending by meters (invariant for the selection algorithm)", () => {
    const meters = YARN_COMPARISONS.map((ref) => ref.meters);
    const sorted = [...meters].sort((a, b) => a - b);
    expect(meters).toEqual(sorted);
  });
});
