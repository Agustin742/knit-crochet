// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { COLOR_FAMILY_LABELS } from "@/shared/config";

import { YarnFilterPanel, parseScope, scopeOf } from "./YarnFilterPanel";
import type { YarnFilters } from "./types";

const BRAND = { id: "brand-a", userId: "u", name: "Malabrigo" };
const TYPE = { id: "type-a1", brandId: "brand-a", name: "Merino Worsted" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function defaultFetch(url: string): Promise<Response> {
  if (url === "/api/brands") {
    return Promise.resolve(jsonResponse(200, { brands: [BRAND] }));
  }
  if (url === `/api/brands/${BRAND.id}/types`) {
    return Promise.resolve(jsonResponse(200, { types: [TYPE] }));
  }
  return Promise.reject(new Error(`url inesperada: ${url}`));
}

const fetchSpy = vi.fn(defaultFetch);

beforeEach(() => {
  fetchSpy.mockImplementation(defaultFetch);
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("scopeOf / parseScope — el único valor exclusivo del árbol (design D5-bis)", () => {
  it("sin marca ni tipo, el valor es 'all' y viceversa", () => {
    expect(scopeOf({})).toBe("all");
    expect(parseScope("all")).toEqual({});
  });

  it("con marca sola, el valor es el brandId sin typeId y viceversa", () => {
    expect(scopeOf({ brandId: "b" })).toBe("b");
    expect(parseScope("b")).toEqual({ brandId: "b" });
  });

  it("con marca y tipo, el valor combina los dos y viceversa", () => {
    expect(scopeOf({ brandId: "b", typeId: "t" })).toBe("b:t");
    expect(parseScope("b:t")).toEqual({ brandId: "b", typeId: "t" });
  });
});

describe("YarnFilterPanel — árbol y color se combinan con AND (RFC-04 §5)", () => {
  it("marca, tipo y color se acumulan en un solo objeto de filtros", async () => {
    let filters: YarnFilters = {};
    const onFiltersChange = vi.fn((next: YarnFilters) => {
      filters = next;
    });

    const { rerender } = render(
      <YarnFilterPanel filters={filters} onFiltersChange={onFiltersChange} />,
    );

    await userEvent.click(await screen.findByText(BRAND.name));
    await userEvent.click(
      await screen.findByRole("radio", { name: "Toda la marca" }),
    );
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      brandId: BRAND.id,
      colorFamily: undefined,
    });

    rerender(
      <YarnFilterPanel filters={filters} onFiltersChange={onFiltersChange} />,
    );
    await userEvent.click(
      await screen.findByRole("radio", { name: TYPE.name }),
    );
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      brandId: BRAND.id,
      typeId: TYPE.id,
      colorFamily: undefined,
    });

    rerender(
      <YarnFilterPanel filters={filters} onFiltersChange={onFiltersChange} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.red }),
    );
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      brandId: BRAND.id,
      typeId: TYPE.id,
      colorFamily: "red",
    });
  });

  /**
   * Un solo grupo de radios nativo (`name="yarn-scope"`) sólo tiene UNA
   * parada de tabulación para el grupo entero — la del radio marcado — y las
   * demás quedan fuera de la secuencia de `Tab` hasta que se marcan (medido
   * con un experimento descartable antes de escribir este test: `Tab` NO
   * alcanza un radio sin marcar de un grupo, aunque esté recién montado).
   * Design D5-bis lo dice con estas palabras: "Tab into the panel, then
   * Space or arrow keys selects" — así que el pase real usa flechas DENTRO
   * del grupo, no una cadena de `Tab`, y sólo vuelve a `Tab` para salir de
   * él hacia la fila de color.
   */
  it("un pase de sólo teclado alcanza marca, tipo y una muestra de color", async () => {
    const onFiltersChange = vi.fn();
    render(
      <YarnFilterPanel filters={{}} onFiltersChange={onFiltersChange} />,
    );
    await screen.findByText(BRAND.name);

    await userEvent.tab();
    expect(
      screen.getByRole("radio", { name: "Todas las marcas" }),
    ).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByText(BRAND.name).closest("summary")).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await userEvent.tab({ shift: true });
    expect(
      screen.getByRole("radio", { name: "Todas las marcas" }),
    ).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Toda la marca" })).toHaveFocus();
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      brandId: BRAND.id,
      colorFamily: undefined,
    });

    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: TYPE.name })).toHaveFocus();

    await userEvent.tab();
    expect(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.red }),
    ).toHaveFocus();
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = render(
      <YarnFilterPanel filters={{}} onFiltersChange={vi.fn()} />,
    );
    await screen.findByText(BRAND.name);

    expect(await axe(container)).toHaveNoViolations();
  });
});
