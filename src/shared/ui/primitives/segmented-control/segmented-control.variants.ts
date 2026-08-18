import { cva, type VariantProps } from "class-variance-authority";

/* Control EXCLUYENTE (enmienda E2(c) del RFC-03). Es lo contrario del `Toggle`,
   y por eso no puede parecerse a él.

   La forma dice el comportamiento: un solo carril continuo, las opciones
   PEGADAS y separadas por una línea compartida, la elegida RELLENA de acento.
   Un `Toggle` es una ficha suelta con su propia sombra y su propio hueco al
   lado, porque se puede marcar junto a otras. Puestos en la misma fila, la
   diferencia tiene que verse sin probar los botones: eso es lo que falló en
   E1(i) y lo que este primitivo existe para arreglar (deuda 142).

   Tres decisiones de forma, con su motivo:

   - **El hueco entre opciones es CERO.** No hay ninguna utilidad de separación
     en este archivo, a propósito: lo que separa dos opciones es el borde
     izquierdo de la segunda, o sea una línea que las dos comparten. Un hueco
     las convertiría en dos fichas y volvería a prometer "podés marcar varias".
   - **El borde y la sombra son del carril, no de cada opción.** Una sola pieza
     elevada en vez de N piezas elevadas.
   - **La opción elegida NO se hunde.** El `Toggle` se desplaza y encoge su
     sombra al presionarse (el gesto de "botón apretado"); aquí ese gesto sobra
     y además rompería la continuidad del carril. El estado se dice rellenando.

   El anillo de foco se dibuja POR FUERA de la opción (offset positivo) y el
   carril no recorta su contenido: `--focus` y `--accent` son el mismo rosa, así
   que un anillo por dentro de la opción elegida sería rosa sobre rosa. Por fuera
   cae sobre la superficie elevada de la `Card` que envuelve el toolbar, donde
   llega a 3.13:1 (deuda 31). */
export const SEGMENTED_CONTROL_TRACK_CLASSES: string[] = [
  "inline-flex",
  "items-stretch",
  "border-(length:--border-width)",
  "border-solid",
  "border-border",
  "rounded-md",
  "bg-surface-raised",
  "shadow-hard",
];

export const SEGMENTED_CONTROL_OPTION_CLASSES: string[] = [
  "inline-flex",
  "items-center",
  "justify-center",
  "min-h-(--touch-target)",
  "px-(--space-4)",
  "py-(--space-2)",
  "font-body",
  "font-bold",
  "text-base/tight",
  "cursor-pointer",
  "select-none",
  "bg-transparent",
  "text-fg",
  "transition-[background-color,color]",
  "duration-(--dur-fast)",
  "ease-standard",
  "aria-pressed:bg-accent",
  "aria-pressed:text-accent-fg",
  "focus-visible:outline",
  "focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus)",
  "focus-visible:outline-offset-(--border-width)",
  "disabled:cursor-not-allowed",
  "disabled:text-fg-muted",
];

/* La línea que separa dos opciones. La lleva la opción de la derecha, así que la
   primera no tiene ninguna: entre N opciones hay N-1 líneas y ni un hueco. */
export const SEGMENTED_CONTROL_DIVIDER_CLASSES: string[] = [
  "border-l-(length:--border-width)",
  "border-solid",
  "border-border",
];

export const segmentedControlVariants = cva(SEGMENTED_CONTROL_TRACK_CLASSES);

export const segmentedControlOptionVariants = cva(
  SEGMENTED_CONTROL_OPTION_CLASSES,
  {
    variants: {
      /* El redondeo de los extremos lo ponen la primera y la última opción: el
         carril no recorta (ver arriba), así que el relleno de acento tiene que
         traerse su propia esquina o asomaría por fuera del borde. */
      position: {
        only: "rounded-md",
        first: "rounded-s-md",
        middle: "",
        last: "rounded-e-md",
      },
      divided: {
        true: SEGMENTED_CONTROL_DIVIDER_CLASSES.join(" "),
        false: "",
      },
    },
    defaultVariants: {
      position: "only",
      divided: false,
    },
  },
);

export type SegmentedControlVariants = VariantProps<
  typeof segmentedControlVariants
>;

export type SegmentedControlOptionVariants = VariantProps<
  typeof segmentedControlOptionVariants
>;
