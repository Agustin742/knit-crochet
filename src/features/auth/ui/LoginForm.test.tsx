// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { LoginForm } from "./LoginForm";
import { NETWORK_ERROR_MESSAGE } from "./auth-client";

/**
 * Se prueba la COSTURA del formulario: qué manda al endpoint, dónde pinta cada
 * error del servidor y a dónde redirige. El design system corre de verdad (los
 * errores por campo se leen por `aria-invalid`/`aria-describedby`, que es lo que
 * cablea `Field`); lo que se dobla es el borde: el router y `fetch`.
 */
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

const INVALID_CREDENTIALS = "Email o contraseña incorrectos.";

const fetchSpy = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fillValidCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "Ada@Example.com");
  await user.type(screen.getByLabelText("Contraseña"), "lanaslindas");
}

/** La región de error existe siempre (vacía): se espera a que llegue el texto. */
async function expectFormError(message: string) {
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(message),
  );
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Entrar" }));
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

describe("LoginForm", () => {
  it("renders the form (smoke)", () => {
    render(<LoginForm />);

    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(screen.getByRole("link", { name: "Crear una cuenta" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("validates on the client before hitting the endpoint", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await submit(user);

    expect(screen.getByText("El email no es válido.")).toBeInTheDocument();
    expect(screen.getByText("La contraseña es obligatoria.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it("posts the normalized credentials and redirects to the Dashboard", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      jsonResponse(200, { user: { id: "1", email: "ada@example.com" } }),
    );
    render(<LoginForm />);

    await fillValidCredentials(user);
    await submit(user);

    await waitFor(() => expect(routerState.replace).toHaveBeenCalledWith("/"));
    expect(routerState.refresh).toHaveBeenCalledTimes(1);

    const [endpoint, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("/api/auth/login");
    expect(init.method).toBe("POST");
    // El schema del servidor normaliza el email: se manda ya en minúsculas.
    expect(JSON.parse(String(init.body))).toEqual({
      email: "ada@example.com",
      password: "lanaslindas",
    });
  });

  /**
   * El 401 devuelve el MISMO mensaje para email inexistente y password errónea,
   * a propósito. Pintarlo en el campo email haría que la pantalla afirmara algo
   * que el servidor se niega a decir.
   */
  it("shows invalid credentials as a form-level error, never on the email field", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      jsonResponse(401, { error: INVALID_CREDENTIALS }),
    );
    render(<LoginForm />);

    await fillValidCredentials(user);
    await submit(user);

    await expectFormError(INVALID_CREDENTIALS);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Contraseña")).not.toHaveAttribute(
      "aria-invalid",
    );
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it("reports a network failure at form level", async () => {
    const user = userEvent.setup();
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<LoginForm />);

    await fillValidCredentials(user);
    await submit(user);

    await expectFormError(NETWORK_ERROR_MESSAGE);
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it("honours an internal destination handed over by the page", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(jsonResponse(200, { user: { id: "1" } }));
    render(<LoginForm next="/projects/42" />);

    await fillValidCredentials(user);
    await submit(user);

    await waitFor(() =>
      expect(routerState.replace).toHaveBeenCalledWith("/projects/42"),
    );
  });

  /**
   * Gate del redirector abierto **por la ruta nueva** (deuda 37): desde que el
   * destino se lee en el servidor y llega por prop, ya no pasa por el hook de
   * parámetros de búsqueda. Si la guarda viviera sólo en el camino viejo, un
   * destino hostil entraría por este otro. Por eso el control está donde ocurre
   * la navegación y se ejercita **entregando el valor hostil directamente como
   * prop**, saltándose la validación que además hace la página.
   */
  it.each([
    ["absoluta", "https://evil.example/phishing"],
    ["protocol-relative", "//evil.example"],
    ["protocol-relative con barra invertida", "/\\evil.example"],
    ["esquema ejecutable", "javascript:alert(1)"],
    ["carácter de control", `/${String.fromCharCode(9)}/evil.example`],
  ])("rejects a malicious destination (%s) and falls back to '/'", async (
    _label,
    malicious,
  ) => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(jsonResponse(200, { user: { id: "1" } }));
    render(<LoginForm next={malicious} />);

    await fillValidCredentials(user);
    await submit(user);

    await waitFor(() => expect(routerState.replace).toHaveBeenCalledTimes(1));
    expect(routerState.replace).toHaveBeenCalledWith("/");
  });

  /**
   * Deuda 38: el mensaje de `Field` no es región viva, así que un error que
   * aparece tras el envío sólo se anuncia si el foco se mueve al control.
   */
  it("moves focus to the first invalid control after a failed submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await submit(user);

    const email = screen.getByLabelText("Email");
    expect(email).toHaveFocus();
    // Al enfocar, el lector lee la etiqueta + el mensaje que describe al control.
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(
      document.getElementById(email.getAttribute("aria-describedby") ?? ""),
    ).toHaveTextContent("El email no es válido.");
  });

  it("moves focus to the password when only the password is invalid", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await submit(user);

    expect(screen.getByLabelText("Contraseña")).toHaveFocus();
  });

  it("has no axe violations (idle and after a failed login)", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      jsonResponse(401, { error: INVALID_CREDENTIALS }),
    );
    const { container } = render(<LoginForm />);

    expect(await axe(container)).toHaveNoViolations();

    await fillValidCredentials(user);
    await submit(user);
    await expectFormError(INVALID_CREDENTIALS);

    expect(await axe(container)).toHaveNoViolations();
  });
});
