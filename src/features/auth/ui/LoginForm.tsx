"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { loginSchema } from "@/features/auth/validation";
import { Button, Field, Input } from "@/shared/ui";

import { AuthFormError } from "./AuthFormError";
import { AuthPanel } from "./AuthPanel";
import { LOGIN_ENDPOINT, postAuth } from "./auth-client";
import { toFieldErrors } from "./field-errors";
import { focusFirstInvalid } from "./focus-first-invalid";
import { resolveNextPath } from "./next-path";

type LoginField = "email" | "password";

export interface LoginFormProps {
  /**
   * Destino al que volver tras entrar, leído del `?next=` en el servidor
   * (deuda 37). Se vuelve a validar aquí antes de navegar: el control vive donde
   * ocurre la navegación, venga el valor por donde venga.
   */
  next?: string | null;
}

/** Enlace de texto: no hay primitivo de enlace en el design system todavía. */
const LINK_CLASSES = [
  "font-body font-semibold text-fg underline",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");

/**
 * Formulario de acceso. La costura con el backend (fetch + redirección) vive
 * aquí, en la feature: `shared/ui` es presentación pura y no conoce endpoints.
 *
 * El 401 se pinta como error de FORMULARIO, nunca de campo: el servidor devuelve
 * el mismo mensaje para "ese email no existe" y "esa password no es", a
 * propósito, para no confirmarle a un atacante qué emails están registrados.
 * Marcar el campo email sería deshacer esa decisión desde la UI.
 */
export function LoginForm({ next }: LoginFormProps = {}) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<LoginField, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors = toFieldErrors<LoginField>(parsed.error);
      setFieldErrors(errors);
      // El mensaje de `Field` no es región viva: sin mover el foco, un lector de
      // pantalla no se entera de nada (deuda 38).
      focusFirstInvalid(
        [
          { key: "email", ref: emailRef },
          { key: "password", ref: passwordRef },
        ],
        errors,
      );
      return;
    }

    setFieldErrors({});
    setPending(true);
    const result = await postAuth(LOGIN_ENDPOINT, parsed.data);

    if (!result.ok) {
      setPending(false);
      setFormError(result.message);
      return;
    }

    /* La cookie de sesión ya viene seteada por el endpoint. `replace` y no
       `push` para que el botón "atrás" no devuelva a la pantalla de acceso ya
       autenticado; `refresh` para que los Server Components vuelvan a
       renderizarse viendo la sesión nueva. `pending` se queda encendido a
       propósito: apagarlo dejaría el botón otra vez activo durante la
       navegación. */
    router.replace(resolveNextPath(next));
    router.refresh();
  }

  return (
    <AuthPanel
      title="Entrar"
      subtitle="Volvé a tus proyectos, tus lanas y tus patrones."
      footer={
        <>
          {"¿Todavía no tenés cuenta? "}
          <Link href="/register" className={LINK_CLASSES}>
            Crear una cuenta
          </Link>
        </>
      }
    >
      {/* `method="post"` aunque el envío lo maneje JavaScript: un formulario sin
          método declarado se envía por GET a la URL actual, así que un envío
          nativo —el que ocurre si alguien pulsa Enter antes de que hidrate el
          JS— pondría la contraseña en la barra de direcciones, en el historial y
          en los registros de cualquier proxy o CDN (CWE-598). Con POST viaja en
          el cuerpo. */}
      <form
        noValidate
        method="post"
        onSubmit={handleSubmit}
        className="flex flex-col gap-(--space-4)"
      >
        <AuthFormError message={formError} />

        <Field label="Email" error={fieldErrors.email}>
          <Input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Contraseña" error={fieldErrors.password}>
          <Input
            ref={passwordRef}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" loading={pending} className="w-full">
          Entrar
        </Button>
      </form>
    </AuthPanel>
  );
}
