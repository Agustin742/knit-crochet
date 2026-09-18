// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";
import { Swatch } from "./Swatch";
import { SWATCH_SIZES, swatchVariants } from "./swatch.variants";

afterEach(cleanup);

describe("Swatch — nombre accesible", () => {
  it("con label expone su nombre accesible", () => {
    render(<Swatch color="var(--yarn-red)" label="Rojo" size="md" />);

    expect(screen.getByRole("img", { name: "Rojo" })).toBeInTheDocument();
  });

  it("sin label es decorativa (oculta al lector de pantalla)", () => {
    render(<Swatch color="var(--yarn-blue)" />);

    const swatch = document.querySelector("[data-slot='swatch']");
    expect(swatch).toHaveAttribute("aria-hidden", "true");
    expect(swatch).toHaveTextContent("");
  });
});

describe("Swatch — tamaños", () => {
  it("ancla los nombres de tamaño públicos", () => {
    // toEqual y no toContain: cae al añadir un tamaño Y al quitar uno.
    expect([...SWATCH_SIZES].sort()).toEqual(["md", "sm"]);
  });

  for (const size of SWATCH_SIZES) {
    it(`el tamaño "${size}" aplica su propia variante (REGLA 7 aplicada a UI)`, () => {
      render(<Swatch label={`muestra ${size}`} size={size} />);

      const swatch = document.querySelector("[data-slot='swatch']");
      // Salida real de cn()/cva, no un string armado a mano ni un px literal.
      expect(swatch?.className).toBe(cn(swatchVariants({ size })));
    });
  }
});

describe("Swatch — render y accesibilidad", () => {
  it("fusiona className sin perder las clases de la variante", () => {
    render(<Swatch label="Rojo" className="custom-class" />);

    expect(screen.getByRole("img", { name: "Rojo" })).toHaveClass(
      "custom-class",
    );
  });

  it("no tiene violaciones de axe en sus dos formas (con y sin label)", async () => {
    const { container } = render(
      <main>
        <Swatch color="var(--yarn-red)" label="Rojo" />
        <Swatch color="var(--yarn-blue)" />
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
