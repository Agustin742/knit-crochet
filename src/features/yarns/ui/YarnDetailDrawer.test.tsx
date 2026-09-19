// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { COLOR_FAMILY_LABELS } from "@/shared/config";

import { EDIT_YARN_LABEL } from "./yarn-copy";
import { YarnDetailDrawer } from "./YarnDetailDrawer";
import type { SerializedYarnListItem } from "./types";

const YARN: SerializedYarnListItem = {
  id: "0f1c4d3a-1111-4111-8111-111111111111",
  userId: "u",
  image: "https://cdn.example.com/lana.jpg",
  brandId: "brand-1",
  typeId: "type-1",
  brandName: "Malabrigo",
  typeName: "Merino Worsted",
  colorName: "Natural",
  colorCode: "N1",
  colorFamily: "neutral",
  quantity: 3,
  usedQuantity: 2,
  length: 100,
  fiber: "Lana merino",
  recommendedNeedle: { min: 4, max: 5 },
  thickness: 4.5,
  lot: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

afterEach(cleanup);

describe("YarnDetailDrawer — cerrado", () => {
  it("yarn null no monta nada", () => {
    render(<YarnDetailDrawer yarn={null} onClose={vi.fn()} onUsedQuantityChange={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("YarnDetailDrawer — los once campos (RFC-04 §2)", () => {
  it("muestra cada campo del detalle", () => {
    render(
      <YarnDetailDrawer yarn={YARN} onClose={vi.fn()} onUsedQuantityChange={vi.fn()} />,
    );

    expect(screen.getByRole("img", { name: /natural/i })).toHaveAttribute(
      "src",
      YARN.image as string,
    );
    expect(screen.getByText(YARN.colorName)).toBeInTheDocument();
    expect(screen.getByText(YARN.colorCode)).toBeInTheDocument();
    expect(
      screen.getByText(COLOR_FAMILY_LABELS[YARN.colorFamily]),
    ).toBeInTheDocument();
    expect(screen.getByText("100 m")).toBeInTheDocument();
    expect(screen.getByText(YARN.fiber)).toBeInTheDocument();
    expect(screen.getByText("4–5 mm")).toBeInTheDocument();
    expect(screen.getByText("4.5 mm")).toBeInTheDocument();
    expect(screen.getByText("3 ovillos")).toBeInTheDocument();
    // El stepper trae el valor de usedQuantity dentro de su <output>.
    expect(screen.getByRole("status", { name: /ovillos usados/i })).toHaveTextContent("2");
  });

  it("el título nombra marca, tipo y color", () => {
    render(
      <YarnDetailDrawer yarn={YARN} onClose={vi.fn()} onUsedQuantityChange={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", {
        name: `${YARN.brandName} · ${YARN.typeName} · ${YARN.colorName}`,
      }),
    ).toBeInTheDocument();
  });
});

function Wrapper() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        abrir
      </button>
      <YarnDetailDrawer
        yarn={open ? YARN : null}
        onClose={() => setOpen(false)}
        onUsedQuantityChange={vi.fn()}
      />
    </div>
  );
}

describe("YarnDetailDrawer — cerrar", () => {
  it("el cierre con Escape devuelve el foco a quien lo abrió", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const opener = screen.getByRole("button", { name: "abrir" });

    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe("YarnDetailDrawer — el stepper de usedQuantity", () => {
  it("un cambio llama a onUsedQuantityChange exactamente una vez", async () => {
    const onUsedQuantityChange = vi.fn();
    render(
      <YarnDetailDrawer
        yarn={YARN}
        onClose={vi.fn()}
        onUsedQuantityChange={onUsedQuantityChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Sumar" }));

    expect(onUsedQuantityChange).toHaveBeenCalledTimes(1);
    expect(onUsedQuantityChange).toHaveBeenCalledWith(3);
  });

  it("usedQuantityPending deshabilita los dos botones del stepper", () => {
    render(
      <YarnDetailDrawer
        yarn={YARN}
        onClose={vi.fn()}
        onUsedQuantityChange={vi.fn()}
        usedQuantityPending
      />,
    );

    expect(screen.getByRole("button", { name: "Sumar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Restar" })).toBeDisabled();
  });

  it("usedQuantityError se muestra en línea", () => {
    render(
      <YarnDetailDrawer
        yarn={YARN}
        onClose={vi.fn()}
        onUsedQuantityChange={vi.fn()}
        usedQuantityError="No se pudo actualizar."
      />,
    );

    expect(screen.getByText("No se pudo actualizar.")).toBeInTheDocument();
  });
});

describe("YarnDetailDrawer — «Editar» (deuda 199, RFC-04 §7-ter E2(b))", () => {
  it("es un control real, alcanzable por teclado y activarlo no cambia nada", async () => {
    const { container } = render(
      <YarnDetailDrawer yarn={YARN} onClose={vi.fn()} onUsedQuantityChange={vi.fn()} />,
    );
    const boton = screen.getByRole("button", { name: EDIT_YARN_LABEL });
    const antes = container.innerHTML;

    boton.focus();
    expect(boton).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(container.innerHTML).toBe(antes);
  });
});

describe("YarnDetailDrawer — accesibilidad", () => {
  it("no tiene violaciones de axe", async () => {
    const { container } = render(
      <YarnDetailDrawer yarn={YARN} onClose={vi.fn()} onUsedQuantityChange={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
