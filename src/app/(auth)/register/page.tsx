import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/ui";
import { AsciiYarn } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Crear cuenta | Knit&Crochet",
};

/**
 * Pantalla de alta. **CON ovillo**, igual que login: la asimetría que fijaba el
 * criterio de la feature #31 ("sólo en login", RFC-01 §2) quedó **derogada** por
 * el rediseño del usuario (`bdb11b0`) y así está anotado en el RFC-01 §2 y en el
 * gate de `auth-pages.test.tsx`. El `main` lo pone el layout de `(auth)`.
 *
 * El ovillo NO es una capa de fondo: es una celda de la rejilla, en el flujo y
 * con captura de puntero. De ahí `data-slot="auth-hero"` (RFC-01 §3, E12 d).
 *
 * Rejilla mobile-first (E12 a y b), gemela de la de login: una columna en la
 * base, dos a partir de `--bp-tablet`, y la celda del ovillo apagada por CSS por
 * debajo — porque `AsciiYarn` devuelve su host aunque no monte la escena, y el
 * hueco vacío se quedaba media pantalla. Sin `gap`, para no cambiar ni un píxel
 * de lo que el usuario diseñó de `--bp-tablet` para arriba. Lo vigila
 * `src/app/yarn-host-responsive.test.ts`.
 */
export default function RegisterPage() {
  return (
    <div className="grid grid-cols-1 tablet:grid-cols-2 tablet:px-(--auth-inset-inline)">
      <RegisterForm />

      {/* El `aria-hidden` es redundante con el de `AsciiYarn` y SE QUEDA a
          propósito: es el único asidero del gate, que dobla el ovillo con un
          `<span>` pelado. Ver el comentario largo en `login/page.tsx`. */}
      <div aria-hidden="true" data-slot="auth-hero" className="hidden tablet:block">
        <AsciiYarn interactive={true} />
      </div>
    </div>
  );
}
