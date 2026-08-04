// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShellClient } from "./AppShellClient";
import { LOGOUT_ENDPOINT } from "./auth-client";
import { LOGOUT_REDIRECT } from "./next-path";

const routerState = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    replace: routerState.replace,
    refresh: routerState.refresh,
  }),
}));

/**
 * El shell se dobla a propósito: lo que se prueba aquí es la COSTURA (qué monta
 * este componente y qué le entrega al caparazón), no cómo se pinta. El doble
 * registra las props recibidas para poder asertar sobre ellas; el markup real de
 * la banda de cuenta se prueba en `shared/ui/layout/layout.test.tsx` y su
 * geometría en `account-band.tokens.test.ts`.
 *
 * Los dos gates del final se REESCRIBIERON al cablear la feature #32
 * `account_menu` (deuda 29). Decían, con razón para su momento, que el shell no
 * pedía nada y no entregaba ni usuario ni logout, porque la enmienda E7 había
 * dejado el nav sin utils y aquello era una petición HTTP por navegación a
 * cambio de nada (deuda 21). Ahora el caparazón sí muestra la sesión, pero el
 * **invariante de coste se conserva entero**: el usuario lo resuelve el layout
 * servidor de `(app)`, así que montar el shell sigue sin costar ni una petición
 * de cliente. Lo que cambia es que la prohibición pasa a tener su contrapartida
 * explícita: la única petición que sale de aquí es la del logout, una por
 * pulsación y ninguna por montaje.
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
const ADA = { name: "Ada" };

/** Props con las que el shell fue montado la primera vez. */
function shellPropsOf() {
  return shellProps.mock.calls[0]?.[0] as {
    user?: { name: string } | null;
    onLogout?: () => void | Promise<void>;
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  shellProps.mockReset();
  fetchSpy.mockReset();
  routerState.replace.mockReset();
  routerState.refresh.mockReset();
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
   * GATE DE COSTE, heredado de la deuda 21 y CONSERVADO al cablear la sesión.
   * Montar el caparazón no puede costar una petición HTTP: el `GET
   * /api/auth/me` que hubo aquí se disparaba en cada carga de cada página del
   * grupo `(app)` y guardaba el resultado en estado, o sea un re-render del
   * shell entero —ovillo incluido— por navegación.
   *
   * Sigue siendo cierto **con el usuario ya en pantalla** porque quien lo
   * resuelve es el layout servidor de `(app)` y baja por props. Si alguien
   * vuelve a pedirlo desde el navegador, esto cae.
   */
  it("fires no HTTP request when mounted, not even with a session", async () => {
    render(
      <AppShellClient user={ADA}>
        <p>Panel</p>
      </AppShellClient>,
    );

    // Un `useEffect` con fetch resolvería en el siguiente tick, no en el render.
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hands the server-resolved user over to the shell", () => {
    render(
      <AppShellClient user={ADA}>
        <p>Panel</p>
      </AppShellClient>,
    );

    expect(shellPropsOf().user).toEqual(ADA);
  });

  it("hands no user when there is no session", () => {
    render(
      <AppShellClient user={null}>
        <p>Panel</p>
      </AppShellClient>,
    );

    expect(shellPropsOf().user).toBeNull();
    expect(shellPropsOf().onLogout).toBeTypeOf("function");
  });

  /**
   * La otra mitad del gate anterior: la prohibición de pedir datos al montar no
   * puede leerse como "el shell no habla nunca con el servidor". Habla una vez
   * por pulsación explícita de la persona, y nada más.
   */
  describe("cierre de sesión", () => {
    it("posts to the logout endpoint and lands on the login screen", async () => {
      fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));
      render(
        <AppShellClient user={ADA}>
          <p>Panel</p>
        </AppShellClient>,
      );

      await shellPropsOf().onLogout?.();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(LOGOUT_ENDPOINT);
      expect(init.method).toBe("POST");
      await waitFor(() =>
        expect(routerState.replace).toHaveBeenCalledWith(LOGOUT_REDIRECT),
      );
      expect(routerState.refresh).toHaveBeenCalledTimes(1);
    });

    it("does not navigate if the server did not clear the session", async () => {
      // Sin confirmación, la cookie sigue puesta: mandar a `/login` acabaría en
      // un rebote al Dashboard (el proxy ya no deja entrar ahí con sesión).
      fetchSpy.mockResolvedValue(new Response(null, { status: 500 }));
      render(
        <AppShellClient user={ADA}>
          <p>Panel</p>
        </AppShellClient>,
      );

      await shellPropsOf().onLogout?.();

      expect(routerState.replace).not.toHaveBeenCalled();
      expect(routerState.refresh).not.toHaveBeenCalled();
    });

    it("does not navigate if the request never left (network down)", async () => {
      fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
      render(
        <AppShellClient user={ADA}>
          <p>Panel</p>
        </AppShellClient>,
      );

      await expect(shellPropsOf().onLogout?.()).resolves.toBeUndefined();
      expect(routerState.replace).not.toHaveBeenCalled();
    });

    it("costs one request per press, and none per mount", async () => {
      fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));
      const first = render(
        <AppShellClient user={ADA}>
          <p>Panel</p>
        </AppShellClient>,
      );
      first.rerender(
        <AppShellClient user={ADA}>
          <p>Panel</p>
        </AppShellClient>,
      );
      expect(fetchSpy).not.toHaveBeenCalled();

      await shellPropsOf().onLogout?.();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
