import { describe, expect, it } from "vitest";

import * as feedback from "./feedback";
import * as primitives from "./primitives";
import * as ui from "./index";

/**
 * Superficie pública del design system.
 *
 * Es un ancla de contrato de la REGLA 2a: los nombres de abajo están escritos al
 * literal **a propósito**, porque aquí el literal ES el contrato. El template es
 * portable (SDD §2) y quien lo consuma importa por estos nombres; quitar uno o
 * renombrarlo rompe a sus consumidores en silencio, y añadir uno sin pensarlo
 * agranda la API sin que nadie lo note.
 *
 * `toEqual` sobre la lista ordenada, no `toContain`: falla en las DOS
 * direcciones, al añadir un export y al quitarlo (un `toContain` sólo ve lo que
 * falta, nunca lo que sobra).
 */
const PRIMITIVES = [
  "Button",
  "Card",
  "DIALOG_CLOSE_LABEL",
  "DIALOG_SIZES",
  "Dialog",
  "Field",
  "Input",
  "PROGRESS_MAX",
  "PROGRESS_MIN",
  "PROGRESS_TONES",
  "ProgressBar",
  "SKELETON_SHAPES",
  "Skeleton",
  "Toggle",
  "ToggleGroup",
  "buttonVariants",
  "cardVariants",
  "clampProgress",
  "inputClasses",
];

const FEEDBACK = [
  "ERROR_STATE_RETRY_LABEL",
  "EmptyState",
  "ErrorState",
  "STATE_PANEL_HEADING_LEVELS",
];

/** Piezas de #33 que las páginas #19-#30 van a importar. */
const NEW_IN_UI_PRIMITIVES_2 = [
  "Dialog",
  "EmptyState",
  "ErrorState",
  "ProgressBar",
  "Skeleton",
  "Toggle",
  "ToggleGroup",
];

function exportedNames(namespace: object): string[] {
  return Object.keys(namespace).sort();
}

describe("superficie pública de shared/ui", () => {
  it("los primitivos exportan exactamente su contrato", () => {
    expect(exportedNames(primitives)).toEqual([...PRIMITIVES].sort());
  });

  it("feedback exporta exactamente su contrato", () => {
    // `StatePanel` NO está: es la implementación compartida de los dos estados,
    // no una pieza del inventario del SDD §6.
    expect(exportedNames(feedback)).toEqual([...FEEDBACK].sort());
  });

  it("el barrel raíz reexporta todo lo de sus capas", () => {
    // Derivado, no copiado: si mañana una capa exporta algo nuevo y el barrel
    // raíz se olvida de reexportarlo, esto cae solo.
    const root = new Set(Object.keys(ui));
    for (const name of [
      ...Object.keys(primitives),
      ...Object.keys(feedback),
    ]) {
      expect(root.has(name), `el barrel raíz no reexporta ${name}`).toBe(true);
    }
  });

  it("las seis piezas de #33 llegan por el barrel raíz", () => {
    const root = new Set(Object.keys(ui));
    for (const name of NEW_IN_UI_PRIMITIVES_2) {
      expect(root.has(name), `${name} no se exporta desde @/shared/ui`).toBe(
        true,
      );
    }
  });
});
