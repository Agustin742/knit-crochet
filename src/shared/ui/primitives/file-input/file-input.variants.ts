import { cva, type VariantProps } from "class-variance-authority";

import { buttonVariants } from "../button/button.variants";

/**
 * Variantes del selector de archivo (enmienda **E6 (c)** del RFC-03).
 *
 * **Jerarquía de la pieza, decidida antes de elegir clases.** Dentro de un
 * formulario, elegir la foto es una acción **secundaria**: el primario es
 * guardar. Por eso el disparador toma la piel del botón `secondary` —la caja
 * clara con borde y sombra dura— y no la del acento, que compite con el submit.
 * Y por eso el nombre del archivo se pinta en la voz **monoespaciada y pequeña**
 * del sistema, la misma que usa `Field` para sus mensajes: es un dato de estado,
 * no un título.
 */
export const fileInputVariants = cva([
  "flex w-full flex-wrap items-center gap-(--space-3)",
]);

/**
 * El `<input type="file">` real: **invisible, no desmontado**.
 *
 * `sr-only` lo saca de la vista **sin sacarlo del orden de tabulación** —lo mide
 * el gate de CSS compilado: la utilidad posiciona y recorta, y **no declara
 * `display:none`**, que sí lo dejaría sin foco—. `peer` es lo que permite pintar
 * su anillo de foco en el hermano visible, que es el único sitio donde se puede
 * ver.
 */
export const fileInputControlVariants = cva(["peer sr-only"]);

/**
 * El disparador visible.
 *
 * **Reusa `buttonVariants`, no lo clona**: es literalmente el botón del sistema,
 * y copiar sus clases sería garantizar que dentro de tres meses el botón de
 * "Elegir archivo" y el resto de botones no se parezcan.
 *
 * Lo que añade es el **anillo de foco del control hermano**: el `<input>` real
 * es invisible pero sigue siendo la parada de tabulación, así que el foco cae
 * ahí y **el único sitio donde se puede dibujar es acá**. Sin esta línea, quien
 * navega por teclado llegaría al selector de archivo sin ninguna señal de que
 * está encima, que es exactamente el fallo que el baseline de accesibilidad
 * prohíbe. Las utilidades son las mismas del anillo del sistema, con el prefijo
 * del hermano anterior.
 */
export const fileInputTriggerVariants = cva([
  buttonVariants({ variant: "secondary", size: "md" }),
  "peer-focus-visible:outline peer-focus-visible:outline-(length:--border-width-heavy)",
  "peer-focus-visible:outline-(color:--focus)",
  "peer-focus-visible:outline-offset-(--border-width-heavy)",
  "peer-disabled:cursor-not-allowed peer-disabled:border-fg-inverse-muted",
  "peer-disabled:bg-surface-sunken peer-disabled:text-fg-muted",
  "peer-disabled:shadow-none",
]);

/**
 * El nombre del archivo elegido.
 *
 * `truncate` con `min-w-0` para que un nombre largo **no empuje al disparador
 * fuera de la caja**: el control tiene que seguir siendo utilizable con un
 * archivo llamado como un párrafo.
 */
export const fileInputFileNameVariants = cva(
  ["min-w-0 flex-1 truncate font-mono text-xs leading-base"],
  {
    variants: {
      empty: {
        true: "text-fg-muted italic",
        false: "text-fg",
      },
    },
    defaultVariants: {
      empty: true,
    },
  },
);

export type FileInputFileNameVariants = VariantProps<
  typeof fileInputFileNameVariants
>;
