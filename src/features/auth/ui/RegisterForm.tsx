"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { registerSchema } from "@/features/auth/validation";
import { Button, Field, Input } from "@/shared/ui";

import { AuthFormError } from "./AuthFormError";
import { AuthPanel } from "./AuthPanel";
import { REGISTER_ENDPOINT, postAuth } from "./auth-client";
import { toFieldErrors } from "./field-errors";
import { focusFirstInvalid } from "./focus-first-invalid";
import { DEFAULT_REDIRECT } from "./next-path";

type RegisterField = "name" | "email" | "password";

const EMAIL_TAKEN_STATUS = 409;

/** Enlace de texto: no hay primitivo de enlace en el design system todavía. */
const LINK_CLASSES = [
  "font-body font-semibold text-fg underline",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");

/**
 * Formulario de alta. El endpoint responde **201** y ya deja la sesión abierta
 * (setea la misma cookie que el login), así que aquí no se encadena ningún
 * login: se redirige y punto.
 *
 * El 409 es el único caso de "ese email ya está registrado" en este endpoint y
 * su cuerpo no dice qué campo falló, así que el status es lo que decide dónde se
 * pinta: error del campo email. A diferencia del login, aquí no hay nada que
 * ocultar — el usuario acaba de intentar registrar ese email.
 *
 * No lee `?next=`: el proxy sólo lo escribe al desviar a `/login`, y a esta
 * pantalla se llega por decisión propia. Éxito ⇒ Dashboard.
 */
export function RegisterForm() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RegisterField, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    // Orden visual del formulario: el foco va al PRIMER campo inválido.
    const focusableFields = [
      { key: "name", ref: nameRef },
      { key: "email", ref: emailRef },
      { key: "password", ref: passwordRef },
    ] as const;

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const errors = toFieldErrors<RegisterField>(parsed.error);
      setFieldErrors(errors);
      // El mensaje de `Field` no es región viva: sin mover el foco, un lector de
      // pantalla no se entera de nada (deuda 38).
      focusFirstInvalid(focusableFields, errors);
      return;
    }

    setFieldErrors({});
    setPending(true);
    const result = await postAuth(REGISTER_ENDPOINT, parsed.data);

    if (!result.ok) {
      setPending(false);
      if (result.status === EMAIL_TAKEN_STATUS) {
        const errors = { email: result.message };
        setFieldErrors(errors);
        // Mismo motivo que arriba: el 409 se pinta en el campo, así que es el
        // foco —y no una región viva— lo que lo hace audible.
        focusFirstInvalid(focusableFields, errors);
        return;
      }
      setFormError(result.message);
      return;
    }

    router.replace(DEFAULT_REDIRECT);
    router.refresh();
  }

  return (
    <AuthPanel
      title="Crear cuenta"
      subtitle="Empezá a llevar la cuenta de tus proyectos y tu lana."
      footer={
        <>
          {"¿Ya tenés cuenta? "}
          <Link href="/login" className={LINK_CLASSES}>
            Entrar
          </Link>
        </>
      }
    >
      {/* `method="post"` por el mismo motivo que en `LoginForm`: sin método
          declarado, un envío nativo (antes de que hidrate el JS) sería un GET y
          la contraseña acabaría en la URL, el historial y los registros
          (CWE-598). Con POST viaja en el cuerpo. */}
      <form
        noValidate
        method="post"
        onSubmit={handleSubmit}
        className="flex flex-col gap-(--space-4)"
      >
        <AuthFormError message={formError} />

        <Field label="Nombre" error={fieldErrors.name}>
          <Input
            ref={nameRef}
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

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

        <Field
          label="Contraseña"
          hint="Al menos 8 caracteres."
          error={fieldErrors.password}
        >
          <Input
            ref={passwordRef}
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" loading={pending} className="w-full">
          Crear cuenta
        </Button>
      </form>
    </AuthPanel>
  );
}
