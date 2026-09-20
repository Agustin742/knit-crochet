// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  CATALOG_ADD_TYPE_TRIGGER_LABEL,
  CATALOG_BRAND_NAME_LABEL,
  CATALOG_CREATE_BRAND_LABEL,
  CATALOG_CREATE_TYPE_LABEL,
  CATALOG_EMPTY_MESSAGE,
  CATALOG_LIST_SUMMARY_LABEL,
  CATALOG_LOAD_ERROR,
  CATALOG_NEW_BRAND_TRIGGER_LABEL,
  CATALOG_SECTION_LABEL,
  CATALOG_TYPE_NAME_LABEL,
  RETRY_LABEL,
  catalogCreateTypeModalTitle,
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
  await userEvent.click(screen.getByText(CATALOG_LIST_SUMMARY_LABEL));
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

    expect(
      screen.getByRole("group", { name: CATALOG_LIST_SUMMARY_LABEL }),
    ).toHaveAttribute("aria-busy", "true");

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

  it("empty muestra el mensaje propio, y el botón de alta sigue disponible fuera del acordeón", async () => {
    fetchSpy.mockImplementation(emptyFetch);

    render(<YarnCatalogPanel />);
    await openPanel();

    expect(await screen.findByText(CATALOG_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
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

describe("YarnCatalogPanel — el alta sale del acordeón a un modal (2026-09-20)", () => {
  it("el botón para crear una marca está visible sin desplegar «Catálogos»", () => {
    render(<YarnCatalogPanel />);

    expect(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.queryByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL }),
    ).toBeNull();
  });

  it("«Catálogos» encabeza su propia sección, con «Nueva marca» en la misma fila, y el acordeón sólo pliega la lista", () => {
    render(<YarnCatalogPanel />);

    const heading = screen.getByRole("heading", {
      name: CATALOG_SECTION_LABEL,
      level: 2,
    });
    const trigger = screen.getByRole("button", {
      name: CATALOG_NEW_BRAND_TRIGGER_LABEL,
    });
    expect(heading).toBeVisible();
    expect(trigger).toBeVisible();
    // El botón va DESPUÉS del encabezado en el DOM (misma fila, a la derecha).
    expect(
      heading.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // El acordeón lleva su propia etiqueta — no repite «Catálogos», que ya
    // es el encabezado de la sección.
    expect(screen.getByText(CATALOG_LIST_SUMMARY_LABEL)).toBeInTheDocument();
    expect(
      screen.queryAllByText(CATALOG_SECTION_LABEL, { selector: "summary *, summary" }),
    ).toHaveLength(0);
  });

  it("abrirlo abre un modal con el campo de nombre enfocado", async () => {
    render(<YarnCatalogPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
    );

    const modal = screen.getByRole("dialog");
    const input = within(modal).getByRole("textbox", {
      name: CATALOG_BRAND_NAME_LABEL,
    });
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it("el acordeón «Catálogos» ya no monta ningún campo de alta", async () => {
    render(<YarnCatalogPanel />);
    await openPanel();
    await screen.findByText(BRAND_A.name);

    expect(
      screen.queryByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL }),
    ).toBeNull();
  });
});

describe("YarnCatalogPanel — crear marca desde el modal (design D4)", () => {
  it("un 201 agrega la marca a la lista, cierra el modal, limpia el campo y avisa una vez", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/brands" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(201, { brand: NEW_BRAND }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
    );

    const input = screen.getByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL });
    await userEvent.type(input, NEW_BRAND.name);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_BRAND_LABEL }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(onCatalogChange).toHaveBeenCalledTimes(1);

    await openPanel();
    expect(await screen.findByText(NEW_BRAND.name)).toBeInTheDocument();

    // Reabrir el modal confirma que el campo no arrastró lo anterior.
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
    );
    expect(
      screen.getByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL }),
    ).toHaveValue("");
  });

  it("un 400 muestra el error dentro del modal, que sigue abierto, y no avisa", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/brands" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(400, { error: "nombre inválido" }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
    );

    const input = screen.getByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL });
    await userEvent.type(input, "x");
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_BRAND_LABEL }),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(NEW_BRAND.name)).toBeNull();
    expect(onCatalogChange).not.toHaveBeenCalled();
  });
});

describe("YarnCatalogPanel — crear tipo: un modal por marca (design D4, 2026-09-20)", () => {
  it("cada marca listada ofrece un control que abre SU propio modal", async () => {
    render(<YarnCatalogPanel />);
    await openPanel();
    await screen.findByText(BRAND_A.name);
    await userEvent.click(screen.getByText(BRAND_A.name));
    await screen.findByText(TYPE_A1.name);

    const brandPanel = screen.getByRole("group", { name: BRAND_A.name });
    expect(
      within(brandPanel).queryByRole("textbox", { name: CATALOG_TYPE_NAME_LABEL }),
    ).toBeNull();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: CATALOG_ADD_TYPE_TRIGGER_LABEL,
      }),
    );

    const modal = screen.getByRole("dialog");
    expect(
      within(modal).getByRole("heading", {
        name: catalogCreateTypeModalTitle(BRAND_A.name),
      }),
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("textbox", { name: CATALOG_TYPE_NAME_LABEL }),
    ).toBeInTheDocument();
  });

  it("un 201 agrega el tipo al panel anidado de esa marca, cierra el modal y avisa una vez", async () => {
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
    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: CATALOG_ADD_TYPE_TRIGGER_LABEL,
      }),
    );

    const input = screen.getByRole("textbox", { name: CATALOG_TYPE_NAME_LABEL });
    await userEvent.type(input, NEW_TYPE.name);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_TYPE_LABEL }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(onCatalogChange).toHaveBeenCalledTimes(1);
    expect(await within(brandPanel).findByText(NEW_TYPE.name)).toBeInTheDocument();
  });

  it("un 404 (marca borrada por otro) muestra el error dentro del modal y no avisa", async () => {
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
    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: CATALOG_ADD_TYPE_TRIGGER_LABEL,
      }),
    );

    const input = screen.getByRole("textbox", { name: CATALOG_TYPE_NAME_LABEL });
    await userEvent.type(input, "Sock");
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_TYPE_LABEL }),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onCatalogChange).not.toHaveBeenCalled();
  });
});

describe("YarnCatalogPanel — crear con el árbol todavía no listo (R3-001, 2026-09-20)", () => {
  it("crear una marca mientras el árbol sigue \"loading\" no la reemplaza: termina mostrando la lista completa del servidor, marca nueva incluida", async () => {
    const onCatalogChange = vi.fn();
    let resolveFirstGet: (response: Response) => void = () => {};
    let brandsGetCalls = 0;

    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/brands" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(201, { brand: NEW_BRAND }));
      }
      if (url === "/api/brands") {
        brandsGetCalls += 1;
        if (brandsGetCalls === 1) {
          // El GET inicial se queda en vuelo: es el que estaba pendiente
          // cuando se disparó el alta.
          return new Promise((resolve) => {
            resolveFirstGet = resolve;
          });
        }
        // El refetch que dispara el alta (retryToken) ve el estado real del
        // servidor: las dos marcas.
        return Promise.resolve(
          jsonResponse(200, { brands: [BRAND_A, NEW_BRAND] }),
        );
      }
      if (url === `/api/brands/${BRAND_A.id}/types`) {
        return Promise.resolve(jsonResponse(200, { types: [TYPE_A1] }));
      }
      if (url === `/api/brands/${NEW_BRAND.id}/types`) {
        return Promise.resolve(jsonResponse(200, { types: [] }));
      }
      return Promise.reject(new Error(`url inesperada: ${url}`));
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);

    // El árbol sigue "loading" (el primer GET no resolvió todavía) cuando
    // se crea la marca desde el modal, siempre visible.
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
    );
    const input = screen.getByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL });
    await userEvent.type(input, NEW_BRAND.name);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_BRAND_LABEL }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(onCatalogChange).toHaveBeenCalledTimes(1);

    // El GET viejo resuelve TARDE, con datos obsoletos (sin la marca nueva):
    // el flag `cancelled` del efecto debe impedir que pise el estado ya
    // refrescado por el refetch.
    resolveFirstGet(jsonResponse(200, { brands: [BRAND_A] }));

    await openPanel();
    expect(await screen.findByText(BRAND_A.name)).toBeInTheDocument();
    expect(await screen.findByText(NEW_BRAND.name)).toBeInTheDocument();
  });

  it("crear una marca mientras el árbol está \"failed\" también recupera la lista completa, no sólo la nueva marca", async () => {
    const onCatalogChange = vi.fn();
    let brandsGetCalls = 0;

    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/brands" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(201, { brand: NEW_BRAND }));
      }
      if (url === "/api/brands") {
        brandsGetCalls += 1;
        if (brandsGetCalls === 1) {
          return Promise.reject(new Error("sin red"));
        }
        return Promise.resolve(
          jsonResponse(200, { brands: [BRAND_A, NEW_BRAND] }),
        );
      }
      if (url === `/api/brands/${BRAND_A.id}/types`) {
        return Promise.resolve(jsonResponse(200, { types: [TYPE_A1] }));
      }
      if (url === `/api/brands/${NEW_BRAND.id}/types`) {
        return Promise.resolve(jsonResponse(200, { types: [] }));
      }
      return Promise.reject(new Error(`url inesperada: ${url}`));
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    await openPanel();
    expect(await screen.findByText(CATALOG_LOAD_ERROR)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
    );
    const input = screen.getByRole("textbox", { name: CATALOG_BRAND_NAME_LABEL });
    await userEvent.type(input, NEW_BRAND.name);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_BRAND_LABEL }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(onCatalogChange).toHaveBeenCalledTimes(1);

    expect(await screen.findByText(BRAND_A.name)).toBeInTheDocument();
    expect(await screen.findByText(NEW_BRAND.name)).toBeInTheDocument();
  });
});

describe("YarnCatalogPanel — accesibilidad", () => {
  it("no tiene violaciones de axe con el panel abierto y poblado", async () => {
    const { container } = render(<YarnCatalogPanel />);
    await openPanel();
    await screen.findByText(BRAND_A.name);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("no tiene violaciones de axe con el modal de alta de marca abierto", async () => {
    const { baseElement } = render(<YarnCatalogPanel />);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_NEW_BRAND_TRIGGER_LABEL }),
    );

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
