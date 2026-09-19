// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  CATALOG_BRAND_NAME_LABEL,
  CATALOG_CREATE_BRAND_LABEL,
  CATALOG_CREATE_TYPE_LABEL,
  CATALOG_EMPTY_MESSAGE,
  CATALOG_LOAD_ERROR,
  CATALOG_SECTION_LABEL,
  CATALOG_TYPE_NAME_LABEL,
  RETRY_LABEL,
} from "./yarn-copy";
import { YarnCatalogPanel } from "./YarnCatalogPanel";

const BRAND_A = { id: "brand-a", userId: "u", name: "Malabrigo" };
const TYPE_A1 = { id: "type-a1", brandId: "brand-a", name: "Merino Worsted" };
const NEW_BRAND = { id: "brand-new", userId: "u", name: "Cascada" };
const NEW_TYPE = { id: "type-new", brandId: "brand-a", name: "Sock" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function defaultFetch(url: string): Promise<Response> {
  if (url === "/api/brands") {
    return Promise.resolve(jsonResponse(200, { brands: [BRAND_A] }));
  }
  if (url === `/api/brands/${BRAND_A.id}/types`) {
    return Promise.resolve(jsonResponse(200, { types: [TYPE_A1] }));
  }
  return Promise.reject(new Error(`url inesperada: ${url}`));
}

function emptyFetch(url: string): Promise<Response> {
  if (url === "/api/brands") {
    return Promise.resolve(jsonResponse(200, { brands: [] }));
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

async function openPanel() {
  await userEvent.click(screen.getByText(CATALOG_SECTION_LABEL));
}

describe("YarnCatalogPanel — estados de carga (SDD-01 §9)", () => {
  it("aria-busy mientras el árbol propio del panel está en vuelo", async () => {
    let resolveBrands: (response: Response) => void = () => {};
    fetchSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBrands = resolve;
        }),
    );

    render(<YarnCatalogPanel />);
    await openPanel();

    expect(screen.getByRole("group", { name: CATALOG_SECTION_LABEL })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    resolveBrands(jsonResponse(200, { brands: [BRAND_A] }));
    await screen.findByText(BRAND_A.name);
  });

  it("failed muestra el mensaje y un reintento que vuelve a pedir el catálogo", async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.reject(new Error("sin red")),
    );

    render(<YarnCatalogPanel />);
    await openPanel();

    expect(await screen.findByText(CATALOG_LOAD_ERROR)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: RETRY_LABEL }));

    expect(await screen.findByText(BRAND_A.name)).toBeInTheDocument();
  });

  it("empty muestra el mensaje propio Y sigue montando el formulario de creación", async () => {
    fetchSpy.mockImplementation(emptyFetch);

    render(<YarnCatalogPanel />);
    await openPanel();

    expect(await screen.findByText(CATALOG_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: CATALOG_CREATE_BRAND_LABEL }),
    ).toBeInTheDocument();
  });

  it("ready muestra la marca y sus tipos existentes", async () => {
    render(<YarnCatalogPanel />);
    await openPanel();

    expect(await screen.findByText(BRAND_A.name)).toBeInTheDocument();
    await userEvent.click(screen.getByText(BRAND_A.name));
    expect(await screen.findByText(TYPE_A1.name)).toBeInTheDocument();
  });
});

describe("YarnCatalogPanel — crear marca (design D4)", () => {
  it("un 201 agrega la marca a la lista, limpia el campo y avisa una vez", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/brands" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(201, { brand: NEW_BRAND }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    await openPanel();
    await screen.findByText(BRAND_A.name);

    const input = screen.getByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL });
    await userEvent.type(input, NEW_BRAND.name);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_BRAND_LABEL }),
    );

    expect(await screen.findByText(NEW_BRAND.name)).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(onCatalogChange).toHaveBeenCalledTimes(1);
  });

  it("un 400 muestra el error, no agrega nada y no avisa", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/brands" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(400, { error: "nombre inválido" }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    await openPanel();
    await screen.findByText(BRAND_A.name);

    const input = screen.getByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL });
    await userEvent.type(input, "x");
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_BRAND_LABEL }),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(NEW_BRAND.name)).toBeNull();
    expect(onCatalogChange).not.toHaveBeenCalled();
  });
});

describe("YarnCatalogPanel — crear tipo bajo una marca (design D4)", () => {
  it("un 201 agrega el tipo al panel anidado de esa marca y avisa una vez", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === `/api/brands/${BRAND_A.id}/types` && init?.method === "POST") {
        return Promise.resolve(jsonResponse(201, { type: NEW_TYPE }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    await openPanel();
    await screen.findByText(BRAND_A.name);
    await userEvent.click(screen.getByText(BRAND_A.name));
    await screen.findByText(TYPE_A1.name);

    const brandPanel = screen.getByRole("group", { name: BRAND_A.name });
    const input = within(brandPanel).getByRole("textbox", {
      name: CATALOG_TYPE_NAME_LABEL,
    });
    await userEvent.type(input, NEW_TYPE.name);
    await userEvent.click(
      within(brandPanel).getByRole("button", { name: CATALOG_CREATE_TYPE_LABEL }),
    );

    expect(await within(brandPanel).findByText(NEW_TYPE.name)).toBeInTheDocument();
    expect(onCatalogChange).toHaveBeenCalledTimes(1);
  });

  it("un 404 (marca borrada por otro) muestra el error y no avisa", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === `/api/brands/${BRAND_A.id}/types` && init?.method === "POST") {
        return Promise.resolve(jsonResponse(404, { error: "La marca no existe." }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    await openPanel();
    await screen.findByText(BRAND_A.name);
    await userEvent.click(screen.getByText(BRAND_A.name));
    await screen.findByText(TYPE_A1.name);

    const brandPanel = screen.getByRole("group", { name: BRAND_A.name });
    const input = within(brandPanel).getByRole("textbox", {
      name: CATALOG_TYPE_NAME_LABEL,
    });
    await userEvent.type(input, "Sock");
    await userEvent.click(
      within(brandPanel).getByRole("button", { name: CATALOG_CREATE_TYPE_LABEL }),
    );

    expect(await within(brandPanel).findByRole("alert")).toBeInTheDocument();
    expect(onCatalogChange).not.toHaveBeenCalled();
  });
});

describe("YarnCatalogPanel — accesibilidad", () => {
  it("no tiene violaciones de axe con el panel abierto y poblado", async () => {
    const { container } = render(<YarnCatalogPanel />);
    await openPanel();
    await screen.findByText(BRAND_A.name);

    expect(await axe(container)).toHaveNoViolations();
  });
});
