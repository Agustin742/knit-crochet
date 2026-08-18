// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SegmentedControl, type SegmentedControlOption } from "./SegmentedControl";

const GROUP_LABEL = "Estado del proyecto";

const OPTIONS: readonly SegmentedControlOption[] = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

function renderControl(
  value = "active",
  onValueChange: (next: string) => void = () => {},
) {
  return render(
    <SegmentedControl
      label={GROUP_LABEL}
      options={OPTIONS}
      value={value}
      onValueChange={onValueChange}
    />,
  );
}

function optionNamed(name: string): HTMLElement {
  const group = screen.getByRole("group", { name: GROUP_LABEL });
  return within(group).getByRole("button", { name });
}

afterEach(cleanup);

describe("SegmentedControl", () => {
  it("es un grupo con nombre y una opción por entrada", () => {
    renderControl();

    const group = screen.getByRole("group", { name: GROUP_LABEL });
    expect(within(group).getAllByRole("button")).toHaveLength(OPTIONS.length);
    expect(optionNamed("Activos")).toBeInTheDocument();
    expect(optionNamed("Inactivos")).toBeInTheDocument();
  });

  /**
   * LA INVARIANTE DEL CONTROL, y el motivo de que exista el primitivo: **siempre
   * hay exactamente una elegida**. No se comprueba sólo que la elegida esté
   * marcada, sino que **el resto no lo está** — un `ToggleGroup` podía tener dos
   * marcadas o ninguna y nadie se enteraba.
   */
  it("marca exactamente una opción, nunca ninguna ni dos", () => {
    renderControl("inactive");

    const pressed = screen
      .getAllByRole("button")
      .filter((option) => option.getAttribute("aria-pressed") === "true");

    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toBe(optionNamed("Inactivos"));
    expect(optionNamed("Activos")).toHaveAttribute("aria-pressed", "false");
  });

  it("avisa con el valor de la opción tocada", async () => {
    const onValueChange = vi.fn();
    renderControl("active", onValueChange);

    await userEvent.click(optionNamed("Inactivos"));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("inactive");
  });

  /**
   * Volver a tocar la ya elegida **no la apaga**: en un excluyente no existe
   * "ninguna". Avisa igual, con el mismo valor, para que el consumidor no tenga
   * que adivinar si hubo o no interacción.
   */
  it("no se puede quedar sin ninguna elegida al retocar la actual", async () => {
    const onValueChange = vi.fn();
    renderControl("active", onValueChange);

    await userEvent.click(optionNamed("Activos"));

    expect(onValueChange).toHaveBeenCalledWith("active");
    expect(optionNamed("Activos")).toHaveAttribute("aria-pressed", "true");
  });

  /** Botones nativos: el tabulador los alcanza y Enter los activa, sin cablear teclado. */
  it("se recorre y se activa con el teclado", async () => {
    const onValueChange = vi.fn();
    renderControl("active", onValueChange);

    await userEvent.tab();
    expect(optionNamed("Activos")).toHaveFocus();

    await userEvent.tab();
    expect(optionNamed("Inactivos")).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("inactive");
  });

  /**
   * `type="button"` fijo: dentro de un formulario, un segmentado que enviara el
   * formulario al elegir sería la deuda 39 en otro disfraz.
   */
  it("nunca envía el formulario que lo contenga", () => {
    renderControl();

    for (const option of screen.getAllByRole("button")) {
      expect(option).toHaveAttribute("type", "button");
    }
  });

  it("respeta una opción deshabilitada sin perder la elegida", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label={GROUP_LABEL}
        options={[OPTIONS[0]!, { ...OPTIONS[1]!, disabled: true }]}
        value="active"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(optionNamed("Inactivos"));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(optionNamed("Activos")).toHaveAttribute("aria-pressed", "true");
  });

  it("fusiona el className del llamador sin perder el suyo", () => {
    const extra = ["w", "full"].join("-");
    const { container } = render(
      <SegmentedControl
        label={GROUP_LABEL}
        options={OPTIONS}
        value="active"
        onValueChange={() => {}}
        className={extra}
      />,
    );

    const track = container.querySelector('[data-slot="segmented-control"]');
    expect(track?.className).toContain(extra);
    expect(track?.className.split(" ").length).toBeGreaterThan(1);
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = renderControl();

    expect(await axe(container)).toHaveNoViolations();
  });
});
