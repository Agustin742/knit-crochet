// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  ALL_BRANDS_LABEL,
  TREE_LOAD_ERROR,
  WHOLE_BRAND_LABEL,
  YARN_SCOPE_GROUP_NAME,
  YarnBrandTree,
} from "./YarnBrandTree";

const BRAND_A = { id: "brand-a", userId: "u", name: "Malabrigo" };
const BRAND_B = { id: "brand-b", userId: "u", name: "Cascada" };
const TYPE_A1 = { id: "type-a1", brandId: "brand-a", name: "Merino Worsted" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function defaultFetch(url: string): Promise<Response> {
  if (url === "/api/brands") {
    return Promise.resolve(jsonResponse(200, { brands: [BRAND_A, BRAND_B] }));
  }
  if (url === `/api/brands/${BRAND_A.id}/types`) {
    return Promise.resolve(jsonResponse(200, { types: [TYPE_A1] }));
  }
  if (url === `/api/brands/${BRAND_B.id}/types`) {
    return Promise.resolve(jsonResponse(200, { types: [] }));
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

describe("YarnBrandTree — marca sola vs. marca+tipo (design D5-bis)", () => {
  it("selecciona 'Toda la marca' y fija brandId sin typeId", async () => {
    const onValueChange = vi.fn();
    render(<YarnBrandTree value="all" onValueChange={onValueChange} />);

    await userEvent.click(await screen.findByText(BRAND_A.name));
    await userEvent.click(
      await screen.findByRole("radio", { name: WHOLE_BRAND_LABEL }),
    );

    expect(onValueChange).toHaveBeenCalledWith(BRAND_A.id);
  });

  it("selecciona un tipo y fija brandId y typeId juntos", async () => {
    const onValueChange = vi.fn();
    render(<YarnBrandTree value="all" onValueChange={onValueChange} />);

    await userEvent.click(await screen.findByText(BRAND_A.name));
    await userEvent.click(
      await screen.findByRole("radio", { name: TYPE_A1.name }),
    );

    expect(onValueChange).toHaveBeenCalledWith(`${BRAND_A.id}:${TYPE_A1.id}`);
  });

  it("selecciona 'Todas las marcas' y limpia brandId y typeId de una", async () => {
    const onValueChange = vi.fn();
    render(
      <YarnBrandTree
        value={`${BRAND_A.id}:${TYPE_A1.id}`}
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: ALL_BRANDS_LABEL }));

    expect(onValueChange).toHaveBeenCalledWith("all");
  });
});

describe("YarnBrandTree — un solo grupo de radios cubre el árbol entero", () => {
  it("todos los radios comparten el mismo name, aunque vivan en paneles distintos", async () => {
    render(<YarnBrandTree value="all" onValueChange={vi.fn()} />);

    await userEvent.click(await screen.findByText(BRAND_A.name));

    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(3);
    for (const radio of radios) {
      expect(radio).toHaveAttribute("name", YARN_SCOPE_GROUP_NAME);
    }
    expect(YARN_SCOPE_GROUP_NAME).toBe("yarn-scope");
  });
});

describe("YarnBrandTree — la marca activa se ve marcada aunque su panel esté cerrado", () => {
  it("con el panel cerrado, no hay ningún radio de tipo montado pero sí la marca", async () => {
    render(<YarnBrandTree value={BRAND_A.id} onValueChange={vi.fn()} />);

    await screen.findByText(BRAND_A.name);

    expect(screen.queryByRole("radio", { name: WHOLE_BRAND_LABEL })).toBeNull();
    expect(screen.getByText(/elegida/)).toBeInTheDocument();
  });
});

describe("YarnBrandTree — un árbol que no carga no tira la página abajo", () => {
  it("degrada a un panel deshabilitado y deja el resto de la pantalla intacto", async () => {
    fetchSpy.mockImplementationOnce(() => Promise.reject(new Error("sin red")));

    render(
      <>
        <p>Lista de lanas poblada</p>
        <YarnBrandTree value="all" onValueChange={vi.fn()} />
      </>,
    );

    expect(await screen.findByText(TREE_LOAD_ERROR)).toBeInTheDocument();
    expect(screen.getByText("Lista de lanas poblada")).toBeInTheDocument();
  });
});

describe("YarnBrandTree — accesibilidad", () => {
  it("no tiene violaciones de axe con el árbol ya cargado", async () => {
    const { container } = render(
      <YarnBrandTree value="all" onValueChange={vi.fn()} />,
    );
    await screen.findByText(BRAND_A.name);

    expect(await axe(container)).toHaveNoViolations();
  });
});
