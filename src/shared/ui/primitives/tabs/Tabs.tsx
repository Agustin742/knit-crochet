"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";

import { cn } from "@/shared/ui/lib/cn";

import {
  tabPanelVariants,
  tabVariants,
  tabsListVariants,
  tabsVariants,
} from "./tabs.variants";

/** Una pestaña con el contenido que manda. */
export interface TabItem<TValue extends string = string> {
  value: TValue;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps<TValue extends string = string> {
  /** Nombre accesible del carril ("Secciones del proyecto"). */
  label: string;
  /**
   * Las pestañas, en el orden en que se pintan. **Es el único sitio del que se
   * infiere `TValue`**, igual que en `SegmentedControl`: anotarlas con el
   * parámetro por defecto colapsa el tipo a `string` y `value` deja de estar
   * atado al juego de pestañas.
   */
  tabs: readonly TabItem<TValue>[];
  /** La elegida. Va envuelta en `NoInfer`: no participa de la inferencia. */
  value: NoInfer<TValue>;
  onValueChange: (value: TValue) => void;
  className?: string;
}

/**
 * Pestañas (SDD §6, RFC-03 §2, enmienda **E3(c)**).
 *
 * **Nace como primitiva y NO se construye sobre `SegmentedControl`**, aunque las
 * dos sean "elegís una". El segmentado es `role="group"` + `aria-pressed` y su
 * propio comentario dice que no es `radiogroup` ni `tablist` **a propósito**:
 * `tablist` promete paneles asociados y navegación por flechas, y forzar un
 * control de `aria-pressed` a comportarse como pestañas da un componente que
 * miente a los lectores de pantalla en los dos papeles. RFC-04 y RFC-05 también
 * piden pestañas, así que la pieza vive en el design system y **paga su ancla**
 * en `public-api.test.ts`.
 *
 * Las cuatro cosas que un `tablist` roto incumple, y que están testeadas:
 *
 * 1. **Los roles son los tres del patrón**: `tablist` con nombre, `tab` con
 *    `aria-selected`, y `tabpanel` etiquetado por su pestaña.
 * 2. **Las flechas mueven** (izquierda/derecha, con `Home`/`End`) y **dan la
 *    vuelta** en los extremos. La activación es **automática**: moverse con las
 *    flechas cambia la pestaña, que es lo correcto cuando el panel se pinta al
 *    instante y no hay que ir a buscar nada.
 * 3. **El carril es UNA sola parada de tabulación** (`tabindex` rotatorio): la
 *    elegida vale `0` y las demás `-1`, así que el tabulador entra al grupo y
 *    sale de él, en vez de recorrer N pestañas.
 * 4. **Sólo se monta el panel de la pestaña elegida**, y por eso `aria-controls`
 *    lo lleva **sólo** la elegida: apuntar a un `id` que no existe es un atributo
 *    ARIA inválido y `axe` lo marca.
 *
 * El panel es una **parada de tabulación** (`tabindex="0"`) porque su contenido
 * puede no tener ninguna —el tab General es texto—, y sin eso quien navega por
 * teclado no puede llevar el foco a lo que acaba de abrir.
 *
 * Presentación pura: no guarda estado. Quien lo monta decide qué pestaña está
 * elegida, igual que con `SegmentedControl`.
 */
export function Tabs<TValue extends string>({
  label,
  tabs,
  value,
  onValueChange,
  className,
}: TabsProps<TValue>) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* La elegida es UNA POSICIÓN, no un valor repetido: si dos pestañas
     compartieran `value` —lo único que el tipo no puede impedir— se marca la
     primera y ninguna más. Mismo criterio que `SegmentedControl`. */
  const selectedIndex = tabs.findIndex((tab) => tab.value === value);
  /* Sin ninguna coincidencia no habría parada de tabulación en todo el carril y
     el grupo quedaría inalcanzable por teclado: la primera hace de puerta. */
  const focusIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const tabId = (index: number) => `${baseId}-tab-${String(index)}`;
  const panelId = (index: number) => `${baseId}-panel-${String(index)}`;

  function select(index: number) {
    const target = tabs[index];
    if (target === undefined) {
      return;
    }
    tabRefs.current[index]?.focus();
    onValueChange(target.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = tabs.length - 1;
    if (last < 0) {
      return;
    }

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        select(focusIndex === last ? 0 : focusIndex + 1);
        return;
      case "ArrowLeft":
        event.preventDefault();
        select(focusIndex === 0 ? last : focusIndex - 1);
        return;
      case "Home":
        event.preventDefault();
        select(0);
        return;
      case "End":
        event.preventDefault();
        select(last);
        return;
      default:
        return;
    }
  }

  const selected = selectedIndex === -1 ? undefined : tabs[selectedIndex];

  return (
    <div data-slot="tabs" className={cn(tabsVariants(), className)}>
      <div
        data-slot="tabs-list"
        role="tablist"
        aria-label={label}
        className={tabsListVariants()}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab, index) => (
          /* La clave lleva la posición delante por lo mismo que en el
             segmentado: la identidad de una pestaña es el hueco que ocupa. */
          <button
            key={`${String(index)}-${tab.value}`}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            data-slot="tab"
            role="tab"
            id={tabId(index)}
            aria-selected={index === selectedIndex}
            aria-controls={index === selectedIndex ? panelId(index) : undefined}
            tabIndex={index === focusIndex ? 0 : -1}
            className={tabVariants()}
            onClick={() => onValueChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selected === undefined ? null : (
        <div
          data-slot="tabpanel"
          role="tabpanel"
          id={panelId(selectedIndex)}
          aria-labelledby={tabId(selectedIndex)}
          tabIndex={0}
          className={tabPanelVariants()}
        >
          {selected.content}
        </div>
      )}
    </div>
  );
}
