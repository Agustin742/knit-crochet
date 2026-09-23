// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DUPLICATE_COLOR_CODE_MESSAGE } from "./yarns-client";
import { YarnFormDialog } from "./YarnFormDialog";
import type { SerializedYarnRecord } from "./types";

const BRAND_ID = "00000000-0000-4000-8000-000000000001";
const TYPE_ID = "00000000-0000-4000-8000-000000000002";
const BRAND_TREE = {
  status: "ready" as const,
  entries: [{
    brand: { id: BRAND_ID, userId: "user-1", name: "Malabrigo" },
    types: [{ id: TYPE_ID, brandId: BRAND_ID, name: "Worsted" }],
  }],
};
const RECORD = { id: "yarn-1" } as SerializedYarnRecord;

vi.mock("./brands-client", () => ({
  getBrandTree: vi.fn(async () => BRAND_TREE),
}));
vi.mock("./yarns-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./yarns-client")>();
  return { ...actual, createYarn: vi.fn() };
});

import { createYarn } from "./yarns-client";

function renderDialog(onSaved = vi.fn(), onClose = vi.fn()) {
  return render(
    <YarnFormDialog target={{ mode: "create" }} onClose={onClose} onSaved={onSaved} onCatalogChange={vi.fn()} />,
  );
}

async function chooseIdentity(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("combobox", { name: "Marca" });
  await user.selectOptions(screen.getByRole("combobox", { name: "Marca" }), BRAND_ID);
  await user.selectOptions(screen.getByRole("combobox", { name: "Tipo" }), TYPE_ID);
  await user.type(screen.getByLabelText("Color"), "Azul noche");
  await user.type(screen.getByLabelText("Código de color"), "AZ-42");
  await user.click(screen.getByRole("button", { name: "Azul" }));
}

async function chooseTechnical(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: "Ficha técnica" }));
  await user.type(screen.getByLabelText("Largo (m)"), "100");
  await user.type(screen.getByLabelText("Fibra"), "Lana merino");
  await user.type(screen.getByLabelText("Mínimo"), "4");
  await user.type(screen.getByLabelText("Máximo"), "5");
  await user.type(screen.getByLabelText("Grosor (mm)"), "3");
  await user.type(screen.getByLabelText("Lote"), "2026-03-05");
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("YarnFormDialog — alta", () => {
  it("no renderiza diálogo sin objetivo", () => {
    const { queryByRole } = render(<YarnFormDialog target={null} onClose={vi.fn()} onSaved={vi.fn()} onCatalogChange={vi.fn()} />);
    expect(queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre vacío en Identidad y deja el stock en cero", async () => {
    renderDialog();
    expect(await screen.findByRole("combobox", { name: "Marca" })).toHaveValue("");
    expect(screen.getByRole("tab", { name: "Identidad" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Color")).toHaveValue("");
    const user = userEvent.setup();
    expect(screen.queryByLabelText(/usados|usedQuantity/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Ficha técnica" }));
    expect(screen.getByLabelText("Largo (m)")).toHaveValue("");
    expect(screen.getByLabelText("Fibra")).toHaveValue("");
    expect(screen.getByLabelText("Mínimo")).toHaveValue("");
    expect(screen.getByLabelText("Máximo")).toHaveValue("");
    expect(screen.getByLabelText("Grosor (mm)")).toHaveValue("");
    expect(screen.getByLabelText("Lote")).toHaveValue("");
    expect(screen.getByLabelText("Stock (ovillos)")).toHaveValue("0");
  });

  it("conserva los valores al alternar entre pestañas", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole("combobox", { name: "Marca" });
    await user.type(screen.getByLabelText("Color"), "Azul noche");
    await user.click(screen.getByRole("tab", { name: "Ficha técnica" }));
    await user.type(screen.getByLabelText("Fibra"), "Merino");
    await user.click(screen.getByRole("tab", { name: "Identidad" }));
    expect(screen.getByLabelText("Color")).toHaveValue("Azul noche");
    await user.click(screen.getByRole("tab", { name: "Ficha técnica" }));
    expect(screen.getByLabelText("Fibra")).toHaveValue("Merino");
  });

  it("al enviar desde Identidad cambia a Ficha técnica y enfoca el primer campo inválido", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole("combobox", { name: "Marca" });
    await chooseIdentity(user);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByRole("tab", { name: "Ficha técnica" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Largo (m)")).toHaveFocus();
  });

  it("desde Ficha técnica cambia a Identidad y enfoca el primer campo inválido", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole("combobox", { name: "Marca" });
    await user.click(screen.getByRole("tab", { name: "Ficha técnica" }));
    await user.type(screen.getByLabelText("Largo (m)"), "100");
    await user.type(screen.getByLabelText("Fibra"), "Merino");
    await user.type(screen.getByLabelText("Mínimo"), "4");
    await user.type(screen.getByLabelText("Máximo"), "5");
    await user.type(screen.getByLabelText("Grosor (mm)"), "3");
    await user.type(screen.getByLabelText("Lote"), "2026-03-05");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByRole("tab", { name: "Identidad" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox", { name: "Marca" })).toHaveFocus();
  });

  it("enfoca el campo inválido activo sin cambiar de pestaña", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole("combobox", { name: "Marca" });
    await chooseIdentity(user);
    await user.click(screen.getByRole("tab", { name: "Ficha técnica" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByRole("tab", { name: "Ficha técnica" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Largo (m)")).toHaveFocus();
  });

  it("expone el error de familia de color en el control", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole("combobox", { name: "Marca" });
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const group = screen.getByRole("group", { name: /Familia de color/i });
    expect(within(group).getByText("Elegí una familia de color.")).toBeInTheDocument();
    expect(group).toHaveAttribute("aria-invalid", "true");
  });

  it("ubica un máximo de aguja menor que el mínimo sólo en Máximo", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole("combobox", { name: "Marca" });
    await chooseIdentity(user);
    await user.click(screen.getByRole("tab", { name: "Ficha técnica" }));
    await user.type(screen.getByLabelText("Mínimo"), "5");
    await user.type(screen.getByLabelText("Máximo"), "4");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByLabelText("Máximo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Mínimo")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("mapea un 409 duplicado a Código de color, cambia de pestaña y no muestra alerta general", async () => {
    const user = userEvent.setup();
    vi.mocked(createYarn).mockResolvedValue({ ok: false, field: "colorCode", message: DUPLICATE_COLOR_CODE_MESSAGE });
    renderDialog();
    await chooseIdentity(user);
    await chooseTechnical(user);
    await user.type(screen.getByLabelText("Grosor (mm)"), "3");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const code = await screen.findByLabelText("Código de color");
    expect(code).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("tab", { name: "Identidad" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(code).toHaveFocus();
  });

  it("envía payload ensamblado, entrega el registro crudo y cierra al guardar", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.mocked(createYarn).mockResolvedValue({ ok: true, data: RECORD });
    renderDialog(onSaved, onClose);
    await chooseIdentity(user);
    await chooseTechnical(user);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(createYarn).toHaveBeenCalledWith({
      brandId: BRAND_ID,
      typeId: TYPE_ID,
      colorName: "Azul noche",
      colorCode: "AZ-42",
      colorFamily: "blue",
      image: null,
      quantity: 0,
      length: 100,
      fiber: "Lana merino",
      recommendedNeedle: { min: 4, max: 5 },
      thickness: 3,
      lot: new Date("2026-03-05"),
    }));
    expect(onSaved).toHaveBeenCalledWith(RECORD);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("recovers from a rejected save with a safe form alert and clears pending", async () => {
    const user = userEvent.setup();
    vi.mocked(createYarn).mockRejectedValue(new Error("private server detail"));
    renderDialog();
    await chooseIdentity(user);
    await chooseTechnical(user);
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar la lana. Intentá de nuevo.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("private server detail");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("ignores a save result after the dialog has been closed", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    let resolveCreate!: (value: Awaited<ReturnType<typeof createYarn>>) => void;
    vi.mocked(createYarn).mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    const view = renderDialog(onSaved, onClose);
    await chooseIdentity(user);
    await chooseTechnical(user);
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    view.rerender(<YarnFormDialog target={null} onClose={onClose} onSaved={onSaved} onCatalogChange={vi.fn()} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await act(async () => {
      resolveCreate({ ok: true, data: RECORD });
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("no ofrece usedQuantity en la pestaña técnica", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole("combobox", { name: "Marca" });
    expect(screen.queryByLabelText(/usados|usedQuantity/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Ficha técnica" }));
    expect(screen.queryByLabelText(/usados|usedQuantity/i)).not.toBeInTheDocument();
  });

  it("mantiene el diálogo completo accesible", async () => {
    renderDialog();
    await screen.findByRole("combobox", { name: "Marca" });
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
