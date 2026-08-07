import { cva, type VariantProps } from "class-variance-authority";

/* Control conmutable y SUPERPONIBLE (RFC-02 §1 y §5): el selector de métrica
   (horas / proyectos / metros) y los dos botones de tipo (agujas / crochet) son
   el mismo control repetido, y en los dos casos puede haber varios activos a la
   vez. No es un `Tabs`: un `Tabs` tiene exactamente uno activo y usa
   `aria-selected` dentro de un `tablist`.

   El estado ACTIVO se pinta desde el propio `aria-pressed`, no desde una clase
   que el llamador tenga que acordarse de pasar. Es la misma técnica que usa el
   `Input` con `aria-invalid`: la pista visual y la semántica no pueden
   desincronizarse porque salen del mismo atributo.

   Los dos estados declaran fondo Y primer plano (regla de superficies, deuda 32
   y 17): el activo invierte a acento y por eso tiene que traerse su propio color
   de texto en lugar de heredar el de la superficie de debajo. */
export const toggleVariants = cva([
  "inline-flex items-center justify-center gap-(--space-2)",
  "min-h-(--touch-target) px-(--space-4) py-(--space-2)",
  "font-body font-bold text-base/tight",
  "border-(length:--border-width) border-solid border-border rounded-md",
  "cursor-pointer select-none",
  "bg-surface-raised text-fg shadow-hard",
  "transition-[transform,box-shadow,background-color] duration-(--dur-fast) ease-standard",
  "aria-pressed:bg-accent aria-pressed:text-accent-fg",
  "aria-pressed:[transform:translate(var(--border-width),var(--border-width))]",
  "aria-pressed:shadow-[var(--border-width)_var(--border-width)_0_var(--border)]",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width-heavy)",
  "disabled:cursor-not-allowed disabled:border-fg-inverse-muted disabled:bg-surface-sunken",
  "disabled:text-fg-muted disabled:shadow-none disabled:[transform:none]",
]);

export type ToggleVariants = VariantProps<typeof toggleVariants>;

/* El grupo es sólo el carril que los alinea y les da nombre accesible. No
   impone selección única ni gestiona estado: quién está activo lo decide quien
   consume, porque el punto entero del control es que se superpongan. */
export const toggleGroupVariants = cva([
  "flex flex-wrap items-center gap-(--space-2)",
]);
