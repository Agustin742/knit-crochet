import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/ui";

export const metadata: Metadata = {
  title: "Crear cuenta | Knit&Crochet",
};

/**
 * Pantalla de alta. Sin ovillo de fondo: el RFC-01 §2 lo reserva para login.
 * El `main` lo pone el layout de `(auth)`.
 */
export default function RegisterPage() {
  return <RegisterForm />;
}
