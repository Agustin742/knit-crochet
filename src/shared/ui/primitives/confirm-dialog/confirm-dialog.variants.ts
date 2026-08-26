import { cva } from "class-variance-authority";

/**
 * Tono de la confirmación (enmienda **E6 (d)** del RFC-03).
 *
 * **El defecto es `danger`, y es deliberado.** Este primitivo nace para el
 * borrado: si el defecto fuese el neutro, el caso peligroso sería el que hay que
 * acordarse de pedir, y olvidarse saldría **silencioso y bonito**. Al revés, un
 * olvido pinta de rojo una confirmación inocua, que es un error visible y
 * barato. Quien confirma algo que no destruye nada pasa `tone="default"`.
 */
export const CONFIRM_DIALOG_TONES = ["danger", "default"] as const;

export type ConfirmDialogTone = (typeof CONFIRM_DIALOG_TONES)[number];

/**
 * Con qué piel de botón se pinta la acción que confirma.
 *
 * Es un mapa a **variantes de `Button`** en vez de una lista de clases propias:
 * la piel del peligro ya existe en el sistema y clonarla acá sería tener dos
 * rojos que se separan con el primer retoque.
 */
export const CONFIRM_DIALOG_BUTTON_VARIANT = {
  danger: "danger",
  default: "primary",
} as const satisfies Record<ConfirmDialogTone, "danger" | "primary">;

/**
 * La fila de salidas.
 *
 * **Alineada al final del eje en línea** porque son acciones de cierre, no
 * contenido: el ojo las busca donde termina el panel. Envuelve
 * (`flex-wrap`) para que en una pantalla angosta las dos salidas caigan una
 * debajo de la otra en vez de encogerse por debajo del objetivo táctil.
 */
export const confirmDialogActionsVariants = cva([
  "flex flex-wrap items-center justify-end gap-(--space-3)",
  "mt-(--space-2)",
]);
