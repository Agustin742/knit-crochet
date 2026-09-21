// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  CONFIRM_DIALOG_CANCEL_LABEL,
  CONFIRM_DIALOG_CONFIRM_LABEL,
  DIALOG_CLOSE_LABEL,
} from "@/shared/ui";

import {
  CATALOG_ADD_TYPE_TRIGGER_LABEL,
  CATALOG_BLOCKED_BRAND_TITLE,
  CATALOG_BLOCKED_TYPE_TITLE,
  CATALOG_BRAND_NAME_LABEL,
  CATALOG_CREATE_BRAND_LABEL,
  CATALOG_CREATE_TYPE_LABEL,
  CATALOG_EMPTY_MESSAGE,
  CATALOG_LIST_SUMMARY_LABEL,
  CATALOG_LOAD_ERROR,
  CATALOG_NEW_BRAND_TRIGGER_LABEL,
  CATALOG_NOTICE_DISMISS_LABEL,
  CATALOG_SECTION_LABEL,
  CATALOG_TYPE_NAME_LABEL,
  RETRY_LABEL,
  brandBlockedBody,
  catalogCreateTypeModalTitle,
  catalogDeleteConfirmTitle,
  catalogDeleteLabel,
  typeBlockedBody,
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

describe("YarnCatalogPanel — crear tipo: descartar el modal no confunde dos marcas (2026-09-20)", () => {
  it("descartar el modal de A en vuelo y abrir el de B: la 201 tardía de A no cierra el modal de B, pero igual agrega el tipo y avisa", async () => {
    const onCatalogChange = vi.fn();
    const BRAND_B = { id: "brand-b", userId: "u", name: "Drops" };
    let resolveCreateA: (response: Response) => void = () => {};

    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/brands") {
        return Promise.resolve(jsonResponse(200, { brands: [BRAND_A, BRAND_B] }));
      }
      if (url === `/api/brands/${BRAND_A.id}/types` && init?.method === "POST") {
        return new Promise((resolve) => {
          resolveCreateA = resolve;
        });
      }
      if (url === `/api/brands/${BRAND_A.id}/types`) {
        return Promise.resolve(jsonResponse(200, { types: [TYPE_A1] }));
      }
      if (url === `/api/brands/${BRAND_B.id}/types`) {
        return Promise.resolve(jsonResponse(200, { types: [] }));
      }
      return Promise.reject(new Error(`url inesperada: ${url}`));
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    await openPanel();
    await screen.findByText(BRAND_A.name);
    await screen.findByText(BRAND_B.name);
    await userEvent.click(screen.getByText(BRAND_A.name));
    await screen.findByText(TYPE_A1.name);

    const brandAPanel = screen.getByRole("group", { name: BRAND_A.name });
    await userEvent.click(
      within(brandAPanel).getByRole("button", {
        name: CATALOG_ADD_TYPE_TRIGGER_LABEL,
      }),
    );

    const inputA = screen.getByRole("textbox", { name: CATALOG_TYPE_NAME_LABEL });
    await userEvent.type(inputA, NEW_TYPE.name);
    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_CREATE_TYPE_LABEL }),
    );

    // El POST de A queda en vuelo; se descarta el modal con el botón de
    // cierre antes de que resuelva (el botón «Crear tipo» queda deshabilitado
    // mientras pende, así que Escape no llega a burbujear hasta el velo).
    await userEvent.click(
      screen.getByRole("button", { name: DIALOG_CLOSE_LABEL }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    // Se abre el modal de alta de tipo de la marca B.
    await userEvent.click(screen.getByText(BRAND_B.name));
    const brandBPanel = screen.getByRole("group", { name: BRAND_B.name });
    await userEvent.click(
      within(brandBPanel).getByRole("button", {
        name: CATALOG_ADD_TYPE_TRIGGER_LABEL,
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: catalogCreateTypeModalTitle(BRAND_B.name),
      }),
    ).toBeInTheDocument();

    // La 201 de A resuelve tarde.
    resolveCreateA(jsonResponse(201, { type: NEW_TYPE }));
    await waitFor(() => {
      expect(onCatalogChange).toHaveBeenCalledTimes(1);
    });

    // El modal de B sigue abierto, intacto.
    expect(
      screen.getByRole("heading", {
        name: catalogCreateTypeModalTitle(BRAND_B.name),
      }),
    ).toBeInTheDocument();

    // El tipo de A se agregó igual: el servidor ya lo creó.
    await userEvent.click(
      screen.getByRole("button", { name: DIALOG_CLOSE_LABEL }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(within(brandAPanel).getByText(NEW_TYPE.name)).toBeInTheDocument();
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

async function openBrandPanel() {
  await openPanel();
  await screen.findByText(BRAND_A.name);
  await userEvent.click(screen.getByText(BRAND_A.name));
  await screen.findByText(TYPE_A1.name);
  return screen.getByRole("group", { name: BRAND_A.name });
}

describe("YarnCatalogPanel — borrar: ConfirmDialog antes del pedido (design D4, backlog 24 S2b)", () => {
  it("el botón nombra la marca (nunca «Borrar» a secas) y abre ConfirmDialog con dos botones, foco en Cancelar", async () => {
    render(<YarnCatalogPanel />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(BRAND_A.name),
      }),
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", {
        name: catalogDeleteConfirmTitle(BRAND_A.name),
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
      ).toHaveFocus();
    });
  });

  it("el botón de un tipo nombra el tipo y abre su propia confirmación", async () => {
    render(<YarnCatalogPanel />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(TYPE_A1.name),
      }),
    );

    expect(
      screen.getByRole("heading", { name: catalogDeleteConfirmTitle(TYPE_A1.name) }),
    ).toBeInTheDocument();
  });

  it("cancelar cierra la confirmación sin pedir nada y la fila sigue listada", async () => {
    render(<YarnCatalogPanel />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(BRAND_A.name),
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(BRAND_A.name)).toBeInTheDocument();
    const deleteCalls = fetchSpy.mock.calls.filter(
      ([, init]: [string, RequestInit?]) => init?.method === "DELETE",
    );
    expect(deleteCalls).toHaveLength(0);
  });
});

describe("YarnCatalogPanel — borrar una marca vacía (design D4, backlog 24 S2b)", () => {
  it("un 204 quita la marca de la lista y avisa una sola vez con el brandId borrado", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === `/api/brands/${BRAND_A.id}` && init?.method === "DELETE") {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(BRAND_A.name),
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(screen.queryByText(BRAND_A.name)).toBeNull();
    expect(onCatalogChange).toHaveBeenCalledTimes(1);
    expect(onCatalogChange).toHaveBeenCalledWith({ brandId: BRAND_A.id });
  });
});

describe("YarnCatalogPanel — borrar un tipo vacío (design D4, backlog 24 S2b)", () => {
  it("un 204 quita el tipo del panel de su marca y avisa una sola vez con el typeId borrado", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (
        url === `/api/brands/${BRAND_A.id}/types/${TYPE_A1.id}` &&
        init?.method === "DELETE"
      ) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(TYPE_A1.name),
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(within(brandPanel).queryByText(TYPE_A1.name)).toBeNull();
    expect(onCatalogChange).toHaveBeenCalledTimes(1);
    expect(onCatalogChange).toHaveBeenCalledWith({ typeId: TYPE_A1.id });
  });
});

describe("YarnCatalogPanel — 409 abre un aviso de una sola acción, no ConfirmDialog (design D4, backlog 24 S2b)", () => {
  it("borrar una marca con hijos muestra los DOS contadores, un solo control, y la marca sigue listada", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === `/api/brands/${BRAND_A.id}` && init?.method === "DELETE") {
        return Promise.resolve(
          jsonResponse(409, { error: "tiene hijos", types: 1, yarns: 4 }),
        );
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(BRAND_A.name),
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );

    const notice = await screen.findByRole("dialog");
    expect(
      within(notice).getByRole("heading", { name: CATALOG_BLOCKED_BRAND_TITLE }),
    ).toBeInTheDocument();
    expect(within(notice).getByText(brandBlockedBody(1, 4))).toBeInTheDocument();
    expect(within(notice).getAllByRole("button")).toHaveLength(1);
    expect(
      within(notice).getByRole("button", { name: CATALOG_NOTICE_DISMISS_LABEL }),
    ).toBeInTheDocument();

    expect(screen.getByText(BRAND_A.name)).toBeInTheDocument();
    expect(onCatalogChange).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: CATALOG_NOTICE_DISMISS_LABEL }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("borrar un tipo con lanas muestra UN contador y la ConfirmDialog no reaparece", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (
        url === `/api/brands/${BRAND_A.id}/types/${TYPE_A1.id}` &&
        init?.method === "DELETE"
      ) {
        return Promise.resolve(jsonResponse(409, { error: "tiene lanas", yarns: 3 }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(TYPE_A1.name),
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );

    const notice = await screen.findByRole("dialog");
    expect(
      within(notice).getByRole("heading", { name: CATALOG_BLOCKED_TYPE_TITLE }),
    ).toBeInTheDocument();
    expect(within(notice).getByText(typeBlockedBody(3))).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    ).toBeNull();

    expect(within(brandPanel).getByText(TYPE_A1.name)).toBeInTheDocument();
    expect(onCatalogChange).not.toHaveBeenCalled();
  });
});

describe("YarnCatalogPanel — borrar: fallo genérico (404 o red) no toca ni la lista ni el diálogo (backlog 24 S2b)", () => {
  it("un fallo genérico al borrar una marca mantiene la confirmación abierta, muestra el error, reactiva los botones y no toca la lista", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === `/api/brands/${BRAND_A.id}` && init?.method === "DELETE") {
        return Promise.resolve(jsonResponse(404, { error: "no existe" }));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(BRAND_A.name),
      }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );

    expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    ).not.toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    ).not.toBeDisabled();
    expect(screen.getByText(BRAND_A.name)).toBeInTheDocument();
    expect(onCatalogChange).not.toHaveBeenCalled();
  });

  it("un fallo genérico al borrar un tipo mantiene la confirmación abierta, muestra el error, reactiva los botones y no toca la lista", async () => {
    const onCatalogChange = vi.fn();
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (
        url === `/api/brands/${BRAND_A.id}/types/${TYPE_A1.id}` &&
        init?.method === "DELETE"
      ) {
        return Promise.reject(new Error("sin red"));
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(TYPE_A1.name),
      }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );

    expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    ).not.toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    ).not.toBeDisabled();
    expect(within(brandPanel).getByText(TYPE_A1.name)).toBeInTheDocument();
    expect(onCatalogChange).not.toHaveBeenCalled();
  });
});

describe("YarnCatalogPanel — guarda contra respuestas tardías (distinta de R3-003, que sigue abierto)", () => {
  it("cancelar durante un borrado en vuelo evita que la respuesta tardía reabra un modal, toque la lista o avise", async () => {
    const onCatalogChange = vi.fn();
    let resolveDelete: (response: Response) => void = () => {};
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === `/api/brands/${BRAND_A.id}` && init?.method === "DELETE") {
        return new Promise((resolve) => {
          resolveDelete = resolve;
        });
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(BRAND_A.name),
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    // La respuesta llega DESPUÉS de cancelar: un 409 que, de aplicarse,
    // abriría el aviso de bloqueo.
    resolveDelete(jsonResponse(409, { error: "tiene hijos", types: 1, yarns: 2 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(BRAND_A.name)).toBeInTheDocument();
    expect(onCatalogChange).not.toHaveBeenCalled();
  });

  it("abrir la confirmación de OTRA fila mientras la primera sigue en vuelo no se ve tocada por la respuesta vieja", async () => {
    const onCatalogChange = vi.fn();
    let resolveBrandDelete: (response: Response) => void = () => {};
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (url === `/api/brands/${BRAND_A.id}` && init?.method === "DELETE") {
        return new Promise((resolve) => {
          resolveBrandDelete = resolve;
        });
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    // Primer borrado: se confirma y queda en vuelo.
    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(BRAND_A.name),
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    );

    // Se abre una SEGUNDA confirmación, esta vez para el tipo.
    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(TYPE_A1.name),
      }),
    );
    expect(
      screen.getByRole("heading", { name: catalogDeleteConfirmTitle(TYPE_A1.name) }),
    ).toBeInTheDocument();

    // La respuesta del PRIMER borrado (marca) llega tarde, con éxito.
    resolveBrandDelete(new Response(null, { status: 204 }));

    // El servidor ya borró la marca: la fila desaparece y se avisa, aunque
    // el diálogo al que esa petición respondía ya no exista (design D4,
    // corrección del guarda de token — un 204 tardío nunca se descarta
    // entero).
    await waitFor(() => {
      expect(screen.queryByText(BRAND_A.name)).toBeNull();
    });
    expect(onCatalogChange).toHaveBeenCalledTimes(1);
    expect(onCatalogChange).toHaveBeenCalledWith({ brandId: BRAND_A.id });

    // La confirmación del TIPO sigue abierta, intacta — la respuesta vieja
    // no la cerró ni la mutó: sólo lo que toca el diálogo queda gateado por
    // el token.
    expect(
      screen.getByRole("heading", { name: catalogDeleteConfirmTitle(TYPE_A1.name) }),
    ).toBeInTheDocument();
  });

  /* Simetrico del anterior, pero sobre la rama de TIPO. El arreglo del guarda
     se aplico a las dos ramas de `handleConfirmDelete`; sin este test solo una
     quedaba cubierta, y una regresion en la otra pasaria sin que nadie la vea. */
  it("un 204 tardio de un tipo lo saca de la lista y avisa, aunque el dialogo ya sea otro", async () => {
    const onCatalogChange = vi.fn();
    let resolveTypeDelete: (response: Response) => void = () => {};
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (
        url === `/api/brands/${BRAND_A.id}/types/${TYPE_A1.id}` &&
        init?.method === "DELETE"
      ) {
        return new Promise((resolve) => {
          resolveTypeDelete = resolve;
        });
      }
      return defaultFetch(url);
    });

    render(<YarnCatalogPanel onCatalogChange={onCatalogChange} />);
    const brandPanel = await openBrandPanel();

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(TYPE_A1.name),
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    );

    await userEvent.click(
      within(brandPanel).getByRole("button", {
        name: catalogDeleteLabel(BRAND_A.name),
      }),
    );
    expect(
      screen.getByRole("heading", { name: catalogDeleteConfirmTitle(BRAND_A.name) }),
    ).toBeInTheDocument();

    resolveTypeDelete(new Response(null, { status: 204 }));

    await waitFor(() => {
      expect(screen.queryByText(TYPE_A1.name)).toBeNull();
    });
    expect(onCatalogChange).toHaveBeenCalledTimes(1);
    expect(onCatalogChange).toHaveBeenCalledWith({ typeId: TYPE_A1.id });

    expect(
      screen.getByRole("heading", { name: catalogDeleteConfirmTitle(BRAND_A.name) }),
    ).toBeInTheDocument();
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
