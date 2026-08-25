import { cva, type VariantProps } from "class-variance-authority";

/* Ref: .kc-tabs__list / .kc-tab del template.

   La pestaña es una carpeta: borde grueso arriba y a los lados, **sin borde
   abajo**, esquinas superiores redondeadas, y una línea continua bajo todo el
   carril que hace de canto de la carpeta. La elegida se rellena de acento, que
   es el mismo gesto que usa el `SegmentedControl` para decir "ésta".

   **Se parece al segmentado a propósito, y se diferencia a propósito.** Los dos
   son excluyentes, así que los dos rellenan la opción activa; lo que cambia es
   que las pestañas van SEPARADAS y cuelgan de una línea inferior, porque además
   de elegir una cambian el contenido de debajo. El segmentado filtra una lista
   que ya está en pantalla; estas pestañas mandan sobre qué se ve.

   El anillo de foco se dibuja por FUERA (offset positivo) por el mismo motivo
   que en el segmentado: `--focus` y `--accent` son el mismo rosa, así que por
   dentro de la pestaña elegida sería rosa sobre rosa. */
export const TABS_ROOT_CLASSES: string[] = ["flex", "flex-col"];

export const TABS_LIST_CLASSES: string[] = [
  "flex",
  "flex-wrap",
  "items-end",
  "gap-(--space-2)",
  "border-b-(length:--border-width)",
  "border-solid",
  "border-border",
];

export const TAB_CLASSES: string[] = [
  "inline-flex",
  "items-center",
  "justify-center",
  "min-h-(--touch-target)",
  "px-(--space-5)",
  "py-(--space-2)",
  "font-body",
  "font-bold",
  "text-sm/tight",
  "tracking-label",
  "cursor-pointer",
  "select-none",
  "border-(length:--border-width)",
  "border-solid",
  "border-border",
  "border-b-0",
  "rounded-t-md",
  "bg-surface-raised",
  "text-fg-muted",
  "transition-[background-color,color]",
  "duration-(--dur-fast)",
  "ease-standard",
  "aria-selected:bg-accent",
  "aria-selected:text-accent-fg",
  "focus-visible:outline",
  "focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus)",
  "focus-visible:outline-offset-(--border-width)",
];

/* El panel no lleva superficie propia: hereda la del contenedor que monte las
   pestañas (en el drawer, la del panel del diálogo). Sí lleva anillo de foco,
   porque es una parada de tabulación (ver el JSDoc del componente). */
export const TAB_PANEL_CLASSES: string[] = [
  "pt-(--space-4)",
  "focus-visible:outline",
  "focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus)",
  "focus-visible:outline-offset-(--border-width)",
];

export const tabsVariants = cva(TABS_ROOT_CLASSES);
export const tabsListVariants = cva(TABS_LIST_CLASSES);
export const tabVariants = cva(TAB_CLASSES);
export const tabPanelVariants = cva(TAB_PANEL_CLASSES);

export type TabsVariants = VariantProps<typeof tabsVariants>;
