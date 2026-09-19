// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Stepper } from "./Stepper";
import {
  STEPPER_DECREMENT_LABEL,
  STEPPER_INCREMENT_LABEL,
  STEPPER_SIZES,
} from "./stepper.variants";

afterEach(cleanup);

describe("Stepper — nombres públicos (REGLA 2a)", () => {
  it("ancla los tamaños", () => {
    expect([...STEPPER_SIZES].sort()).toEqual(["md", "sm"]);
  });
});

describe("Stepper — incrementar/decrementar (controlado)", () => {
  it("+ llama a onValueChange(value + step) por clic", async () => {
    const onValueChange = vi.fn();
    render(<Stepper value={3} onValueChange={onValueChange} label="Cantidad" />);

    await userEvent.click(
      screen.getByRole("button", { name: STEPPER_INCREMENT_LABEL }),
    );

    expect(onValueChange).toHaveBeenCalledWith(4);
  });

  it("+ llama a onValueChange(value + step) por teclado (Enter/Espacio)", async () => {
    const onValueChange = vi.fn();
    render(<Stepper value={5} onValueChange={onValueChange} label="Cantidad" />);

    const boton = screen.getByRole("button", { name: STEPPER_INCREMENT_LABEL });
    boton.focus();
    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(6);

    await userEvent.keyboard(" ");
    expect(onValueChange).toHaveBeenLastCalledWith(6);
  });

  it("- llama a onValueChange(value - step)", async () => {
    const onValueChange = vi.fn();
    render(<Stepper value={3} onValueChange={onValueChange} label="Cantidad" />);

    await userEvent.click(
      screen.getByRole("button", { name: STEPPER_DECREMENT_LABEL }),
    );

    expect(onValueChange).toHaveBeenCalledWith(2);
  });

  it("respeta un step distinto de 1", async () => {
    const onValueChange = vi.fn();
    render(
      <Stepper value={10} step={5} onValueChange={onValueChange} label="Cantidad" />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: STEPPER_INCREMENT_LABEL }),
    );
    expect(onValueChange).toHaveBeenCalledWith(15);
  });
});

describe("Stepper — piso y techo", () => {
  it("en min, el botón de restar está deshabilitado y no emite nada", async () => {
    const onValueChange = vi.fn();
    render(
      <Stepper value={0} min={0} onValueChange={onValueChange} label="Cantidad" />,
    );

    const restar = screen.getByRole("button", { name: STEPPER_DECREMENT_LABEL });
    expect(restar).toBeDisabled();

    await userEvent.click(restar);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("sin max, sumar nunca se detiene", async () => {
    const onValueChange = vi.fn();
    render(<Stepper value={999} onValueChange={onValueChange} label="Cantidad" />);

    const sumar = screen.getByRole("button", { name: STEPPER_INCREMENT_LABEL });
    expect(sumar).not.toBeDisabled();

    await userEvent.click(sumar);
    expect(onValueChange).toHaveBeenCalledWith(1000);
  });

  it("con max, en el techo el botón de sumar está deshabilitado y no emite nada", async () => {
    const onValueChange = vi.fn();
    render(
      <Stepper value={10} max={10} onValueChange={onValueChange} label="Cantidad" />,
    );

    const sumar = screen.getByRole("button", { name: STEPPER_INCREMENT_LABEL });
    expect(sumar).toBeDisabled();

    await userEvent.click(sumar);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Stepper — el número visible", () => {
  it("el valor se anuncia dentro de un role=\"status\" (<output> implícito)", () => {
    render(<Stepper value={7} onValueChange={vi.fn()} label="Cantidad" />);

    expect(screen.getByRole("status")).toHaveTextContent("7");
  });

  it("formatValue controla lo que se pinta sin cambiar el value real", () => {
    render(
      <Stepper
        value={7}
        onValueChange={vi.fn()}
        label="Cantidad"
        formatValue={(value) => `${value} u.`}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("7 u.");
  });
});

describe("Stepper — el grupo tiene nombre", () => {
  it("el role=\"group\" queda nombrado por label", () => {
    render(<Stepper value={1} onValueChange={vi.fn()} label="Ovillos usados" />);

    expect(
      screen.getByRole("group", { name: "Ovillos usados" }),
    ).toBeInTheDocument();
  });
});

describe("Stepper — deshabilitado por el consumidor", () => {
  it("disabled apaga los dos botones", () => {
    render(
      <Stepper value={3} onValueChange={vi.fn()} label="Cantidad" disabled />,
    );

    expect(
      screen.getByRole("button", { name: STEPPER_INCREMENT_LABEL }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: STEPPER_DECREMENT_LABEL }),
    ).toBeDisabled();
  });
});

describe("Stepper — accesibilidad", () => {
  it("no tiene violaciones de axe", async () => {
    const { container } = render(
      <Stepper value={3} min={0} onValueChange={vi.fn()} label="Cantidad" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
