// @vitest-environment happy-dom
import type { ReactNode } from "react";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

/**
 * GUARDARRAÍL de los dos formularios de auth (uno solo, para que la garantía no
 * dependa de acordarse de repetirla en cada archivo).
 *
 * Un formulario sin método declarado **no** es un formulario que no se envía: el
 * HTML lo envía **por GET a la URL actual**. Como estos llevan `name` en sus
 * controles, un envío nativo —el que ocurre si alguien escribe y pulsa Enter
 * ANTES de que hidrate el JavaScript, algo posible desde que el HTML ya trae la
 * pantalla (deuda 37)— mandaría la contraseña en la barra de direcciones, y de
 * ahí al historial, al `Referer` y a los registros de cualquier proxy o CDN que
 * haya delante. Es CWE-598.
 *
 * Declarando POST, ese mismo envío nativo manda las credenciales en el CUERPO.
 * No es la solución completa —eso es la Server Action de la deuda 39— pero saca
 * el secreto de la URL, que es lo irreversible: una URL queda escrita en sitios
 * que no controlamos.
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

const FORMS = [
  ["LoginForm", <LoginForm key="login" />],
  ["RegisterForm", <RegisterForm key="register" />],
] as const;

describe("los formularios de auth nunca envían credenciales por la URL", () => {
  for (const [name, element] of FORMS) {
    it(`${name} declara POST como método de envío`, () => {
      const { container } = render(element);

      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    });

    it(`${name} no declara un destino de envío propio`, () => {
      const { container } = render(element);

      // Sin `action`, el envío nativo va a la URL actual, que es una página y no
      // acepta credenciales: no hay ningún endpoint al que llegue por accidente.
      // El envío de verdad lo hace `fetch` desde el manejador.
      expect(container.querySelector("form")).not.toHaveAttribute("action");
    });
  }
});
