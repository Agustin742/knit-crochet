import type { ReactNode } from "react";

/**
 * Layout de autenticación: pantalla limpia, sin archivero (RFC-01 §2). Las
 * páginas login/register quedan fuera del alcance de esta feature.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-bg p-[var(--space-6)]">
      {children}
    </main>
  );
}
