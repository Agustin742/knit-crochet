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
