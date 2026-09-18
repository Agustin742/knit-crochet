import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * La frontera de portabilidad (deuda 168), medida sobre el fuente: ningún
 * test de comportamiento puede demostrar que `Swatch` NO importa la
 * configuración de la app, sólo que no lo hizo en el caso probado. Misma
 * técnica que `FileInput.tsx`/`file-input.boundary.test.ts` (también deuda
 * 168), y vive en su propio archivo por el mismo motivo: en `happy-dom`,
 * `import.meta.url` no es una URL de archivo y `readFileSync` no la resuelve.
 */
const SOURCE = readFileSync(
  fileURLToPath(new URL("./Swatch.tsx", import.meta.url)),
  "utf8",
);

describe("Swatch — la frontera del design system (deuda 168)", () => {
  it("el fuente se leyó de verdad (seguro del propio gate)", () => {
    // Un archivo vacío daría cero infracciones, es decir verde falso.
    expect(SOURCE.length).toBeGreaterThan(200);
    expect(SOURCE).toContain("Swatch");
  });

  it("no importa nada de shared/config ni el tipo ColorFamily", () => {
    const configPath = ["shared", "config"].join("/");
    expect(SOURCE).not.toContain(configPath);
    expect(SOURCE).not.toContain("ColorFamily");
  });
});
