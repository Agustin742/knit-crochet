import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guardrail token-first (SDD §9 / RFC-01 §3): ningún primitivo hardcodea
 * color, tamaño, radio, borde ni sombra. Todo valor visual referencia un token
 * (`var(--…)` o utilidad Tailwind respaldada por `@theme`). Los VALORES viven
 * sólo en `globals.css`; los componentes nunca los repiten.
 *
 * Excepción explícita: en `three/ascii-yarn/` los números de geometría, luces y
 * cámara son unidades de mundo 3D portadas de `template/ascii-yarn.js`, no CSS.
 * Lo que sí se exige ahí es que el color visible y el tamaño de fuente del ASCII
 * salgan de tokens (`text-accent` → `currentColor`, `text-xs`, `--shadow-glow`).
 */
const COMPONENT_FILES = [
  "./button/Button.tsx",
  "./button/button.variants.ts",
  "./card/Card.tsx",
  "./card/card.variants.ts",
  "./field/Field.tsx",
  "./field/Input.tsx",
  "../layout/account-band/AccountBand.tsx",
  "../layout/account-band/account-band.variants.ts",
  "../layout/app-shell/AppShell.tsx",
  "../layout/archive-nav/ArchiveNav.tsx",
  "../layout/archive-nav/archive-nav.variants.ts",
  "../layout/bottom-nav/BottomNav.tsx",
  "../layout/bottom-nav/bottom-nav.variants.ts",
  "../three/ascii-yarn/AsciiYarn.tsx",
  "../three/ascii-yarn/AsciiYarnScene.tsx",
  "../three/ascii-yarn/asciiFromPixels.ts",
  "../three/ascii-yarn/createYarnScene.ts",
  "../three/ascii-yarn/useViewportSupports3d.ts",
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
