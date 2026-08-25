import type { ReactNode } from "react";

/**
 * Las dos piezas que comparten los tres tabs pesados del cajón —Progreso, Lanas
 * y Sesiones— y que no son de ninguno en particular (RFC-03 §2, tanda 2 de la
 * enmienda E3(a)).
 *
 * Viven en su propio archivo y no repetidas en cada tab por lo de siempre: tres
 * copias de un aviso de error se desincronizan en cuanto alguien toca una. Y no
 * suben a `shared/ui/` porque no son del design system: son la maquetación
 * interna de **este** cajón.
 */

/**
 * Un bloque del tab, con su título **visible**.
 *
 * El título es un `h3` de verdad y no un párrafo en negrita: el cajón cuelga de
 * un `h2` —el nombre del proyecto, que es el título del diálogo—, así que estos
 * bloques son su nivel siguiente y quien navegue por encabezados los encuentra.
 *
 * El título se pinta en **monoespaciada chica en versalitas**, igual que las
 * etiquetas del tab General: es la misma familia de "esto nombra a lo de abajo",
 * y así el dato de debajo se lleva todo el peso visual. La jerarquía se hace por
 * **familia y tamaño**, nunca bajando el contraste (sobre esta superficie el
 * primer plano apagado no llega al mínimo para texto chico).
 */
export function TabSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-(--space-3)">
      <h3 className="m-0 font-mono text-xs uppercase tracking-label text-fg">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Lo que salió mal al tocar algo, **a la vista** (enmienda E2(d)).
 *
 * Es `role="alert"` y no una región educada: quien acaba de pulsar "sumar una
 * vuelta" está esperando el resultado de ESA acción, y un aviso que espera turno
 * llega cuando ya se fue. El acierto no necesita aviso ninguno en estos tabs
 * porque **se ve solo**: el contador cambia, la lana aparece, el cronómetro
 * arranca.
 *
 * Se monta **sólo cuando hay algo que decir**. Un nodo vacío permanente con
 * `role="alert"` es una trampa conocida: algunos lectores lo anuncian al
 * vaciarse, y encima reservaría un hueco en blanco en mitad del tab.
 */
export function ActionError({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }
  return (
    <p role="alert" className={ACTION_ERROR_CLASSES}>
      {message}
    </p>
  );
}

/**
 * Mismo tratamiento que el aviso fallido de la lista: color de peligro sobre la
 * superficie elevada, que es donde se monta el cajón (5.35:1 medido ahí; sobre
 * el fondo espresso de la app no llegaría).
 */
const ACTION_ERROR_CLASSES = [
  "m-0 self-start",
  "border-(length:--border-width) border-solid border-danger rounded-sm",
  "px-(--space-4) py-(--space-2)",
  "font-mono text-sm leading-base text-danger",
].join(" ");
