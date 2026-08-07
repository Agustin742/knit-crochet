// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";
import { Skeleton } from "./Skeleton";
import {
  SKELETON_ANIMATED_CLASSES,
  SKELETON_SHAPES,
  SKELETON_STILL_CLASSES,
  skeletonVariants,
} from "./skeleton.variants";

/**
 * Misma técnica que `three/ascii-yarn/ascii-yarn.test.tsx` para la misma
 * preferencia: se mueve el ajuste de happy-dom, que es lo que contesta
 * `window.matchMedia`. Así se ejercita el hook real —no un doble suyo— y lo que
 * se asierta es el elemento renderizado (REGLA 7 aplicada a UI).
 */
interface HappyDomWindow {
  happyDOM: { settings: { device: { prefersReducedMotion: string } } };
}

function setReducedMotion(value: "reduce" | "no-preference") {
  (
    window as unknown as HappyDomWindow
  ).happyDOM.settings.device.prefersReducedMotion = value;
}

function skeletonNode(): HTMLElement {
  const node = document.querySelector("[data-slot='skeleton']");
  if (!(node instanceof HTMLElement)) {
    throw new Error("el skeleton no montó");
  }
  return node;
}

beforeEach(() => setReducedMotion("no-preference"));

afterEach(() => {
  cleanup();
  setReducedMotion("no-preference");
});

describe("Skeleton — contrato de formas (REGLA 2a)", () => {
  it("ancla los nombres de las formas públicas", () => {
    // `toEqual` y no `toContain`: cae al añadir una forma Y al quitar una.
    expect([...SKELETON_SHAPES].sort()).toEqual(["block", "circle", "text"]);
  });
});

describe("Skeleton — render", () => {
  it("monta un bloque oculto al árbol accesible (smoke + a11y)", () => {
    render(<Skeleton />);

    expect(skeletonNode()).toHaveAttribute("aria-hidden", "true");
  });

  it("aplica la forma pedida y la de por defecto", () => {
    const { rerender } = render(<Skeleton />);
    // Salida real de `cn()` sobre el DOM, no el string crudo de `cva`.
    const byDefault = skeletonNode().className.split(" ");
    for (const entry of cn(skeletonVariants({})).split(" ")) {
      expect(byDefault).toContain(entry);
    }

    for (const shape of SKELETON_SHAPES) {
      rerender(<Skeleton shape={shape} />);
      const classes = skeletonNode().className.split(" ");
      for (const entry of cn(skeletonVariants({ shape })).split(" ")) {
        expect(
          classes,
          `la forma ${shape} perdió ${entry} al pasar por cn()`,
        ).toContain(entry);
      }
    }
  });

  it("fusiona className sin perder el fondo del sistema", () => {
    render(<Skeleton className="custom-class" />);

    const node = skeletonNode();
    expect(node).toHaveClass("custom-class");
    expect(node.className).toContain("bg-surface-sunken");
  });

  it("no tiene violaciones de axe en sus tres formas", async () => {
    const { container } = render(
      <main>
        {SKELETON_SHAPES.map((shape) => (
          <Skeleton key={shape} shape={shape} />
        ))}
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Skeleton — prefers-reduced-motion", () => {
  it("anima cuando NO hay preferencia de movimiento reducido", () => {
    setReducedMotion("no-preference");
    render(<Skeleton />);

    const classes = skeletonNode().className.split(" ");
    for (const entry of SKELETON_ANIMATED_CLASSES) {
      expect(classes).toContain(entry);
    }
    for (const entry of SKELETON_STILL_CLASSES) {
      expect(classes).not.toContain(entry);
    }
  });

  it("se queda quieto cuando la preferencia es reducir", () => {
    setReducedMotion("reduce");
    render(<Skeleton />);

    const classes = skeletonNode().className.split(" ");
    for (const entry of SKELETON_STILL_CLASSES) {
      expect(classes).toContain(entry);
    }
    for (const entry of SKELETON_ANIMATED_CLASSES) {
      expect(classes).not.toContain(entry);
    }
  });

  it("quieto NO es invisible: conserva la superficie hundida de la base", () => {
    // Deuda 86: apagar el shimmer no puede dejar un hueco. El degradado se
    // quita entero (`bg-none` lo apaga vía `twMerge`) pero el color de fondo del
    // bloque sigue puesto, así que se sigue leyendo como un bloque de carga.
    setReducedMotion("reduce");
    render(<Skeleton />);

    expect(skeletonNode().className).toContain("bg-surface-sunken");
  });

  it("las dos clases son excluyentes en TODAS las formas", () => {
    // Sin esto, un `cn()` que dejara pasar las dos daría verde en los dos tests
    // de arriba y animaría igual: `twMerge` resuelve el conflicto, y esto lo
    // fija sobre la salida real en vez de suponerlo.
    for (const preference of ["no-preference", "reduce"] as const) {
      for (const shape of SKELETON_SHAPES) {
        cleanup();
        setReducedMotion(preference);
        render(<Skeleton shape={shape} />);

        const classes = skeletonNode().className.split(" ");
        const expected =
          preference === "reduce"
            ? SKELETON_STILL_CLASSES
            : SKELETON_ANIMATED_CLASSES;
        const forbidden =
          preference === "reduce"
            ? SKELETON_ANIMATED_CLASSES
            : SKELETON_STILL_CLASSES;

        for (const entry of expected) {
          expect(classes, `${shape} con ${preference}`).toContain(entry);
        }
        for (const entry of forbidden) {
          expect(classes, `${shape} con ${preference}`).not.toContain(entry);
        }
      }
    }
  });
});
