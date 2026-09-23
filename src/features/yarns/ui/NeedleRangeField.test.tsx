// @vitest-environment happy-dom
import { createRef } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NeedleRangeField } from "./NeedleRangeField";

afterEach(cleanup);

describe("NeedleRangeField — Mínimo y Máximo, cada uno con su error (design D6)", () => {
  it("vive dentro de un fieldset nombrado «Aguja recomendada (mm)»", () => {
    render(
      <NeedleRangeField
        min=""
        max=""
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Aguja recomendada (mm)" }),
    ).toBeInTheDocument();
  });

  it("muestra los dos campos con sus valores controlados", () => {
    render(
      <NeedleRangeField
        min="4"
        max="5"
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Mínimo")).toHaveValue("4");
    expect(screen.getByLabelText("Máximo")).toHaveValue("5");
  });

  it("escribir en Mínimo llama a onMinChange con el texto crudo", async () => {
    const onMinChange = vi.fn();
    render(
      <NeedleRangeField
        min=""
        max=""
        onMinChange={onMinChange}
        onMaxChange={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Mínimo"), "4");

    expect(onMinChange).toHaveBeenCalledWith("4");
  });

  it("escribir en Máximo llama a onMaxChange con el texto crudo", async () => {
    const onMaxChange = vi.fn();
    render(
      <NeedleRangeField
        min=""
        max=""
        onMinChange={vi.fn()}
        onMaxChange={onMaxChange}
      />,
    );

    await userEvent.type(screen.getByLabelText("Máximo"), "6");

    expect(onMaxChange).toHaveBeenCalledWith("6");
  });

  it("cada campo muestra su propio error, sin mezclarse con el otro, cableado por aria-describedby (B1)", () => {
    render(
      <NeedleRangeField
        min="6"
        max="4"
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        maxError="El máximo debe ser >= al mínimo."
      />,
    );

    const maxMessage = screen.getByText("El máximo debe ser >= al mínimo.");
    const maxInput = screen.getByLabelText("Máximo");
    const minInput = screen.getByLabelText("Mínimo");

    expect(maxMessage).toBeInTheDocument();
    expect(maxInput).toHaveAttribute("aria-invalid", "true");
    expect(maxInput).toHaveAttribute("aria-describedby", maxMessage.id);
    expect(minInput).not.toHaveAttribute("aria-invalid");
    expect(minInput).not.toHaveAttribute("aria-describedby");
  });

  it("minError y maxError renderizan a la vez, cada uno cableado a su propio campo (B1)", async () => {
    render(
      <NeedleRangeField
        min=""
        max=""
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        minError="Ingresá la aguja mínima, en mm."
        maxError="Ingresá la aguja máxima, en mm."
      />,
    );

    const minInput = screen.getByLabelText("Mínimo");
    const maxInput = screen.getByLabelText("Máximo");
    const minMessage = screen.getByText("Ingresá la aguja mínima, en mm.");
    const maxMessage = screen.getByText("Ingresá la aguja máxima, en mm.");

    expect(minInput).toHaveAttribute("aria-invalid", "true");
    expect(minInput).toHaveAttribute("aria-describedby", minMessage.id);
    expect(maxInput).toHaveAttribute("aria-invalid", "true");
    expect(maxInput).toHaveAttribute("aria-describedby", maxMessage.id);
    expect(minMessage.id).not.toBe(maxMessage.id);
  });

  it("no tiene violaciones de axe con ambos errores presentes (B1)", async () => {
    const { container } = render(
      <NeedleRangeField
        min=""
        max=""
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        minError="Ingresá la aguja mínima, en mm."
        maxError="Ingresá la aguja máxima, en mm."
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("minRef y maxRef apuntan a sus propios inputs", () => {
    const minRef = createRef<HTMLInputElement>();
    const maxRef = createRef<HTMLInputElement>();
    render(
      <NeedleRangeField
        min=""
        max=""
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        minRef={minRef}
        maxRef={maxRef}
      />,
    );

    expect(minRef.current).toBe(screen.getByLabelText("Mínimo"));
    expect(maxRef.current).toBe(screen.getByLabelText("Máximo"));
  });

  it("disabled desactiva los dos campos", () => {
    render(
      <NeedleRangeField
        min=""
        max=""
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText("Mínimo")).toBeDisabled();
    expect(screen.getByLabelText("Máximo")).toBeDisabled();
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = render(
      <NeedleRangeField
        min="4"
        max="5"
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
