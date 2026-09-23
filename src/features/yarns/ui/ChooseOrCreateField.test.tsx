// @vitest-environment happy-dom
import { createRef, type ComponentProps, type FormEvent } from "react";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "@/shared/ui";

import { ChooseOrCreateField } from "./ChooseOrCreateField";

const OPTIONS = [
  { id: "brand-a", name: "Manos del Uruguay" },
  { id: "brand-b", name: "Malabrigo" },
];

function renderField(
  overrides: Partial<ComponentProps<typeof ChooseOrCreateField>> = {},
) {
  const props: ComponentProps<typeof ChooseOrCreateField> = {
    label: "Marca",
    placeholder: "Elegí una marca",
    options: OPTIONS,
    value: "",
    onValueChange: vi.fn(),
    status: "ready",
    onRetry: vi.fn(),
    createTriggerLabel: "Nueva marca",
    createFieldLabel: "Nombre de la marca",
    onCreate: vi.fn(async () => ({ ok: true as const })),
    selectRef: createRef<HTMLSelectElement>(),
    ...overrides,
  };

  return { ...render(<ChooseOrCreateField {...props} />), props };
}

describe("ChooseOrCreateField — elegir o crear inline", () => {
  afterEach(cleanup);

  it("muestra Skeleton y región de estado nombrada mientras carga", () => {
    renderField({ status: "loading" });

    expect(screen.getByRole("status", { name: "Marca" })).toHaveTextContent(
      "Cargando opciones de Marca",
    );
    expect(screen.queryByRole("combobox", { name: "Marca" })).not.toBeInTheDocument();
  });

  it("muestra error de carga y Reintentar llama a onRetry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderField({ status: "failed", onRetry });

    expect(screen.getByText("No se pudo cargar Marca.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("muestra el Select listo con las opciones dadas y emite el valor elegido", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderField({ onValueChange });

    await user.selectOptions(screen.getByRole("combobox", { name: "Marca" }), "brand-b");

    expect(screen.getByRole("option", { name: "Malabrigo" })).toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledWith("brand-b");
  });

  it("Nueva marca abre una fila inline debajo del select y enfoca el input", async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("button", { name: "Nueva marca" }));

    expect(screen.getByRole("combobox", { name: "Marca" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la marca")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("Enter en el input inline previene el submit del form y dispara onCreate", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const onCreate = vi.fn(async () => ({ ok: true as const }));

    render(
      <form onSubmit={onSubmit}>
        <ChooseOrCreateField
          label="Marca"
          placeholder="Elegí una marca"
          options={OPTIONS}
          value=""
          onValueChange={vi.fn()}
          status="ready"
          onRetry={vi.fn()}
          createTriggerLabel="Nueva marca"
          createFieldLabel="Nombre de la marca"
          onCreate={onCreate}
          selectRef={createRef<HTMLSelectElement>()}
        />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Nueva marca" }));
    await user.type(screen.getByLabelText("Nombre de la marca"), "Nube{Enter}");

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Nube"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Escape en la fila inline frena la propagación y no cierra el Dialog", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Dialog open onClose={onClose} title="Alta de lana">
        <ChooseOrCreateField
          label="Marca"
          placeholder="Elegí una marca"
          options={OPTIONS}
          value=""
          onValueChange={vi.fn()}
          status="ready"
          onRetry={vi.fn()}
          createTriggerLabel="Nueva marca"
          createFieldLabel="Nombre de la marca"
          onCreate={vi.fn(async () => ({ ok: true as const }))}
          selectRef={createRef<HTMLSelectElement>()}
        />
      </Dialog>,
    );

    await user.click(await screen.findByRole("button", { name: "Nueva marca" }));
    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Alta de lana" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre de la marca")).not.toBeInTheDocument();
  });

  it("ignora clicks repetidos en Crear mientras el create está pendiente", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(
      () => new Promise<{ ok: true }>(() => {}),
    );
    renderField({ onCreate });

    await user.click(screen.getByRole("button", { name: "Nueva marca" }));
    await user.type(screen.getByLabelText("Nombre de la marca"), "Nube");
    const createButton = screen.getByRole("button", { name: "Crear" });

    await user.click(createButton);
    await user.click(createButton);

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith("Nube");
  });

  it("un create fallido muestra el error y deja abierta la fila", async () => {
    const user = userEvent.setup();
    renderField({
      onCreate: vi.fn(async () => ({ ok: false, message: "Esa marca ya existe." })),
    });

    await user.click(screen.getByRole("button", { name: "Nueva marca" }));
    await user.type(screen.getByLabelText("Nombre de la marca"), "Nube");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(await screen.findByText("Esa marca ya existe.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la marca")).toBeInTheDocument();
  });

  it("disabled desactiva el select y el trigger", () => {
    renderField({ disabled: true });

    expect(screen.getByRole("combobox", { name: "Marca" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nueva marca" })).toBeDisabled();
  });
});
