import { cn } from "../../lib/cn";
import { Button } from "../../primitives/button/Button";
import {
  accountBandVariants,
  accountNameVariants,
} from "./account-band.variants";

export interface AccountUser {
  name: string;
}

export interface AccountBandProps {
  /** Sesión abierta. Sin usuario no hay banda: no se ofrece salir a un visitante. */
  user?: AccountUser | null;
  /** Cierre de sesión. Lo decide quien consume el template, no el template. */
  onLogout?: () => void;
  className?: string;
}

/**
 * Banda de cuenta del caparazón (RFC-01 §3, enmienda E11): quién tiene la sesión
 * abierta y cómo cerrarla.
 *
 * Vive **fuera del elemento `nav`** y por encima del cajón del archivero, en el
 * flujo. No vuelve al `ArchiveNav` —de donde E7 la sacó— porque desde E4/E6 el
 * carril no tiene ancho que ceder, y no se superpone al cajón porque la pestaña
 * de la ranura 6 deja 2 de techo con el puntero encima. Las dos cosas están
 * medidas y verificadas en `account-band.tokens.test.ts`.
 *
 * Rige en TODOS los anchos (E11 b): por debajo de `--bp-archive` el archivero no
 * se monta y el `BottomNav` no recibe la sesión, así que esta banda es la única
 * superficie del shell capaz de alojarla en los dos regímenes.
 *
 * **Sin `user` o sin `onLogout` no monta nada.** Ofrecer "Salir" sin sesión fue
 * el defecto que motivó E7; enseñar el nombre con un botón muerto sería el mismo
 * error al revés (deuda 29: la cadena estuvo cortada dos capas más arriba sin
 * que nada lo delatara). Media sesión no se ofrece: o están las dos mitades, o
 * la banda no existe.
 *
 * Presentación pura: no hace fetch ni conoce endpoints.
 */
export function AccountBand({ user, onLogout, className }: AccountBandProps) {
  if (!user || !onLogout) {
    return null;
  }

  return (
    <div
      data-slot="account-band"
      className={cn(accountBandVariants(), className)}
    >
      <span data-slot="account-name" className={accountNameVariants()}>
        {user.name}
      </span>
      {/* Un `button`, nunca un enlace: además de ser la semántica correcta para
          una acción, un enlace aquí reabriría el defecto que E8 cerró en el nav
          (navegación sin señal visual). */}
      <Button variant="ghost" onClick={onLogout}>
        Salir
      </Button>
    </div>
  );
}
