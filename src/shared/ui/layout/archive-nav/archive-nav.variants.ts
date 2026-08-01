import { cva, type VariantProps } from "class-variance-authority";

/**
 * Ranuras del cajón. La geometría del fichero está derivada para este número:
 * el presupuesto vertical (los cantos que se dibujan más una pestaña dentro de
 * `--nav-height`), la rampa de profundidad (`--z-nav-leaf-1..6`) y el ancho de
 * columna del carril. Un séptimo ítem no tendría ni columna ni profundidad
 * propias —caería encima de la primera pestaña—, así que el cajón monta como
 * mucho estas ranuras.
 */
export const ARCHIVE_SLOTS = 6;

/* Hoja del fichero (RFC-01 §3 D4). La hoja es DECORACIÓN INERTE (enmienda E8):
   no es un enlace, no reacciona al puntero y lo bloquea a todo su ancho. Lo
   único interactivo del archivero es la pestaña, que lo vuelve a habilitar para
   sí misma. Antes el enlace era la hoja entera a todo el ancho del shell, así
   que el puntero levantaba —y navegaba— una pestaña desde cualquier x de la
   franja, aunque el puntero estuviera al otro extremo de la pantalla, y sin
   ninguna señal visual de que aquello fuera clicable.

   `open` es la hoja de la ruta activa (enmienda E10): no dibuja canto y baja al
   FONDO del cajón. Como el cajón se apila en columna invertida, el fondo es el
   primer elemento del orden de flexión: por eso `order-first`, que reordena en
   pantalla sin tocar el orden del DOM (que es el de lectura y tabulación, y ése
   sigue siendo el de la lista). Su cara es el área de contenido de la página,
   justo debajo.

   Lo que la hoja abierta pierde es la CARA, no el ALTO: conserva su ranura de
   `--nav-leaf-height` como cualquier otra. Si no la conservara, su pestaña y la
   del canto más bajo quedarían al mismo nivel y la escalera del fichero
   arrancaría plana, con lo que se pierde la lectura de "esta ficha está fuera
   del cajón". Conservándola, la hoja abierta se queda donde está (su pestaña a
   ras del contenido) y son los 5 cantos los que suben un escalón.

   La profundidad se declara por POSICIÓN EN EL STACK y NO invirtiendo el orden
   del DOM: la ranura 1 es la del fondo, que pinta encima de todas. */
export const leafVariants = cva(
  ["pointer-events-none relative w-full h-(--nav-leaf-height)"],
  {
    variants: {
      depth: {
        1: "z-(--z-nav-leaf-1)",
        2: "z-(--z-nav-leaf-2)",
        3: "z-(--z-nav-leaf-3)",
        4: "z-(--z-nav-leaf-4)",
        5: "z-(--z-nav-leaf-5)",
        6: "z-(--z-nav-leaf-6)",
      },
      open: {
        true: "order-first",
        false: "",
      },
    },
    defaultVariants: { depth: 1, open: false },
  },
);

/* Superficie visible de la hoja: el canto. Se dibujan CINCO, no seis (enmienda
   E10): la hoja abierta no monta esta superficie, porque el área de contenido
   ya se lee como una hoja más y con seis cantos el cajón enseñaba siete hojas
   para seis páginas.

   El canto no cambia de alto en hover (enmienda E5): al ser una superficie
   opaca, encogerla abría un hueco que dejaba ver la textura del fondo, o sea un
   agujero en vez de una ficha levantada. El alto del stack es constante por
   construcción y nada hace reflow. Sombra hacia ARRIBA (la y del token es
   negativa) porque cada hoja proyecta sobre la que tiene detrás, que en pantalla
   queda encima; el filo superior es la otra mitad de la profundidad (E3). */
export const leafSheetVariants = cva([
  "block h-(--nav-leaf-height)",
  "bg-(--nav-leaf-face) shadow-(--shadow-nav-leaf-edge)",
  "[filter:drop-shadow(var(--shadow-nav-leaf))]",
]);

/* Rampa horizontal de las pestañas: el carril se reparte en tantas columnas
   como hojas monte el cajón y cada pestaña ocupa la suya, así que las x son
   crecientes y ninguna toca a la siguiente sin escribir un solo offset a mano.
   Ocupa el ancho del shell menos un margen a cada lado.

   Va anclado al borde inferior de SU hoja (de ahí cuelga la pestaña, que
   desborda hacia arriba) y pinta por encima del canto por ser el descendiente
   posicionado de la hoja.

   NO captura el puntero (invariante 8-bis). El carril es una banda a todo el
   ancho y tan alta como la pestaña: con las columnas vacías capturando, la hoja
   de mayor profundidad se tragaba media navegación y apuntar a una pestaña
   activaba otra. Quien recibe el puntero es la pestaña, y sólo ella. */
export const tabTrackVariants = cva(
  [
    "pointer-events-none absolute inset-x-0 bottom-0 grid",
    "pl-(--nav-tab-inset-start) pr-(--nav-tab-inset-end)",
  ],
  {
    variants: {
      columns: {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
        6: "grid-cols-6",
      },
    },
    defaultVariants: { columns: 6 },
  },
);

/* Pestaña: es EL ENLACE (enmienda E8) y lo único del archivero que recibe el
   puntero y el foco. Cuelga del canto de su hoja, desborda hacia arriba y mide
   un objetivo táctil de alto.

   Al pasar el puntero (o al recibir foco de teclado) no se desplaza: CRECE
   hacia arriba, porque su base está anclada al borde inferior de su hoja
   (enmienda E9). Desplazarla destapaba la franja de canto que cubría en reposo
   —con su filo claro cruzando justo por debajo— y la pestaña se leía
   flotando suelta. Creciendo, la zona que cubría en reposo sólo puede aumentar,
   así que no hay manera de que aparezca una arista entre la pestaña y su hoja.
   La transición degrada sola con la media global de movimiento reducido.

   Se queda dentro de su columna y nunca la desborda; la etiqueta se recortaría
   antes que solaparse con la vecina, aunque con los tokens actuales no llega a
   recortarse en ningún ancho donde vive el nav. La columna la fija el índice de
   la página en la LISTA, no su posición en el stack (enmienda E10): al navegar
   cambia el orden vertical del cajón, nunca la x de una pestaña.

   La pestaña de la ruta activa cae al tono de la página: es la cara de la hoja
   abierta, que se continúa sin costura con el área de contenido de debajo. */
export const tabVariants = cva(
  [
    "pointer-events-auto flex min-w-0 max-w-full flex-col items-center justify-center",
    "h-(--nav-tab-height) justify-self-start no-underline",
    "rounded-(--radius-tab) px-(--nav-tab-padding-x)",
    "shadow-(--shadow-nav-leaf-edge) [filter:drop-shadow(var(--shadow-nav-leaf))]",
    "transition-[height] duration-(--dur-base) ease-entrance",
    "hover:h-(--nav-tab-height-lifted) focus-visible:h-(--nav-tab-height-lifted)",
    "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
    "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
  ],
  {
    variants: {
      column: {
        1: "col-start-1",
        2: "col-start-2",
        3: "col-start-3",
        4: "col-start-4",
        5: "col-start-5",
        6: "col-start-6",
      },
      active: { true: "bg-bg", false: "bg-(--nav-leaf-face)" },
    },
    defaultVariants: { column: 1, active: false },
  },
);

/* Etiqueta del lockup, en tamaño grande (enmienda E6): el archivero perdía toda
   su presencia con una etiqueta de sistema. El tamaño manda sobre el ancho al
   que nace el nav, no al revés (enmienda E4). */
export const tabLabelVariants = cva(
  [
    "max-w-full truncate font-body font-bold uppercase leading-tight",
    "text-nav-tab tracking-label",
  ],
  {
    variants: {
      active: { true: "text-accent", false: "text-fg-inverse" },
    },
    defaultVariants: { active: false },
  },
);

export type LeafVariants = VariantProps<typeof leafVariants>;

type SlotIndex = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Columna horizontal de la pestaña: la fija el índice de la página en la LISTA
 * (enmienda E10). Es lo que sostiene la memoria espacial cuando el cajón se
 * reordena al navegar: una página está siempre en la misma x, cambia sólo su
 * altura.
 */
export function navTabColumn(index: number): SlotIndex {
  return (Math.min(index, ARCHIVE_SLOTS - 1) + 1) as SlotIndex;
}

/**
 * Ranura de profundidad de la hoja: 1 es el fondo del cajón (la que pinta
 * encima de todas) y va creciendo hacia arriba. Desde E10 el fondo es siempre
 * la hoja ABIERTA (la de la ruta activa) y las demás se apilan encima en el
 * orden de la lista. Sin ninguna ruta activa (`openIndex` negativo) el cajón
 * conserva el orden de la lista.
 */
export function navLeafDepth(index: number, openIndex: number): SlotIndex {
  if (openIndex < 0) {
    return navTabColumn(index);
  }
  if (index === openIndex) {
    return 1;
  }
  return ((index < openIndex ? index : index - 1) + 2) as SlotIndex;
}

/** Columnas del carril: una por hoja montada. */
export function navTrackColumns(count: number): SlotIndex {
  return Math.min(Math.max(count, 1), ARCHIVE_SLOTS) as SlotIndex;
}
