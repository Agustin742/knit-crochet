import { beforeAll, describe, expect, it } from "vitest";

import { compileGlobalsCss, emitsRule } from "@/shared/ui/testing/class-names-from-source";

import { COLOR_FAMILIES } from "./index";
import { yarnSwatchClass } from "./yarn-swatch";

/**
 * Cobertura de CSS COMPILADO para `yarnSwatchClass` (deuda 168 / D4). El
 * barrido de `projects-ui.classes.test.ts` sólo sabe seguir una función del
 * MISMO archivo; ahora que el mapa vive en otro módulo lo trataría como
 * fuente externa y perdería cobertura en silencio. Este test itera las 13
 * familias de verdad y comprueba que cada clase emite una regla real.
 */
const COMPILE_TIMEOUT_MS = 120_000;

let css = "";

beforeAll(async () => {
  css = await compileGlobalsCss();
}, COMPILE_TIMEOUT_MS);

describe("yarnSwatchClass — el mapa de 13 familias emite CSS real", () => {
  it("ninguna familia queda sin su clase, y ninguna clase queda inerte", () => {
    const inert: string[] = [];

    for (const family of COLOR_FAMILIES) {
      const className = yarnSwatchClass(family);
      expect(className.length, family).toBeGreaterThan(0);
      if (!emitsRule(css, className)) {
        inert.push(`${family} → ${className}`);
      }
    }

    expect(inert, "estas familias no generan ninguna regla real").toEqual([]);
  });
});
