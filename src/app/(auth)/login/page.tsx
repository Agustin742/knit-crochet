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
 * El ovillo va montado en ESTA página y no en el layout porque cada pantalla de
 * `(auth)` monta el suyo (el alta también, desde el rediseño `bdb11b0`; ver el
 * gate de `auth-pages.test.tsx`). **Ya no es el slot de fondo de `AppShell`**:
 * desde ese rediseño es una CELDA DE LA REJILLA, en el flujo, junto al
 * formulario, y **sí captura el puntero** (`interactive`), porque vive en su
 * propia columna y no puede robarle clics al formulario. Por eso el `data-slot`
 * dice `auth-hero` y no `bg-3d` (RFC-01 §3, E12 d): `bg-3d` es la capa fija de
 * fondo del caparazón, que es otra pieza y sigue existiendo en `AppShell`.
 *
 * La rejilla es mobile-first (RFC-01 §3, E12 a y b): **una columna en la base,
 * dos a partir de `--bp-tablet`**, y la celda del ovillo apagada por CSS por
 * debajo de ese ancho. No es cosmético: por debajo de `--bp-tablet`
 * `useViewportSupports3d` no monta la escena, pero `AsciiYarn` **devuelve igual
 * su host** `h-full w-full`, así que la segunda pista `1fr` seguía existiendo y
 * reclamando su mitad del ancho con nada dentro. El JS quita la escena; el CSS
 * tiene que quitar el hueco. Mismo patrón que `DashboardHero`, y vigilado por
 * `src/app/yarn-host-responsive.test.ts`.
 *
 * Sin `gap`: a partir de `--bp-tablet` el resultado tiene que ser IDÉNTICO al
 * que diseñó el usuario, y hoy las dos columnas se tocan. Por debajo sólo hay
 * un hijo visible, así que un `gap` no separaría nada.
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
    <div className="grid grid-cols-1 tablet:grid-cols-2 tablet:px-(--auth-inset-inline)">
      <LoginForm
        next={resolveNextPath(
          typeof requestedNext === "string" ? requestedNext : null,
        )}
      />

      {/* El `aria-hidden` de este envoltorio es REDUNDANTE con el de `AsciiYarn`
          (que es incondicional, `AsciiYarn.tsx:59`) y aun así SE QUEDA, a
          propósito: en `auth-pages.test.tsx` el ovillo está doblado por un
          `<span>` pelado que no reproduce ninguno de sus atributos, así que este
          es el único asidero que el gate tiene para comprobar que la pieza es
          decorativa. Quitarlo pondría dos gates en rojo por artefacto del doble,
          no por accesibilidad. No lo "limpies" (RFC-01 §3, E12 d). */}
      <div aria-hidden="true" data-slot="auth-hero" className="hidden tablet:block">
        <AsciiYarn interactive={true} />
      </div>
    </div>
  );
}
