// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { COLOR_FAMILY_LABELS } from "@/shared/config";

import { EMPTY_TITLE, ERROR_TITLE, RETRY_LABEL } from "./yarn-copy";
import { YARNS_ENDPOINT } from "./yarns-client";
import {
  LOADING_MESSAGE,
  LOADING_REGION_LABEL,
  PAGE_TITLE,
  YarnsView,
} from "./YarnsView";
import type { SerializedYarnListItem } from "./types";

const fetchSpy = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function yarn(patch: Partial<SerializedYarnListItem> = {}): SerializedYarnListItem {
  return {
    id: "cruda",
    userId: "u",
    image: null,
    brandId: "brand-1",
    typeId: "type-1",
    brandName: "Malabrigo",
    typeName: "Merino Worsted",
    colorName: "Natural",
    colorCode: "N1",
    colorFamily: "neutral",
    quantity: 3,
    usedQuantity: 0,
    length: 100,
    fiber: "Lana",
    recommendedNeedle: { min: 4, max: 5 },
    thickness: 4.5,
    lot: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

const CRUDA = yarn();
const AZUL = yarn({ id: "azul", colorName: "Azul", colorFamily: "blue" });

type Scenario = { yarns?: SerializedYarnListItem[]; status?: number; failNetwork?: boolean };

/**
 * `YarnFilterPanel` (S4b) trae su propio pedido en paralelo (`GET
 * /api/brands`, design D7), así que el mock de `fetch` tiene que enrutar por
 * URL y devolver un `Response` FRESCO por llamada — uno compartido entre las
 * dos peticiones concurrentes rompía porque un cuerpo de `Response` sólo se
 * lee una vez (`.json()` de la segunda petición fallaba con el cuerpo ya
 * consumido por la primera). El árbol de marcas no es lo que este archivo
 * prueba: se lo deja vacío a propósito.
 */
function serve(next: Scenario = {}) {
  fetchSpy.mockImplementation((url: string) => {
    if (url.startsWith("/api/brands")) {
      return Promise.resolve(jsonResponse(200, { brands: [] }));
    }
    if (next.failNetwork === true) {
      return Promise.reject(new Error("sin red"));
    }
    return Promise.resolve(
      jsonResponse(next.status ?? 200, { yarns: next.yarns ?? [CRUDA, AZUL] }),
    );
  });
}

async function settle() {
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: LOADING_REGION_LABEL }).textContent,
    ).toBe(""),
  );
}

async function renderReady(next: Scenario = {}) {
  serve(next);
  const view = render(<YarnsView />);
  await settle();
  return view;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("YarnsView — smoke", () => {

  /**
   * El `h1` es el título de la PÁGINA, no una etiqueta de la columna de
   * filtros. Cuando vivía dentro de esa columna empujaba sólo al filtro hacia
   * abajo, y la rejilla de tarjetas arrancaba más arriba: las dos columnas
   * quedaban desalineadas por exactamente el alto del título. Lo levantó el
   * usuario mirando la pantalla.
   */
  it("el título encabeza la página, no la columna del filtro", async () => {
    const { container } = await renderReady();

    const titulo = container.querySelector("h1");
    const panel = container.querySelector('[data-slot="yarn-filter-panel"]');

    expect(titulo).not.toBeNull();
    expect(panel).not.toBeNull();
    /* La propiedad es la contraria a la que tenía: la COLUMNA DEL FILTRO no
       debe contener el título. Si lo contiene, el título empuja sólo a ese
       lado y las dos columnas arrancan a alturas distintas. */
    const columnaDelFiltro = panel?.parentElement;
    expect(columnaDelFiltro?.contains(titulo as Node)).toBe(false);
  });
  it("monta el título y una tarjeta por lana", async () => {
    await renderReady();

    expect(
      screen.getByRole("heading", { level: 1, name: PAGE_TITLE }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${CRUDA.brandName} · ${CRUDA.typeName} · ${CRUDA.colorName}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${AZUL.brandName} · ${AZUL.typeName} · ${AZUL.colorName}`),
    ).toBeInTheDocument();
  });

  it("pide el endpoint de lanas", async () => {
    await renderReady();

    expect(fetchSpy).toHaveBeenCalledWith(
      YARNS_ENDPOINT,
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});

describe("YarnsView — los tres estados (RFC-04 §4)", () => {
  it("pinta bloques de carga y anuncia la carga una sola vez", async () => {
    serve();
    render(<YarnsView />);

    expect(
      screen.getByRole("status", { name: LOADING_REGION_LABEL }).textContent,
    ).toBe(LOADING_MESSAGE);
    expect(screen.queryByText(CRUDA.colorName, { exact: false })).toBeNull();

    await settle();
    expect(
      screen.getByText(`${CRUDA.brandName} · ${CRUDA.typeName} · ${CRUDA.colorName}`),
    ).toBeInTheDocument();
  });

  it("el cesto vacío dice que no hay lanas y no pinta ninguna tarjeta", async () => {
    await renderReady({ yarns: [] });

    expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument();
    // Ningún `<ul>` de grilla: el panel de filtros (S4b) sigue montado al
    // lado, así que "ninguna tarjeta" se prueba por la ausencia de la
    // lista, no por cero botones en toda la pantalla.
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("un fallo del servidor muestra el error fijo y ofrece reintentar", async () => {
    await renderReady({ status: 500 });

    expect(screen.getByText(ERROR_TITLE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: RETRY_LABEL }),
    ).toBeInTheDocument();
  });

  it("la red caída también cuenta como el error de pantalla", async () => {
    await renderReady({ failNetwork: true });

    expect(screen.getByText(ERROR_TITLE)).toBeInTheDocument();
  });

  it("reintentar vuelve a pedir la lista y, si sale bien, pinta las tarjetas", async () => {
    await renderReady({ status: 500 });
    const before = fetchSpy.mock.calls.length;

    serve({ yarns: [CRUDA] });
    await userEvent.click(screen.getByRole("button", { name: RETRY_LABEL }));
    await settle();

    expect(fetchSpy.mock.calls.length).toBeGreaterThan(before);
    expect(screen.queryByText(ERROR_TITLE)).toBeNull();
    expect(
      screen.getByText(`${CRUDA.brandName} · ${CRUDA.typeName} · ${CRUDA.colorName}`),
    ).toBeInTheDocument();
  });

  /**
   * Prueba de cableado (tarea 5.6): elegir algo en `YarnFilterPanel` tiene
   * que volver a pedir la lista con ese filtro en la URL — no sólo que el
   * árbol dispare su propio callback, que ya cubren `YarnFilterPanel.test.tsx`
   * y `YarnBrandTree.test.tsx` por su cuenta.
   */
  it("elegir una marca en el panel vuelve a pedir la lista con brandId (design D6)", async () => {
    const BRAND = { id: "brand-1", userId: "u", name: "Malabrigo" };
    fetchSpy.mockImplementation((url: string) => {
      if (url === "/api/brands") {
        return Promise.resolve(jsonResponse(200, { brands: [BRAND] }));
      }
      if (url === `/api/brands/${BRAND.id}/types`) {
        return Promise.resolve(jsonResponse(200, { types: [] }));
      }
      return Promise.resolve(jsonResponse(200, { yarns: [CRUDA] }));
    });

    render(<YarnsView />);
    await settle();
    await screen.findByText(BRAND.name);

    await userEvent.click(screen.getByText(BRAND.name));
    await userEvent.click(
      await screen.findByRole("radio", { name: "Toda la marca" }),
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`brandId=${BRAND.id}`),
        expect.anything(),
      );
    });
  });

  /**
   * Prueba de cableado para la familia de color (gap CRITICAL de verify):
   * `ColorFamilyFilter.test.tsx` prueba el control aislado y
   * `yarn-service.test.ts` prueba el filtro de la API por su cuenta, pero
   * ningún test conectaba las dos puntas — elegir un swatch en `/lanas` y ver
   * la grilla angostarse. El mock enruta por URL: sin `colorFamily` en la
   * query devuelve las dos lanas, con `colorFamily=blue` devuelve solo AZUL.
   */
  it("elegir un swatch de color en el panel vuelve a pedir la lista con colorFamily y angosta la grilla", async () => {
    fetchSpy.mockImplementation((url: string) => {
      if (url.startsWith("/api/brands")) {
        return Promise.resolve(jsonResponse(200, { brands: [] }));
      }
      if (url.includes("colorFamily=blue")) {
        return Promise.resolve(jsonResponse(200, { yarns: [AZUL] }));
      }
      return Promise.resolve(jsonResponse(200, { yarns: [CRUDA, AZUL] }));
    });

    render(<YarnsView />);
    await settle();
    expect(
      screen.getByText(`${CRUDA.brandName} · ${CRUDA.typeName} · ${CRUDA.colorName}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${AZUL.brandName} · ${AZUL.typeName} · ${AZUL.colorName}`),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.blue }),
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("colorFamily=blue"),
        expect.anything(),
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByText(
          `${CRUDA.brandName} · ${CRUDA.typeName} · ${CRUDA.colorName}`,
        ),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(`${AZUL.brandName} · ${AZUL.typeName} · ${AZUL.colorName}`),
    ).toBeInTheDocument();
  });

  it("no tiene violaciones de axe en ninguno de los tres estados", async () => {
    const loaded = await renderReady();
    expect(await axe(loaded.container)).toHaveNoViolations();
    loaded.unmount();

    const empty = await renderReady({ yarns: [] });
    expect(await axe(empty.container)).toHaveNoViolations();
    empty.unmount();

    const failed = await renderReady({ status: 500 });
    expect(await axe(failed.container)).toHaveNoViolations();
  });
});
