// @vitest-environment happy-dom
import { createRef } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { COLOR_FAMILIES, COLOR_FAMILY_LABELS } from "@/shared/config";

import { ColorFamilyPicker } from "./ColorFamilyPicker";

afterEach(cleanup);

function group(): HTMLElement {
  return screen.getByRole("group", { name: "Familia de color" });
}

describe("ColorFamilyPicker — obligatorio, aria-pressed exclusivo (design D4)", () => {
  it("vive dentro de un fieldset nombrado por su legend", () => {
    render(<ColorFamilyPicker value={null} onValueChange={vi.fn()} />);
    expect(group()).toBeInTheDocument();
  });

  it("monta un control por cada familia de color, ni uno más ni uno menos", () => {
    render(<ColorFamilyPicker value={null} onValueChange={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(COLOR_FAMILIES.length);
  });

  it("marca aria-pressed sólo en la familia activa", () => {
    render(<ColorFamilyPicker value="red" onValueChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.red }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.green }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("tocar una familia sin elegir todavía la fija", async () => {
    const onValueChange = vi.fn();
    render(<ColorFamilyPicker value={null} onValueChange={onValueChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.blue }),
    );

    expect(onValueChange).toHaveBeenCalledWith("blue");
  });

  it("tocar una familia distinta reemplaza la activa", async () => {
    const onValueChange = vi.fn();
    render(<ColorFamilyPicker value="red" onValueChange={onValueChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.green }),
    );

    expect(onValueChange).toHaveBeenCalledWith("green");
  });

  /** design D4: re-presionar la activa NO la limpia — a diferencia del filtro. */
  it("volver a tocar la familia activa es un no-op", async () => {
    const onValueChange = vi.fn();
    render(<ColorFamilyPicker value="red" onValueChange={onValueChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.red }),
    );

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("el nombre de la familia elegida se ve junto al legend", () => {
    render(<ColorFamilyPicker value="red" onValueChange={vi.fn()} />);

    const name = screen.getByText(COLOR_FAMILY_LABELS.red, { selector: "span" });
    expect(name).toHaveAttribute("aria-hidden", "true");
  });

  it("sin selección no muestra ningún nombre de familia junto al legend", () => {
    render(<ColorFamilyPicker value={null} onValueChange={vi.fn()} />);

    for (const family of COLOR_FAMILIES) {
      expect(
        screen.queryByText(COLOR_FAMILY_LABELS[family], { selector: "span" }),
      ).not.toBeInTheDocument();
    }
  });

  it("el mensaje de error se cablea siempre por aria-describedby", () => {
    render(
      <ColorFamilyPicker
        value={null}
        onValueChange={vi.fn()}
        error="Elegí una familia de color."
      />,
    );

    const fieldset = group();
    const message = screen.getByText("Elegí una familia de color.");
    expect(fieldset).toHaveAttribute("aria-describedby", message.id);
  });

  it("sin error no cablea aria-describedby, no muestra mensaje ni aria-invalid", () => {
    render(<ColorFamilyPicker value={null} onValueChange={vi.fn()} />);

    expect(group()).not.toHaveAttribute("aria-describedby");
    expect(group()).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(document.querySelector("span.text-danger")).not.toBeInTheDocument();
  });

  /** A2: un error="" cuenta como "sin error" — mismo guard que undefined (línea ~43). */
  it("un error de cadena vacía se trata como ausencia de error", () => {
    render(<ColorFamilyPicker value={null} onValueChange={vi.fn()} error="" />);

    expect(group()).not.toHaveAttribute("aria-describedby");
    expect(group()).not.toHaveAttribute("aria-invalid");
    expect(document.querySelector("span.text-danger")).not.toBeInTheDocument();
  });

  /** A1: dos instancias en pantalla no deben compartir el id de su mensaje de
   * error — un `ERROR_ID` fijo produciría un `aria-describedby` idéntico en
   * ambas, apuntando siempre al primer nodo del DOM con ese id. */
  it("cada instancia resuelve aria-describedby a su propio mensaje (A1)", () => {
    render(
      <>
        <ColorFamilyPicker value={null} onValueChange={vi.fn()} error="Error A" />
        <ColorFamilyPicker value={null} onValueChange={vi.fn()} error="Error B" />
      </>,
    );

    const [firstGroup, secondGroup] = screen.getAllByRole("group", {
      name: "Familia de color",
    });
    const messageA = screen.getByText("Error A");
    const messageB = screen.getByText("Error B");

    expect(messageA.id).not.toBe(messageB.id);
    expect(firstGroup).toHaveAttribute("aria-describedby", messageA.id);
    expect(secondGroup).toHaveAttribute("aria-describedby", messageB.id);
  });

  it("focusRef apunta a la activa cuando hay una selección", () => {
    const focusRef = createRef<HTMLButtonElement>();
    render(
      <ColorFamilyPicker value="green" onValueChange={vi.fn()} focusRef={focusRef} />,
    );

    expect(focusRef.current).toBe(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.green }),
    );
  });

  it("focusRef apunta a la primera opción cuando no hay selección", () => {
    const focusRef = createRef<HTMLButtonElement>();
    render(<ColorFamilyPicker value={null} onValueChange={vi.fn()} focusRef={focusRef} />);

    expect(focusRef.current).toBe(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS[COLOR_FAMILIES[0]] }),
    );
  });

  it("disabled desactiva las 13 opciones", () => {
    render(<ColorFamilyPicker value={null} onValueChange={vi.fn()} disabled />);

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  it("no tiene violaciones de axe sin error", async () => {
    const { container } = render(
      <ColorFamilyPicker value="red" onValueChange={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("no tiene violaciones de axe con error, y expone el estado inválido de forma accesible", async () => {
    const { container } = render(
      <ColorFamilyPicker
        value={null}
        onValueChange={vi.fn()}
        error="Elegí una familia de color."
      />,
    );
    expect(await axe(container)).toHaveNoViolations();

    /* R3-003: `vitest-axe` acepta `aria-invalid` en el `<fieldset>` (rol
       `group`) sin violación — comprobado empíricamente arriba, así que el
       estado inválido accesible se queda en el fieldset y NO hace falta
       moverlo a cada toggle individual (la rama alternativa que el design
       reserva por si axe lo rechazaba). */
    expect(group()).toHaveAttribute("aria-invalid", "true");
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("aria-invalid");
    }
  });
});
