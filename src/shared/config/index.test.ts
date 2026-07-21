import { describe, expect, it } from "vitest";
import { z } from "zod";
import { APP_NAME } from "@/shared/config";

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
