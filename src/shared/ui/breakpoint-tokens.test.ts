import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { isAbsolutePxLength } from "./testing/css-tokens";

/**
 * Guardrail de los PARES de breakpoint (SDD §5, `globals.css`).
 *
 * Cada ancho vive **dos veces** en `globals.css`, y no por descuido: las media
 * queries de CSS **no resuelven `var()`**, así que el alias que genera la
 * variante responsive de Tailwind (`--breakpoint-*`) tiene que ser un literal,
 * mientras que el token que se lee en runtime con `matchMedia` (`--bp-*`) es el
 * que consultan los componentes. Son el mismo ancho escrito en dos sitios, y
 * **nada del lenguaje los ata**.
 *
 * POR QUÉ ESTE ARCHIVO EXISTE (#19). Hasta ahora sólo un par estaba atado por
 * test: `archive-nav.tokens.test.ts:257-262` compara `--breakpoint-archive` con
 * `--bp-archive`, y sólo ése. Los otros tres se podían desincronizar **sin que
 * nada avisara**: medido en el review de #19, moviendo `--breakpoint-tablet` a
 * 900px y dejando `--bp-tablet` en 768px, la suite entera salía verde con exit
 * 0. El defecto que eso produce es real y silencioso: entre los dos anchos, un
 * componente que se monta leyendo `--bp-*` aparece mientras el hueco que lo
 * aloja —gobernado por la variante responsive— sigue oculto, o al revés. Le pasa
 * exactamente al hero del Dashboard (`useViewportSupports3d` lee `--bp-tablet`;
 * el hueco se apaga con la variante de tablet), pero el agujero es del design
 * system entero, no de esa página.
 *
 * LOS PARES SE DESCUBREN, NO SE ENUMERAN. Una lista escrita a mano dejaría sin
 * vigilar el quinto breakpoint el día que exista — que es el patrón de las
 * deudas 40/43/71 y la razón por la que el guardrail de no-hardcode dejó de
 * tener lista. Por eso se leen los dos namespaces del propio CSS y se comparan
 * como conjuntos, lo que falla en las **dos** direcciones: sobra un alias sin su
 * token de lectura, o falta el alias de un token.
 *
 * Y por eso mismo hay seguro anti-descubrimiento-roto: una expresión que no
 * casara con nada devolvería dos conjuntos vacíos, que son iguales entre sí, o
 * sea **verde falso**.
 */
const GLOBALS_CSS = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8",
);

/** Nombres declarados bajo un prefijo, con el sufijo como clave del par. */
function declaredSuffixes(prefix: string): string[] {
  const pattern = new RegExp(String.raw`^\s*--${prefix}-([a-z0-9-]+)\s*:`, "gm");
  return [...GLOBALS_CSS.matchAll(pattern)]
    .map((match) => match[1] as string)
    .sort();
}

/** El valor crudo de una declaración, tal cual está escrito. */
function declarationIn(css: string, name: string): string {
  const match = css.match(new RegExp(String.raw`^\s*${name}\s*:\s*([^;]+);`, "m"));
  const value = match?.[1]?.trim();
  if (value === undefined) {
    throw new Error(`El token ${name} no está declarado en globals.css`);
  }
  return value;
}

/**
 * El ancho de un breakpoint, **con la unidad comprobada** (deuda 158).
 *
 * ANTES ESTO ERA LA MISMA LECTURA PERMISIVA QUE DEJÓ PASAR EL BLOQUEANTE B2:
 * `Number.parseFloat` a secas y un rechazo que sólo miraba si el resultado era
 * un no-número. `Number.parseFloat` **descarta el sufijo en silencio**, así que
 * para ella `1180`, `1180px` y `1180em` son **el mismo número** y los dos
 * juegos de tokens cuadraban con cualquiera de los tres.
 *
 * En un breakpoint eso no es un matiz, es el peor caso del repo y está
 * **medido**: con `--breakpoint-desktop: 1180` el compilador emite
 * `@media (width >= 1180)`, que es una consulta **inválida** — una longitud
 * necesita unidad salvo el cero—, así que el bloque entero se descarta y
 * **todas las utilidades `desktop:` de las seis rutas dejan de aplicar**. El
 * layout de escritorio de la app completa desaparece y la suite sale
 * `1404 passed`. Con `em` no desaparece: aplica a ~16 veces el ancho pedido, o
 * sea nunca en una pantalla real. Los dos desenlaces son silenciosos.
 *
 * La comprobación es `isAbsolutePxLength` de `shared/ui/testing/css-tokens.ts`,
 * que es donde está escrito **a qué tokens se les puede exigir unidad y a
 * cuáles no**. Un breakpoint es una longitud: entra de lleno en el criterio.
 *
 * Se lee por parámetro `css` en vez de cerrar sobre `GLOBALS_CSS` para que el
 * control positivo de abajo pueda correr **esta misma función** contra copias
 * mutadas del CSS real. Un control que sólo se corre en la dirección que ya
 * funcionaba no es un control positivo — ésa fue la causa del B2.
 */
function lengthIn(css: string, name: string): number {
  const value = declarationIn(css, name);
  if (!isAbsolutePxLength(value)) {
    throw new Error(
      `El breakpoint ${name} vale "${value}", que no es una longitud absoluta en ` +
        `píxeles. Sin unidad la media query es inválida y se descarta entera (adiós a ` +
        `todas las utilidades de esa variante); con una unidad relativa se enciende a ` +
        `un ancho que no es el pedido. Las dos cosas son silenciosas (deuda 158).`,
    );
  }
  return Number.parseFloat(value);
}

/**
 * La comparación que hace el gate, extraída para poder correrla contra un CSS
 * que no sea el real. El `it` de verdad la llama con `GLOBALS_CSS`; el control
 * positivo, con las mutaciones.
 */
function expectPairAgrees(css: string, suffix: string): void {
  expect(lengthIn(css, `--breakpoint-${suffix}`)).toBe(
    lengthIn(css, `--bp-${suffix}`),
  );
}

/**
 * Copia del CSS con el valor de UN token sustituido. La guardia no es
 * decorativa: si el patrón no casara, la mutación sería un no-op y la dirección
 * "sigue verde con px" pasaría **por accidente**, que es exactamente cómo un
 * control positivo miente.
 */
function withValue(css: string, name: string, value: string): string {
  const pattern = new RegExp(String.raw`^(\s*${name}\s*:\s*)[^;]+;`, "m");
  if (!pattern.test(css)) {
    throw new Error(`No se pudo mutar ${name}: el patrón no casa con el CSS`);
  }
  return css.replace(pattern, `$1${value};`);
}

/** Token de LECTURA: lo consultan los componentes con `matchMedia`. */
const READ_TOKENS = declaredSuffixes("bp");
/** ALIAS de Tailwind: genera las variantes responsive. Debe ser literal. */
const VARIANT_TOKENS = declaredSuffixes("breakpoint");

describe("el descubrimiento de pares no está roto", () => {
  /**
   * Sin esto, una expresión que dejara de casar devolvería dos listas vacías,
   * que son iguales entre sí y con cero comparaciones que hacer: verde con el
   * guardrail apagado. Los cuatro nombres se escriben a mano **aquí y sólo
   * aquí**, porque en este `it` el literal ES el inventario que se protege.
   */
  it("encuentra los cuatro anchos declarados hoy, en los dos namespaces", () => {
    expect(READ_TOKENS).toEqual(["archive", "desktop", "mobile", "tablet"]);
    expect(VARIANT_TOKENS).toEqual(["archive", "desktop", "mobile", "tablet"]);
  });
});

describe("cada ancho está declarado en los DOS namespaces", () => {
  /**
   * Comparación de conjuntos, no `toContain`: falla igual si sobra un alias sin
   * token de lectura que si falta el alias de un token. Un `--bp-*` huérfano
   * deja a su componente sin variante con la que pintar el hueco; un
   * `--breakpoint-*` huérfano genera una variante que ningún componente puede
   * consultar en runtime.
   */
  it("los dos namespaces declaran exactamente los mismos anchos", () => {
    expect(VARIANT_TOKENS).toEqual(READ_TOKENS);
  });
});

describe("los dos juegos de breakpoints declaran el mismo ancho", () => {
  for (const suffix of READ_TOKENS) {
    it(`--breakpoint-${suffix} vale lo mismo que --bp-${suffix}`, () => {
      expectPairAgrees(GLOBALS_CSS, suffix);
    });
  }
});

/**
 * CONTROL POSITIVO DE LA UNIDAD (deuda 158).
 *
 * Lo que hay que demostrar **no** es que `isAbsolutePxLength` funcione —eso ya
 * está probado donde vive—, sino que **este gate la está usando de verdad**. Por
 * eso los tres tests de abajo llaman a `expectPairAgrees`, que es la MISMA
 * función que ejecuta el `it` real, sólo que contra una copia mutada del
 * `globals.css` de verdad.
 *
 * Y se corre en las cuatro direcciones, no en la que ya funcionaba: sin unidad,
 * con `em`, con `rem` y con el `px` bueno. Ésa fue la lección del bloqueante B2
 * — un control positivo corrido en una sola dirección la daba por buena y la
 * suite entera salía verde con la pantalla rota.
 *
 * Además se muta **cada uno de los pares descubiertos y en los dos namespaces**,
 * no sólo `--breakpoint-desktop`: si mañana un par se lee con otro camino que se
 * saltase la comprobación, este bloque lo caza.
 */
describe("control positivo: el gate se pone ROJO si a un breakpoint le falta su unidad de píxeles", () => {
  const NAMESPACES = ["--breakpoint", "--bp"];

  /**
   * El número de un token, **sin su unidad**, para fabricar mutantes. Se saca
   * quitando el sufijo del texto y no llamando a `lengthIn`: si el mutante se
   * construyera con el lector estricto, las cuatro direcciones dependerían de
   * que el CSS real ya estuviera bien y la de "sigue verde con px" no probaría
   * nada por su cuenta.
   */
  function bareNumber(token: string): string {
    return declarationIn(GLOBALS_CSS, token).replace(/[a-z%]+$/i, "");
  }

  /**
   * El par entero reescrito con el MISMO valor en los dos namespaces.
   *
   * Se muta el par completo, y no un token suelto, para que el único motivo
   * posible de fallo sea **la unidad**: con los dos lados escritos igual, la
   * comparación numérica cuadra y el gate viejo —el de `Number.parseFloat` a
   * secas— habría salido verde con las tres formas.
   */
  function pairWritten(suffix: string, unit: string): string {
    return NAMESPACES.reduce((css, namespace) => {
      const token = `${namespace}-${suffix}`;
      return withValue(css, token, `${bareNumber(token)}${unit}`);
    }, GLOBALS_CSS);
  }

  it("un ancho SIN UNIDAD pone el gate en rojo (media query inválida: la variante entera deja de existir)", () => {
    for (const suffix of READ_TOKENS) {
      expect(
        () => expectPairAgrees(pairWritten(suffix, ""), suffix),
        `con el par ${suffix} escrito sin unidad el gate TIENE que caer`,
      ).toThrow();
    }
  });

  it("un ancho en UNIDADES RELATIVAS pone el gate en rojo (se enciende a ~16 veces el ancho pedido)", () => {
    for (const suffix of READ_TOKENS) {
      for (const unit of ["em", "rem"]) {
        expect(
          () => expectPairAgrees(pairWritten(suffix, unit), suffix),
          `con el par ${suffix} escrito en ${unit} el gate TIENE que caer`,
        ).toThrow();
      }
    }
  });

  it("y sigue VERDE con el mismo ancho escrito en píxeles", () => {
    for (const suffix of READ_TOKENS) {
      expect(
        () => expectPairAgrees(pairWritten(suffix, "px"), suffix),
        `con el par ${suffix} escrito en px el gate tiene que SEGUIR pasando`,
      ).not.toThrow();
    }
  });
});
