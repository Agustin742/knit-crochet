// @vitest-environment happy-dom
import { Suspense, isValidElement, type ReactElement, type ReactNode } from "react";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import LoginPage from "./login/page";
import RegisterPage from "./register/page";

/**
 * Smoke de las dos páginas del grupo `(auth)`: qué compone cada una. El ovillo
 * se dobla en el borde (happy-dom no tiene WebGL y el componente real tiene sus
 * propios tests); el resto del design system corre de verdad, así que `axe` mide
 * el marcado real de los formularios.
 */
vi.mock("@/shared/ui/three", () => ({
  AsciiYarn: () => <span data-testid="ascii-yarn" />,
}));

const routerState = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerState.replace,
    refresh: routerState.refresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const fetchSpy = vi.fn();

/** La página de login es un Server Component asíncrono: se resuelve y se monta. */
function loginPage(query: Record<string, string | string[] | undefined> = {}) {
  return LoginPage({ searchParams: Promise.resolve(query) });
}

/** Recorre el árbol de elementos que DEVUELVE la página (su composición). */
function collectSuspenseBoundaries(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) {
    return node.flatMap(collectSuspenseBoundaries);
  }
  if (!isValidElement(node)) {
    return [];
  }

  const element = node as ReactElement<{ children?: ReactNode }>;
  const inside = collectSuspenseBoundaries(element.props.children);
  return element.type === Suspense ? [element, ...inside] : inside;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  routerState.replace.mockReset();
  routerState.refresh.mockReset();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("página de login", () => {
  it("monta el formulario de acceso (smoke)", async () => {
    render(await loginPage());

    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  /**
   * El slot se llama `auth-hero` desde el arreglo de la deuda 117 (RFC-01 §3,
   * E12 d): el ovillo de auth no es la capa de fondo del caparazón —eso sigue
   * siendo `bg-3d`, en `AppShell`— sino una celda de la rejilla, en el flujo.
   *
   * El `aria-hidden` que se comprueba aquí es el del **envoltorio de la
   * página**, no el de `AsciiYarn`: el doble de arriba es un `<span>` pelado que
   * no reproduce ninguno de sus atributos. Por eso el envoltorio conserva su
   * `aria-hidden` aunque sea redundante — es el único asidero que este gate
   * tiene para comprobar que la pieza es decorativa. Está escrito también en las
   * dos páginas, junto al atributo.
   */
  it("monta el ovillo ASCII como hero de la página, decorativo", async () => {
    const { container } = render(await loginPage());

    expect(screen.getByTestId("ascii-yarn")).toBeInTheDocument();
    const slot = container.querySelector('[data-slot="auth-hero"]');
    expect(slot).not.toBeNull();
    expect(slot).toHaveAttribute("aria-hidden", "true");
  });

  /** El `main` lo pone el layout de `(auth)`: dos landmarks serían un fallo. */
  it("no renderiza su propio main", async () => {
    const { container } = render(await loginPage());

    expect(container.querySelector("main")).toBeNull();
  });

  /**
   * GATE DE LA DEUDA 37. El formulario colgaba de una frontera de Suspense con
   * relleno **nulo** —obligatoria mientras el destino se leía con el hook de
   * parámetros de búsqueda—, así que el HTML que producía el servidor para la
   * puerta de entrada de la app salía SIN formulario: pantalla en blanco hasta
   * hidratar, y sin JS nunca.
   *
   * Lo que se fija: la página no envuelve su contenido en ninguna frontera de
   * Suspense **de relleno nulo**. Una frontera con esqueleto (la otra salida que
   * proponía la review) seguiría pasando este gate a propósito: lo que se
   * prohíbe es el hueco vacío, no Suspense.
   *
   * Alcance honesto: este gate mide la COMPOSICIÓN de la página, no el HTML
   * final. La comprobación de que la respuesta del servidor trae el formulario
   * se hace contra un build limpio y está en el informe; no es automatizable
   * aquí sin un test que quedaría verde en las dos direcciones (con el router
   * doblado no hay suspensión que reproducir).
   */
  it("no esconde el formulario tras una frontera de Suspense con relleno nulo", async () => {
    const boundaries = collectSuspenseBoundaries(await loginPage());
    const emptyFallbacks = boundaries.filter((boundary) => {
      const { fallback } = boundary.props as { fallback?: ReactNode };
      return fallback === null || fallback === undefined;
    });

    expect(emptyFallbacks).toEqual([]);
  });

  /**
   * El destino viaja por el SERVIDOR (deuda 37): la página lo lee de los
   * parámetros de búsqueda y lo entrega como prop.
   */
  it("entrega al formulario el destino interno del proxy", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "1" } }), { status: 200 }),
    );
    render(await loginPage({ next: "/projects/7" }));

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "lanaslindas");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(routerState.replace).toHaveBeenCalledWith("/projects/7"),
    );
  });

  /**
   * Gate del redirector abierto en el camino nuevo: el valor hostil llega por la
   * URL al Server Component. Tiene que morir antes de cruzar a cliente **y** otra
   * vez en el propio formulario (la guarda vive donde ocurre la navegación).
   */
  it.each([
    ["absoluta", "https://evil.example/phishing"],
    ["protocol-relative", "//evil.example"],
    ["protocol-relative con barra invertida", "/\\evil.example"],
    ["repetida (llega como lista)", ["/projects", "//evil.example"]],
  ])("no deja pasar un ?next= hostil (%s)", async (_label, malicious) => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "1" } }), { status: 200 }),
    );
    render(await loginPage({ next: malicious }));

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "lanaslindas");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(routerState.replace).toHaveBeenCalledTimes(1));
    expect(routerState.replace).toHaveBeenCalledWith("/");
  });

  it("has no axe violations", async () => {
    const { container } = render(await loginPage());

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("página de register", () => {
  it("monta el formulario de alta (smoke)", () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole("heading", { name: "Crear cuenta" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  /**
   * ⚠️ ESTE GATE REVIERTE LA DECISIÓN DE LA FEATURE #31 `auth_ui` (2026-08-07).
   *
   * Lo que decía antes: el criterio de #31 —"ovillo ASCII de fondo SOLO en
   * login (no en register)", RFC-01 §2— fijaba una **asimetría deliberada**
   * entre las dos pantallas de auth, y este test la protegía al revés: se
   * llamaba "no monta el ovillo ASCII" y comprobaba que en el alta
   * `queryByTestId("ascii-yarn")` estaba ausente y `[data-slot="bg-3d"]` daba
   * `null`.
   *
   * Qué cambió: el usuario rediseñó las dos páginas de auth (commit `bdb11b0`,
   * 2026-08-07) y puso el ovillo **también en el alta**. La asimetría ya no
   * existe: es una decisión de producto, no un descuido. El test cayó en rojo
   * e hizo exactamente su trabajo — avisar de que se estaba cambiando algo que
   * alguien fijó a propósito (deuda 116).
   *
   * Por eso se REESCRIBE en vez de borrarse, comentarse o saltarse (deuda 29):
   * un gate se reescribe entendiendo qué protegía. Lo que fija ahora es la
   * realidad nueva — el alta **sí** monta el ovillo, y lo monta como pieza
   * **decorativa**, fuera del árbol accesible.
   *
   * A quien venga después: la ficha de #31 en `feature_list.json` sigue
   * describiendo el criterio viejo. **No "arregles" esto al revés.** Quitar el
   * ovillo de `register/page.tsx` es un cambio de producto, y este test es
   * quien tiene que caer para avisarlo.
   *
   * Dos límites honestos de lo que mide:
   * - `AsciiYarn` está **doblado** en este archivo, así que el `aria-hidden`
   *   que se comprueba aquí es el del envoltorio de la página, no el del
   *   componente. El real es `aria-hidden` SIEMPRE por construcción
   *   (`AsciiYarn.tsx:59`) y lo cubren sus propios tests.
   * - El `data-slot` ya no es `bg-3d`: la deuda 117 está saldada y el
   *   envoltorio se llama `auth-hero` (RFC-01 §3, E12 d). `bg-3d` se queda
   *   donde sigue siendo verdad, la capa fija del `AppShell`.
   */
  it("monta el ovillo ASCII, decorativo (revierte la decisión de #31, 2026-08-07)", () => {
    const { container } = render(<RegisterPage />);

    expect(screen.getByTestId("ascii-yarn")).toBeInTheDocument();
    const slot = container.querySelector('[data-slot="auth-hero"]');
    expect(slot).not.toBeNull();
    expect(slot).toHaveAttribute("aria-hidden", "true");
  });

  it("no renderiza su propio main", () => {
    const { container } = render(<RegisterPage />);

    expect(container.querySelector("main")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<RegisterPage />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
