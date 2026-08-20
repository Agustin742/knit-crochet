import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { isAbsolutePxLength } from "../../testing/css-tokens";
import {
  compileGlobalsCss,
  emitsRule,
  extractClassNames,
  rulesFor,
  tokensIn,
  usesToken,
  writtenClassAttributes,
} from "../../testing/class-names-from-source";

/**
 * GATE DE LA ENMIENDA E13 (a) + (d) — LA COLUMNA DE CONTENIDO DEL CAPARAZÓN.
 *
 * **Por qué existe.** E13(d) lo dice sin rodeos: *"sin gate, E13 no se considera
 * implementada, y el gate tiene que llegar al CSS compilado, no quedarse en los
 * nombres de clase"*. Antes de este archivo **se podía borrar el contenedor
 * entero y la suite salía verde**, porque ningún test del repo medía ancho:
 * `happy-dom` no maqueta, `axe` no mide píxeles y los tests de comportamiento
 * leen roles. Es la lección de E12(e) y de la deuda 146 aplicada al caparazón.
 *
 * **Qué asegura, en tres capas:**
 *
 * 1. El **token** existe, es una longitud, cae en la rejilla de espaciado y
 *    cuadra con la derivación escrita en `globals.css`. Un tope elegido a ojo no
 *    pasa de acá.
 * 2. El **contenedor existe en el fuente del caparazón** y las clases que
 *    escribe llegan al CSS compilado: centrado, crecimiento y tope. Una utilidad
 *    que Tailwind no genera es una cadena inerte en el atributo — la pantalla
 *    simplemente no tiene ese estilo, y nada avisa.
 * 3. El tope que la regla aplica es **el token**, y lo aplica **sin condición**
 *    (fuera de cualquier consulta de medios): un tope que sólo valiera a partir
 *    de cierto ancho no acotaría nada donde hace falta.
 *
 * La técnica de barrido está en `shared/ui/testing/class-names-from-source.ts`,
 * que es la de la deuda 146 subida a pieza compartida; su porqué está escrito
 * ahí. Acá sólo vive lo que es propio del caparazón.
 *
 * **Ni un nombre de clase aparece literal en este archivo**, tampoco en la
 * prosa: Tailwind escanea los tests y una utilidad citada de ejemplo se
 * convierte en CSS de producción. Lo que sí se escribe al literal son **nombres
 * de propiedad CSS**, que no son candidatos a clase.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const APP_SHELL = fileURLToPath(new URL("./AppShell.tsx", import.meta.url));

const GLOBALS_CSS = readFileSync(
  fileURLToPath(new URL("../../../../app/globals.css", import.meta.url)),
  "utf8",
);

/** El token que fija el tope. No es una clase: es el nombre de la variable. */
const CONTENT_MAX = "--content-max-inline";

/**
 * Las tres fuentes externas que el caparazón puede meter en un atributo de
 * clase: la prop que le pasa quien lo monta y el ayudante de fusión del design
 * system (que aparece como identificador y como llamada). La lista se compara
 * **exacta**: una fuente nueva pone el gate en rojo en vez de perderse.
 */
const EXTERNAL_SOURCES = ["cn", "className"];

/** Propiedades CSS que se leen del compilado. No son candidatos a clase. */
const MAX_WIDTH = "max-width";
const MARGIN_INLINE = "margin-inline";

function tokenValue(name: string): string {
  const match = GLOBALS_CSS.match(
    new RegExp(String.raw`^\s*${name}:\s*([^;]+);`, "m"),
  );
  const value = match?.[1];
  if (value === undefined) {
    throw new Error(`El token ${name} no está declarado en globals.css`);
  }
  return value.trim();
}


/**
 * ¿`globals.css` declara este token? Se pregunta por el nombre **entero**
 * seguido de sus dos puntos, así que un nombre con una letra de más no cuela por
 * ser el otro un prefijo suyo — que es exactamente el verde falso de la ronda 1.
 */
function isDeclared(name: string): boolean {
  return new RegExp(String.raw`^\s*${name}:`, "m").test(GLOBALS_CSS);
}

/**
 * El valor de un token **que se consume como longitud**, ya comprobado de que
 * lleve su unidad.
 *
 * **RONDA 3 — antes esto salía verde con el tope sin efecto** (bloqueante B2).
 * Sólo hacía `Number.parseFloat`, que **descarta el sufijo en silencio**: para él
 * `1040`, `1040px` y `1040em` son el mismo número, así que la derivación cuadraba
 * con los tres y la **suite entera** —los 1403 tests— pasaba con
 * `--content-max-inline: 1040`. En el navegador eso no es una longitud válida:
 * `max-width` cae a `none` y **no hay tope**, o sea la pantalla otra vez en el
 * defecto que E13 vino a arreglar. El leader lo vio en pantalla, con el
 * contenedor llegando al borde de la ventana, mientras el reviewer corría la
 * mutación.
 *
 * **Lo que lo volvía inminente:** la **deuda 156**, fichada en la ronda 1, dice
 * que el valor se eligió sin ver la pantalla y que corregirlo es *"una línea de
 * `globals.css`"*. O sea que **la próxima edición prevista de este repo es justo
 * la que el gate no sabía vigilar**.
 *
 * El comprobador es genérico a propósito, así que de paso protege a `--space-*` y
 * a `--bp-tablet`, que alimentan la misma derivación. El criterio de a qué
 * tokens se les puede exigir unidad —y a cuáles no— está escrito en
 * `isAbsolutePxLength`.
 */
function tokenLength(name: string): number {
  const value = tokenValue(name);
  if (!isAbsolutePxLength(value)) {
    throw new Error(
      `El token ${name} vale "${value}", que no es una longitud absoluta en píxeles. ` +
        `Un número sin unidad hace que la declaración sea inválida en el navegador y la ` +
        `propiedad caiga a su valor inicial; otra unidad da un tope que no es el pedido. ` +
        `Las dos cosas dejan la pantalla sin acotar con la suite en verde (bloqueante B2).`,
    );
  }
  return Number.parseFloat(value);
}

const EXTRACTED = extractClassNames(APP_SHELL);

let css = "";

beforeAll(async () => {
  css = await compileGlobalsCss();
}, COMPILE_TIMEOUT_MS);

describe("el tope de ancho del contenido es un token derivado, no un número a ojo", () => {
  /**
   * **La derivación, rehecha con los mismos tokens que la escribieron.**
   *
   * La composición más ancha que el contenido sirve es una rejilla de TRES
   * columnas de tarjeta, y a esa columna se le pide no crecer más allá del ancho
   * de ventana más estrecho en el que la app se dibuja entera —320px, que fija
   * la enmienda E11(b) de este mismo RFC ("la banda propia rige en TODOS los
   * anchos, de 320px a desktop")—. El hueco entre columnas y el relleno lateral
   * de la página salen de la escala.
   *
   * Este test no dice "el número es bonito": dice **de dónde sale**. Si alguien
   * mueve el tope, tiene que rehacer la derivación a conciencia en vez de
   * empujar el número hasta que la pantalla le guste.
   */
  it("cuadra con las tres columnas de tarjeta a su ancho máximo", () => {
    /** Ancho de ventana más estrecho que la app soporta (RFC-01 §3, E11 b). */
    const NARROWEST_SUPPORTED_VIEWPORT = 320;
    const COLUMNS = 3;

    const gap = tokenLength("--space-4");
    const pagePadding = tokenLength("--space-6");
    const expected =
      COLUMNS * NARROWEST_SUPPORTED_VIEWPORT +
      (COLUMNS - 1) * gap +
      2 * pagePadding;

    /* RONDA 3: se compara el valor CRUDO, con su unidad, y no sólo el número.
       Comparar números dejaba pasar el token sin unidad y el token con otra
       unidad —la lectura de coma flotante descarta el sufijo en silencio—, y con
       cualquiera de los dos la suite entera salía verde con la pantalla sin
       acotar (bloqueante B2). `tokenLength` ya rechaza los dos casos por su
       cuenta; esto lo vuelve a decir en el sitio donde se lee el número, para
       que la protección no dependa de un solo punto. */
    expect(tokenValue(CONTENT_MAX)).toBe(`${expected}px`);
    expect(tokenLength(CONTENT_MAX)).toBe(expected);
  });

  /**
   * **RONDA 3, bloqueante B2.** Un tope declarado sin unidad no es una longitud
   * válida: la declaración se descarta en el navegador, `max-width` cae a su
   * valor inicial y **no hay tope**. Uno declarado en unidades relativas a la
   * tipografía sí es válido pero vale ~16 veces lo pedido, o sea tampoco acota.
   * Los dos desenlaces son el mismo defecto que E13 vino a arreglar, y los dos
   * pasaban con la suite completa en verde.
   *
   * Va como test propio y con nombre —además de la comprobación dentro de
   * `tokenLength`— porque **la deuda 156 planifica editar exactamente esta
   * línea** de `globals.css` en cuanto el leader haga su verificación en
   * pantalla. Cuando eso pase, el rojo tiene que decir qué se rompió, no
   * esconderse dentro de una excepción de un ayudante.
   */
  it("el tope se declara con unidad de longitud, no con un número pelado", () => {
    const raw = tokenValue(CONTENT_MAX);

    expect(
      isAbsolutePxLength(raw),
      `el tope vale "${raw}": sin una unidad de longitud absoluta el navegador descarta la declaración y la columna se queda sin acotar`,
    ).toBe(true);
  });

  /** "Sobre la rejilla de espaciado existente" (E13 a), comprobado y no supuesto. */
  it("cae exacto en la rejilla de espaciado de la app", () => {
    const step = tokenLength("--space-1");
    expect(tokenLength(CONTENT_MAX) % step).toBe(0);
  });

  /**
   * Un tope por debajo del ancho al que la app todavía está reacomodando su
   * maqueta apretaría el contenido justo donde las variantes están trabajando.
   * El tope existe para frenar el crecimiento arriba, no para estrechar abajo.
   */
  it("no muerde por debajo del ancho de tablet", () => {
    expect(tokenLength(CONTENT_MAX)).toBeGreaterThan(tokenLength("--bp-tablet"));
  });
});

describe("el barrido de clases del caparazón no se deja nada", () => {
  /** Un resolvedor roto devuelve cero clases, o sea verde perpetuo. */
  it("encuentra clases y atributos en el caparazón", () => {
    expect(EXTRACTED.attributes).toBeGreaterThan(2);
    expect(EXTRACTED.classes.length).toBeGreaterThan(5);
  });

  it("ve tantos atributos de clase como hay escritos en el fuente", () => {
    expect(EXTRACTED.attributes + EXTRACTED.objectProperties).toBe(
      writtenClassAttributes(APP_SHELL),
    );
  });

  it("no queda ninguna forma de expresión sin seguir ni sin denunciar", () => {
    expect(EXTRACTED.unhandled).toEqual([]);
  });

  it("ningún atributo de clase llega por un camino que el barrido no atraviesa", () => {
    expect(EXTRACTED.bypassed).toEqual([]);
  });

  it("no resuelve ninguna clase por un nombre pisado ni reasignado", () => {
    expect(EXTRACTED.ambiguous).toEqual([]);
  });

  it("sólo deja sin resolver lo que se declara fuera del archivo", () => {
    expect([...EXTRACTED.external].sort()).toEqual([...EXTERNAL_SOURCES].sort());
  });
});

describe("la columna de contenido llega al CSS compilado", () => {
  it("Tailwind genera todas las utilidades del caparazón", () => {
    const inert = EXTRACTED.classes.filter(
      (className) => !emitsRule(css, className),
    );

    expect(
      inert,
      "estas clases del caparazón no generan ninguna regla: se quedan inertes en el atributo",
    ).toEqual([]);
  });

  /**
   * **El corazón del gate.** No basta con que exista una utilidad de tope: tiene
   * que aplicar **este** token. Buscar el tope entre las clases REALES del
   * caparazón —y no comprobar que una clase concreta esté presente— es lo que
   * hace que borrar el contenedor ponga el test en rojo.
   *
   * **RONDA 2 — este aserto salía VERDE con el tope apuntando a la nada.**
   * Comparaba el nombre del token por SUBCADENA, así que una utilidad escrita
   * con un token de **una letra de más** —que en el navegador es una variable
   * sin declarar, o sea `max-width` cayendo a su valor inicial y NINGÚN tope—
   * pasaba el filtro. Lo midió el reviewer mutando en las dos direcciones: la
   * subcadena caza el token **recortado** y no caza el **alargado**. Ahora la
   * comparación es por **igualdad de nombre entero** (`usesToken`), que no tiene
   * dirección buena ni mala.
   */
  it("una clase del caparazón acota el ancho con el token, y sin condición", () => {
    const capping = EXTRACTED.classes.flatMap((className) =>
      rulesFor(css, className)
        .filter((rule) =>
          rule.declarations.some(
            (declaration) =>
              declaration.property === MAX_WIDTH &&
              usesToken(declaration.value, CONTENT_MAX),
          ),
        )
        .map((rule) => ({ className, conditions: rule.conditions })),
    );

    expect(
      capping.length,
      "ninguna clase del caparazón aplica el tope de ancho del contenido: la columna no existe, o su utilidad consume otro token",
    ).toBeGreaterThan(0);

    /* Sin condición: un tope metido dentro de una consulta de medios dejaría el
       contenido suelto justo por debajo de ese ancho, y las variantes son
       min-width (enmienda E12 b), así que el hueco quedaría abajo y no arriba. */
    for (const entry of capping) {
      expect(entry.conditions, entry.className).toEqual([]);
    }
  });

  /**
   * **LA OTRA MITAD DE LA PINZA, y la que mata la CLASE de fallo en vez de este
   * caso.** El aserto de arriba dice "hay una utilidad que consume el token
   * bueno"; éste dice "**ninguna** utilidad de tope del caparazón consume un
   * token que no exista". Son cosas distintas: se puede tener las dos
   * utilidades, la buena y una con una errata, y sólo el segundo aserto lo ve.
   *
   * Y es el que sobrevive a que mañana cambie el nombre del token: no compara
   * contra un nombre escrito acá, compara contra **lo que `globals.css`
   * declara**. Una variable sin declarar no es un error de CSS que rompa nada
   * ruidosamente — es `max-width: none`, silencio absoluto y pantalla sin tope.
   */
  it("ningún tope del caparazón apunta a un token que no exista", () => {
    const referenced = new Set<string>();
    for (const className of EXTRACTED.classes) {
      for (const rule of rulesFor(css, className)) {
        for (const declaration of rule.declarations) {
          if (declaration.property !== MAX_WIDTH) {
            continue;
          }
          for (const token of tokensIn(declaration.value)) {
            referenced.add(token);
          }
        }
      }
    }

    expect(
      [...referenced],
      "el caparazón no consume ningún token en un tope de ancho: no hay nada que comprobar, o sea que el aserto anterior estaba midiendo aire",
    ).not.toEqual([]);

    const undeclared = [...referenced].filter((token) => !isDeclared(token));

    expect(
      undeclared,
      "estos tokens los usa un tope del caparazón y NO están declarados en globals.css: en el navegador la propiedad cae a su valor inicial y no hay tope",
    ).toEqual([]);
  });

  /**
   * Acotar sin centrar deja la columna pegada a un borde con todo el aire del
   * otro lado, que se lee peor que no acotar. Las dos mitades de la decisión
   * —tope y centrado— se comprueban por separado a propósito: quitar una y
   * dejar la otra es un fallo real y silencioso.
   */
  it("una clase del caparazón centra esa columna", () => {
    const centring = EXTRACTED.classes.filter((className) =>
      rulesFor(css, className).some((rule) =>
        rule.declarations.some(
          (declaration) =>
            declaration.property === MARGIN_INLINE &&
            declaration.value.trim() === "auto",
        ),
      ),
    );

    expect(
      centring,
      "el caparazón no centra su columna de contenido: sin esto el tope deja todo el aire de un solo lado",
    ).not.toEqual([]);
  });
});
