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
  "CONFIRM_DIALOG_CANCEL_LABEL",
  "CONFIRM_DIALOG_CONFIRM_LABEL",
  // Enmienda E6(d) del RFC-03: la confirmación de un borrado. Se construye sobre
  // `Dialog` y su ancla se paga igual que la del segmentado y la de las
  // pestañas: esconder la pieza en `features/` para no tocar esta lista es justo
  // el antipatrón que la regla "el template es un SUELO" prohíbe.
  "CONFIRM_DIALOG_TONES",
  "Card",
  "ConfirmDialog",
  "DIALOG_CLOSE_LABEL",
  // Enmienda E3(b) del RFC-03: el cajón lateral es una COLOCACIÓN del diálogo,
  // no un componente nuevo. Sus nombres públicos se anclan igual que los tamaños.
  "DIALOG_PLACEMENTS",
  "DIALOG_SIZES",
  "Dialog",
  // Design D5 de #23 (deuda 142): el envoltorio de `<details>`/`<summary>`
  // nativos que la marca→tipo del filtro de lanas necesita repetir una vez
  // por marca. Confirmado sobre un `role="tree"` a mano — la tabulación
  // rotativa de un treeview APG saca los controles de tipo de la secuencia de
  // tabulación, que es peor acceso por teclado, no mejor.
  "DISCLOSURE_SIZES",
  "Disclosure",
  // Enmienda E6(c) del RFC-03: elegir un archivo es genérico y sube al design
  // system; SUBIRLO depende de la configuración de la app y se queda en la
  // feature (frontera de la deuda 168).
  "FILE_INPUT_BUTTON_LABEL",
  "FILE_INPUT_EMPTY_LABEL",
  "Field",
  "FileInput",
  "Input",
  "PROGRESS_MAX",
  "PROGRESS_MIN",
  "PROGRESS_TONES",
  "ProgressBar",
  "SKELETON_SHAPES",
  // Enmienda E2(c) del RFC-03: el segmentado excluyente. El ancla se paga a
  // propósito — esconder la pieza en `features/` para no tocar esta lista es
  // justo el antipatrón que la regla "el template es un SUELO" prohíbe.
  "SegmentedControl",
  // Deuda 168 saldada (S2 `swatch-split` de #23): la muestra de color genérica
  // que RFC-04 va a necesitar. Su mapa app-side (`yarnSwatchClass`) queda en
  // `shared/config`, así que el ancla se paga sólo por el primitivo — igual
  // que el resto de las piezas de esta lista.
  "SWATCH_SIZES",
  "Swatch",
  // Enmienda E6(b) del RFC-03: los dos controles de formulario que faltaban.
  // Son design system puro —no dependen de ninguna configuración de la app— y
  // componen con `Field` igual que `Input`. Sus listas de clases NO se exportan:
  // `inputClasses` existe porque antes había que pintar controles a mano, y
  // publicar `selectClasses`/`textareaClasses` invitaría justo al `<select>`
  // escrito a mano que estos primitivos vienen a sustituir.
  "Select",
  "Skeleton",
  // RFC-04 §7-bis E2(a) (backlog 24, slice S1): el incrementador/decrementador
  // genérico que el cajón de detalle de lanas necesita para `usedQuantity`.
  // Controlado, sin piso ni techo propios — eso lo decide quien lo consume.
  "STEPPER_DECREMENT_LABEL",
  "STEPPER_INCREMENT_LABEL",
  "STEPPER_SIZES",
  "Stepper",
  // Enmienda E3(c) del RFC-03: las pestañas del drawer de detalle. Mismo trato
  // que `SegmentedControl` — es un control genérico (RFC-04 y RFC-05 también
  // piden pestañas), así que vive en el design system y su ancla se paga.
  "Tabs",
  "Textarea",
  "Toggle",
  "ToggleGroup",
  "buttonVariants",
  "cardVariants",
  "clampProgress",
  "disclosureVariants",
  "inputClasses",
  "stepperVariants",
  "swatchVariants",
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

/**
 * Las cuatro piezas que la enmienda **E6** de RFC-03 mandó crear para el
 * formulario de proyectos (#22, tanda 1). Se comprueba que llegan **por el
 * barrel raíz**, que es por donde las va a importar la tanda 2: un primitivo que
 * existe pero no se reexporta es un primitivo que nadie puede usar.
 */
const NEW_IN_PROJECTS_FORM = [
  "ConfirmDialog",
  "FileInput",
  "Select",
  "Textarea",
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

  it("los cuatro controles de #22 llegan por el barrel raíz", () => {
    const root = new Set(Object.keys(ui));
    for (const name of NEW_IN_PROJECTS_FORM) {
      expect(root.has(name), `${name} no se exporta desde @/shared/ui`).toBe(
        true,
      );
    }
  });
});
