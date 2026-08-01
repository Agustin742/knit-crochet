// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Card } from "./Card";

afterEach(cleanup);

describe("Card", () => {
  it("renders its children (smoke)", () => {
    render(
      <Card>
        <p>Contenido</p>
      </Card>,
    );

    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("applies the raised surface by default", () => {
    render(<Card data-testid="card">x</Card>);

    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-surface-raised");
    expect(card.className).toContain("shadow-hard-lg");
  });

  it("renders the flat variant without a hard shadow", () => {
    render(
      <Card data-testid="card" variant="flat">
        x
      </Card>,
    );

    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-surface");
    expect(card.className).toContain("shadow-none");
  });

  /**
   * Deuda 32: la tarjeta declaraba fondo claro y NO primer plano, así que
   * heredaba el crema que `globals.css` pone en el `body` para la app oscura —
   * crema sobre crema, 1.14:1. Una superficie que elige su fondo tiene que
   * elegir también qué se lee encima, porque además es de aquí de donde hereda
   * la variante fantasma del botón (deuda 17). El contraste real se mide en
   * `button.variants.test.ts`; esto fija que la clase no se pierda.
   */
  it("declares its own foreground next to its surface (deuda 32)", () => {
    for (const variant of ["raised", "flat"] as const) {
      render(
        <Card data-testid={variant} variant={variant}>
          x
        </Card>,
      );

      const classes = screen.getByTestId(variant).className.split(" ");
      const prefix = ["text", "-"].join("");
      expect(
        classes.some((entry) => entry.startsWith(prefix)),
        `la variante ${variant} no declara primer plano: ${classes.join(" ")}`,
      ).toBe(true);
    }
  });

  it("merges a custom className", () => {
    render(
      <Card data-testid="card" className="custom-class">
        x
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveClass("custom-class");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <main>
        <Card>Raised</Card>
        <Card variant="flat">Flat</Card>
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
