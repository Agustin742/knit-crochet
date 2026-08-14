import { describe, expect, it } from "vitest";

import { COLOR_FAMILY_LABELS } from "@/shared/config";

import {
  CRAFT_TYPE_LABELS,
  CRAFT_TYPE_ORDER,
  DEFAULT_STATUS_FILTER,
  STATUS_FILTERS,
  filterByName,
  isActiveFilter,
  normalizeText,
  toTypeFilter,
  toYarnChoices,
} from "./project-filters";
import type { SerializedProject, YarnOption } from "./types";

function project(patch: Partial<SerializedProject>): SerializedProject {
  return {
    id: "p",
    userId: "u",
    name: "Proyecto",
    image: null,
    type: "knitting",
    status: "in_progress",
    rounds: 0,
    targetRounds: 0,
    progress: 0,
    needles: [],
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: null,
    time: 0,
    patternId: null,
    completedSteps: [],
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

const GORRO = project({ id: "gorro", name: "Gorró de lana" });
const BUFANDA = project({ id: "bufanda", name: "Bufanda de invierno" });
const MEDIAS = project({ id: "medias", name: "Medias" });
const ALL = [GORRO, BUFANDA, MEDIAS];

/**
 * ANCLA del segmentado (enmienda E1(i)): son **dos** opciones y el default es
 * **activos**. El default es de cliente y no del backend: sin el parámetro
 * `active` el endpoint devuelve todo, no sólo los activos.
 */
describe("STATUS_FILTERS (segmentado activo/inactivo)", () => {
  it("has exactly the two options, in order", () => {
    expect(STATUS_FILTERS.map((option) => option.value)).toEqual([
      "active",
      "inactive",
    ]);
  });

  it("defaults to the active half", () => {
    expect(DEFAULT_STATUS_FILTER).toBe("active");
    expect(isActiveFilter(DEFAULT_STATUS_FILTER)).toBe(true);
    expect(isActiveFilter("inactive")).toBe(false);
  });
});

describe("toTypeFilter (un craft type por petición)", () => {
  it("sends no filter when none or both are pressed", () => {
    expect(toTypeFilter([])).toBeUndefined();
    expect(toTypeFilter(["knitting", "crochet"])).toBeUndefined();
  });

  it("sends the single selected craft", () => {
    expect(toTypeFilter(["crochet"])).toBe("crochet");
  });

  it("labels both crafts of the enum", () => {
    for (const craft of CRAFT_TYPE_ORDER) {
      expect(CRAFT_TYPE_LABELS[craft].trim(), craft).not.toBe("");
    }
    expect(CRAFT_TYPE_ORDER).toHaveLength(2);
  });
});

/**
 * "Buscar" es de **cliente** (enmienda E1(a)): el backend no tiene ningún
 * parámetro de texto y, al ser un `z.object` sin `.strict()`, mandarle uno
 * respondería 200 con la lista **sin filtrar**.
 */
describe("filterByName (el buscador de cliente)", () => {
  it("returns everything when the search is empty or blank", () => {
    expect(filterByName(ALL, "")).toEqual(ALL);
    expect(filterByName(ALL, "   ")).toEqual(ALL);
  });

  it("matches a substring, case-insensitively", () => {
    expect(filterByName(ALL, "BUF").map((entry) => entry.id)).toEqual([
      "bufanda",
    ]);
    expect(filterByName(ALL, "de").map((entry) => entry.id)).toEqual([
      "gorro",
      "bufanda",
    ]);
  });

  /** Buscar "gorro" tiene que encontrar "Gorró": nadie escribe las tildes. */
  it("ignores diacritics on both sides", () => {
    expect(filterByName(ALL, "gorro").map((entry) => entry.id)).toEqual([
      "gorro",
    ]);
    expect(filterByName(ALL, "gorró").map((entry) => entry.id)).toEqual([
      "gorro",
    ]);
    expect(normalizeText("  MEDIÁS ")).toBe("medias");
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterByName(ALL, "chaleco")).toEqual([]);
  });

  it("does not mutate the list it receives", () => {
    const original = [...ALL];
    filterByName(ALL, "buf");
    expect(ALL).toEqual(original);
  });
});

/**
 * La lana se etiqueta **sólo por color** (enmienda E1(d)): `GET /api/yarns`
 * devuelve `brandId`/`typeId` como UUID, sin nombres. La familia se añade
 * únicamente cuando el nombre de color se repite.
 */
describe("toYarnChoices (etiqueta del selector de lana)", () => {
  function yarn(patch: Partial<YarnOption>): YarnOption {
    return {
      id: "y",
      colorName: "Crudo",
      colorFamily: "neutral",
      ...patch,
    };
  }

  it("uses the colour name alone when it is unique", () => {
    expect(
      toYarnChoices([
        yarn({ id: "a", colorName: "Crudo" }),
        yarn({ id: "b", colorName: "Petróleo", colorFamily: "blue" }),
      ]),
    ).toEqual([
      { id: "a", label: "Crudo" },
      { id: "b", label: "Petróleo" },
    ]);
  });

  it("disambiguates repeated colour names with the family", () => {
    expect(
      toYarnChoices([
        yarn({ id: "a", colorName: "Crudo", colorFamily: "neutral" }),
        yarn({ id: "b", colorName: "crudo", colorFamily: "white" }),
      ]),
    ).toEqual([
      { id: "a", label: `Crudo (${COLOR_FAMILY_LABELS.neutral})` },
      { id: "b", label: `crudo (${COLOR_FAMILY_LABELS.white})` },
    ]);
  });

  it("keeps the empty list empty", () => {
    expect(toYarnChoices([])).toEqual([]);
  });
});
