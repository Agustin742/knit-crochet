// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";

import { Field } from "../field/Field";
import { inputClasses } from "../field/Input";

import { Select, selectClasses } from "./Select";

afterEach(cleanup);

/**
 * `Select` (enmienda **E6 (b)** del RFC-03).
 *
 * Lo que se mide acá es el contrato del primitivo, no su pinta: que sea un
 * `<select>` de verdad, que **componga con `Field` igual que `Input`** —o sea que
 * deje que `Field` le cablee `id`, `aria-invalid` y `aria-describedby` por
 * `cloneElement`, que es lo único que hace que la etiqueta y el mensaje de error
 * lleguen a quien usa un lector de pantalla— y que su piel sea **la misma** que
 * la del control de texto en vez de una copia parecida.
 *
 * Ninguna clase se escribe literal: Tailwind escanea también los tests y una
 * clase citada como ejemplo se vuelve CSS de producción. Todas se DERIVAN de las
 * mismas constantes que usa el componente.
 */
function opciones() {
  return (
    <>
      <option value="">Cualquiera</option>
      <option value="knitting">Dos agujas</option>
      <option value="crochet">Crochet</option>
    </>
  );
}

describe("Select", () => {
  it("renderiza un select nativo con sus opciones (smoke)", () => {
    render(<Select aria-label="Tipo">{opciones()}</Select>);

    const select = screen.getByLabelText("Tipo");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Crochet" })).toBeInTheDocument();
  });

  it("deja elegir una opción y avisa al llamador", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select aria-label="Tipo" defaultValue="" onChange={onChange}>
        {opciones()}
      </Select>,
    );

    const select = screen.getByLabelText("Tipo");
    await user.selectOptions(select, "crochet");

    expect(select).toHaveValue("crochet");
    expect(onChange).toHaveBeenCalled();
  });

  /**
   * El corazón de E6 (b): sin esto, `Field` seguiría siendo el único que sabe
   * atar etiqueta y control, y el `<select>` volvería a escribirse a mano.
   */
  it("Field le cablea la etiqueta, el estado inválido y el mensaje", () => {
    render(
      <Field label="Tipo de tejido" error="Elegí un tipo.">
        <Select defaultValue="">{opciones()}</Select>
      </Field>,
    );

    const select = screen.getByLabelText("Tipo de tejido");
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveAttribute("aria-invalid", "true");

    const describedBy = select.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(screen.getByText("Elegí un tipo.")).toHaveAttribute(
      "id",
      describedBy,
    );
  });

  it("reenvía la ref al select, para que el modal pueda pedirle el foco", () => {
    const ref = { current: null as HTMLSelectElement | null };
    render(
      <Select ref={ref} aria-label="Tipo">
        {opciones()}
      </Select>,
    );

    expect(ref.current).toBe(screen.getByLabelText("Tipo"));
  });

  /**
   * La piel es **la misma** que la del control de texto, no una parecida: si
   * mañana cambia el borde de `Input`, el `Select` cambia con él. Por eso se
   * compara contra `inputClasses` derivado, no contra una lista copiada.
   *
   * Se compara contra `cn(inputClasses)` y no contra la constante cruda porque
   * lo que `Input` pinta **también** pasa por `cn()`: `twMerge` descarta ahí una
   * clase (medido), así que la constante cruda no describe lo que ningún control
   * renderiza. Comparar contra la cruda haría fallar a `Select` por una
   * diferencia que `Input` tiene igual.
   */
  it("hereda entera la piel del control de texto", () => {
    render(<Select aria-label="Tipo">{opciones()}</Select>);

    const select = screen.getByLabelText("Tipo");
    for (const className of cn(inputClasses).split(" ")) {
      expect(select).toHaveClass(className);
    }
  });

  it("se comporta como un control que se abre, no como una caja de texto", () => {
    render(<Select aria-label="Tipo">{opciones()}</Select>);

    const heredadas = cn(inputClasses).split(" ");
    const propias = cn(selectClasses)
      .split(" ")
      .filter((className) => !heredadas.includes(className));

    // Añade algo por encima del control de texto; si no, no haría falta.
    expect(propias.length).toBeGreaterThan(0);
    for (const className of propias) {
      expect(screen.getByLabelText("Tipo")).toHaveClass(className);
    }
  });

  it("deja sobreescribir clases desde fuera sin chocar", () => {
    // Armada en runtime: Tailwind escanea también los tests.
    const override = ["max", "w", "xs"].join("-");
    render(
      <Select aria-label="Tipo" className={override}>
        {opciones()}
      </Select>,
    );

    expect(screen.getByLabelText("Tipo")).toHaveClass(override);
  });

  it("no tiene violaciones de axe dentro de un Field, válido y con error", async () => {
    const { container } = render(
      <>
        <Field label="Tipo">
          <Select defaultValue="">{opciones()}</Select>
        </Field>
        <Field label="Patrón" error="Elegí uno.">
          <Select defaultValue="">{opciones()}</Select>
        </Field>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
