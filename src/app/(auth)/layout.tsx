import type { ReactNode } from "react";

/**
 * Layout de autenticación: pantalla limpia, sin archivero (RFC-01 §2).
 *
 * El `main` lo pone ESTE layout, así que las páginas que cuelgan de él
 * (`login/` y `register/`, feature #31) no renderizan otro: serían dos
 * landmarks. Es también quien declara el posicionamiento relativo del que se
 * cuelga el ovillo ASCII de la página de login.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-bg p-(--space-6)">
      {children}
    </main>
  );
}
