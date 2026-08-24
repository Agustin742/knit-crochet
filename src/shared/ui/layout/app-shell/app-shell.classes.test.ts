import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { isAbsolutePxLength } from "../../testing/css-tokens";
import {
  compileCss,
  compileGlobalsCss,
  declarationsOf,
  emitsRule,
  extractClassNames,
  globalsCssSource,
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

/**
 * Selectores que alcanzan al caparazón desde la raíz del documento. Un token de
 * tope declarado bajo otro selector existiría sólo donde ESE selector aplicara,
 * que es la misma clase de trampa que la condición.
 */
const ROOT_SELECTOR = /(^|,)\s*(:root|:host|html)\s*(,|$)/;

/**
 * Las declaraciones de un token que **de verdad valen** para el caparazón: las
 * que el compilador emite en la raíz y **sin ninguna condición** encima.
 *
 * **T6, deuda 158 (mitad hermana). Antes esto se preguntaba al TEXTO de
 * `globals.css` con una expresión regular de línea**, y eso responde a otra
 * pregunta: si el nombre está ESCRITO, no si está declarado en un ámbito que
 * aplique. Medido en esta misma sesión: sacando el tope de `@theme` y metiéndolo
 * dentro de `@media (min-width: 5000px)`, este archivo salía **`14 passed`** y la
 * suite entera **`1416 passed`** con el token sin definir en ninguna pantalla
 * real — o sea `max-width: var(--content-max-inline)` inválido, `max-width: none`
 * y la columna de contenido **sin tope**. Es el desenlace del bloqueante B2 por
 * otra puerta, y dejaba sin red lo único que el usuario verificó en pantalla.
 *
 * La pregunta buena se la sabe el **compilado**, que conserva las reglas-arroba
 * alrededor de la declaración: es la misma comprobación que este archivo ya hace
 * para la utilidad (`entry.conditions`), apuntada al otro lado. La regex no se
 * endurece: se abandona.
 */
function effectiveDeclarationsIn(compiled: string, name: string) {
  return declarationsOf(compiled, name).filter(
    (entry) =>
      entry.conditions.length === 0 && ROOT_SELECTOR.test(entry.selector),
  );
}

function effectiveDeclarations(name: string) {
  return effectiveDeclarationsIn(css, name);
}

/**
 * ¿El token está declarado **donde aplica**? El nombre se compara entero, que es
 * lo que ya hacía falta contra el verde falso de la ronda 1 (un nombre con una
 * letra de más colaba por ser el bueno un prefijo suyo): `declarationsOf`
 * compara la propiedad por igualdad, no por subcadena, así que esa protección se
 * conserva y encima deja de depender de una frontera escrita a mano.
 */
function isDeclaredIn(compiled: string, name: string): boolean {
  return effectiveDeclarationsIn(compiled, name).length > 0;
}

function isDeclared(name: string): boolean {
  return isDeclaredIn(css, name);
}

function tokenValue(name: string): string {
  const declarations = effectiveDeclarations(name);
  const last = declarations.at(-1);
  if (last === undefined) {
    throw new Error(
      `El token ${name} no está declarado en ninguna regla de raíz SIN condiciones. ` +
        `Escrito en el archivo puede estar; lo que no está es en un ámbito que aplique, ` +
        `y una variable que no existe deja la propiedad en su valor inicial sin avisar.`,
    );
  }
  /* La última gana: es lo que hace la cascada cuando el mismo token se declara
     dos veces en el mismo ámbito. */
  return last.value.trim();
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

/**
 * Los tokens que las clases del caparazón consumen en un **tope de ancho**,
 * leídos del CSS compilado que se le pase.
 *
 * Va parametrizado por el compilado —y no cerrado sobre `css`— para que el
 * control positivo de la deuda 158 pueda correr **esta misma comprobación**
 * contra un `globals.css` mutado. Un control positivo que sólo se corre en la
 * dirección que ya funcionaba no es un control positivo.
 */
function capTokens(compiled: string): string[] {
  const referenced = new Set<string>();
  for (const className of EXTRACTED.classes) {
    for (const rule of rulesFor(compiled, className)) {
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
  return [...referenced];
}

/** De esos, los que NO están declarados en un ámbito que aplique. */
function undeclaredCapTokens(compiled: string): string[] {
  return capTokens(compiled).filter((token) => !isDeclaredIn(compiled, token));
}

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
    expect(
      capTokens(css),
      "el caparazón no consume ningún token en un tope de ancho: no hay nada que comprobar, o sea que el aserto anterior estaba midiendo aire",
    ).not.toEqual([]);

    expect(
      undeclaredCapTokens(css),
      "estos tokens los usa un tope del caparazón y NO están declarados en un ámbito que aplique: en el navegador la propiedad cae a su valor inicial y no hay tope",
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

/**
 * CONTROL POSITIVO DEL ÁMBITO DEL TOKEN (deuda 158, T6).
 *
 * Lo que hay que demostrar no es que `declarationsOf` sepa leer condiciones,
 * sino que **este gate se pone rojo** cuando el tope deja de existir donde hace
 * falta. Por eso se compila un `globals.css` **mutado de verdad** —con el mismo
 * compilador de la app— y se le pasa a `undeclaredCapTokens`, que es la MISMA
 * función que ejecuta el aserto real de arriba.
 *
 * La mutación es exactamente la que se midió en T4 y que salía **verde** con el
 * gate anterior: el token se saca de `@theme` y se declara sólo dentro de una
 * consulta de medios que ninguna pantalla real cumple. En el navegador, por
 * debajo de esa condición la variable **no existe**, `max-width: var(...)` es
 * inválido y la columna se queda sin tope — el defecto que E13 vino a arreglar y
 * lo único que el usuario verificó en pantalla.
 *
 * Las DOS direcciones, que es la lección del bloqueante B2: rojo con el token
 * condicionado y verde con el token donde está hoy.
 */
describe("control positivo: el tope tiene que estar declarado donde APLICA", () => {
  /** Ancho que ninguna ventana real alcanza: la condición nunca se cumple. */
  const UNREACHABLE_WIDTH = "5000px";

  let conditional = "";

  beforeAll(async () => {
    const source = globalsCssSource();
    const declaration = new RegExp(
      String.raw`^[^\S\n]*${CONTENT_MAX}:\s*([^;]+);`,
      "m",
    );
    const match = source.match(declaration);
    if (match === null) {
      throw new Error(
        `No se pudo fabricar la mutación: ${CONTENT_MAX} no está declarado en el texto`,
      );
    }
    /* Se saca de donde está y se vuelve a declarar bajo una condición. La
       guardia de arriba no es decorativa: una mutación que no se aplica deja la
       dirección verde pasando por accidente, que es como un control positivo
       miente. */
    conditional = await compileCss(
      `${source.replace(declaration, "")}
@media (min-width: ${UNREACHABLE_WIDTH}) {
  :root {
    ${CONTENT_MAX}: ${match[1] as string};
  }
}
`,
    );
  }, COMPILE_TIMEOUT_MS);

  it("con el token metido en una consulta de medios, el gate se pone ROJO", () => {
    /* El compilado sigue trayendo la utilidad y su declaración de tope: lo único
       que cambia es dónde vive el token. Si esto fallara, la mutación no estaría
       midiendo lo que dice medir. */
    expect(capTokens(conditional)).toEqual(capTokens(css));

    expect(
      undeclaredCapTokens(conditional),
      "el tope declarado sólo bajo una condición TIENE que caer: por debajo de esa condición la variable no existe y max-width cae a none",
    ).toEqual([CONTENT_MAX]);
  });

  it("y con el token declarado sin condición, como está hoy, sigue VERDE", () => {
    expect(undeclaredCapTokens(css)).toEqual([]);
    expect(isDeclared(CONTENT_MAX)).toBe(true);
  });

  /**
   * La otra mitad del ámbito: un token declarado bajo un selector que no alcanza
   * al caparazón tampoco existe para él, aunque no haya ninguna condición
   * encima. Es la misma trampa con otra forma.
   */
  it("y también se pone ROJO si el token se declara bajo un selector que no es la raíz", async () => {
    const source = globalsCssSource();
    const declaration = new RegExp(
      String.raw`^[^\S\n]*${CONTENT_MAX}:\s*([^;]+);`,
      "m",
    );
    const match = source.match(declaration);
    if (match === null) {
      throw new Error("No se pudo fabricar la mutación de selector");
    }
    const scoped = await compileCss(
      `${source.replace(declaration, "")}
[data-t158-alcance] {
  ${CONTENT_MAX}: ${match[1] as string};
}
`,
    );

    expect(undeclaredCapTokens(scoped)).toEqual([CONTENT_MAX]);
  }, COMPILE_TIMEOUT_MS);
});
