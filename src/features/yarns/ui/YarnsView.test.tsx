// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

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

function serve(next: Scenario = {}) {
  if (next.failNetwork === true) {
    fetchSpy.mockRejectedValue(new Error("sin red"));
    return;
  }
  fetchSpy.mockResolvedValue(
    jsonResponse(next.status ?? 200, { yarns: next.yarns ?? [CRUDA, AZUL] }),
  );
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
    expect(screen.queryAllByRole("button")).toHaveLength(0);
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
