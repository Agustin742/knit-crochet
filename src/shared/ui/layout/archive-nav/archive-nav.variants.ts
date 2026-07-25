import { cva, type VariantProps } from "class-variance-authority";

/* Carpeta del archivero (adapta .kc-folder del template). El `<a>` lleva la
   sombra de papel y el hover que "saca la ficha del cajón" (sube --folder-lift);
   la carpeta activa se funde con la página. Todo por token: sin px/color crudos.
   La transición degrada sola vía la media global de prefers-reduced-motion. */
export const folderVariants = cva(
  [
    "group relative flex min-w-0 flex-col justify-end no-underline",
    "[margin-left:calc(-1*var(--folder-overlap))] first:ml-0",
    "[filter:drop-shadow(var(--shadow-paper))]",
    "transition-[transform,filter] duration-[var(--dur-base)] ease-entrance",
    "hover:[transform:translateY(calc(-1*var(--folder-lift)))]",
    "hover:[filter:drop-shadow(var(--shadow-folder-hover))]",
    "focus-visible:outline focus-visible:outline-[length:var(--border-width-heavy)]",
    "focus-visible:outline-[color:var(--focus)] focus-visible:outline-offset-[var(--border-width)]",
  ],
  {
    variants: {
      active: {
        true: "z-[var(--z-nav)] hover:[transform:none]",
        false: "",
      },
    },
    defaultVariants: { active: false },
  },
);

/* Superficie compartida por pestaña y cuerpo: escalón tonal por posición. La
   carpeta activa cae al tono de la página (--bg) — como twMerge conserva la
   última clase, `bg-bg` (active) gana sobre el tono. */
export const folderSurfaceVariants = cva("", {
  variants: {
    tone: {
      1: "bg-[var(--folder-tone-1)]",
      2: "bg-[var(--folder-tone-2)]",
      3: "bg-[var(--folder-tone-3)]",
      4: "bg-[var(--folder-tone-4)]",
      5: "bg-[var(--folder-tone-5)]",
      6: "bg-[var(--folder-tone-6)]",
    },
    active: { true: "bg-bg", false: "" },
  },
  defaultVariants: { tone: 1, active: false },
});

export type FolderVariants = VariantProps<typeof folderVariants>;

/** Tono de carpeta (1..6) a partir de la posición en la lista. */
export function folderTone(index: number): 1 | 2 | 3 | 4 | 5 | 6 {
  return ((index % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}
