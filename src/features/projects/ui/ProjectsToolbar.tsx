"use client";

import { NEEDLE_SIZES, type CraftType } from "@/shared/config";
import { formatDecimal } from "@/shared/lib/format";
import {
  Card,
  Field,
  Input,
  SegmentedControl,
  Toggle,
  ToggleGroup,
  inputClasses,
} from "@/shared/ui";

import {
  CRAFT_TYPE_LABELS,
  CRAFT_TYPE_ORDER,
  STATUS_FILTERS,
  type StatusFilter,
  type YarnChoice,
} from "./project-filters";

export const TOOLBAR_LABEL = "Filtros de proyectos";
export const STATUS_GROUP_LABEL = "Estado del proyecto";
export const TYPE_GROUP_LABEL = "Tipo de tejido";
export const SEARCH_LABEL = "Buscar";
export const MORE_FILTERS_LABEL = "Más filtros";
export const NEEDLE_LABEL = "Aguja";
export const YARN_LABEL = "Lana usada";
export const ANY_OPTION_LABEL = "Todas";

/** Ids de las etiquetas visibles de los dos grupos (enmienda E2(c), punto 1). */
const STATUS_GROUP_LABEL_ID = "projects-status-label";
const TYPE_GROUP_LABEL_ID = "projects-type-label";

/**
 * Las dos mitades del segmentado, en la forma que pide el primitivo.
 *
 * El `value` que sale de aquí es `StatusFilter`, no `string`: el segmentado es
 * **genérico sobre sus opciones** (deuda 148), infiere el juego desde esta lista
 * y devuelve el tipo del dominio en `onValueChange`. Por eso el consumidor ya no
 * reconstruye el tipo buscando la opción a mano — y un `value` que no fuera una
 * de estas dos mitades ni siquiera compilaría.
 */
const STATUS_OPTIONS = STATUS_FILTERS.map((option) => ({
  value: option.value,
  label: option.label,
}));

/** "4,5 mm": la coma decimal es la del idioma, y sale de `Intl`, no a mano. */
export function needleOptionLabel(millimetres: number): string {
  return `${formatDecimal(millimetres)} mm`;
}

export interface ProjectsToolbarProps {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  types: readonly CraftType[];
  onToggleType: (type: CraftType) => void;
  search: string;
  onSearchChange: (search: string) => void;
  needle: number | null;
  onNeedleChange: (needle: number | null) => void;
  yarnId: string | null;
  onYarnChange: (yarnId: string | null) => void;
  yarnChoices: readonly YarnChoice[];
}

/**
 * Toolbar de la lista de proyectos (RFC-03 §2): segmentado activo/inactivo,
 * botones de tipo, buscar y "más filtros".
 *
 * **Todo el toolbar vive en UNA sola superficie** (enmienda E2(b)). Antes medio
 * toolbar flotaba sobre el fondo espresso y medio sobre una tarjeta elevada, en
 * una fila que mezclaba hijos del alto de un objetivo táctil con uno del triple:
 * la tarjeta se leía como un **diálogo abierto** y quedaba un hueco muerto
 * encima de los botones (deuda 136). Ahora hay una sola tarjeta y una sola línea
 * de base.
 *
 * **La tarjeta se queda en la variante elevada, y es obligatorio**: es la única
 * superficie clara del sistema donde el anillo de foco llega al mínimo de
 * contraste (deuda 31). La plana no vale. Y por el mismo motivo al revés, el
 * `summary` de "más filtros" usa el primer plano **normal** y no el inverso:
 * dentro de esta tarjeta, el crema sobre la superficie elevada se lee a 1.14:1
 * (la deuda 32 dada vuelta).
 *
 * **Los dos grupos llevan etiqueta VISIBLE** (enmienda E2(c), punto 1). Antes
 * sus nombres existían sólo como nombre accesible: quien miraba la pantalla no
 * los veía, y por eso los cuatro botones en fila parecían un único grupo de
 * cuatro. La etiqueta visible pasa a ser **el** nombre accesible vía
 * `aria-labelledby` —que gana sobre `aria-label`—, así que un lector de pantalla
 * no oye el nombre dos veces.
 *
 * Y **la forma de cada grupo dice lo que hace** (enmienda E2(c), punto 2): el
 * estado es un `SegmentedControl` —carril continuo, opciones pegadas, la elegida
 * rellena— porque se elige **una**; el tipo son fichas sueltas con hueco entre
 * ellas porque se pueden marcar **varias**.
 *
 * Se conserva de E1: **"más filtros" es un `<details>` nativo** (E1(g)) y
 * **buscar es de cliente** (E1(a)), o sea que el texto no viaja a ningún
 * parámetro.
 */
export function ProjectsToolbar({
  status,
  onStatusChange,
  types,
  onToggleType,
  search,
  onSearchChange,
  needle,
  onNeedleChange,
  yarnId,
  onYarnChange,
  yarnChoices,
}: ProjectsToolbarProps) {
  return (
    <section aria-label={TOOLBAR_LABEL}>
      <Card className="flex flex-col gap-(--space-5)">
        <div className="flex flex-wrap items-end gap-(--space-6)">
          <div className="flex flex-col gap-(--space-2)">
            <span id={STATUS_GROUP_LABEL_ID} className={GROUP_LABEL_CLASSES}>
              {STATUS_GROUP_LABEL}
            </span>
            <SegmentedControl
              label={STATUS_GROUP_LABEL}
              aria-labelledby={STATUS_GROUP_LABEL_ID}
              options={STATUS_OPTIONS}
              value={status}
              onValueChange={onStatusChange}
            />
          </div>

          <div className="flex flex-col gap-(--space-2)">
            <span id={TYPE_GROUP_LABEL_ID} className={GROUP_LABEL_CLASSES}>
              {TYPE_GROUP_LABEL}
            </span>
            <ToggleGroup
              label={TYPE_GROUP_LABEL}
              aria-labelledby={TYPE_GROUP_LABEL_ID}
            >
              {CRAFT_TYPE_ORDER.map((candidate) => (
                <Toggle
                  key={candidate}
                  pressed={types.includes(candidate)}
                  onPressedChange={() => onToggleType(candidate)}
                >
                  {CRAFT_TYPE_LABELS[candidate]}
                </Toggle>
              ))}
            </ToggleGroup>
          </div>

          {/* El buscador ocupa lo que sobra en vez de flotar a la derecha: es lo
              que cierra la fila y hace que el toolbar se lea como una barra y no
              como una tarjeta suelta. */}
          <div className="min-w-0 flex-1">
            <Field label={SEARCH_LABEL}>
              <Input
                type="search"
                name="search"
                autoComplete="off"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <details>
          <summary className={SUMMARY_CLASSES}>{MORE_FILTERS_LABEL}</summary>

          <div className="mt-(--space-4) flex flex-wrap gap-(--space-4)">
            <Field label={NEEDLE_LABEL}>
              <select
                className={inputClasses}
                value={needle === null ? "" : String(needle)}
                onChange={(event) =>
                  onNeedleChange(
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
              >
                <option value="">{ANY_OPTION_LABEL}</option>
                {NEEDLE_SIZES.map((size) => (
                  <option key={size} value={String(size)}>
                    {needleOptionLabel(size)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={YARN_LABEL}>
              <select
                className={inputClasses}
                value={yarnId ?? ""}
                onChange={(event) =>
                  onYarnChange(
                    event.target.value === "" ? null : event.target.value,
                  )
                }
              >
                <option value="">{ANY_OPTION_LABEL}</option>
                {yarnChoices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </details>
      </Card>
    </section>
  );
}

/**
 * Etiqueta visible de un grupo de controles. Misma tipografía y mismo peso que
 * la etiqueta de `Field` —que es la de "Buscar", "Aguja" y "Lana usada"—, para
 * que las cinco etiquetas del toolbar se lean como una sola familia.
 */
const GROUP_LABEL_CLASSES = "font-body font-semibold text-sm text-fg";

/**
 * El `summary` ahora vive **dentro** de la tarjeta, o sea sobre una superficie
 * clara: usa el primer plano normal, no el inverso (ver el JSDoc del
 * componente). Declara su propio anillo de foco porque no es un `Button` y sin
 * él el foco de teclado no se vería.
 */
const SUMMARY_CLASSES = [
  "inline-flex min-h-(--touch-target) cursor-pointer items-center",
  "font-body font-semibold text-fg",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");
