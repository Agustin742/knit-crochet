"use client";

import {
  type ChangeEvent,
  type InputHTMLAttributes,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";

import { cn } from "@/shared/ui/lib/cn";

import {
  fileInputControlVariants,
  fileInputFileNameVariants,
  fileInputTriggerVariants,
  fileInputVariants,
} from "./file-input.variants";

/** Copia por defecto. Exportada para que los tests la importen en vez de reescribirla. */
export const FILE_INPUT_BUTTON_LABEL = "Elegir archivo";
export const FILE_INPUT_EMPTY_LABEL = "Ningún archivo elegido";

export interface FileInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "children"
  > {
  /** El archivo elegido, o `null` si el llamador lo descartó. */
  onFileChange: (file: File | null) => void;
  /**
   * Qué nombre mostrar. **Lo manda el llamador y no se guarda acá**: quien elige
   * el archivo ya lo tiene en su estado —lo necesita para subirlo—, y una
   * segunda copia dentro del primitivo serían dos fuentes de verdad que se
   * desincronizan en cuanto el formulario se limpia tras guardar.
   */
  fileName?: string | null;
  buttonLabel?: string;
  emptyLabel?: string;
}

/**
 * Selector de archivo (enmienda **E6 (c)** del RFC-03).
 *
 * **Es TONTO a propósito, y ésa es la mitad del contrato.** Elige un archivo y
 * enseña cuál eligió. No sabe subir nada, ni conoce ningún endpoint, ni ningún
 * proveedor de imágenes. La frontera es la lección de la **deuda 168**: lo que
 * depende de la configuración de la app **no sube al design system**, o el
 * template deja de ser portable (SDD §2). Subir la foto es trabajo de
 * `features/projects/ui/`. Hay un test que lo mide leyendo este fuente, porque
 * ningún test de comportamiento puede demostrar una ausencia.
 *
 * **Por qué el input está escondido pero NO desmontado ni con `display:none`.**
 * El `<input type="file">` real es el único control del árbol de accesibilidad:
 * es quien recibe el `id` y las `aria-*` que le cablea `Field`, quien se anuncia
 * y **quien sigue siendo parada de tabulación**. Las dos alternativas obvias
 * están descartadas y por motivos concretos:
 *
 * - un disparador que además fuera `<label>` le daría **dos etiquetas** al mismo
 *   input (la de `Field` y la suya), y el nombre accesible pasaría a ser la
 *   concatenación de las dos;
 * - esconderlo con `display:none` lo sacaría del orden de tabulación y dejaría a
 *   quien navega por teclado **sin ninguna forma de abrir el selector**.
 *
 * El precio de esta forma es que el anillo de foco hay que dibujarlo en el
 * hermano visible (`peer-focus-visible:` en las variantes). Está pagado ahí y
 * medido en el gate de CSS compilado: una utilidad que Tailwind no genera es una
 * cadena inerte, y un anillo que no se pinta es un control sin foco visible.
 */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  function FileInput(
    {
      className,
      onFileChange,
      fileName,
      buttonLabel = FILE_INPUT_BUTTON_LABEL,
      emptyLabel = FILE_INPUT_EMPTY_LABEL,
      disabled,
      ...props
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

    const hasFile = fileName !== undefined && fileName !== null && fileName !== "";

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      onFileChange(event.target.files?.[0] ?? null);
    }

    return (
      <div className={cn(fileInputVariants(), className)}>
        <input
          ref={inputRef}
          type="file"
          className={fileInputControlVariants()}
          disabled={disabled}
          onChange={handleChange}
          {...props}
        />
        {/* Duplica al input: si se anunciara, el mismo control se leería dos veces. */}
        <span
          aria-hidden="true"
          className={fileInputTriggerVariants()}
          onClick={() => inputRef.current?.click()}
        >
          {buttonLabel}
        </span>
        <span
          aria-live="polite"
          className={fileInputFileNameVariants({ empty: !hasFile })}
        >
          {hasFile ? fileName : emptyLabel}
        </span>
      </div>
    );
  },
);
