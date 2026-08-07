import type { Metadata } from "next";

import { LoginForm, resolveNextPath } from "@/features/auth/ui";
import { AsciiYarn } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Entrar | Knit&Crochet",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Pantalla de acceso. El `main` lo pone el layout de `(auth)`: aquí no se
 * renderiza otro o habría dos landmarks.
 *
 * El ovillo va montado en ESTA página y no en el layout porque el RFC-01 §2 lo
 * quiere sólo en login (en el layout aparecería también en register). Se sigue
 * la receta del slot de `AppShell`: decorativo, fuera del árbol accesible, sin
 * capturar el puntero y por detrás del contenido.
 *
 * El destino del proxy se lee **en el servidor** y se pasa como prop (deuda 37).
 * Antes lo leía el formulario con el hook de parámetros de búsqueda, que obliga
 * a envolverlo en una frontera de Suspense: con relleno nulo, el HTML
 * prerenderizado de la puerta de entrada de la app salía **sin formulario**, y
 * sin JS no llegaba a haberlo nunca. El precio es que la ruta pasa de estática a
 * dinámica: es lo que cuesta servir un HTML que ya trae la pantalla.
 *
 * El valor se sanea aquí con `resolveNextPath` para que ni siquiera cruce la
 * frontera servidor→cliente sin validar, y el formulario **vuelve a pasarlo por
 * la misma guarda** antes de redirigir, porque el control tiene que vivir donde
 * ocurre la navegación. La función es idempotente, así que aplicarla dos veces
 * no cambia el resultado.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedNext = params.next;

  return (
    <div className="grid grid-cols-2 px-20">
      <LoginForm
        next={resolveNextPath(
          typeof requestedNext === "string" ? requestedNext : null,
        )}
      />

      <div
        aria-hidden="true"
        data-slot="bg-3d"
        className=""
      >
        <AsciiYarn interactive={true} />
      </div>
    </div>
  );
}
