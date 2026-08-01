// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * happy-dom no expone WebGL (`canvas.getContext("webgl")` devuelve `null`), así
 * que `three` se mockea **en el borde**: el componente propio corre entero. El
 * doble registra rotaciones y renders, que es lo que define el comportamiento
 * observable (auto-rotación, arrastre, un-solo-frame con reduced-motion). Los
 * píxeles no se testean (SDD §9).
 */
const threeState = vi.hoisted(() => ({
  renders: 0,
  groups: [] as { rotation: { x: number; y: number; z: number } }[],
}));

vi.mock("three", () => {
  class Vec3 {
    x = 0;
    y = 0;
    z = 0;
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  }

  class Obj3D {
    position = new Vec3();
    rotation = new Vec3();
    children: Obj3D[] = [];
    add(...objects: Obj3D[]) {
      this.children.push(...objects);
      return this;
    }
  }

  class Group extends Obj3D {
    constructor() {
      super();
      threeState.groups.push(this);
    }
  }

  class Resource {
    disposed = false;
    dispose() {
      this.disposed = true;
    }
  }

  return {
    Scene: class extends Obj3D {},
    Group,
    Mesh: class extends Obj3D {},
    PerspectiveCamera: class extends Obj3D {
      lookAt() {}
    },
    AmbientLight: class extends Obj3D {},
    DirectionalLight: class extends Obj3D {},
    MeshPhongMaterial: Resource,
    SphereGeometry: Resource,
    TorusGeometry: Resource,
    ConeGeometry: Resource,
    CylinderGeometry: Resource,
    WebGLRenderTarget: Resource,
    WebGLRenderer: class {
      setSize() {}
      setRenderTarget() {}
      render() {
        threeState.renders += 1;
      }
      readRenderTargetPixels(
        _target: unknown,
        _x: number,
        _y: number,
        _width: number,
        _height: number,
        buffer: Uint8Array,
      ) {
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = (i * 7) % 256;
        }
      }
      dispose() {}
    },
  };
});

import { AsciiYarn } from "./AsciiYarn";
import AsciiYarnScene from "./AsciiYarnScene";
import { ASCII_RAMP, asciiFromPixels } from "./asciiFromPixels";

interface HappyDomWindow {
  happyDOM: { settings: { device: { prefersReducedMotion: string } } };
}

function setReducedMotion(value: "reduce" | "no-preference") {
  (
    window as unknown as HappyDomWindow
  ).happyDOM.settings.device.prefersReducedMotion = value;
}

/** El grupo que rota es el primero que crea la escena (los dos siguientes son
 *  las agujas). */
function yarnGroup() {
  const group = threeState.groups[0];
  if (group === undefined) {
    throw new Error("la escena no creó el grupo del ovillo");
  }
  return group;
}

/** Sin recursión: el bucle dibuja un frame y se detiene, así el test es determinista. */
function stubAnimationFrame() {
  return vi
    .spyOn(globalThis, "requestAnimationFrame")
    .mockImplementation(() => 1);
}

beforeEach(() => {
  setReducedMotion("no-preference");
  threeState.renders = 0;
  threeState.groups.length = 0;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setReducedMotion("no-preference");
  document.documentElement.style.removeProperty("--bp-tablet");
});

describe("AsciiYarn — host decorativo", () => {
  it("monta el host oculto a a11y y con el color por token", () => {
    stubAnimationFrame();
    const { container } = render(<AsciiYarn />);
    const host = container.querySelector("[data-slot='ascii-yarn']");

    expect(host).not.toBeNull();
    expect(host).toHaveAttribute("aria-hidden", "true");
    expect(host).toHaveClass("text-accent");
    expect(host).toHaveClass("pointer-events-none");
  });

  it("carga la escena diferida y escribe el ASCII en un <pre>", async () => {
    stubAnimationFrame();
    render(<AsciiYarn cols={8} rows={4} />);

    const pre = await screen.findByTestId("ascii-yarn-pre");
    expect(pre.tagName).toBe("PRE");
    expect(pre).toHaveClass("font-mono", "text-xs", "leading-ascii");
    await waitFor(() => expect(pre.textContent).not.toBe(""));

    const lines = (pre.textContent ?? "").split("\n").slice(0, -1);
    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(line).toHaveLength(8);
      expect([...line].every((char) => ASCII_RAMP.includes(char))).toBe(true);
    }
  });

  it("sólo captura puntero como hero interactivo", async () => {
    stubAnimationFrame();
    const { container, rerender } = render(<AsciiYarn cols={8} rows={4} />);
    const host = container.querySelector("[data-slot='ascii-yarn']");

    expect(host).toHaveClass("pointer-events-none");
    const pre = await screen.findByTestId("ascii-yarn-pre");
    expect(pre).not.toHaveClass("cursor-grab");

    rerender(<AsciiYarn cols={8} rows={4} interactive />);
    expect(host).toHaveClass("pointer-events-auto");
    expect(await screen.findByTestId("ascii-yarn-pre")).toHaveClass(
      "cursor-grab",
    );
  });

  it("fusiona className con cn()", () => {
    stubAnimationFrame();
    const { container } = render(<AsciiYarn className="opacity-40" />);

    expect(container.querySelector("[data-slot='ascii-yarn']")).toHaveClass(
      "opacity-40",
    );
  });

  it("aplica el halo por token cuando se pide glow", () => {
    stubAnimationFrame();
    const { container } = render(<AsciiYarn glow />);

    expect(container.querySelector("[data-slot='ascii-yarn']")).toHaveClass(
      "text-shadow-(--shadow-glow)",
    );
  });

  it("omite la escena por debajo de --bp-tablet (degradación mobile)", async () => {
    document.documentElement.style.setProperty("--bp-tablet", "99999px");
    render(<AsciiYarn />);

    await waitFor(() =>
      expect(screen.queryByTestId("ascii-yarn-pre")).not.toBeInTheDocument(),
    );
    expect(threeState.renders).toBe(0);
  });
});

describe("AsciiYarn — auto-rotación", () => {
  it("arranca el requestAnimationFrame y rota en cada frame", () => {
    const raf = stubAnimationFrame();
    render(<AsciiYarnScene cols={8} rows={4} />);

    expect(raf).toHaveBeenCalledTimes(1);
    expect(threeState.renders).toBe(1);
    expect(yarnGroup().rotation.y).toBeCloseTo(0.006);
  });
});

describe("AsciiYarn — prefers-reduced-motion (D3)", () => {
  it("dibuja un único frame en la pose fija y no arranca el bucle", () => {
    setReducedMotion("reduce");
    const raf = stubAnimationFrame();
    render(<AsciiYarnScene cols={8} rows={4} />);

    expect(raf).not.toHaveBeenCalled();
    expect(threeState.renders).toBe(1);
    expect(yarnGroup().rotation.y).toBeCloseTo(0.7);
  });

  it("mantiene el arrastre: rota y redibuja en cada pointermove", async () => {
    setReducedMotion("reduce");
    stubAnimationFrame();
    render(<AsciiYarnScene cols={8} rows={4} interactive />);

    const pre = await screen.findByTestId("ascii-yarn-pre");
    const rendersAfterFirstFrame = threeState.renders;

    fireEvent.pointerDown(pre, { clientX: 100, clientY: 100 });
    expect(pre).toHaveAttribute("data-dragging", "true");

    fireEvent.pointerMove(pre, { clientX: 150, clientY: 100 });
    expect(threeState.renders).toBe(rendersAfterFirstFrame + 1);
    expect(yarnGroup().rotation.y).toBeCloseTo(0.7 + 50 * 0.01);

    fireEvent.pointerUp(pre);
    expect(pre).not.toHaveAttribute("data-dragging");

    // Ya no arrastra: un pointermove suelto no mueve ni redibuja.
    const rendersAfterDrag = threeState.renders;
    fireEvent.pointerMove(pre, { clientX: 400, clientY: 100 });
    expect(threeState.renders).toBe(rendersAfterDrag);
    expect(yarnGroup().rotation.y).toBeCloseTo(0.7 + 50 * 0.01);
  });

  it("acota la inclinación vertical del arrastre", async () => {
    setReducedMotion("reduce");
    stubAnimationFrame();
    render(<AsciiYarnScene cols={8} rows={4} interactive />);

    const pre = await screen.findByTestId("ascii-yarn-pre");
    fireEvent.pointerDown(pre, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(pre, { clientX: 0, clientY: 10000 });

    expect(yarnGroup().rotation.x).toBeCloseTo(1.2);
  });
});

describe("asciiFromPixels", () => {
  const CHANNELS = 4;

  function buffer(cols: number, rows: number, fill: number) {
    return new Uint8Array(cols * rows * CHANNELS).fill(fill);
  }

  it("mapea negro al primer carácter de la rampa y blanco al último", () => {
    expect(asciiFromPixels(buffer(2, 1, 0), 2, 1)).toBe("  \n");
    expect(asciiFromPixels(buffer(2, 1, 255), 2, 1)).toBe("@@\n");
  });

  it("emite una línea por fila y un carácter por columna", () => {
    const out = asciiFromPixels(buffer(5, 3, 128), 5, 3);
    const lines = out.split("\n").slice(0, -1);

    expect(lines).toHaveLength(3);
    expect(lines.every((line) => line.length === 5)).toBe(true);
  });

  it("invierte el orden de las filas (el framebuffer viene de abajo a arriba)", () => {
    const pixels = new Uint8Array(1 * 2 * CHANNELS);
    // Fila 0 del buffer (abajo) blanca, fila 1 (arriba) negra.
    pixels[0] = 255;
    pixels[1] = 255;
    pixels[2] = 255;

    expect(asciiFromPixels(pixels, 1, 2)).toBe(" \n@\n");
  });
});
