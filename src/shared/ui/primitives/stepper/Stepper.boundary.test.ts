import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * La frontera de portabilidad (deuda 168), medida sobre el fuente, igual que
 * `Swatch.boundary.test.ts`: `Stepper` no sabe qué es una lana ni qué es
 * `usedQuantity`, sólo un `value` numérico con piso y techo opcionales.
 */
const SOURCE = readFileSync(
  fileURLToPath(new URL("./Stepper.tsx", import.meta.url)),
  "utf8",
);

describe("Stepper — la frontera del design system (deuda 168)", () => {
  it("el fuente se leyó de verdad (seguro del propio gate)", () => {
    expect(SOURCE.length).toBeGreaterThan(200);
    expect(SOURCE).toContain("Stepper");
  });

  it("no importa nada de shared/config", () => {
    const configPath = ["shared", "config"].join("/");
    expect(SOURCE).not.toContain(configPath);
  });

  it("no menciona lanas, usedQuantity ni ovillos", () => {
    expect(SOURCE.toLowerCase()).not.toContain("yarn");
    expect(SOURCE).not.toContain("usedQuantity");
    expect(SOURCE.toLowerCase()).not.toContain("ovillo");
  });
});
