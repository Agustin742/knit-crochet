"use client";

import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  forwardRef,
} from "react";

import { cn } from "@/shared/ui/lib/cn";

import {
  segmentedControlOptionVariants,
  segmentedControlVariants,
} from "./segmented-control.variants";

/**
 * Una opción del carril. El parámetro `TValue` es lo que ata `value` a
 * `options`: por defecto es `string`, así que anotar
 * `readonly SegmentedControlOption[]` sigue significando lo de siempre.
 */
export interface SegmentedControlOption<TValue extends string = string> {
  value: TValue;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<TValue extends string = string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "role" | "onChange"> {
  /** Nombre accesible del conjunto ("Estado del proyecto"). */
  label: string;
  /**
   * Las opciones, en el orden en que se pintan. Mínimo dos. **Es el único sitio
   * del que se infiere `TValue`**, y por eso manda sobre `value` — **mientras se
   * deje inferir**: anotarlas con el parámetro por defecto lo colapsa a `string`
   * y deja de mandar sobre nada.
   */
  options: readonly SegmentedControlOption<TValue>[];
  /**
   * La elegida. **Es un valor, no una lista** —ahí vive la exclusividad—, y
   * **tiene que ser el `value` de una de las `options`**: va envuelto en
   * `NoInfer`, así que no participa de la inferencia y uno ajeno al juego es
   * error de compilación, no una sorpresa en pantalla.
   *
   * **Con una condición, y conviene saberla:** eso vale mientras `TValue` llegue a
   * inferirse. Si quien llama **anota** `options` con el parámetro por defecto
   * (`readonly SegmentedControlOption[]`), `TValue` colapsa a `string` y vuelve a
   * entrar cualquier cadena. Ver la enumeración del JSDoc del componente.
   */
  value: NoInfer<TValue>;
  /** Recibe el valor de la opción tocada, incluso si ya era la elegida. */
  onValueChange: (value: TValue) => void;
}

/**
 * Segmentado: **se elige exactamente una** opción (enmienda E2(c) del RFC-03).
 *
 * Es el compañero opuesto del `Toggle`, y existe porque **controles que se
 * comportan distinto tienen que verse distinto**. En `/proyectos` convivían
 * cuatro botones idénticos en fila —dos excluyentes y dos acumulables— sin una
 * sola señal visual que los distinguiera, y la decisión anterior (E1(i))
 * justificó reusar el `Toggle` con el coste de tocar un gate del arnés. Eso es
 * exactamente lo que la regla "el template es un SUELO, no un techo" prohíbe:
 * aquí la pieza correcta no existía, así que **se crea y se paga su gate**
 * (`public-api.test.ts` está anclado al literal y se toca a propósito).
 *
 * **Exactamente una elegida, y cada mitad de esa promesa la sostiene una cosa
 * distinta.** El párrafo anterior prometía en absoluto ("no se puede ni
 * representar") algo que el tipo no ataba, y se comprobó **midiendo**: con
 * `value: string` suelto salían **cero** pulsadas o **dos**, y `tsc` aceptaba
 * las dos (deuda 148). Ahora, por partes:
 *
 * - **"Ninguna elegida" lo cierra el TIPO** —**siempre que `TValue` se infiera**,
 *   ver el tercer punto—. El componente es genérico sobre sus opciones y `TValue`
 *   sale **sólo de `options`** (`value` va envuelto en `NoInfer`), así que un
 *   `value` ajeno al juego lo caza `pnpm typecheck`.
 * - **"Dos elegidas" NO lo puede cerrar el tipo**: nada en TypeScript impide
 *   listar dos `options` con el mismo `value`. Lo cierra el **render**, que marca
 *   la **primera** coincidencia y ninguna más, y lo sostiene un test.
 * - **Lo que no cierra ninguno de los dos**, en orden de probabilidad:
 *   1. **Anotar `options` con el parámetro por defecto**
 *      (`readonly SegmentedControlOption[]`, o sea `SegmentedControlOption<string>`).
 *      No es "llamar sin tipos": es una anotación idiomática, la usa el propio
 *      archivo de test de este primitivo, y **colapsa `TValue` a `string`**, con lo
 *      que cualquier `value` compila. Comprobado con `tsc`, no leído. Para que el
 *      tipo proteja, `options` se deja **inferir** (o se anota con su unión).
 *   2. Llamar **sin tipos** (JS puro) o forzando con un `as`.
 *   En los dos casos salen cero pulsadas. No se defiende en runtime a propósito:
 *   el primitivo no tiene forma de saber cuál sería el valor correcto, y elegir uno
 *   por su cuenta sería inventarle una decisión al consumidor.
 *
 * **`role="group"` + `aria-pressed`, no `radiogroup` ni `tablist`** (RFC-03 §5 y
 * el JSDoc de `ToggleGroup`): un `radiogroup` promete la navegación por flechas
 * de un grupo de radios y `tablist` promete paneles asociados. Aquí cada opción
 * es un botón que se pulsa y anuncia su estado, y se recorren con el tabulador
 * como cualquier botón.
 *
 * Presentación pura: no guarda estado. Quien lo monta decide qué está elegido,
 * igual que con `Toggle`.
 */
function SegmentedControlRender<TValue extends string>(
  {
    label,
    options,
    value,
    onValueChange,
    className,
    ...props
  }: SegmentedControlProps<TValue>,
  ref: ForwardedRef<HTMLDivElement>,
) {
  /* La elegida es UNA POSICIÓN, no un valor repetido por el camino: si dos
     opciones comparten `value` —lo único que el tipo no puede impedir— se marca
     la primera y ninguna más, para que "exactamente una pulsada" siga siendo
     cierto en la pantalla y no sólo en el comentario. */
  const selectedIndex = options.findIndex((option) => option.value === value);

  return (
    <div
      ref={ref}
      data-slot="segmented-control"
      role="group"
      aria-label={label}
      className={cn(segmentedControlVariants(), className)}
      {...props}
    >
      {options.map((option, index) => (
        /* La clave lleva la posición delante: la identidad de una opción aquí es
           el hueco que ocupa en el carril (un conjunto fijo que no se reordena),
           y así dos opciones con el mismo `value` tampoco chocan de clave. */
        <button
          key={`${index}-${option.value}`}
          type="button"
          data-slot="segmented-control-option"
          aria-pressed={index === selectedIndex}
          disabled={option.disabled}
          className={segmentedControlOptionVariants({
            position: positionOf(index, options.length),
            divided: index > 0,
          })}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SegmentedControlWithRef = forwardRef(SegmentedControlRender);
SegmentedControlWithRef.displayName = "SegmentedControl";

/**
 * `forwardRef` **borra los genéricos**: su tipo de retorno fija las props a una
 * sola instanciación, y con ella `value` volvería a ser un `string` cualquiera —
 * o sea la deuda 148 otra vez. La aserción devuelve la firma genérica y **no
 * toca el runtime**: es el mismo componente envuelto, con el mismo `ref`. Es el
 * idioma estándar para un componente genérico con `ref`.
 */
export const SegmentedControl = SegmentedControlWithRef as <
  TValue extends string,
>(
  props: SegmentedControlProps<TValue> & RefAttributes<HTMLDivElement>,
) => ReactElement;

/** Qué extremo del carril ocupa cada opción: sólo los extremos van redondeados. */
function positionOf(
  index: number,
  total: number,
): "only" | "first" | "middle" | "last" {
  if (total === 1) {
    return "only";
  }
  if (index === 0) {
    return "first";
  }
  return index === total - 1 ? "last" : "middle";
}
