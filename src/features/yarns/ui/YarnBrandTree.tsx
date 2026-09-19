import { useEffect, useState } from "react";

import { Disclosure } from "@/shared/ui";
import type { BrandRecord, YarnTypeRecord } from "@/features/yarns/types";

/**
 * Nombre del ÚNICO grupo de radios que cubre el árbol entero (design D5-bis):
 * "Todas las marcas" arriba y, dentro de cada panel, "Toda la marca" y un
 * radio por tipo, todos con este `name` aunque vivan en subárboles del DOM
 * distintos — así agrupa HTML los radios, no por anidamiento.
 */
export const YARN_SCOPE_GROUP_NAME = "yarn-scope";

export const ALL_BRANDS_LABEL = "Todas las marcas";
export const WHOLE_BRAND_LABEL = "Toda la marca";
export const TREE_LOAD_ERROR = "No se pudo cargar el árbol de marcas.";

const RADIO_CLASSES = [
  "size-(--space-5) shrink-0 accent-accent cursor-pointer",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");

export interface YarnBrandTreeProps {
  /** `"all"` | `brandId` | `` `${brandId}:${typeId}` `` — un solo valor exclusivo. */
  value: string;
  onValueChange: (value: string) => void;
}

type BrandTreeEntry = { brand: BrandRecord; types: YarnTypeRecord[] };
type BrandTreeState =
  | { status: "loading" }
  | { status: "ready"; entries: BrandTreeEntry[] }
  | { status: "failed" };

/**
 * `GET /api/brands` y luego `Promise.all` sobre `GET /api/brands/:id/types`
 * (design D7): una sola vez, en paralelo, sin depender de ningún filtro. Un
 * fallo en cualquier tramo se atrapa entero y nunca se propaga — quien llama
 * lo lee como "panel deshabilitado", no como una excepción que tire la
 * página abajo.
 */
async function fetchTree(): Promise<BrandTreeState> {
  try {
    const brandsResponse = await fetch("/api/brands", {
      credentials: "same-origin",
    });
    if (!brandsResponse.ok) {
      return { status: "failed" };
    }
    const { brands } = (await brandsResponse.json()) as {
      brands: BrandRecord[];
    };

    const entries = await Promise.all(
      brands.map(async (brand): Promise<BrandTreeEntry> => {
        const typesResponse = await fetch(`/api/brands/${brand.id}/types`, {
          credentials: "same-origin",
        });
        if (!typesResponse.ok) {
          throw new Error("no se pudo leer los tipos de la marca");
        }
        const { types } = (await typesResponse.json()) as {
          types: YarnTypeRecord[];
        };
        return { brand, types };
      }),
    );
    return { status: "ready", entries };
  } catch {
    return { status: "failed" };
  }
}

/**
 * Árbol marca→tipo (RFC-04 §2/§5, design D5/D5-bis/D7). Cada marca es un
 * `Disclosure`: el `<summary>` sólo expande, y "seleccionar" vive en radios
 * nativos DENTRO del panel — nunca anidados en el propio `<summary>`, que es
 * quien ya posee la activación por teclado.
 *
 * El estado de apertura de cada `Disclosure` es no controlado y ajeno al
 * valor elegido (design D5-bis): colapsar una marca nunca cambia el filtro,
 * así que la marca que sostiene la selección activa lo anuncia en su propio
 * `summary` (siempre montado, cerrado o no), no en el panel que se desmonta.
 */
export function YarnBrandTree({ value, onValueChange }: YarnBrandTreeProps) {
  const [state, setState] = useState<BrandTreeState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void fetchTree().then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "failed") {
    return (
      <div aria-disabled="true" className="flex flex-col gap-(--space-2)">
        <p className="font-body text-sm text-fg-muted">{TREE_LOAD_ERROR}</p>
      </div>
    );
  }

  const entries = state.status === "ready" ? state.entries : [];

  return (
    <fieldset className="flex flex-col gap-(--space-2)">
      <legend className="font-body text-sm font-semibold text-fg">
        Marca y tipo
      </legend>
      <label className="flex items-center gap-(--space-2) font-body text-sm text-fg">
        <input
          type="radio"
          name={YARN_SCOPE_GROUP_NAME}
          className={RADIO_CLASSES}
          checked={value === "all"}
          onChange={() => onValueChange("all")}
        />
        {ALL_BRANDS_LABEL}
      </label>

      {entries.map(({ brand, types }) => {
        const brandActive =
          value === brand.id || value.startsWith(`${brand.id}:`);
        return (
          <Disclosure
            key={brand.id}
            summary={
              <span>
                {brand.name}
                {brandActive ? (
                  <span className="font-body text-xs text-fg-muted">
                    {" "}
                    (elegida)
                  </span>
                ) : null}
              </span>
            }
          >
            <div className="flex flex-col gap-(--space-1) pl-(--space-4)">
              <label className="flex items-center gap-(--space-2) font-body text-sm text-fg">
                <input
                  type="radio"
                  name={YARN_SCOPE_GROUP_NAME}
                  className={RADIO_CLASSES}
                  checked={value === brand.id}
                  onChange={() => onValueChange(brand.id)}
                />
                {WHOLE_BRAND_LABEL}
              </label>
              {types.map((type) => (
                <label
                  key={type.id}
                  className="flex items-center gap-(--space-2) font-body text-sm text-fg"
                >
                  <input
                    type="radio"
                    name={YARN_SCOPE_GROUP_NAME}
                    className={RADIO_CLASSES}
                    checked={value === `${brand.id}:${type.id}`}
                    onChange={() => onValueChange(`${brand.id}:${type.id}`)}
                  />
                  {type.name}
                </label>
              ))}
            </div>
          </Disclosure>
        );
      })}
    </fieldset>
  );
}
