// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShellClient } from "./AppShellClient";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

/**
 * El shell se dobla a propósito: lo que se prueba aquí es la COSTURA (qué monta
 * este componente y qué le entrega al caparazón), no cómo se pinta.
 *
 * El doble registra las props recibidas para poder asertar sobre ellas. Antes
 * este archivo montaba un botón "Salir" que el shell real **no tiene** desde la
 * enmienda E7 de D4: el test se fabricaba su propio sujeto y daba por cubierto
 * un cableado que ningún usuario podía alcanzar (deuda 21).
 */
const shellProps = vi.fn();

vi.mock("@/shared/ui", () => ({
  AppShell: (props: {
    children: ReactNode;
    background?: ReactNode;
    user?: unknown;
    onLogout?: unknown;
  }) => {
    shellProps(props);
    return (
      <div data-testid="app-shell">
        {props.background}
        {props.children}
      </div>
    );
  },
  AsciiYarn: () => <span data-testid="ascii-yarn" />,
}));

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  shellProps.mockReset();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("AppShellClient", () => {
  it("renders its children inside the shell", () => {
    render(
      <AppShellClient>
        <p>Panel</p>
      </AppShellClient>,
    );

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByText("Panel")).toBeInTheDocument();
  });

  it("hands the 3D layer to the shell as its background", () => {
    render(
      <AppShellClient>
        <p>Panel</p>
      </AppShellClient>,
    );

    expect(screen.getByTestId("ascii-yarn")).toBeInTheDocument();
  });

  /**
   * GATE DE REGRESIÓN de la deuda 21. Montar el shell no puede costar una
   * petición HTTP: el `GET /api/auth/me` que había aquí se disparaba en CADA
   * carga de CADA página del grupo `(app)` para alimentar una prop que el nav
   * descarta. Si alguien vuelve a pedir datos desde el caparazón, esto cae.
   *
   * El endpoint sigue existiendo y con sus propios tests: lo que se prohíbe es
   * llamarlo desde aquí mientras nadie consuma el resultado.
   */
  it("fires no HTTP request at all when mounted", async () => {
    render(
      <AppShellClient>
        <p>Panel</p>
      </AppShellClient>,
    );

    // Un `useEffect` con fetch resolvería en el siguiente tick, no en el render.
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hands over neither user nor logout until feature #31 wires them", () => {
    render(
      <AppShellClient>
        <p>Panel</p>
      </AppShellClient>,
    );

    const props = shellProps.mock.calls[0]?.[0] as {
      user?: unknown;
      onLogout?: unknown;
    };
    expect(props.user).toBeUndefined();
    expect(props.onLogout).toBeUndefined();
  });
});
