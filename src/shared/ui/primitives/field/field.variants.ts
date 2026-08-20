import { cva, type VariantProps } from "class-variance-authority";

/**
 * Tono de la piel del campo: sobre qué superficie se está dibujando.
 *
 * **Por qué existe** (RFC-01 §3, enmienda E13 c). `Card` es para CONTENIDO, así
 * que los controles del Dashboard perdieron su marco. Pero el marco no era
 * decoración: era la única razón por la que el campo se leía. `Field` pintaba su
 * etiqueta con el primer plano **oscuro** (`--fg`), pensado para una superficie
 * clara, y la app es oscura — sacar la tarjeta sin más deja la etiqueta en
 * espresso sobre espresso, o sea invisible. El design system no sabía dibujar un
 * campo sobre el fondo de la app; ahora sí. Es el "el template es un SUELO, no
 * un techo" aplicado: la pieza que faltaba se crea, no se encoge la pantalla
 * hasta que quepa en lo que ya había.
 *
 * - `default` — sobre superficie clara (`Card`, diálogo, panel de acceso).
 * - `inverse` — sobre el fondo de la app (`--bg`).
 *
 * **El anillo de foco mejora al quitar la tarjeta, no empeora** (deuda 31):
 * `--focus` mide 4.68:1 contra el fondo oscuro y sólo 2.95:1 / 2.41:1 contra dos
 * de las tres superficies claras. El anillo del control sale por fuera del
 * control (`outline` con desplazamiento), así que sobre el espresso cae en el
 * caso bueno.
 */
export const FIELD_TONES = ["default", "inverse"] as const;

export type FieldTone = (typeof FIELD_TONES)[number];

export const fieldLabelVariants = cva("font-body font-semibold text-sm", {
  variants: {
    tone: {
      default: "text-fg",
      inverse: "text-fg-inverse",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

/**
 * El pie del campo hace **dos** trabajos con la misma caja: ayuda y error. El
 * color depende de los dos ejes a la vez, así que va por `compoundVariants` y no
 * por un ternario en el componente — un ternario dejaría las cuatro
 * combinaciones escritas a mano en el JSX, que es justo lo que `cva` existe para
 * evitar.
 *
 * El error en tono inverso NO usa `--danger`: sobre el espresso ese rojo mide
 * 3.02:1, por debajo del 4.5:1 que pide un texto. Usa `--danger-inverse`, su
 * gemelo para fondo oscuro (5.00:1), igual que `--fg-inverse` lo es de `--fg`.
 * Los dos contrastes se miden en `field.variants.test.ts`.
 */
export const fieldMessageVariants = cva("font-mono text-xs leading-base", {
  variants: {
    tone: {
      default: "",
      inverse: "",
    },
    invalid: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { tone: "default", invalid: false, class: "text-fg-muted" },
    { tone: "default", invalid: true, class: "text-danger" },
    { tone: "inverse", invalid: false, class: "text-fg-inverse-muted" },
    { tone: "inverse", invalid: true, class: "text-danger-inverse" },
  ],
  defaultVariants: {
    tone: "default",
    invalid: false,
  },
});

export type FieldLabelVariants = VariantProps<typeof fieldLabelVariants>;
export type FieldMessageVariants = VariantProps<typeof fieldMessageVariants>;
