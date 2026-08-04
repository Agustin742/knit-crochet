import { cva } from "class-variance-authority";

/* Banda de cuenta (RFC-01 §3, enmienda E11). Es una superficie propia del
   caparazón, FUERA del elemento `nav` y por ENCIMA del cajón del archivero, en
   el flujo normal del shell: empuja al nav hacia abajo en vez de superponerse a
   él.

   Por qué en el flujo y no superpuesta, que es lo que pedía la banda histórica:
   desde E10 la columna 6 puede caer en la ranura 6, y ahí el borde superior de
   su pestaña queda a 10 del techo del nav en reposo y a 2 con el puntero
   encima. Un control de un objetivo táctil con su respiro no cabe ahí por
   ningún camino, y el archivero no cede ni un milímetro de ancho (E11 a: sólo
   quedaban 30.88 de holgura en el carril y el relleno lateral de un botón ya
   son 48). Todas las medidas van en unidades de píxel de CSS; la cuenta la
   rehace `account-band.tokens.test.ts` leyendo estas clases.

   Sin ninguna variante responsive a propósito (E11 b): el archivero no se monta
   por debajo de `--bp-archive` y el `BottomNav` no tiene dónde alojar la sesión,
   así que la banda es la ÚNICA superficie que cubre los dos regímenes. Rige
   desde el ancho más estrecho que soporta la app hasta desktop.

   Declara fondo Y primer plano en la misma capa (la regla que dejó escrita la
   deuda 32): la variante fantasma del botón hereda `currentColor`, así que una
   superficie que elige su fondo sin elegir su texto deja invisible lo que
   contenga. Aquí hereda el crema sobre el espresso del shell. */
export const accountBandVariants = cva([
  "flex w-full items-center justify-end gap-(--space-4)",
  "min-h-(--touch-target)",
  "px-(--nav-account-inset-inline) py-(--nav-account-inset-block)",
  "bg-bg bg-(image:--texture-dots-dark) [background-size:var(--space-4)_var(--space-4)]",
  "text-fg-inverse",
]);

/* Nombre de quien tiene la sesión abierta: dato, no navegación. Va en mono y
   pequeño para que el control de salida siga siendo lo prominente de la banda, y
   se recorta antes que empujar al botón fuera del ancho en pantallas estrechas.
   El tono atenuado se mide contra el fondo de la banda en el test de tokens. */
export const accountNameVariants = cva([
  "min-w-0 truncate font-mono text-xs tracking-label text-fg-inverse-muted",
]);
