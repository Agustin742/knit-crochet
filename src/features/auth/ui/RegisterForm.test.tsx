// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { RegisterForm } from "./RegisterForm";
import { UNEXPECTED_ERROR_MESSAGE } from "./auth-client";

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

const EMAIL_TAKEN = "Ya existe una cuenta con ese email.";

const fetchSpy = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre"), "Ada");
  await user.type(screen.getByLabelText("Email"), "Ada@Example.com");
  await user.type(screen.getByLabelText("Contraseña"), "lanaslindas");
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

/** La región de error existe siempre (vacía): se espera a que llegue el texto. */
async function expectFormError(message: string) {
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(message),
  );
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

describe("RegisterForm", () => {
  it("renders the form (smoke)", () => {
    render(<RegisterForm />);

    expect(
      screen.getByRole("heading", { name: "Crear cuenta" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear cuenta" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("validates on the client with the server rules before posting", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Nombre"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "corta");
    await submit(user);

    expect(
      screen.getByText("La contraseña debe tener al menos 8 caracteres."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  /**
   * El endpoint responde 201 y **ya deja la sesión abierta** (setea la cookie),
   * así que no se encadena ningún login: se redirige directo al Dashboard.
   */
  it("posts the account and redirects on 201 without chaining a login", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(jsonResponse(201, { user: { id: "1" } }));
    render(<RegisterForm />);

    await fillValidForm(user);
    await submit(user);

    await waitFor(() => expect(routerState.replace).toHaveBeenCalledWith("/"));
    expect(routerState.refresh).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [endpoint, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("/api/auth/register");
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Ada",
      email: "ada@example.com",
      password: "lanaslindas",
    });
  });

  /**
   * El cuerpo del 409 no dice qué campo falló: el status es la única señal, y en
   * este endpoint sólo lo produce el email duplicado.
   *
   * REESCRITO al saldar la deuda 38. La versión anterior asertaba que la región
   * viva queda vacía y **paraba ahí**: fijaba el silencio: el mensaje se pintaba
   * en un `span` que no es región viva, así que quien usa lector de pantalla
   * pulsaba el botón, lo veía desactivarse y reactivarse, y no oía nada. La
   * garantía "el 409 no se duplica a nivel de formulario" **se conserva** (sigue
   * asertada abajo), pero ahora va acompañada de lo que la hace inocua: el foco
   * se mueve al campo, y con él el lector anuncia etiqueta, invalidez y mensaje.
   */
  it("maps a 409 onto the email field and takes the focus there", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(jsonResponse(409, { error: EMAIL_TAKEN }));
    render(<RegisterForm />);

    await fillValidForm(user);
    await submit(user);

    const email = screen.getByLabelText("Email");
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    const describedBy = email.getAttribute("aria-describedby");
    expect(screen.getByText(EMAIL_TAKEN)).toHaveAttribute("id", describedBy);
    // Lo que hace audible el error: el foco, no una segunda copia del texto.
    expect(email).toHaveFocus();
    // Y sigue sin duplicarse a nivel de formulario.
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  /**
   * Deuda 38, camino de la validación en cliente: el foco va al PRIMER campo
   * inválido en orden visual, no al último ni al que se validó primero.
   */
  it("moves focus to the first invalid control after a failed submit", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "no-es-un-email");
    await user.type(screen.getByLabelText("Contraseña"), "corta");
    await submit(user);

    // Nombre vacío, email inválido y password corta: gana el nombre.
    expect(screen.getByLabelText("Nombre")).toHaveFocus();
  });

  it("falls back to a generic form-level error on 500", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(
      new Response("<html>boom</html>", { status: 500 }),
    );
    render(<RegisterForm />);

    await fillValidForm(user);
    await submit(user);

    await expectFormError(UNEXPECTED_ERROR_MESSAGE);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it("has no axe violations (idle and with a duplicated email)", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(jsonResponse(409, { error: EMAIL_TAKEN }));
    const { container } = render(<RegisterForm />);

    expect(await axe(container)).toHaveNoViolations();

    await fillValidForm(user);
    await submit(user);
    await waitFor(() =>
      expect(screen.getByLabelText("Email")).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
