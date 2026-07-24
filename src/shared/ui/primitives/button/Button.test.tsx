// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Button } from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it("renders as a button with its label (smoke)", () => {
    render(<Button>Tejer</Button>);
    expect(screen.getByRole("button", { name: "Tejer" })).toBeInTheDocument();
  });

  it("defaults to type=button", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("calls onClick when pressed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enviar</Button>);

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick while disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Enviar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Enviar" });
    expect(button).toBeDisabled();
    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("is focusable via keyboard when enabled", async () => {
    const user = userEvent.setup();
    render(<Button>Foco</Button>);

    await user.tab();

    expect(screen.getByRole("button", { name: "Foco" })).toHaveFocus();
  });

  it("marks itself busy and disabled while loading", () => {
    render(<Button loading>Guardando</Button>);

    const button = screen.getByRole("button", { name: "Guardando" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("merges a custom className without dropping variant classes", () => {
    render(
      <Button variant="primary" className="custom-class">
        Estilo
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Estilo" });
    expect(button).toHaveClass("custom-class");
    expect(button.className).toContain("bg-accent");
  });

  it("has no axe violations across variants", async () => {
    const { container } = render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
