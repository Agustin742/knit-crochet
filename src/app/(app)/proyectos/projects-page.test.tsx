// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShellClient } from "@/features/auth/ui/AppShellClient";
import { LOADING_REGION_LABEL } from "@/features/projects/ui/ProjectsView";

import ProjectsPage from "./page";

/**
 * GATE DE COMPOSICIÓN DENTRO DEL CAPARAZÓN (deuda 111), la mitad `/proyectos`
 * del par que abrió `dashboard-page.test.tsx`.
 *
 * La enmienda E1.2 del RFC-02 dice que **nunca hay dos ovillos vivos**: en `/` el
 * hero del Dashboard REEMPLAZA al fondo global del caparazón, y en cualquier otra
 * ruta de `(app)` el fondo global es el único. El gate del Dashboard cubre la
 * primera mitad de verdad, pero la segunda la cubre **con una página de mentira**
 * (`<p>Otra página</p>`, `dashboard-page.test.tsx:131-148`): prueba la regla del
 * `AppShellClient`, no la página real de #20. Hoy ese test seguiría verde aunque
 * `/proyectos` montara tres ovillos.
 *
 * Por eso este archivo monta la **página real** dentro del **`AppShellClient`
 * real** —probar las dos mitades por separado es justo lo que deja el agujero— y
 * cuenta con `queryAllByTestId`: el singular `getByTestId` **no falla con dos
 * instancias**, así que un gate escrito en singular no gatea nada.
 *
 * Sólo se dobla el borde: el router (no hay contexto de Next en un test), `next/link`
 * y el ovillo (happy-dom no tiene WebGL). El doble del ovillo **conserva
 * `data-interactive`**, que es lo que distingue hero de fondo.
 */
const routerState = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  pathname: vi.fn(() => "/proyectos"),
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

/**
 * Lista y lanas vacías: este gate mide **composición**, no datos. El cuerpo tiene
 * que ser válido igualmente para que la vista salga del estado de carga.
 */
function emptyPayload(url: string): Response {
  return new Response(
    JSON.stringify(url.startsWith("/api/yarns") ? { yarns: [] } : { projects: [] }),
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
  routerState.pathname.mockReturnValue("/proyectos");
  vi.unstubAllGlobals();
});

/**
 * Espera a que la carga termine (la región viva se vacía). Se pide **por nombre**:
 * la vista tiene dos regiones `role="status"` —carga y cronómetro— y un selector
 * ambiguo no falla limpio, falla raro (deuda 114).
 */
async function settle() {
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: LOADING_REGION_LABEL }).textContent,
    ).toBe(""),
  );
}

function renderInShell() {
  return render(
    <AppShellClient>
      <ProjectsPage />
    </AppShellClient>,
  );
}

describe("Proyectos dentro del caparazón (enmienda E1.2)", () => {
  it("monta EXACTAMENTE un ovillo en '/proyectos'", async () => {
    routerState.pathname.mockReturnValue("/proyectos");

    renderInShell();
    await settle();

    // `queryAllByTestId` y no `getByTestId`: el singular no falla con dos.
    expect(screen.queryAllByTestId("ascii-yarn")).toHaveLength(1);
  });

  /** En `/` el ovillo es el hero arrastrable; acá es decorado de fondo. */
  it("monta ese ovillo como fondo y no como hero interactivo", async () => {
    routerState.pathname.mockReturnValue("/proyectos");

    renderInShell();
    await settle();

    const yarns = screen.queryAllByTestId("ascii-yarn");
    expect(yarns).toHaveLength(1);
    expect(yarns[0]).toHaveAttribute("data-interactive", "false");
  });

  /**
   * La otra mitad del par de `dashboard-page.test.tsx`: en `/` el slot de fondo
   * queda VACÍO porque el hero va en el flujo del contenido; acá el ovillo vive
   * DENTRO del slot, que es `aria-hidden`, no captura puntero y ocupa la pantalla
   * entera (RFC-02 §1).
   */
  it("mete ese ovillo DENTRO del slot de fondo del caparazón", async () => {
    routerState.pathname.mockReturnValue("/proyectos");

    const { container } = renderInShell();
    await settle();

    const slot = container.querySelector('[data-slot="bg-3d"]');
    expect(slot).not.toBeNull();
    expect(slot?.querySelectorAll('[data-testid="ascii-yarn"]')).toHaveLength(1);
  });
});

describe("página de Proyectos (smoke de ruta)", () => {
  it("compone la vista de proyectos", async () => {
    render(<ProjectsPage />);
    await settle();

    expect(
      screen.getByRole("heading", { level: 1, name: "Proyectos" }),
    ).toBeInTheDocument();
  });

  /** La página es fina: rutea y compone. Un solo `h1` en la pantalla. */
  it("aporta un único encabezado de primer nivel dentro del caparazón", async () => {
    renderInShell();
    await settle();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
