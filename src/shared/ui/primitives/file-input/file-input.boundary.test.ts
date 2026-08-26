import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * **La frontera de E6 (c) / deuda 168, medida sobre el fuente.**
 *
 * Elegir un archivo es genérico y sube al design system; hablar con el endpoint
 * de subida depende de la configuración de la app y **no sube**, o el template
 * deja de ser portable (SDD §2). La subida vive en `features/projects/ui/`.
 *
 * **Por qué se lee el archivo en vez de probar comportamiento.** Ningún test de
 * comportamiento puede demostrar que un componente NO habla con el backend: sólo
 * puede demostrar que no lo hizo en el caso que se probó. La ausencia se mide
 * sobre el texto o no se mide.
 *
 * **Y por qué vive en su propio archivo, en el entorno de Node.** El test de
 * comportamiento corre en `happy-dom`, donde `import.meta.url` no es una URL de
 * archivo y `readFileSync` no puede resolverla (medido: "The URL must be of
 * scheme file"). Separarlo cuesta un archivo; meterlo a la fuerza costaría una
 * ruta armada a mano que se rompe al mover la carpeta.
 */
const SOURCE = readFileSync(
  fileURLToPath(new URL("./FileInput.tsx", import.meta.url)),
  "utf8",
);

/** Armadas en runtime por costumbre de la casa: Tailwind escanea también los tests. */
const PROHIBIDOS = [
  "fetch",
  "XMLHttpRequest",
  ["Form", "Data"].join(""),
  ["/", "api", "/"].join(""),
  "cloudinary",
  "upload",
];

describe("FileInput — la frontera del design system", () => {
  it("el fuente se leyó de verdad (seguro del propio gate)", () => {
    // Un archivo vacío daría cero infracciones, es decir verde falso.
    expect(SOURCE.length).toBeGreaterThan(500);
    expect(SOURCE).toContain("FileInput");
  });

  it("no sabe nada de subidas ni de ningún endpoint", () => {
    const texto = SOURCE.toLowerCase();
    for (const prohibido of PROHIBIDOS) {
      expect(
        texto.includes(prohibido.toLowerCase()),
        `FileInput menciona ${prohibido}: la subida vive en la feature`,
      ).toBe(false);
    }
  });
});
