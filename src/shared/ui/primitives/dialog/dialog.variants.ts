import { cva, type VariantProps } from "class-variance-authority";

/* Ref: .kc-scrim / .kc-dialog. El velo cubre la ventana y centra el panel; el
   panel es una superficie elevada con borde pesado y sombra dura.

   Z-INDEX: velo en `--z-overlay` y panel en `--z-modal`, los dos escalones que
   el SDD §5 reserva justo por encima de `--z-nav` y por debajo de `--z-toast`.
   Estos dos tokens sólo significan algo gracias al portal al `body` (ver
   `Dialog.tsx`): dentro del árbol de la página, el `main` del `AppShell` abre su
   propio contexto de apilamiento en `--z-base` = 1 y encierra ahí a todos sus
   descendientes, así que el panel quedaría por debajo del nav (`--z-nav` = 100,
   y pintado FUERA del `main`) por mucho que su token valga 300. La jaula es el
   `main`, no un `transform` del archivero, que no existe (deuda 94). El
   razonamiento está atado a los tokens en `dialog.portal.tokens.test.ts`.

   El panel usa la superficie ELEVADA a propósito: es la única del sistema donde
   el anillo de foco llega al contraste mínimo (deuda 31), y un diálogo es todo
   navegación por teclado. */
/* DÓNDE se pega el panel, que es **lo único** que separa un modal de un cajón
   lateral (enmienda E3(b) del RFC-03).

   El cajón no es un componente aparte: reescribir una jaula de foco ya probada
   es regalar bugs de accesibilidad. Lo caro —foco atrapado, `Escape`,
   `aria-modal`, portal al `body`, bloqueo de scroll y devolución del foco al
   abridor— vive en `Dialog.tsx` y no se toca; acá cambia la geometría.

   El velo participa de la variante porque es él quien coloca al panel: centrado
   con aire alrededor para el modal, pegado al final del eje en línea y estirado
   de alto para el cajón. */
const dialogPlacements = {
  center: "items-center justify-center p-(--space-4)",
  side: "items-stretch justify-end",
} as const;

export type DialogPlacement = keyof typeof dialogPlacements;

export const DIALOG_PLACEMENTS = Object.keys(
  dialogPlacements,
) as DialogPlacement[];

export const dialogScrimVariants = cva(
  ["fixed inset-0 flex", "bg-fg/50", "z-(--z-overlay)"],
  {
    variants: {
      placement: dialogPlacements,
    },
    defaultVariants: {
      placement: "center",
    },
  },
);

/* Los anchos se declaran en un objeto propio para poder derivar de él los
   NOMBRES públicos de la variante (`DIALOG_SIZES`), que el ancla de contrato
   compara contra el literal (REGLA 2a). */
const dialogSizes = {
  md: "max-w-md",
  lg: "max-w-2xl",
} as const;

export type DialogSize = keyof typeof dialogSizes;

export const DIALOG_SIZES = Object.keys(dialogSizes) as DialogSize[];

/* El cajón ocupa **todo el alto** y pierde el redondeo: sus tres cantos caen
   fuera de la ventana, así que redondearlos sólo dejaría una muesca en la
   esquina. También pierde la sombra dura, que se proyecta hacia abajo y a la
   derecha —o sea, fuera de la pantalla—: lo que lo separa de la página es el
   borde grueso de su canto de entrada, no una sombra que nadie puede ver. El
   `size` sigue mandando sobre el ancho, así que las dos variantes se combinan
   sin pisarse.

   Va anotado como `Record<DialogPlacement, string>` a propósito: son dos objetos
   —uno coloca el velo y otro deforma el panel— y **añadir una colocación sin su
   geometría no compila**. */
const dialogPanelPlacements: Record<DialogPlacement, string> = {
  center: "",
  side: "h-full rounded-none shadow-none",
};

export const dialogPanelVariants = cva(
  [
    "relative flex w-full flex-col gap-(--space-3)",
    "max-h-full overflow-auto",
    "p-(--space-5)",
    "border-(length:--border-width-heavy) border-solid border-border rounded-md",
    "bg-surface-raised text-fg shadow-hard-lg",
    "z-(--z-modal)",
    "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
    "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width-heavy)",
  ],
  {
    variants: {
      size: dialogSizes,
      placement: dialogPanelPlacements,
    },
    defaultVariants: {
      size: "md",
      placement: "center",
    },
  },
);

export type DialogVariants = VariantProps<typeof dialogPanelVariants>;

export const dialogHeaderVariants = cva([
  "flex items-start justify-between gap-(--space-3)",
]);

export const dialogTitleVariants = cva([
  "m-0 font-display text-xl/tight text-fg",
]);

export const dialogDescriptionVariants = cva([
  "m-0 font-body text-sm leading-base text-fg-muted",
]);
