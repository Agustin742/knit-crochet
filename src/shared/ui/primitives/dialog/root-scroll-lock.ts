/**
 * Bloqueo del scroll del elemento raíz mientras hay un modal abierto (deuda 87).
 *
 * `aria-modal` le basta al lector de pantalla que lo honra, pero no le dice nada
 * a la rueda del ratón ni a las flechas: con el modal abierto, lo que se movía
 * era la página de detrás. Escenario real de #19: el usuario abre el modal de
 * creación de proyecto, gira la rueda para ver un campo de abajo y lo que se
 * desplaza es el Dashboard.
 *
 * **Contador de referencias, no un `boolean`.** Las tres trampas que resuelve, y
 * las tres están testeadas una por una en `Dialog.test.tsx`:
 *
 * 1. **Desmontar sin cerrar.** Si el `Dialog` desaparece estando abierto —la
 *    página navega—, la limpieza del efecto suelta igual: el soltador es el
 *    valor de retorno, no una llamada aparte que alguien pueda olvidar.
 * 2. **Dos diálogos a la vez.** Con un `boolean`, cerrar el de arriba devolvía
 *    el scroll con el de abajo todavía abierto. El bloqueo se levanta cuando lo
 *    suelta el ÚLTIMO que lo pidió, sea cual sea el orden de cierre — no sólo en
 *    orden inverso al de apertura.
 * 3. **No pisar un valor previo.** Se guarda el `overflow` en línea que hubiera
 *    antes del PRIMER bloqueo y se restaura ese, no un valor fijo: si algo más
 *    ya lo había tocado, sobrevive.
 *
 * Cada soltador es idempotente: llamarlo dos veces no descuenta dos veces, que
 * es como se corrompe un contador (React puede montar y limpiar un efecto dos
 * veces en modo estricto).
 *
 * El estado vive en el módulo a propósito: el contador tiene que ser único para
 * toda la aplicación, porque lo que se comparte es un único elemento raíz.
 */
const LOCKED_OVERFLOW = "hidden";

let holders = 0;
let overflowBeforeLock = "";

export function lockRootScroll(): () => void {
  const root = document.documentElement;

  if (holders === 0) {
    overflowBeforeLock = root.style.overflow;
    root.style.overflow = LOCKED_OVERFLOW;
  }
  holders += 1;

  let released = false;

  return function releaseRootScroll() {
    if (released) {
      return;
    }
    released = true;
    holders -= 1;

    if (holders === 0) {
      root.style.overflow = overflowBeforeLock;
      overflowBeforeLock = "";
    }
  };
}
