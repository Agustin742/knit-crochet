import { APP_NAME } from "@/shared/config";
import { AsciiYarn } from "@/shared/ui";

/**
 * Hero del Dashboard: wordmark + saludo y el ovillo ASCII (RFC-02 §2).
 *
 * **Éste es el ÚNICO ovillo de la ruta `/` (enmienda E1.2).** El caparazón no
 * monta el suyo aquí —lo decide `AppShellClient` por la ruta—, porque dos
 * efectos ASCII simultáneos duplican el coste de CPU del bucle de asciificación
 * justo en la página que más se abre. El del hero va **en el flujo del `main`**,
 * no en el slot fijo de fondo del shell: ese slot está `aria-hidden`, no captura
 * puntero y ocupa la pantalla entera.
 *
 * **NO es operable por teclado, y es a propósito (enmienda E1.3).** Es una pieza
 * decorativa de marca: no transmite información ni habilita ninguna acción, así
 * que quien no pueda arrastrarlo no se pierde nada. `AsciiYarn` es siempre
 * `aria-hidden` y su lienzo no es enfocable, de modo que `axe` pasa solo. **No
 * lo "arregles" haciéndolo enfocable**: eso obligaría a sacarlo del árbol
 * accesible oculto y a darle nombre, rol e instrucciones, es decir, a anunciarle
 * a un lector de pantalla un adorno que no lleva a ninguna parte.
 *
 * Por debajo de `--bp-tablet` el ovillo **no se monta**
 * (`useViewportSupports3d` ni siquiera descarga `three`), así que su hueco se
 * apaga con la misma condición de ancho en vez de quedarse como un agujero.
 *
 * Ojo, porque son DOS tokens y no uno: el hook lee **`--bp-tablet`** con
 * `matchMedia` en runtime, y la variante responsive que apaga el hueco la genera
 * **`--breakpoint-tablet`**, que tiene que ser un literal porque las media
 * queries no resuelven `var()`. Si se desincronizaran, entre un ancho y el otro
 * el ovillo se montaría con el hueco oculto (o al revés) — que es exactamente el
 * agujero que este bloque dice no tener.
 *
 * Los ata **`src/shared/ui/breakpoint-tokens.test.ts`**, que compara los dos
 * namespaces enteros de `globals.css` par por par. Ese archivo se escribió en
 * #19 porque hasta entonces **sólo el par `archive` estaba atado**
 * (`archive-nav.tokens.test.ts:257-262`) y los otros tres se podían mover sin
 * que ningún test se enterara: está medido en
 * `progress/reports/review_dashboard_ui.md` §2.
 */
export function DashboardHero() {
  return (
    <section
      aria-labelledby="dashboard-hero-title"
      className="flex flex-col gap-(--space-4) tablet:flex-row tablet:items-center tablet:justify-between"
    >
      <div className="flex flex-col gap-(--space-2)">
        <h1
          id="dashboard-hero-title"
          className="font-display text-3xl leading-tight text-fg-inverse desktop:text-hero"
        >
          {APP_NAME}
        </h1>
        <p className="font-emphasis text-lg leading-base text-fg-inverse-muted">
          Tu taller: lo que tejiste, lo que estás tejiendo y lo que falta.
        </p>
      </div>

      <div className="hidden w-full max-w-sm shrink-0 tablet:block tablet:aspect-square">
        <AsciiYarn interactive />
      </div>
    </section>
  );
}
