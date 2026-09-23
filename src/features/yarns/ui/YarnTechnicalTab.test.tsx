// @vitest-environment happy-dom
import { createRef } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { emptyYarnFormValues, type YarnFormValues } from "./yarn-form";
import { YarnTechnicalTab } from "./YarnTechnicalTab";

afterEach(cleanup);

const VALUES: YarnFormValues = {
  ...emptyYarnFormValues(),
  length: "100",
  fiber: "Lana merino",
  needleMin: "4",
  needleMax: "5",
  thickness: "4,5",
  lot: "2026-03-05",
  quantity: "3",
};

describe("YarnTechnicalTab — controlado, sin usedQuantity (design)", () => {
  it("muestra los valores de cada campo tal como llegan por props", () => {
    render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByLabelText("Largo (m)")).toHaveValue("100");
    expect(screen.getByLabelText("Fibra")).toHaveValue("Lana merino");
    expect(screen.getByLabelText("Mínimo")).toHaveValue("4");
    expect(screen.getByLabelText("Máximo")).toHaveValue("5");
    expect(screen.getByLabelText("Grosor (mm)")).toHaveValue("4,5");
    expect(screen.getByLabelText("Lote")).toHaveValue("2026-03-05");
    expect(screen.getByLabelText("Stock (ovillos)")).toHaveValue("3");
  });

  it("lot se renderiza como input type=date", () => {
    render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByLabelText("Lote")).toHaveAttribute("type", "date");
  });

  it("no ofrece ningún control para usedQuantity", () => {
    render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.queryByLabelText(/ovillos usados/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ovillos usados/i)).not.toBeInTheDocument();
  });

  /** C3: chequeo estructural, no sólo por texto — si algún día apareciera un
   * octavo input (p. ej. para `usedQuantity`), este conteo lo detecta aunque
   * no lleve la etiqueta "ovillos usados". */
  it("renderiza exactamente 7 inputs — uno por campo, ninguno de más (C3)", () => {
    const { container } = render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );

    expect(container.querySelectorAll("input")).toHaveLength(7);
  });

  it("escribir en Largo llama a onChange con el parche { length }", async () => {
    const onChange = vi.fn();
    render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{}}
        onChange={onChange}
        disabled={false}
      />,
    );

    await userEvent.type(screen.getByLabelText("Largo (m)"), "0");

    expect(onChange).toHaveBeenCalledWith({ length: "1000" });
  });

  it("escribir en Fibra llama a onChange con el parche { fiber }", async () => {
    const onChange = vi.fn();
    render(
      <YarnTechnicalTab
        values={{ ...VALUES, fiber: "" }}
        errors={{}}
        onChange={onChange}
        disabled={false}
      />,
    );

    await userEvent.type(screen.getByLabelText("Fibra"), "L");

    expect(onChange).toHaveBeenCalledWith({ fiber: "L" });
  });

  it("escribir en Mínimo llama a onChange con el parche { needleMin }", async () => {
    const onChange = vi.fn();
    render(
      <YarnTechnicalTab
        values={{ ...VALUES, needleMin: "" }}
        errors={{}}
        onChange={onChange}
        disabled={false}
      />,
    );

    await userEvent.type(screen.getByLabelText("Mínimo"), "4");

    expect(onChange).toHaveBeenCalledWith({ needleMin: "4" });
  });

  /** C1: sin este caso, un binding cruzado (p. ej. Máximo llamando a
   * onMinChange) pasaría inadvertido — el caso de Mínimo arriba no lo cubre. */
  it("escribir en Máximo llama a onChange con el parche { needleMax } (C1)", async () => {
    const onChange = vi.fn();
    render(
      <YarnTechnicalTab
        values={{ ...VALUES, needleMax: "" }}
        errors={{}}
        onChange={onChange}
        disabled={false}
      />,
    );

    await userEvent.type(screen.getByLabelText("Máximo"), "5");

    expect(onChange).toHaveBeenCalledWith({ needleMax: "5" });
  });

  it("escribir en Grosor llama a onChange con el parche { thickness }", async () => {
    const onChange = vi.fn();
    render(
      <YarnTechnicalTab
        values={{ ...VALUES, thickness: "" }}
        errors={{}}
        onChange={onChange}
        disabled={false}
      />,
    );

    await userEvent.type(screen.getByLabelText("Grosor (mm)"), "4");

    expect(onChange).toHaveBeenCalledWith({ thickness: "4" });
  });

  it("cambiar Lote llama a onChange con el parche { lot }", async () => {
    const onChange = vi.fn();
    render(
      <YarnTechnicalTab
        values={{ ...VALUES, lot: "" }}
        errors={{}}
        onChange={onChange}
        disabled={false}
      />,
    );

    /* Gotcha confirmado en `design.md` (Testing Strategy): bajo happy-dom,
       `user-event` SÍ dispara el cambio de un input `type="date"` en esta
       versión (comprobado con un probe descartable antes de escribir este
       test) — el fallback a `fireEvent.change` que el design reserva por si
       fallara no hizo falta acá. */
    await userEvent.type(screen.getByLabelText("Lote"), "2026-03-05");

    expect(onChange).toHaveBeenCalledWith({ lot: "2026-03-05" });
  });

  it("escribir en Stock llama a onChange con el parche { quantity }", async () => {
    const onChange = vi.fn();
    render(
      <YarnTechnicalTab
        values={{ ...VALUES, quantity: "" }}
        errors={{}}
        onChange={onChange}
        disabled={false}
      />,
    );

    await userEvent.type(screen.getByLabelText("Stock (ovillos)"), "3");

    expect(onChange).toHaveBeenCalledWith({ quantity: "3" });
  });

  it("cada error se renderiza en el campo que le corresponde", () => {
    render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{
          length: "Ingresá el largo, en metros.",
          needleMax: "El máximo debe ser >= al mínimo.",
          lot: "La fecha de lote es obligatoria.",
        }}
        onChange={vi.fn()}
        disabled={false}
      />,
    );

    expect(
      screen.getByText("Ingresá el largo, en metros."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El máximo debe ser >= al mínimo."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La fecha de lote es obligatoria."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Largo (m)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Máximo")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Lote")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Fibra")).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  /** C2: un error distinto por cada uno de los 7 campos — si algún binding
   * estuviera cruzado (p. ej. el error de `fiber` cableado al input de
   * `thickness`), este caso lo expondría; el caso de arriba, con sólo 3
   * campos, no lo garantiza. */
  it("los 7 campos muestran su propio texto de error y aria-invalid, sin cruzarse (C2)", () => {
    const ERRORS: Record<keyof typeof VALUES, string> = {
      brandId: "",
      typeId: "",
      colorName: "",
      colorCode: "",
      colorFamily: "",
      image: "",
      length: "Ingresá el largo, en metros.",
      fiber: "Ingresá la fibra.",
      needleMin: "Ingresá la aguja mínima, en mm.",
      needleMax: "Ingresá la aguja máxima, en mm.",
      thickness: "Ingresá el grosor, en mm.",
      lot: "La fecha de lote es obligatoria.",
      quantity: "Ingresá el stock, en ovillos.",
    };
    const FIELD_ERROR_TEXT: Record<string, string> = {
      "Largo (m)": ERRORS.length,
      Fibra: ERRORS.fiber,
      Mínimo: ERRORS.needleMin,
      Máximo: ERRORS.needleMax,
      "Grosor (mm)": ERRORS.thickness,
      Lote: ERRORS.lot,
      "Stock (ovillos)": ERRORS.quantity,
    };

    render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{
          length: ERRORS.length,
          fiber: ERRORS.fiber,
          needleMin: ERRORS.needleMin,
          needleMax: ERRORS.needleMax,
          thickness: ERRORS.thickness,
          lot: ERRORS.lot,
          quantity: ERRORS.quantity,
        }}
        onChange={vi.fn()}
        disabled={false}
      />,
    );

    for (const [label, message] of Object.entries(FIELD_ERROR_TEXT)) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(field).toHaveAttribute(
        "aria-describedby",
        screen.getByText(message).id,
      );
    }
  });

  it("disabled desactiva todos los campos", () => {
    render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{}}
        onChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText("Largo (m)")).toBeDisabled();
    expect(screen.getByLabelText("Fibra")).toBeDisabled();
    expect(screen.getByLabelText("Mínimo")).toBeDisabled();
    expect(screen.getByLabelText("Máximo")).toBeDisabled();
    expect(screen.getByLabelText("Grosor (mm)")).toBeDisabled();
    expect(screen.getByLabelText("Lote")).toBeDisabled();
    expect(screen.getByLabelText("Stock (ovillos)")).toBeDisabled();
  });

  it("los refs de cada campo apuntan a su propio input", () => {
    const lengthRef = createRef<HTMLInputElement>();
    const fiberRef = createRef<HTMLInputElement>();
    const needleMinRef = createRef<HTMLInputElement>();
    const needleMaxRef = createRef<HTMLInputElement>();
    const thicknessRef = createRef<HTMLInputElement>();
    const lotRef = createRef<HTMLInputElement>();
    const quantityRef = createRef<HTMLInputElement>();

    render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{}}
        onChange={vi.fn()}
        disabled={false}
        lengthRef={lengthRef}
        fiberRef={fiberRef}
        needleMinRef={needleMinRef}
        needleMaxRef={needleMaxRef}
        thicknessRef={thicknessRef}
        lotRef={lotRef}
        quantityRef={quantityRef}
      />,
    );

    expect(lengthRef.current).toBe(screen.getByLabelText("Largo (m)"));
    expect(fiberRef.current).toBe(screen.getByLabelText("Fibra"));
    expect(needleMinRef.current).toBe(screen.getByLabelText("Mínimo"));
    expect(needleMaxRef.current).toBe(screen.getByLabelText("Máximo"));
    expect(thicknessRef.current).toBe(screen.getByLabelText("Grosor (mm)"));
    expect(lotRef.current).toBe(screen.getByLabelText("Lote"));
    expect(quantityRef.current).toBe(screen.getByLabelText("Stock (ovillos)"));
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  /** C4: la corrida sin errores no prueba nada sobre aria-invalid ni
   * aria-describedby en los 7 campos a la vez. */
  it("no tiene violaciones de axe con los 7 campos en error (C4)", async () => {
    const { container } = render(
      <YarnTechnicalTab
        values={VALUES}
        errors={{
          length: "Ingresá el largo, en metros.",
          fiber: "Ingresá la fibra.",
          needleMin: "Ingresá la aguja mínima, en mm.",
          needleMax: "Ingresá la aguja máxima, en mm.",
          thickness: "Ingresá el grosor, en mm.",
          lot: "La fecha de lote es obligatoria.",
          quantity: "Ingresá el stock, en ovillos.",
        }}
        onChange={vi.fn()}
        disabled={false}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
