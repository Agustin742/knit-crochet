// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";
import {
  PROGRESS_MAX,
  PROGRESS_MIN,
  ProgressBar,
  clampProgress,
} from "./ProgressBar";
import { PROGRESS_TONES, progressFillVariants } from "./progress-bar.variants";

afterEach(cleanup);

/** Ancho pintado, leído del DOM real (no del string de `cva`). */
function fillWidth(): string {
  const fill = document.querySelector("[data-slot='progress-bar-fill']");
  if (!(fill instanceof HTMLElement)) {
    throw new Error("la barra no pintó su relleno");
  }
  return fill.style.width;
}

describe("ProgressBar — contrato de la escala (REGLA 2a)", () => {
  it("ancla los extremos de la escala al literal del contrato", () => {
    // Los DOS únicos literales del archivo. Todo lo demás deriva de aquí: sin
    // este ancla, "acepta el mínimo y el máximo" seguiría verde con cualquier
    // par de extremos (el defecto que #15 destapó).
    expect(PROGRESS_MIN).toBe(0);
    expect(PROGRESS_MAX).toBe(100);
  });

  it("ancla los nombres de los tonos públicos", () => {
    // `toEqual` y no `toContain`: cae al añadir un tono Y al quitar uno.
    expect([...PROGRESS_TONES].sort()).toEqual(["accent", "success"]);
  });
});

describe("ProgressBar — valores dentro de rango", () => {
  it("anuncia el valor y la escala (smoke + a11y)", () => {
    render(<ProgressBar value={62} label="Progreso del proyecto" />);

    const bar = screen.getByRole("progressbar", {
      name: "Progreso del proyecto",
    });
    expect(bar).toHaveAttribute("aria-valuenow", "62");
    expect(bar).toHaveAttribute("aria-valuemin", String(PROGRESS_MIN));
    expect(bar).toHaveAttribute("aria-valuemax", String(PROGRESS_MAX));
  });

  it("pinta el ancho del relleno con el mismo valor que anuncia", () => {
    for (const value of [PROGRESS_MIN, 37.5, PROGRESS_MAX]) {
      cleanup();
      render(<ProgressBar value={value} label="Progreso" />);

      const announced = screen
        .getByRole("progressbar")
        .getAttribute("aria-valuenow");
      expect(announced).toBe(String(value));
      expect(fillWidth()).toBe(`${announced}%`);
    }
  });
});

describe("ProgressBar — valores fuera de rango (no rompe)", () => {
  const OUT_OF_RANGE: [string, number, number][] = [
    ["negativo", -20, PROGRESS_MIN],
    ["por encima del máximo", PROGRESS_MAX + 40, PROGRESS_MAX],
    ["NaN", Number.NaN, PROGRESS_MIN],
    ["infinito positivo", Number.POSITIVE_INFINITY, PROGRESS_MIN],
    ["infinito negativo", Number.NEGATIVE_INFINITY, PROGRESS_MIN],
  ];

  for (const [label, raw, expected] of OUT_OF_RANGE) {
    it(`acota ${label} sin romper el render`, () => {
      render(<ProgressBar value={raw} label="Progreso" />);

      const bar = screen.getByRole("progressbar");
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveAttribute("aria-valuenow", String(expected));
      // Lo que se anuncia y lo que se pinta no pueden divergir: es la mitad del
      // arreglo que un `clamp` sólo en el estilo dejaría rota.
      expect(fillWidth()).toBe(`${expected}%`);
      cleanup();
    });
  }

  it("clampProgress deja los valores del rango intactos", () => {
    for (const value of [PROGRESS_MIN, 1, 50, PROGRESS_MAX]) {
      expect(clampProgress(value)).toBe(value);
    }
  });
});

describe("ProgressBar — presentación", () => {
  it("aplica el tono por defecto y respeta el pedido", () => {
    const { rerender } = render(<ProgressBar value={10} label="Progreso" />);
    const defaultFill = document.querySelector(
      "[data-slot='progress-bar-fill']",
    );
    // Salida real de `cn()`, no el string crudo de `cva` (REGLA 7 aplicada a UI).
    expect(defaultFill?.className).toBe(cn(progressFillVariants({})));

    rerender(<ProgressBar value={10} label="Progreso" tone="success" />);
    expect(
      document.querySelector("[data-slot='progress-bar-fill']")?.className,
    ).toBe(cn(progressFillVariants({ tone: "success" })));
  });

  it("cada tono declara su propio fondo", () => {
    const backgroundPrefix = ["bg", "-"].join("");
    for (const tone of PROGRESS_TONES) {
      const classes = cn(progressFillVariants({ tone })).split(" ");
      expect(
        classes.some((entry) => entry.startsWith(backgroundPrefix)),
        `el tono ${tone} no pinta ningún fondo: ${classes.join(" ")}`,
      ).toBe(true);
    }
  });

  it("fusiona className sin perder las clases del carril", () => {
    render(<ProgressBar value={10} label="Progreso" className="custom-class" />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveClass("custom-class");
    expect(bar.className).toContain("bg-brand-cream");
  });

  it("no tiene violaciones de axe en sus estados relevantes", async () => {
    const { container } = render(
      <main>
        <ProgressBar value={PROGRESS_MIN} label="Vacía" />
        <ProgressBar value={62} label="A medias" />
        <ProgressBar value={PROGRESS_MAX} label="Completa" tone="success" />
        <ProgressBar value={Number.NaN} label="Dato roto" />
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("el relleno queda fuera del árbol accesible", () => {
    // El dato lo anuncia el carril con `aria-valuenow`; el relleno es la mitad
    // visual del mismo dato y anunciarlo dos veces sólo genera ruido.
    render(<ProgressBar value={10} label="Progreso" />);

    expect(
      document.querySelector("[data-slot='progress-bar-fill']"),
    ).toHaveAttribute("aria-hidden", "true");
  });
});
