import type { ReactNode } from "react";

/**
 * Layout de autenticación: pantalla limpia, sin archivero (RFC-01 §2).
 *
 * El `main` lo pone ESTE layout, así que las páginas que cuelgan de él
 * (`login/` y `register/`, feature #31) no renderizan otro: serían dos
 * landmarks.
 *
 * Su trabajo es sólo centrar la pantalla y poner el relleno de página; el
 * `relative` **ya no sostiene ningún ovillo posicionado**: el rediseño
 * `bdb11b0` sacó el `absolute inset-0` de las dos páginas y las pasó a una
 * rejilla en el flujo (RFC-01 §3, E12 a y d). Se conserva como contexto de
 * posicionamiento del `main` —cualquier capa futura de esta pantalla se colgará
 * de él— pero hoy no ancla nada, y el inset lateral de la rejilla es cosa de las
 * páginas (`--auth-inset-inline`, E12 c), no de aquí.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-bg p-(--space-6)">
      {children}
    </main>
  );
}
