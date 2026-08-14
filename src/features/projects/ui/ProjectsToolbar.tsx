"use client";

import { NEEDLE_SIZES, type CraftType } from "@/shared/config";
import { formatDecimal } from "@/shared/lib/format";
import { Card, Field, Input, Toggle, ToggleGroup, inputClasses } from "@/shared/ui";

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
export const SEARCH_HINT =
  "Filtra por nombre sobre los proyectos ya cargados, sin volver a pedirlos.";
export const MORE_FILTERS_LABEL = "Más filtros";
export const NEEDLE_LABEL = "Aguja";
export const YARN_LABEL = "Lana usada";
export const ANY_OPTION_LABEL = "Todas";

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
 * botones de tipo, "más filtros" y buscar.
 *
 * Tres decisiones de la enmienda E1 que se ven en el marcado:
 *
 * - **El segmentado son dos `Toggle`** dentro de un `ToggleGroup`, con la
 *   exclusividad impuesta desde aquí (E1(i)): el grupo aporta el nombre
 *   accesible obligatorio pero **no** impone exclusividad, y crear un primitivo
 *   de segmentado tocaría `public-api.test.ts`, anclado al literal.
 * - **"Más filtros" es un `<details>`/`<summary>` nativo** (E1(g)): no hay
 *   primitivo de desplegable en el design system, `<details>` es accesible de
 *   fábrica, no usa portal y no arrastra el gate del bloqueo de scroll que sí
 *   exigiría un `Dialog`. Para dos campos, un modal es desproporcionado.
 * - **Buscar es de cliente** (E1(a)): el texto no viaja a ningún parámetro.
 *
 * Los campos van **dentro de un `Card`** y no sueltos sobre el fondo: `Field`
 * pinta su etiqueta con el primer plano oscuro, ilegible sobre el espresso de la
 * app, y la variante elevada es la única superficie donde el anillo de foco
 * llega al contraste mínimo (deuda 31).
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
    <section
      aria-label={TOOLBAR_LABEL}
      className="flex flex-col gap-(--space-4)"
    >
      <div className="flex flex-wrap items-end gap-(--space-4)">
        <ToggleGroup
          label={STATUS_GROUP_LABEL}
          className="flex flex-wrap gap-(--space-2)"
        >
          {STATUS_FILTERS.map((option) => (
            <Toggle
              key={option.value}
              pressed={status === option.value}
              onPressedChange={() => onStatusChange(option.value)}
            >
              {option.label}
            </Toggle>
          ))}
        </ToggleGroup>

        <ToggleGroup
          label={TYPE_GROUP_LABEL}
          className="flex flex-wrap gap-(--space-2)"
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

        <Card className="p-(--space-3)">
          <Field label={SEARCH_LABEL} hint={SEARCH_HINT}>
            <Input
              type="search"
              name="search"
              autoComplete="off"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </Field>
        </Card>
      </div>

      <details className="w-full">
        <summary className={SUMMARY_CLASSES}>{MORE_FILTERS_LABEL}</summary>

        <Card className="mt-(--space-3) flex flex-wrap gap-(--space-4) p-(--space-3)">
          <Field label={NEEDLE_LABEL}>
            <select
              className={inputClasses}
              value={needle === null ? "" : String(needle)}
              onChange={(event) =>
                onNeedleChange(
                  event.target.value === "" ? null : Number(event.target.value),
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
        </Card>
      </details>
    </section>
  );
}

/**
 * El `summary` va sobre el fondo de la app, así que usa el primer plano
 * `inverse` —igual que los títulos de sección del Dashboard— y declara su propio
 * anillo de foco: no es un `Button`, y sin esto el foco de teclado sería
 * invisible sobre el espresso.
 */
const SUMMARY_CLASSES = [
  "inline-flex min-h-(--touch-target) cursor-pointer items-center",
  "font-body font-semibold text-fg-inverse",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");
