import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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

function declaration(name: string): string {
  const match = GLOBALS_CSS.match(
    new RegExp(String.raw`^\s*${name}:\s*([^;]+);`, "m"),
  );
  const value = match?.[1];
  if (value === undefined) {
    throw new Error(`El token ${name} no está declarado en globals.css`);
  }
  return value.trim().replace(/\s+/g, " ");
}

/** Sigue la cadena de referencias hasta el valor literal. */
function resolved(name: string): string {
  const value = declaration(name);
  const reference = value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];
  return reference ? resolved(reference) : value;
}

function length(name: string): number {
  const value = resolved(name);
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) {
    throw new Error(`El token ${name} no es una longitud: ${value}`);
  }
  return amount;
}

function integer(name: string): number {
  return Math.round(length(name));
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
      length("--space-2") + length("--text-xl") * length("--leading-tight");
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
      length("--space-2") + length("--text-xl") * length("--leading-tight");
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
