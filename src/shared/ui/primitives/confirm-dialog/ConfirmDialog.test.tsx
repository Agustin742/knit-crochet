// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";
import { buttonVariants } from "../button/button.variants";
import { DIALOG_CLOSE_LABEL } from "../dialog/Dialog";

import {
  CONFIRM_DIALOG_CANCEL_LABEL,
  CONFIRM_DIALOG_CONFIRM_LABEL,
  ConfirmDialog,
} from "./ConfirmDialog";

afterEach(() => {
  cleanup();
  /* El bloqueo de scroll vive en el módulo del diálogo: si un test lo dejara
     puesto, el siguiente arrancaría con el fondo bloqueado. Se limpia ANTES de
     comprobar, para que un rojo aquí no arrastre a los que vengan detrás. */
  const leftover = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "";
  expect(leftover, "un diálogo se fue sin soltar el bloqueo").toBe("");
});

/**
 * `ConfirmDialog` (enmienda **E6 (d)** del RFC-03).
 *
 * **Se construye SOBRE el `Dialog` que ya existe, no en paralelo**: la jaula de
 * foco, el `Escape`, el portal al `body`, el bloqueo de scroll y la devolución
 * del foco a quien abrió están probados uno a uno en `Dialog.test.tsx`, y
 * reescribirlos es como se regalan bugs de accesibilidad. Lo que se mide acá es
 * **lo que este primitivo añade** y no estaba antes.
 *
 * Y lo que añade tiene dos piezas que un borrado sin ellas no es un borrado
 * confirmado:
 *
 * 1. **el clic en el velo NO cierra** — `Dialog` ya traía la prop
 *    `dismissOnScrimClick` documentada literalmente como *"se puede apagar para
 *    un flujo destructivo"* y nunca se había usado;
 * 2. **el foco inicial cae en «Cancelar»**, no en la acción destructiva: quien
 *    abre esto por teclado y pulsa Enter por inercia **no borra nada**.
 */
function abrir(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="¿Borrar el proyecto?"
      description="Esta acción no se puede deshacer."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
}

function velo(): HTMLElement {
  const found = document.querySelector("[data-slot='dialog-scrim']");
  if (!(found instanceof HTMLElement)) {
    throw new Error("el diálogo no pintó su velo");
  }
  return found;
}

describe("ConfirmDialog", () => {
  it("cerrado no pinta nada", () => {
    render(
      <ConfirmDialog
        open={false}
        title="¿Borrar el proyecto?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abierto muestra la pregunta, el detalle y las dos salidas (smoke)", () => {
    abrir();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("¿Borrar el proyecto?")).toBeInTheDocument();
    expect(
      screen.getByText("Esta acción no se puede deshacer."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    ).toBeInTheDocument();
  });

  it("confirmar avisa una sola vez y no cancela", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = abrir();

    await user.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CONFIRM_LABEL }),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancelar avisa y no confirma", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = abrir();

    await user.click(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  /**
   * **El corazón de E6 (d).** Un borrado que se confirma al hacer clic fuera por
   * accidente no es una confirmación. Se comprueba en las dos direcciones: ni
   * confirma, ni cancela, ni se va el diálogo.
   */
  it("el clic en el velo NO cierra ni decide nada", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = abrir();

    await user.click(velo());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  /** Apagar el velo NO puede llevarse por delante la salida por teclado. */
  it("Escape sigue siendo una salida, y sale por cancelar", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = abrir();

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("el aspa del encabezado también cancela", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = abrir();

    await user.click(screen.getByRole("button", { name: DIALOG_CLOSE_LABEL }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  /**
   * La segunda mitad de E6 (d): un Enter por inercia al abrir **no borra**. El
   * foco inicial es el de la salida segura.
   */
  it("el foco inicial cae en cancelar, no en la acción destructiva", () => {
    abrir();

    expect(
      screen.getByRole("button", { name: CONFIRM_DIALOG_CANCEL_LABEL }),
    ).toHaveFocus();
  });

  /**
   * **Controles que se comportan distinto se ven distinto.** Confirmar destruye
   * y cancelar no: no pueden salir con la misma piel (es la lección de la deuda
   * 142). Las clases se DERIVAN de `buttonVariants`, no se copian.
   */
  it("por defecto, confirmar se pinta como lo que es: peligroso", () => {
    abrir();

    const confirmar = screen.getByRole("button", {
      name: CONFIRM_DIALOG_CONFIRM_LABEL,
    });
    const cancelar = screen.getByRole("button", {
      name: CONFIRM_DIALOG_CANCEL_LABEL,
    });

    for (const className of cn(buttonVariants({ variant: "danger" })).split(
      " ",
    )) {
      expect(confirmar).toHaveClass(className);
    }

    // Y la salida segura NO comparte la piel del peligro.
    const peligro = cn(buttonVariants({ variant: "danger" })).split(" ");
    const seguro = cn(buttonVariants({ variant: "secondary" })).split(" ");
    const soloPeligro = peligro.filter(
      (className) => !seguro.includes(className),
    );
    expect(soloPeligro.length).toBeGreaterThan(0);
    for (const className of soloPeligro) {
      expect(cancelar).not.toHaveClass(className);
    }
  });

  it("con tono neutro, confirmar deja de vestirse de peligro", () => {
    abrir({ tone: "default" });

    const confirmar = screen.getByRole("button", {
      name: CONFIRM_DIALOG_CONFIRM_LABEL,
    });
    for (const className of cn(buttonVariants({ variant: "primary" })).split(
      " ",
    )) {
      expect(confirmar).toHaveClass(className);
    }
  });

  it("mientras la acción está en vuelo, confirmar no se puede pulsar dos veces", () => {
    abrir({ loading: true });

    const confirmar = screen.getByRole("button", {
      name: CONFIRM_DIALOG_CONFIRM_LABEL,
    });
    expect(confirmar).toBeDisabled();
    expect(confirmar).toHaveAttribute("aria-busy", "true");
  });

  it("deja meter contenido propio (p. ej. el error de la acción)", () => {
    abrir({ children: <p role="alert">No se pudo borrar.</p> });

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo borrar.");
  });

  it("acepta etiquetas propias para las dos salidas", () => {
    abrir({ confirmLabel: "Borrar igual", cancelLabel: "Dejarlo" });

    expect(
      screen.getByRole("button", { name: "Borrar igual" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dejarlo" })).toBeInTheDocument();
  });

  it("no tiene violaciones de axe", async () => {
    abrir();

    const dialog = screen.getByRole("dialog");
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
