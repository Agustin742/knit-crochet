// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShellClient } from "./AppShellClient";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock }),
}));

/**
 * El shell se dobla a propósito. Lo que prueba este archivo es la COSTURA con
 * el backend (traer el usuario y cablear el cierre de sesión), no cómo se
 * pinta: desde la enmienda E7 de D4 el `ArchiveNav` **no renderiza utils**
 * —ofrecía "Salir" sin sesión abierta— y la pantalla que los justifica llega en
 * la feature #31 `auth_ui`. Con el doble, el cableado sigue cubierto y el día
 * que #31 lo muestre no hay que reescribir esta lógica.
 */
vi.mock("@/shared/ui", () => ({
  AppShell: ({
    children,
    user,
    onLogout,
  }: {
    children: ReactNode;
    user?: { name: string } | null;
    onLogout?: () => void;
  }) => (
    <div>
      {user ? <span>{user.name}</span> : null}
      <button type="button" onClick={onLogout}>
        Salir
      </button>
      {children}
    </div>
  ),
  AsciiYarn: () => <span data-testid="ascii-yarn" />,
}));

const PUBLIC_USER = {
  id: "u1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: new Date("2026-01-01").toISOString(),
  updatedAt: new Date("2026-01-01").toISOString(),
};

function mockFetch(overrides?: (url: string) => Response | undefined) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const custom = overrides?.(url);
    if (custom) {
      return custom;
    }
    if (url.includes("/api/auth/me")) {
      return new Response(JSON.stringify({ user: PUBLIC_USER }), { status: 200 });
    }
    if (url.includes("/api/auth/logout")) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response("null", { status: 404 });
  });
}

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch());
});

describe("AppShellClient (wiring me + logout)", () => {
  it("hands the shell the user from GET /api/auth/me", async () => {
    render(
      <AppShellClient>
        <p>Panel</p>
      </AppShellClient>,
    );
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/auth/me");
  });

  it("logs out via POST /api/auth/logout and redirects to /login", async () => {
    const user = userEvent.setup();
    render(
      <AppShellClient>
        <p>Panel</p>
      </AppShellClient>,
    );
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Salir" }));

    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("still renders the shell when /api/auth/me fails (no user handed over)", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch((url) =>
        url.includes("/api/auth/me")
          ? new Response("null", { status: 401 })
          : undefined,
      ),
    );
    render(
      <AppShellClient>
        <p>Panel</p>
      </AppShellClient>,
    );
    expect(screen.getByText("Panel")).toBeInTheDocument();
  });
});
