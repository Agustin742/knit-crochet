import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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

function length(name: string): number {
  const match = GLOBALS_CSS.match(
    new RegExp(String.raw`^\s*${name}\s*:\s*([^;]+);`, "m"),
  );
  const value = match?.[1]?.trim();
  if (value === undefined) {
    throw new Error(`El token ${name} no está declarado en globals.css`);
  }
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) {
    throw new Error(`El token ${name} no es una longitud: ${value}`);
  }
  return amount;
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
      expect(length(`--breakpoint-${suffix}`)).toBe(length(`--bp-${suffix}`));
    });
  }
});
