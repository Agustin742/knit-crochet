import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guardrail token-first (SDD §9 / RFC-01 §3): ningún primitivo hardcodea
 * color, tamaño, radio, borde ni sombra. Todo valor visual referencia un token
 * (`var(--…)` o utilidad Tailwind respaldada por `@theme`). Los VALORES viven
 * sólo en `globals.css`; los componentes nunca los repiten.
 */
const COMPONENT_FILES = [
  "./button/Button.tsx",
  "./button/button.variants.ts",
  "./card/Card.tsx",
  "./card/card.variants.ts",
  "./field/Field.tsx",
  "./field/Input.tsx",
  "../layout/app-shell/AppShell.tsx",
  "../layout/archive-nav/ArchiveNav.tsx",
  "../layout/archive-nav/archive-nav.variants.ts",
  "../layout/bottom-nav/BottomNav.tsx",
  "../layout/bottom-nav/bottom-nav.variants.ts",
];

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_COLOR = /\brgba?\(/;
const PX_LITERAL = /\b\d+(?:\.\d+)?px\b/;

describe("primitives are token-first (no hardcoded values)", () => {
  for (const relative of COMPONENT_FILES) {
    const absolute = fileURLToPath(new URL(relative, import.meta.url));
    const source = readFileSync(absolute, "utf8");

    it(`has no raw hex/rgb colors in ${relative}`, () => {
      expect(HEX_COLOR.test(source), `hex color found in ${relative}`).toBe(
        false,
      );
      expect(RGB_COLOR.test(source), `rgb()/rgba() found in ${relative}`).toBe(
        false,
      );
    });

    it(`has no raw px sizes in ${relative}`, () => {
      expect(PX_LITERAL.test(source), `raw px value found in ${relative}`).toBe(
        false,
      );
    });
  }
});
