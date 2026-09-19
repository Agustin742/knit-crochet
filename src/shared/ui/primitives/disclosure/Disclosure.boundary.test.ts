import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * La frontera de portabilidad (design D5, deuda 142), medida sobre el fuente:
 * ningún test de comportamiento puede demostrar que `Disclosure` NO importa la
 * configuración de la app, sólo que no lo hizo en el caso probado. Misma
 * técnica que `Swatch.boundary.test.ts`/`file-input.boundary.test.ts` (también
 * deuda 168), y vive en su propio archivo por el mismo motivo: en `happy-dom`,
 * `import.meta.url` no es una URL de archivo y `readFileSync` no la resuelve.
 */
const SOURCE = readFileSync(
  fileURLToPath(new URL("./Disclosure.tsx", import.meta.url)),
  "utf8",
);

describe("Disclosure — la frontera del design system (design D5)", () => {
  it("el fuente se leyó de verdad (seguro del propio gate)", () => {
    // Un archivo vacío daría cero infracciones, es decir verde falso.
    expect(SOURCE.length).toBeGreaterThan(200);
    expect(SOURCE).toContain("Disclosure");
  });

  it("no importa nada de shared/config ni conoce ninguna entidad de la app", () => {
    const configPath = ["shared", "config"].join("/");
    const prohibidos = [configPath, "ColorFamily", "yarn", "brand", "Brand"];

    for (const prohibido of prohibidos) {
      expect(
        SOURCE.includes(prohibido),
        `Disclosure menciona "${prohibido}": es un desplegable genérico`,
      ).toBe(false);
    }
  });
});
