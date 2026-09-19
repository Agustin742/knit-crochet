// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Disclosure } from "./Disclosure";
import { DISCLOSURE_SIZES, disclosureVariants } from "./disclosure.variants";

afterEach(cleanup);

/**
 * Ninguna clase de Tailwind se escribe literal en este archivo: Tailwind
 * escanea también los `.test.tsx` (`docs/harness/conventions.md`).
 */
function classesOf(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

const NORMAL_FOREGROUND = ["text", "fg"].join("-");
const INVERSE_FOREGROUND = ["text", "fg", "inverse"].join("-");

describe("Disclosure — render y tamaños (REGLA 2a)", () => {
  it("ancla los nombres de tamaño públicos", () => {
    // toEqual y no toContain: cae al añadir un tamaño Y al quitar uno.
    expect([...DISCLOSURE_SIZES].sort()).toEqual(["md", "sm"]);
  });

  it("smoke: se ve el summary, y abierto se ve el contenido del panel", () => {
    render(
      <Disclosure summary="Marca ejemplo" defaultOpen>
        <p>Contenido del panel</p>
      </Disclosure>,
    );

    expect(screen.getByText("Marca ejemplo")).toBeInTheDocument();
    expect(screen.getByText("Contenido del panel")).toBeInTheDocument();
  });

  it("cerrado por defecto no muestra el contenido del panel", () => {
    render(
      <Disclosure summary="Marca ejemplo">
        <p>Contenido del panel</p>
      </Disclosure>,
    );

    expect(screen.getByText("Marca ejemplo")).toBeInTheDocument();
    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();
  });

  it("fusiona className sin perder las clases de la variante", () => {
    render(
      <Disclosure summary="Marca" className="custom-class">
        <p>Panel</p>
      </Disclosure>,
    );

    const details = document.querySelector("details");
    expect(details).toHaveClass("custom-class");
    for (const className of classesOf(disclosureVariants())) {
      expect(details).toHaveClass(className);
    }
  });
});

describe("Disclosure — no reemplaza un role=\"tree\" a mano (design D5)", () => {
  it("no aparece ningún role de árbol: el patrón elegido es distinto", () => {
    render(
      <Disclosure summary="Marca">
        <p>Panel</p>
      </Disclosure>,
    );

    for (const role of ["tree", "treeitem"] as const) {
      expect(screen.queryAllByRole(role)).toEqual([]);
    }
  });
});

describe("Disclosure — conmutación", () => {
  it("clic en el summary abre y cierra (nativo, sin JS de más)", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="Marca">
        <p>Contenido del panel</p>
      </Disclosure>,
    );

    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();

    await user.click(screen.getByText("Marca"));
    expect(screen.getByText("Contenido del panel")).toBeInTheDocument();

    await user.click(screen.getByText("Marca"));
    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();
  });

  it("conmuta con teclado: Enter y Espacio, con el summary enfocado", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="Marca">
        <p>Contenido del panel</p>
      </Disclosure>,
    );

    screen.getByText("Marca").focus();
    expect(screen.getByText("Marca")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByText("Contenido del panel")).toBeInTheDocument();

    await user.keyboard(" ");
    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();
  });

  it("avisa del estado AL QUE PASA, no del actual (mismo contrato que Toggle)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Disclosure summary="Marca" onOpenChange={onOpenChange}>
        <p>Panel</p>
      </Disclosure>,
    );

    await user.click(screen.getByText("Marca"));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByText("Marca"));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("un panel cerrado no deja ninguna parada de tabulación dentro", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>antes</button>
        <Disclosure summary="Marca">
          <button>tipo A</button>
          <button>tipo B</button>
        </Disclosure>
        <button>después</button>
      </div>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "antes" })).toHaveFocus();

    // El siguiente Tab tiene que saltar directo al summary y de ahí al de
    // afuera: nada de "tipo A"/"tipo B" existe todavía en el árbol.
    await user.tab();
    expect(screen.getByText("Marca")).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "después" })).toHaveFocus();
  });
});

describe("Disclosure — controlado vs. no controlado", () => {
  it("no controlado: guarda su propio estado a partir de defaultOpen", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="Marca" defaultOpen>
        <p>Contenido del panel</p>
      </Disclosure>,
    );

    expect(screen.getByText("Contenido del panel")).toBeInTheDocument();

    await user.click(screen.getByText("Marca"));
    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();
  });

  it("controlado: open manda, y sin actualizarlo desde afuera no se mueve", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Disclosure summary="Marca" open={false} onOpenChange={onOpenChange}>
        <p>Contenido del panel</p>
      </Disclosure>,
    );

    await user.click(screen.getByText("Marca"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // El padre no actualizó `open`: sigue cerrado, no se mueve solo.
    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();
  });

  it("controlado: sí se mueve cuando el padre pasa el nuevo valor", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <Disclosure summary="Marca" open={open} onOpenChange={setOpen}>
          <p>Contenido del panel</p>
        </Disclosure>
      );
    }
    render(<Controlled />);

    expect(screen.queryByText("Contenido del panel")).not.toBeInTheDocument();

    await user.click(screen.getByText("Marca"));
    expect(screen.getByText("Contenido del panel")).toBeInTheDocument();
  });
});

describe("Disclosure — contraste del summary (RFC-03 E2(b), trap #5, tarea 4.3)", () => {
  it("el summary nunca usa el primer plano inverso por defecto", () => {
    render(
      <Disclosure summary="Marca">
        <p>Panel</p>
      </Disclosure>,
    );

    const summary = document.querySelector("summary");
    expect(classesOf(summary?.className ?? "")).not.toContain(
      INVERSE_FOREGROUND,
    );
  });

  it("el summary declara el primer plano normal (text-fg) de forma explícita", () => {
    render(
      <Disclosure summary="Marca">
        <p>Panel</p>
      </Disclosure>,
    );

    const summary = document.querySelector("summary");
    expect(classesOf(summary?.className ?? "")).toContain(NORMAL_FOREGROUND);
  });
});

describe("Disclosure — accesibilidad", () => {
  it("no tiene violaciones de axe, cerrado ni abierto", async () => {
    const { container, rerender } = render(
      <main>
        <Disclosure summary="Marca cerrada">
          <p>Panel</p>
        </Disclosure>
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();

    rerender(
      <main>
        <Disclosure summary="Marca abierta" defaultOpen>
          <p>Panel</p>
        </Disclosure>
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
