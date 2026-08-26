// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";

import { Field } from "../field/Field";
import { inputClasses } from "../field/Input";

import {
  TEXTAREA_DEFAULT_ROWS,
  Textarea,
  textareaClasses,
} from "./Textarea";

afterEach(cleanup);

/**
 * `Textarea` (enmienda **E6 (b)** del RFC-03).
 *
 * Existe por las **notas del proyecto**, que aceptan **5000 caracteres**
 * (`projects/validation.ts:25`) y hoy no tienen ningún control: escribir un
 * párrafo en una caja de una línea es el defecto que este primitivo cierra.
 *
 * Ninguna clase se escribe literal (Tailwind escanea los tests): todas se
 * derivan de las constantes del componente.
 */
describe("Textarea", () => {
  it("renderiza un textarea nativo (smoke)", () => {
    render(<Textarea aria-label="Notas" />);

    expect(screen.getByLabelText("Notas").tagName).toBe("TEXTAREA");
  });

  it("deja escribir varias líneas", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Notas" />);

    const textarea = screen.getByLabelText("Notas");
    await user.type(textarea, "Primera línea{enter}Segunda línea");

    expect(textarea).toHaveValue("Primera línea\nSegunda línea");
  });

  /**
   * **La caja nace alta, no de una línea.** Es lo único que separa a este
   * primitivo de un `Input` con otra etiqueta, y se pide con `rows` —un número
   * de LÍNEAS, no una longitud— para no inventar un token de altura que el
   * sistema no tiene.
   */
  it("nace con varias líneas de alto y deja cambiarlo", () => {
    const { rerender } = render(<Textarea aria-label="Notas" />);
    expect(screen.getByLabelText("Notas")).toHaveAttribute(
      "rows",
      String(TEXTAREA_DEFAULT_ROWS),
    );
    expect(TEXTAREA_DEFAULT_ROWS).toBeGreaterThan(1);

    rerender(<Textarea aria-label="Notas" rows={8} />);
    expect(screen.getByLabelText("Notas")).toHaveAttribute("rows", "8");
  });

  it("Field le cablea la etiqueta, el estado inválido y el mensaje", () => {
    render(
      <Field label="Notas" error="Máximo 5000 caracteres.">
        <Textarea />
      </Field>,
    );

    const textarea = screen.getByLabelText("Notas");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("aria-invalid", "true");

    const describedBy = textarea.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(screen.getByText("Máximo 5000 caracteres.")).toHaveAttribute(
      "id",
      describedBy,
    );
  });

  it("reenvía la ref al textarea", () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<Textarea ref={ref} aria-label="Notas" />);

    expect(ref.current).toBe(screen.getByLabelText("Notas"));
  });

  it("hereda entera la piel del control de texto", () => {
    render(<Textarea aria-label="Notas" />);

    const textarea = screen.getByLabelText("Notas");
    for (const className of cn(inputClasses).split(" ")) {
      expect(textarea).toHaveClass(className);
    }
  });

  it("añade lo suyo por encima de la piel del control de texto", () => {
    render(<Textarea aria-label="Notas" />);

    const heredadas = cn(inputClasses).split(" ");
    const propias = cn(textareaClasses)
      .split(" ")
      .filter((className) => !heredadas.includes(className));

    expect(propias.length).toBeGreaterThan(0);
    for (const className of propias) {
      expect(screen.getByLabelText("Notas")).toHaveClass(className);
    }
  });

  it("deja sobreescribir clases desde fuera sin chocar", () => {
    const override = ["max", "w", "xs"].join("-");
    render(<Textarea aria-label="Notas" className={override} />);

    expect(screen.getByLabelText("Notas")).toHaveClass(override);
  });

  it("no tiene violaciones de axe dentro de un Field, válido y con error", async () => {
    const { container } = render(
      <>
        <Field label="Notas">
          <Textarea />
        </Field>
        <Field label="Notas del patrón" error="Revisá el texto.">
          <Textarea />
        </Field>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
