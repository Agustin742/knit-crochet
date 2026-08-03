/** Destino por defecto tras iniciar sesión: el Dashboard (RFC-01 §2). */
export const DEFAULT_REDIRECT = "/";

const FIRST_PRINTABLE_CODE_POINT = 0x20;
const DELETE_CODE_POINT = 0x7f;

/**
 * Ruta interna: empieza por una barra y esa barra NO va seguida de otra barra ni
 * de una barra invertida.
 *
 * `//evil.com` y la variante con barra invertida son URLs **protocol-relative**:
 * el navegador las resuelve contra el esquema actual, o sea a `https://evil.com`,
 * así que un `router.push` con ese valor se lleva al usuario fuera del sitio.
 */
const INTERNAL_PATH = /^\/(?![/\\])/;

/** Caracteres de control ASCII (C0 + DEL). Se comparan por código en vez de con
 *  una clase de regex para no escribir bytes de control en el fuente. */
function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < FIRST_PRINTABLE_CODE_POINT || code === DELETE_CODE_POINT) {
      return true;
    }
  }
  return false;
}

/**
 * Valida el `?next=` que escribe `src/proxy.ts` antes de redirigir.
 *
 * El proxy sólo escribe ahí el `pathname` de la página protegida que se pidió
 * (`proxy.ts:29-31`), pero **el parámetro llega por la URL**: cualquiera puede
 * repartir un enlace a `/login?next=https://evil.com` y convertir la pantalla de
 * acceso en un redirector abierto (el usuario se autentica en el sitio real y
 * aterriza en el falso, con la sesión recién abierta y la barra de direcciones ya
 * en el dominio del atacante). Por eso el destino se valida en quien redirige y
 * nunca se confía en el origen del valor.
 *
 * Los caracteres de control se rechazan porque el navegador **los elimina** al
 * normalizar una URL: una barra seguida de un tabulador y otra barra se convierte
 * en `//` después de haber pasado un control que sólo mirase el primer par de
 * caracteres.
 *
 * Todo lo que no sea una ruta interna cae al Dashboard.
 */
export function resolveNextPath(next: string | null | undefined): string {
  if (typeof next !== "string") {
    return DEFAULT_REDIRECT;
  }
  if (!INTERNAL_PATH.test(next) || hasControlCharacters(next)) {
    return DEFAULT_REDIRECT;
  }
  return next;
}
