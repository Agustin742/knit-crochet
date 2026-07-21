import { describe, expect, it } from "vitest";
import {
  ACTIVE_PROJECT_STATUSES,
  COLOR_FAMILIES,
  CRAFT_TYPES,
  PROJECT_STATUSES,
} from "@/shared/config";

describe("shared/config enums (PRD §4)", () => {
  it("CraftType has the exact values", () => {
    expect([...CRAFT_TYPES]).toEqual(["knitting", "crochet"]);
  });

  it("ProjectStatus has the exact values", () => {
    expect([...PROJECT_STATUSES]).toEqual([
      "in_progress",
      "paused",
      "finished",
      "abandoned",
    ]);
  });

  it("active statuses are the subset in_progress/paused", () => {
    expect([...ACTIVE_PROJECT_STATUSES]).toEqual(["in_progress", "paused"]);
    for (const status of ACTIVE_PROJECT_STATUSES) {
      expect(PROJECT_STATUSES).toContain(status);
    }
  });

  it("ColorFamily has the exact 13 values in order", () => {
    expect([...COLOR_FAMILIES]).toEqual([
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "violet",
      "pink",
      "brown",
      "gray",
      "black",
      "white",
      "neutral",
      "multicolor",
    ]);
  });
});
