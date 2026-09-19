// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { stockLabel } from "./yarn-copy";
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
    render(<YarnCard yarn={CRUDA} onOpen={vi.fn()} />);

    expect(
      screen.getByText(`${CRUDA.brandName} · ${CRUDA.typeName} · ${CRUDA.colorName}`),
    ).toBeInTheDocument();
    expect(screen.getByText(stockLabel(CRUDA.quantity))).toBeInTheDocument();
  });

  /**
   * Deuda 194: el stock se renderizaba como un número pelado —"3"—, así que ni
   * en pantalla ni en el nombre accesible del control había nada que dijera
   * TRES DE QUÉ. El test viejo afirmaba sobre el valor, no sobre si el valor
   * estaba identificado, y por eso no lo vio. La unidad es **ovillos**
   * (PRD-01 §4.5: `quantity` es "stock en OVILLOS").
   */
  it("identifica el stock con su unidad, no lo deja como un número suelto", () => {
    render(<YarnCard yarn={CRUDA} onOpen={vi.fn()} />);

    expect(screen.getByText("3 ovillos")).toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("concuerda la unidad en singular y en cero", () => {
    render(<YarnCard yarn={{ ...CRUDA, quantity: 1 }} onOpen={vi.fn()} />);
    expect(screen.getByText("1 ovillo")).toBeInTheDocument();
    cleanup();

    render(<YarnCard yarn={{ ...CRUDA, quantity: 0 }} onOpen={vi.fn()} />);
    expect(screen.getByText("0 ovillos")).toBeInTheDocument();
  });

  it("el nombre accesible del control termina en el stock identificado", () => {
    render(<YarnCard yarn={CRUDA} onOpen={vi.fn()} />);

    const control = screen.getByRole("button");
    expect(control).toHaveAccessibleName(/3 ovillos$/);
  });

  it("monta exactamente un control, y ninguno más", () => {
    render(<YarnCard yarn={CRUDA} onOpen={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  /**
   * Deuda 192 SALDADA (backlog 24, slice S1): el tap deja de ser un no-op y
   * abre el cajón de detalle. La tarjeta sigue sin fetch ni estado propio —
   * sólo avisa hacia arriba, que es de quien es la lista real.
   */
  it("tocar la tarjeta llama a onOpen exactamente una vez", async () => {
    const onOpen = vi.fn();
    render(<YarnCard yarn={CRUDA} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("se alcanza y se activa con el teclado, y llama a onOpen", async () => {
    const onOpen = vi.fn();
    render(<YarnCard yarn={CRUDA} onOpen={onOpen} />);

    await userEvent.tab();
    expect(screen.getByRole("button")).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = render(<YarnCard yarn={CRUDA} onOpen={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

/** Smoke: monta una lista de tarjetas sin que ninguna interfiera con la otra. */
describe("YarnCard — varias tarjetas", () => {
  it("cada tarjeta llama sólo a su propio onOpen", async () => {
    const OTRA: SerializedYarnListItem = { ...CRUDA, id: "otra", colorName: "Azul" };
    const onOpenCruda = vi.fn();
    const onOpenOtra = vi.fn();
    render(
      <>
        <YarnCard yarn={CRUDA} onOpen={onOpenCruda} />
        <YarnCard yarn={OTRA} onOpen={onOpenOtra} />
      </>,
    );

    const botones = screen.getAllByRole("button");
    await userEvent.click(botones[1] as HTMLElement);

    expect(onOpenOtra).toHaveBeenCalledTimes(1);
    expect(onOpenCruda).not.toHaveBeenCalled();
  });
});
