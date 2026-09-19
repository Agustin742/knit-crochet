// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { YarnCard } from "./YarnCard";
import type { SerializedYarnListItem } from "./types";

const CRUDA: SerializedYarnListItem = {
  id: "0f1c4d3a-1111-4111-8111-111111111111",
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
};

afterEach(cleanup);

describe("YarnCard", () => {
  it("muestra marca, tipo, color y stock", () => {
    render(<YarnCard yarn={CRUDA} />);

    expect(
      screen.getByText(`${CRUDA.brandName} · ${CRUDA.typeName} · ${CRUDA.colorName}`),
    ).toBeInTheDocument();
    expect(screen.getByText(String(CRUDA.quantity))).toBeInTheDocument();
  });

  it("monta exactamente un control, y ninguno más", () => {
    render(<YarnCard yarn={CRUDA} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  /**
   * El tap es un no-op documentado (deuda 192 / entrada 24): ni navega, ni
   * abre nada, ni cambia ningún estado. Lo único observable de un no-op es
   * que la tarjeta sigue exactamente igual después de tocarla.
   */
  it("tocar la tarjeta no navega, no abre nada y no cambia el estado", async () => {
    const { container } = render(<YarnCard yarn={CRUDA} />);
    const before = container.innerHTML;

    await userEvent.click(screen.getByRole("button"));

    expect(container.innerHTML).toBe(before);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.location.pathname).toBe("/");
  });

  it("se alcanza y se activa con el teclado sin hacer nada más", async () => {
    render(<YarnCard yarn={CRUDA} />);

    await userEvent.tab();
    expect(screen.getByRole("button")).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveFocus();
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = render(<YarnCard yarn={CRUDA} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

/** Smoke: monta una lista de tarjetas sin que ninguna interfiera con la otra. */
describe("YarnCard — varias tarjetas", () => {
  it("cada tarjeta llama sólo a su propio no-op", async () => {
    const OTRA: SerializedYarnListItem = { ...CRUDA, id: "otra", colorName: "Azul" };
    render(
      <>
        <YarnCard yarn={CRUDA} />
        <YarnCard yarn={OTRA} />
      </>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(
      screen.getByText(`${CRUDA.brandName} · ${CRUDA.typeName} · ${CRUDA.colorName}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${OTRA.brandName} · ${OTRA.typeName} · ${OTRA.colorName}`),
    ).toBeInTheDocument();
  });
});
