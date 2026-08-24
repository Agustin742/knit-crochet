import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { isAbsolutePxLength } from "../../testing/css-tokens";
import { NAV_ITEMS } from "../nav-items";

/**
 * Contrato de tokens del archivero en su modelo fichero (RFC-01 §3 D4).
 *
 * Los invariantes de D4 son geométricos y de profundidad, no de píxeles
 * renderizados: se pueden verificar leyendo los valores declarados en
 * `globals.css`. Aquí se comprueban los cuatro que se rompieron en la primera
 * versión de la feature #13 (dirección de la sombra, compensación del hover,
 * presupuesto vertical, rampa de profundidad) y, sobre todo, el que motivó esta
 * corrección: que las hojas se distingan DE VERDAD sobre el fondo oscuro.
 *
 * La referencia es blanco sobre blanco y le basta una sombra negra casi
 * transparente. Sobre el espresso de esta app eso es invisible: el fondo ya
 * tiene una luminancia relativa bajísima, así que oscurecerlo con negro tiene
 * un techo de contraste de ~1.4:1 por mucha opacidad que se le ponga. Por eso
 * la profundidad se reparte entre tres pistas y cada una se mide con la misma
 * fórmula de luminancia relativa que usa WCAG.
 */
const GLOBALS_CSS = readFileSync(
  fileURLToPath(new URL("../../../../app/globals.css", import.meta.url)),
  "utf8",
);

interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

function declarationIn(css: string, name: string): string {
  const match = css.match(new RegExp(String.raw`^\s*${name}:\s*([^;]+);`, "m"));
  const value = match?.[1];
  if (value === undefined) {
    throw new Error(`El token ${name} no está declarado en globals.css`);
  }
  return value.trim().replace(/\s+/g, " ");
}

function declaration(name: string): string {
  return declarationIn(GLOBALS_CSS, name);
}

/** Sigue la cadena de referencias hasta el valor literal. */
function resolvedIn(css: string, name: string): string {
  const value = declarationIn(css, name);
  const reference = value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];
  return reference ? resolvedIn(css, reference) : value;
}

function resolved(name: string): string {
  return resolvedIn(GLOBALS_CSS, name);
}

/**
 * Los tokens que este gate ha leído con cada lector, apuntados por el propio
 * lector según los lee. Se descubren en vez de enumerarse a mano: una lista
 * escrita aquí se queda atrás en cuanto un `it` consuma un token más, y el
 * control positivo pasaría a vigilar menos de lo que el gate usa sin que nadie
 * lo note (patrón de las deudas 40/43/71).
 */
const LENGTH_TOKENS_READ = new Set<string>();
const UNITLESS_TOKENS_READ = new Set<string>();

/**
 * Una LONGITUD del presupuesto del archivero, con la unidad comprobada
 * (deuda 158).
 *
 * ANTES ERA LA LECTURA PERMISIVA QUE DEJÓ PASAR EL BLOQUEANTE B2: hacía
 * `Number.parseFloat` y sólo rechazaba si salía un no-número. `Number.parseFloat`
 * **descarta el sufijo en silencio**, así que para ella `104`, `104px` y `104em`
 * son el mismo número, y **el presupuesto vertical y horizontal entero de este
 * archivo cuadraba igual con los tres**.
 *
 * Lo que se calcula aquí es si seis hojas más una pestaña caben en el alto del
 * cajón y si la etiqueta más larga entra en su columna. Si a uno de esos tokens
 * se le cae la unidad, en el navegador la declaración es inválida y la propiedad
 * cae a su valor inicial: el alto del cajón, el canto de la hoja o el margen del
 * carril **no son** los que la cuenta supone, y el gate sigue diciendo que todo
 * entra. Con `em` la cuenta se hace con un número y la pantalla con otro ~16
 * veces mayor. Los dos son el defecto que este gate existe para impedir, con la
 * suite en verde.
 *
 * Toma el `css` por parámetro para que el control positivo pueda correr **las
 * derivaciones reales de este gate** contra copias mutadas del CSS de verdad. Un
 * control positivo que sólo se corre en la dirección que ya funcionaba no es un
 * control positivo: ésa fue la causa del B2.
 */
function lengthIn(css: string, name: string): number {
  LENGTH_TOKENS_READ.add(name);
  const value = resolvedIn(css, name);
  if (!isAbsolutePxLength(value)) {
    throw new Error(
      `El token ${name} vale "${value}", que no es una longitud absoluta en ` +
        `píxeles. Sin unidad la declaración es inválida en el navegador y la propiedad ` +
        `cae a su valor inicial; con una unidad relativa la geometría real no es la que ` +
        `se calcula aquí. Las dos cosas dejan el presupuesto sin vigilar (deuda 158).`,
    );
  }
  return Number.parseFloat(value);
}

function length(name: string): number {
  return lengthIn(GLOBALS_CSS, name);
}

/**
 * Un número que **NO lleva unidad y no debe llevarla**: el interlineado
 * (`--leading-tight`, una proporción) y la profundidad de apilamiento
 * (`--z-nav-*`).
 *
 * Existe porque el criterio de `isAbsolutePxLength` está escrito y hay que
 * respetarlo: la unidad se le exige a lo que se consume **como longitud**, y
 * exigírsela a una proporción o a un `z-index` sería inventar un error donde no
 * lo hay. Pero la lectura tampoco puede quedarse permisiva, porque el fallo
 * simétrico es igual de silencioso: un `--leading-tight: 1.1px` o un
 * `--z-nav-band: 7px` son declaraciones **inválidas** en el navegador —esas dos
 * propiedades no admiten longitud de esa forma— y `Number.parseFloat` las leería
 * como 1.1 y 7 sin pestañear, dejando la cuenta del wordmark y la rampa de
 * profundidad verificando algo que la pantalla no hace.
 */
function unitlessIn(css: string, name: string): number {
  UNITLESS_TOKENS_READ.add(name);
  const value = resolvedIn(css, name);
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(
      `El token ${name} vale "${value}", y se consume como número SIN unidad ` +
        `(proporción o profundidad de apilamiento). Con unidad la declaración es ` +
        `inválida y la propiedad cae a su valor inicial, mientras la cuenta de este ` +
        `gate sigue saliendo (deuda 158).`,
    );
  }
  return Number.parseFloat(value);
}

function unitless(name: string): number {
  return unitlessIn(GLOBALS_CSS, name);
}

function integer(name: string): number {
  return Math.round(unitless(name));
}

function color(value: string): Rgb {
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  const functional = value.match(/^rgba?\(([^)]+)\)$/)?.[1];
  if (functional) {
    const parts = functional.split(",").map((part) => Number(part.trim()));
    const [r = 0, g = 0, b = 0, a = 1] = parts;
    return { r, g, b, a };
  }
  throw new Error(`Color no reconocido: ${value}`);
}

function colorToken(name: string): Rgb {
  return color(resolved(name));
}

/** Composición alfa sobre una capa ya opaca. */
function over(top: Rgb, bottom: Rgb): Rgb {
  return {
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  };
}

/** Luminancia relativa (misma definición que usa el cálculo de contraste WCAG). */
function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(one: Rgb, other: Rgb): number {
  const first = luminance(one);
  const second = luminance(other);
  const high = Math.max(first, second);
  const low = Math.min(first, second);
  return (high + 0.05) / (low + 0.05);
}

const PAGE = colorToken("--bg");
const LEAF_FACE = colorToken("--nav-leaf-face");
const LEAF_EDGE = colorToken("--nav-leaf-edge");

const LEAF_SHADOW = resolved("--shadow-nav-leaf");
const SHADOW_OFFSETS = [...LEAF_SHADOW.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map(
  (match) => Number(match[1]),
);
const SHADOW_COLOR = color(
  LEAF_SHADOW.match(/rgba?\([^)]+\)/)?.[0] ?? LEAF_SHADOW,
);

describe("geometría del fichero (D4)", () => {
  it("la sombra de la hoja apunta hacia ARRIBA (desplazamiento vertical negativo)", () => {
    const verticalOffset = SHADOW_OFFSETS[1] ?? 0;
    expect(
      verticalOffset,
      `cada hoja proyecta sobre la que tiene detrás, que en pantalla queda encima: ${LEAF_SHADOW}`,
    ).toBeLessThan(0);
  });

  it("las 6 ranuras más una pestaña entran en el alto del nav", () => {
    // El presupuesto se cuenta en RANURAS, no en cantos pintados: desde E10 la
    // hoja de la ruta activa no dibuja canto (se dibujan 5, no 6) pero conserva
    // su ranura de alto, así que la cuenta es la misma con ruta activa y sin
    // ella. Si esa hoja no ocupara ranura, su pestaña y la del canto más bajo
    // quedarían al mismo nivel y la escalera del fichero arrancaría plana.
    const stack = NAV_ITEMS.length * length("--nav-leaf-height");
    expect(stack + length("--nav-tab-height")).toBeLessThanOrEqual(
      length("--nav-height"),
    );
  });

  it("la pestaña mide un objetivo táctil", () => {
    expect(length("--nav-tab-height")).toBeGreaterThanOrEqual(
      length("--touch-target"),
    );
  });

  it("la pestaña levantada no puede despegarse de su canto (E9)", () => {
    // El lift dejó de ser un desplazamiento y pasó a ser CRECIMIENTO con la
    // base anclada: la pestaña levantada mide su alto de reposo más el salto,
    // así que la zona que cubre en reposo sólo puede aumentar y no hay forma de
    // que aparezca una arista entre la pestaña y la hoja de la que sale.
    expect(length("--nav-tab-lift")).toBeGreaterThan(0);
    const lifted = declaration("--nav-tab-height-lifted");
    expect(lifted).toContain("--nav-tab-height");
    expect(lifted).toContain("--nav-tab-lift");
  });

  it("la pestaña más alta sigue dentro del nav con el hover puesto", () => {
    // La pestaña de la hoja de arriba cuelga de su canto (la ranura 6) y crece
    // hacia el techo del nav: tiene que seguir entrando levantada.
    const topTabTop =
      length("--nav-height") -
      (NAV_ITEMS.length - 1) * length("--nav-leaf-height") -
      length("--nav-tab-height") -
      length("--nav-tab-lift");
    expect(topTabTop).toBeGreaterThanOrEqual(0);
  });

  it("el wordmark entra entero por encima de la hoja más alta (E7)", () => {
    // Las hojas son full-bleed y eso no se negocia: quien se aparta es el
    // wordmark. Su caja es una línea de display más el respiro de arriba. El
    // techo del cajón son sus 6 ranuras, active la ruta que sea: la hoja
    // abierta ocupa ranura aunque no pinte canto, así que el stack no sube ni
    // baja al navegar y esta garantía no depende de la ruta.
    const wordmarkBottom =
      length("--space-2") + length("--text-xl") * unitless("--leading-tight");
    const stackTop =
      length("--nav-height") - NAV_ITEMS.length * length("--nav-leaf-height");
    expect(wordmarkBottom).toBeLessThanOrEqual(stackTop);
  });

  it("la pestaña que comparte columna con el wordmark no lo alcanza (E7)", () => {
    // Las pestañas SÍ desbordan por encima del techo del cajón, así que el
    // invariante del wordmark no basta con medirlo contra las hojas: hay que
    // medirlo contra la única pestaña que le queda debajo, la de la primera
    // página de la lista (columna 1; las demás columnas caen a la derecha del
    // wordmark y no compiten con él).
    //
    // Su peor caso es la ranura 2 y con el puntero encima: la primera página o
    // es la hoja ABIERTA —y entonces está en la ranura 1, la más baja de todas—
    // o es la primera de las cinco que se apilan encima, o sea la ranura 2.
    const worstCaseSlot = 2;
    const firstColumnTabTop =
      length("--nav-height") -
      (worstCaseSlot - 1) * length("--nav-leaf-height") -
      length("--nav-tab-height") -
      length("--nav-tab-lift");
    const wordmarkBottom =
      length("--space-2") + length("--text-xl") * unitless("--leading-tight");
    expect(firstColumnTabTop).toBeGreaterThanOrEqual(wordmarkBottom);
  });

  it("el carril lleva el mismo margen a los dos lados (sin utils, E7)", () => {
    expect(declaration("--nav-tab-inset-end")).toContain(
      "--nav-tab-inset-start",
    );
  });
});

/**
 * Enmiendas E4 y E6 de D4: la etiqueta es **grande**, y el archivero nace justo
 * en el ancho al que sus 6 pestañas entran enteras con ese tamaño
 * (`--bp-archive`); por debajo manda el `BottomNav`. Las dos cosas están
 * acopladas a propósito, y ese acoplamiento es lo que verifica este bloque a
 * partir de los MISMOS tokens que consume el componente: si alguien agranda la
 * etiqueta sin subir el ancho de nacimiento —o al revés—, esto cae.
 */
describe("presupuesto horizontal de la rampa (E4 + E6)", () => {
  /**
   * Cota SUPERIOR del avance de una mayúscula, en ems. Un test sin motor de
   * fuentes no puede medir el ancho real: se usa un valor conservador para un
   * grotesco en negrita (las mayúsculas anchas de la familia del cuerpo rondan
   * 0.72 em). Es la palanca a revisar si algún día cambia la tipografía.
   */
  const CAP_ADVANCE_EM = 0.72;
  const longestLabel = Math.max(...NAV_ITEMS.map((item) => item.label.length));

  const trackWidth =
    length("--bp-archive") -
    length("--nav-tab-inset-start") -
    length("--nav-tab-inset-end");
  const columnTextWidth =
    trackWidth / NAV_ITEMS.length - 2 * length("--nav-tab-padding-x");
  const labelWidth =
    longestLabel *
    (CAP_ADVANCE_EM * length("--text-nav-tab") + length("--tracking-label"));

  it("la etiqueta más larga entra entera en su columna a --bp-archive", () => {
    expect(labelWidth).toBeLessThanOrEqual(columnTextWidth);
  });

  it("la etiqueta es GRANDE, no una etiqueta de sistema (E6)", () => {
    expect(length("--text-nav-tab")).toBeGreaterThan(length("--text-lg") - 1);
    expect(length("--text-nav-tab")).toBeGreaterThan(length("--text-xs"));
  });

  it("los dos juegos de breakpoints declaran el mismo ancho de nacimiento", () => {
    // Las media queries no resuelven variables, así que el ancho vive dos veces
    // (el token de lectura y el alias que genera la variante responsive). Si se
    // desincronizan, el nav aparece a un ancho y la cuenta se hace con otro.
    expect(length("--breakpoint-archive")).toBe(length("--bp-archive"));
  });

  it("por debajo de ese ancho NO cabrían las 6, y por eso manda el bottom-nav", () => {
    const tabletTrack =
      length("--bp-tablet") -
      length("--nav-tab-inset-start") -
      length("--nav-tab-inset-end");
    const tabletColumn =
      tabletTrack / NAV_ITEMS.length - 2 * length("--nav-tab-padding-x");
    expect(labelWidth).toBeGreaterThan(tabletColumn);
  });
});

describe("rampa de profundidad (D4: la ranura 1 es el fondo del cajón)", () => {
  const depths = NAV_ITEMS.map((_, index) => integer(`--z-nav-leaf-${index + 1}`));

  it("hay una posición de profundidad declarada por página", () => {
    expect(depths).toHaveLength(NAV_ITEMS.length);
  });

  it("decrece estrictamente del fondo del cajón a la hoja de más arriba", () => {
    const sorted = [...depths].sort((a, b) => b - a);
    expect(depths).toEqual(sorted);
    expect(new Set(depths).size).toBe(depths.length);
  });

  it("la banda del wordmark y los utils va por delante de todas las hojas", () => {
    expect(integer("--z-nav-band")).toBeGreaterThan(Math.max(...depths));
  });
});

describe("legibilidad de las hojas sobre el fondo oscuro", () => {
  it("la cara de la hoja se distingue del tono de la página", () => {
    expect(contrast(LEAF_FACE, PAGE)).toBeGreaterThanOrEqual(1.5);
  });

  it("el filo superior separa una hoja de la siguiente", () => {
    expect(contrast(over(LEAF_EDGE, LEAF_FACE), LEAF_FACE)).toBeGreaterThanOrEqual(2.5);
  });

  it("el núcleo de la sombra oscurece la cara de forma perceptible", () => {
    expect(contrast(over(SHADOW_COLOR, LEAF_FACE), LEAF_FACE)).toBeGreaterThanOrEqual(1.5);
  });

  it("una sombra negra SOLA no bastaría: por eso la profundidad se reparte", () => {
    const opaqueBlack = { r: 0, g: 0, b: 0, a: 1 };
    expect(contrast(over(opaqueBlack, PAGE), PAGE)).toBeLessThan(1.5);
  });
});

/**
 * La pestaña de la ruta activa cae al tono de la página, con la etiqueta en
 * acento: desde E10 esa pestaña es la cara visible de la hoja ABIERTA, que se
 * continúa con el área de contenido de debajo. Estos tests son el criterio que
 * decidió dónde va el tono de página: sobre la cara de la hoja el acento no
 * llega al mínimo legible para texto normal, y sobre el tono de página sí.
 */
describe("marca de la ruta activa (E10)", () => {
  const ACCENT = colorToken("--accent");

  it("la etiqueta en acento es legible sobre la pestaña activa", () => {
    expect(contrast(ACCENT, PAGE)).toBeGreaterThanOrEqual(4.5);
  });

  it("no lo sería si la pestaña activa conservara la cara de la hoja", () => {
    expect(contrast(ACCENT, LEAF_FACE)).toBeLessThan(4.5);
  });

  it("la pestaña activa se distingue de las otras cinco", () => {
    expect(contrast(PAGE, LEAF_FACE)).toBeGreaterThanOrEqual(1.5);
  });
});

/**
 * Copia del CSS con el valor de UN token sustituido. La guardia no es
 * decorativa: si el patrón no casara, la mutación sería un no-op y la dirección
 * "sigue verde con px" pasaría **por accidente**, que es exactamente cómo un
 * control positivo miente.
 */
function withValue(css: string, name: string, value: string): string {
  const pattern = new RegExp(String.raw`^(\s*${name}:\s*)[^;]+;`, "m");
  if (!pattern.test(css)) {
    throw new Error(`No se pudo mutar ${name}: el patrón no casa con el CSS`);
  }
  return css.replace(pattern, `$1${value};`);
}

/** El número de un token, sin su unidad, para fabricar mutantes. */
function bareNumber(token: string): string {
  return resolvedIn(GLOBALS_CSS, token).replace(/[a-z%]+$/i, "");
}

/**
 * CONTROL POSITIVO DE LA UNIDAD (deuda 158).
 *
 * Lo que hay que demostrar **no** es que `isAbsolutePxLength` funcione —eso ya
 * está probado donde vive—, sino que **este gate la está usando de verdad**: los
 * mutantes se construyen sobre el `globals.css` REAL y se leen con `lengthIn` /
 * `unitlessIn`, que son los lectores por los que pasa **toda** lectura numérica
 * de este archivo (`length` y `unitless` son envoltorios de una línea sobre
 * ellos; no hay ninguna otra).
 *
 * Y se corre en las CUATRO direcciones, no sólo en la que ya funcionaba: sin
 * unidad, `em`, `rem` y el `px` bueno. Ésa fue la lección del bloqueante B2 —un
 * control positivo corrido en una sola dirección la daba por buena— y es la
 * razón por la que existe esta deuda.
 *
 * Los tokens se DESCUBREN: los apuntan los propios lectores según los leen, en
 * vez de escribirlos a mano aquí. Como este bloque va el último del archivo, para
 * cuando corre ya se han leído todos los del gate. Si alguien corriera sólo estos
 * tests con un filtro, el conjunto contendría al menos los que se leen al
 * declarar los `describe` —el presupuesto horizontal entero— y nunca estaría
 * vacío, cosa que el primer `it` comprueba para no medir aire.
 */
describe("control positivo: el gate se pone ROJO si a una longitud le falta su unidad de píxeles", () => {
  it("el gate lee longitudes y proporciones (si no, no habría nada que vigilar)", () => {
    expect([...LENGTH_TOKENS_READ].length).toBeGreaterThan(0);
    expect([...UNITLESS_TOKENS_READ].length).toBeGreaterThan(0);
  });

  it("una longitud SIN UNIDAD pone el gate en rojo (declaración inválida: la propiedad cae a su valor inicial)", () => {
    for (const token of [...LENGTH_TOKENS_READ]) {
      const value = bareNumber(token);
      expect(
        () => lengthIn(withValue(GLOBALS_CSS, token, value), token),
        `con ${token}: ${value} (sin unidad) el gate TIENE que caer`,
      ).toThrow();
    }
  });

  it("una longitud en UNIDADES RELATIVAS pone el gate en rojo (el presupuesto real no es el que se calcula)", () => {
    for (const token of [...LENGTH_TOKENS_READ]) {
      for (const unit of ["em", "rem"]) {
        const value = `${bareNumber(token)}${unit}`;
        expect(
          () => lengthIn(withValue(GLOBALS_CSS, token, value), token),
          `con ${token}: ${value} el gate TIENE que caer`,
        ).toThrow();
      }
    }
  });

  it("y sigue VERDE con la misma longitud escrita en píxeles", () => {
    for (const token of [...LENGTH_TOKENS_READ]) {
      const value = `${bareNumber(token)}px`;
      expect(
        () => lengthIn(withValue(GLOBALS_CSS, token, value), token),
        `con ${token}: ${value} el gate tiene que SEGUIR pasando`,
      ).not.toThrow();
    }
  });

  /**
   * El error simétrico, que es igual de silencioso: ponerle unidad a lo que no
   * la lleva. El interlineado y la profundidad de apilamiento **no** se miden en
   * píxeles —el criterio está escrito en `isAbsolutePxLength`—, así que a estos
   * se les exige lo contrario.
   */
  it("y al revés: una proporción o un z-index CON unidad también lo ponen en rojo", () => {
    for (const token of [...UNITLESS_TOKENS_READ]) {
      for (const unit of ["px", "em"]) {
        const value = `${bareNumber(token)}${unit}`;
        expect(
          () => unitlessIn(withValue(GLOBALS_CSS, token, value), token),
          `con ${token}: ${value} el gate TIENE que caer`,
        ).toThrow();
      }
      expect(() =>
        unitlessIn(withValue(GLOBALS_CSS, token, bareNumber(token)), token),
      ).not.toThrow();
    }
  });
});
