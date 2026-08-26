// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Field } from "../field/Field";

import {
  FILE_INPUT_BUTTON_LABEL,
  FILE_INPUT_EMPTY_LABEL,
  FileInput,
} from "./FileInput";

afterEach(cleanup);

/**
 * `FileInput` (enmienda **E6 (c)** del RFC-03).
 *
 * **Es tonto a propósito y ésa es la mitad del contrato.** Esa mitad —que no
 * sabe nada de subidas ni de ningún endpoint, la frontera de la **deuda 168**—
 * se mide leyendo el fuente en `file-input.boundary.test.ts`, porque ningún test
 * de comportamiento puede demostrar una ausencia. Acá se mide la otra mitad: que
 * elige un archivo y enseña cuál eligió.
 *
 * La forma elegida —un `<input type="file">` real, invisible pero **enfocable**,
 * con un disparador visible marcado como oculto para la tecnología asistiva— no
 * es decoración: es la única que deja **un solo control** en el árbol de
 * accesibilidad. Un disparador que también fuera `<label>` daría al mismo input
 * dos etiquetas (la de `Field` y la suya); un input con `display:none` saldría
 * del orden de tabulación y dejaría a quien navega por teclado sin forma de
 * abrir el selector.
 */
function archivo(nombre = "cardigan.png") {
  return new File(["contenido"], nombre, { type: "image/png" });
}

describe("FileInput", () => {
  it("renderiza un input de archivo real (smoke)", () => {
    render(<FileInput aria-label="Foto" onFileChange={vi.fn()} />);

    const input = screen.getByLabelText("Foto");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("type", "file");
  });

  it("reenvía el filtro de formatos al input nativo", () => {
    render(
      <FileInput
        aria-label="Foto"
        accept="image/jpeg,image/png,image/webp"
        onFileChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Foto")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
  });

  it("avisa con el archivo elegido", async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();
    render(<FileInput aria-label="Foto" onFileChange={onFileChange} />);

    const elegido = archivo();
    await user.upload(screen.getByLabelText("Foto"), elegido);

    expect(onFileChange).toHaveBeenCalledTimes(1);
    expect(onFileChange).toHaveBeenCalledWith(elegido);
  });

  /** Sin archivo, el hueco DICE que está vacío en vez de quedarse mudo. */
  it("dice que no hay archivo elegido cuando no lo hay", () => {
    render(<FileInput aria-label="Foto" onFileChange={vi.fn()} />);

    expect(screen.getByText(FILE_INPUT_EMPTY_LABEL)).toBeInTheDocument();
  });

  /**
   * "Muestra cuál eligió" (E6 c). El nombre **lo manda el llamador**: quien sube
   * la foto ya tiene el archivo en su estado, y una segunda copia dentro del
   * primitivo serían dos fuentes de verdad que se desincronizan en cuanto el
   * formulario se limpia tras guardar.
   */
  it("muestra el nombre del archivo elegido y quita el aviso de vacío", () => {
    render(
      <FileInput
        aria-label="Foto"
        fileName="cardigan.png"
        onFileChange={vi.fn()}
      />,
    );

    expect(screen.getByText("cardigan.png")).toBeInTheDocument();
    expect(screen.queryByText(FILE_INPUT_EMPTY_LABEL)).not.toBeInTheDocument();
  });

  it("el disparador visible abre el selector del navegador", async () => {
    const user = userEvent.setup();
    render(<FileInput aria-label="Foto" onFileChange={vi.fn()} />);

    const input = screen.getByLabelText("Foto");
    const abierto = vi.fn();
    input.addEventListener("click", abierto);

    await user.click(screen.getByText(FILE_INPUT_BUTTON_LABEL));

    expect(abierto).toHaveBeenCalledTimes(1);
  });

  /**
   * El disparador **duplica** al input: si no estuviera oculto para la
   * tecnología asistiva, el mismo control se anunciaría dos veces.
   */
  it("el disparador no se anuncia: el control es el input", () => {
    render(<FileInput aria-label="Foto" onFileChange={vi.fn()} />);

    expect(screen.getByText(FILE_INPUT_BUTTON_LABEL)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  /**
   * Mide el **marcado**: que el input no lleve `tabIndex={-1}` ni `disabled`, y
   * que sea él —y no el disparador— quien recibe el foco al tabular.
   *
   * **NO mide el invariante del CSS** (deuda **176**). Esconder el input con
   * `display:none` lo sacaría del orden de tabulación en un navegador de verdad,
   * pero `happy-dom` **no aplica hojas de estilo al orden de foco**: con el input
   * escondido a lo bruto, este archivo seguiría saliendo verde entero.
   * Comprobado. Ese invariante se mide donde sí se puede, sobre **CSS
   * compilado**: `form-primitives.tokens.test.ts` → *"la utilidad que lo esconde
   * recorta y posiciona, pero no lo apaga"*.
   */
  it("el input sigue siendo parada de tabulación", async () => {
    const user = userEvent.setup();
    render(<FileInput aria-label="Foto" onFileChange={vi.fn()} />);

    await user.tab();

    expect(screen.getByLabelText("Foto")).toHaveFocus();
  });

  it("Field le cablea la etiqueta, el estado inválido y el mensaje", () => {
    render(
      <Field label="Foto del proyecto" error="La imagen supera los 4 MB.">
        <FileInput onFileChange={vi.fn()} />
      </Field>,
    );

    const input = screen.getByLabelText("Foto del proyecto");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(screen.getByText("La imagen supera los 4 MB.")).toHaveAttribute(
      "id",
      describedBy,
    );
  });

  it("reenvía la ref al input", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<FileInput ref={ref} aria-label="Foto" onFileChange={vi.fn()} />);

    expect(ref.current).toBe(screen.getByLabelText("Foto"));
  });

  it("no tiene violaciones de axe, con y sin archivo elegido", async () => {
    const { container } = render(
      <>
        <Field label="Foto">
          <FileInput onFileChange={vi.fn()} />
        </Field>
        <Field label="Otra foto" error="Formato no admitido.">
          <FileInput fileName="muestra.webp" onFileChange={vi.fn()} />
        </Field>
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
