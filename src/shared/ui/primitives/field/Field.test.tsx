// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";

import { Field } from "./Field";
import { Input } from "./Input";
import { fieldLabelVariants, fieldMessageVariants } from "./field.variants";

afterEach(cleanup);

describe("Field", () => {
  it("renders and associates the label with the control (smoke)", () => {
    render(
      <Field label="Nombre del patrón">
        <Input defaultValue="Cárdigan" />
      </Field>,
    );

    const input = screen.getByLabelText("Nombre del patrón");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("lets the user type into the associated input", async () => {
    const user = userEvent.setup();
    render(
      <Field label="Aguja">
        <Input />
      </Field>,
    );

    const input = screen.getByLabelText("Aguja");
    await user.type(input, "4.5");

    expect(input).toHaveValue("4.5");
  });

  it("shows the hint and describes the control with it", () => {
    render(
      <Field label="Nombre" hint="visible en tu perfil">
        <Input />
      </Field>,
    );

    const input = screen.getByLabelText("Nombre");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText("visible en tu perfil")).toHaveAttribute(
      "id",
      describedBy,
    );
  });

  it("exposes the error via aria-invalid and aria-describedby", () => {
    render(
      <Field label="Aguja (mm)" error="ingresá un número entre 2 y 12">
        <Input defaultValue="veintiuno" />
      </Field>,
    );

    const input = screen.getByLabelText("Aguja (mm)");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(
      screen.getByText("ingresá un número entre 2 y 12"),
    ).toHaveAttribute("id", describedBy);
  });

  it("prefers the error over the hint when both are present", () => {
    render(
      <Field label="Aguja" hint="pista" error="error real">
        <Input />
      </Field>,
    );

    expect(screen.getByText("error real")).toBeInTheDocument();
    expect(screen.queryByText("pista")).not.toBeInTheDocument();
  });

  /**
   * ENMIENDA E13 (c). El tono inverso existe porque los controles del Dashboard
   * perdieron su `Card` y pasaron a dibujarse sobre el fondo oscuro de la app.
   * Acá se comprueba que el `prop` **llega al marcado**: que la etiqueta y el
   * pie salgan con la piel del tono pedido y no con la de superficie clara.
   *
   * Las clases NO se escriben literales —Tailwind escanea los tests—: se piden a
   * las mismas variantes que usa el componente, así que el test compara la
   * salida real contra la fuente real. El contraste de cada tono se mide aparte,
   * en `field.variants.test.ts`.
   */
  it("dibuja la etiqueta y el pie con la piel del tono pedido", () => {
    render(
      <Field tone="inverse" label="Año" error="fuera de rango">
        <Input />
      </Field>,
    );

    const label = screen.getByText("Año");
    for (const className of cn(
      fieldLabelVariants({ tone: "inverse" }),
    ).split(" ")) {
      expect(label).toHaveClass(className);
    }

    const message = screen.getByText("fuera de rango");
    for (const className of cn(
      fieldMessageVariants({ tone: "inverse", invalid: true }),
    ).split(" ")) {
      expect(message).toHaveClass(className);
    }
  });

  /** Y sin `tone` sigue saliendo la piel de superficie clara: nada regresa. */
  it("sin tono explícito conserva la piel de superficie clara", () => {
    render(
      <Field label="Nombre">
        <Input />
      </Field>,
    );

    for (const className of cn(
      fieldLabelVariants({ tone: "default" }),
    ).split(" ")) {
      expect(screen.getByText("Nombre")).toHaveClass(className);
    }
  });

  it("has no axe violations (valid and error states)", async () => {
    const { container } = render(
      <>
        <Field label="Nombre" hint="pista">
          <Input />
        </Field>
        <Field label="Aguja" error="revisá el valor">
          <Input />
        </Field>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
