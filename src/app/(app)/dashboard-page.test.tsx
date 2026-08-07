// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShellClient } from "@/features/auth/ui/AppShellClient";

import DashboardPage from "./page";

/**
 * GATE DE LA ENMIENDA E1.2, y el que de verdad la hace ejecutable.
 *
 * E1.2 dice que en `/` el hero REEMPLAZA al fondo global del caparazón y que
 * **nunca hay dos ovillos vivos**. Hasta esta feature no existía nada que lo
 * impidiera: los cinco tests del repo que mencionaban el ovillo usaban
 * `getByTestId` en singular, y el singular **no falla con dos instancias**.
 *
 * Por eso este archivo monta la página DENTRO del `AppShellClient` real —la
 * pieza que decide el fondo— en vez de probar las dos mitades por separado, y
 * cuenta con `queryAllByTestId`. Sólo se dobla el borde: el ovillo (happy-dom no
 * tiene WebGL) y el router.
 */
const routerState = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  pathname: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => routerState.pathname(),
  useRouter: () => ({
    replace: routerState.replace,
    refresh: routerState.refresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

/** El doble conserva `data-interactive`: es lo que distingue hero de fondo. */
vi.mock("@/shared/ui/three", () => ({
  AsciiYarn: ({ interactive = false }: { interactive?: boolean }) => (
    <span data-testid="ascii-yarn" data-interactive={String(interactive)} />
  ),
}));

const fetchSpy = vi.fn();

function emptyPayload(url: string): Response {
  return new Response(
    JSON.stringify(
      url.startsWith("/api/dashboard/metrics")
        ? {
            hours: 0,
            projects: 0,
            yarnMeters: 0,
            comparison: {
              hours: { label: "Un partido de fútbol", referenceValue: 1, times: 0 },
              projects: { label: "Un par", referenceValue: 2, times: 0 },
              yarnMeters: { label: "Un colectivo", referenceValue: 12, times: 0 },
            },
          }
        : { projects: [] },
    ),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

beforeEach(() => {
  fetchSpy.mockImplementation((url: string) =>
    Promise.resolve(emptyPayload(String(url))),
  );
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  routerState.pathname.mockReturnValue("/");
  vi.unstubAllGlobals();
});

/** Espera a que la carga de la página termine (la región viva se vacía). */
async function settle() {
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe(""));
}

describe("Dashboard dentro del caparazón (enmienda E1.2)", () => {
  it("monta EXACTAMENTE un ovillo en '/', y es el hero interactivo", async () => {
    routerState.pathname.mockReturnValue("/");

    render(
      <AppShellClient>
        <DashboardPage />
      </AppShellClient>,
    );
    await settle();

    const yarns = screen.queryAllByTestId("ascii-yarn");
    expect(yarns).toHaveLength(1);
    expect(yarns[0]).toHaveAttribute("data-interactive", "true");
  });

  /**
   * El hero va EN EL FLUJO del contenido, no en el slot fijo de fondo del shell:
   * ese slot está `aria-hidden`, no captura puntero y ocupa la pantalla entera,
   * así que el ovillo de ahí no se podría arrastrar (RFC-02 §1).
   */
  it("deja vacío el slot de fondo del caparazón en '/'", async () => {
    routerState.pathname.mockReturnValue("/");

    const { container } = render(
      <AppShellClient>
        <DashboardPage />
      </AppShellClient>,
    );
    await settle();

    const slot = container.querySelector('[data-slot="bg-3d"]');
    expect(slot).not.toBeNull();
    expect(slot?.querySelector('[data-testid="ascii-yarn"]')).toBeNull();
  });

  /** La otra mitad del par: fuera del Dashboard el fondo global sigue vivo. */
  it("mantiene el fondo global en cualquier otra ruta de (app)", () => {
    routerState.pathname.mockReturnValue("/proyectos");

    const { container } = render(
      <AppShellClient>
        <p>Otra página</p>
      </AppShellClient>,
    );

    const yarns = screen.queryAllByTestId("ascii-yarn");
    expect(yarns).toHaveLength(1);
    expect(yarns[0]).toHaveAttribute("data-interactive", "false");
    expect(
      container
        .querySelector('[data-slot="bg-3d"]')
        ?.querySelector('[data-testid="ascii-yarn"]'),
    ).not.toBeNull();
  });
});

describe("página del Dashboard (smoke de ruta)", () => {
  it("compone la vista del Dashboard", async () => {
    render(<DashboardPage />);
    await settle();

    expect(
      screen.getByRole("heading", { level: 1, name: "Knit&Crochet" }),
    ).toBeInTheDocument();
  });

  /** La página es fina: rutea y compone. Un solo `h1` en la pantalla. */
  it("aporta un único encabezado de primer nivel", async () => {
    render(
      <AppShellClient>
        <DashboardPage />
      </AppShellClient>,
    );
    await settle();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
