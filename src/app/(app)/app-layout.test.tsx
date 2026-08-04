// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AppLayout from "./layout";

/**
 * El layout del grupo privado es un **Server Component**: se resuelve y se
 * monta, igual que las páginas de `(auth)`.
 *
 * Lo que fija este archivo es DÓNDE se resuelve la sesión, que es la decisión de
 * menor radio de la feature #32: aquí, en el servidor, y no con un fetch desde
 * el caparazón. Es lo que mantiene verdadero el gate de coste de
 * `AppShellClient.test.tsx` en vez de obligar a invertirlo (deuda 29).
 */
const authState = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  getSessionUser: authState.getSessionUser,
}));

vi.mock("@/features/auth/ui", () => ({
  AppShellClient: ({
    children,
    user,
  }: {
    children: ReactNode;
    user?: { name: string } | null;
  }) => (
    <div data-testid="app-shell-client" data-user={user?.name ?? ""}>
      {children}
    </div>
  ),
}));

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  authState.getSessionUser.mockReset();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("layout del grupo (app)", () => {
  it("resuelve la sesión en el servidor y la baja por props", async () => {
    authState.getSessionUser.mockResolvedValue({
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
    });

    render(await AppLayout({ children: <p>Panel</p> }));

    expect(screen.getByTestId("app-shell-client")).toHaveAttribute(
      "data-user",
      "Ada",
    );
    expect(screen.getByText("Panel")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("entrega null cuando no hay sesión", async () => {
    authState.getSessionUser.mockResolvedValue(null);

    render(await AppLayout({ children: <p>Panel</p> }));

    expect(screen.getByTestId("app-shell-client")).toHaveAttribute(
      "data-user",
      "",
    );
  });

  it("cruza a cliente sólo el nombre, no el registro entero", async () => {
    // Todo lo que se pasa a un componente de cliente viaja serializado en la
    // carga de la página: el email no tiene por qué estar ahí.
    authState.getSessionUser.mockResolvedValue({
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
      passwordHash: "no-deberia-existir-aqui",
    });

    const element = (await AppLayout({ children: <p>Panel</p> })) as {
      props: { user: unknown };
    };

    expect(element.props.user).toEqual({ name: "Ada" });
  });
});
