import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn } from "../../lib/cn";
import { buttonVariants } from "../../primitives/button/button.variants";
import { isAbsolutePxLength } from "../../testing/css-tokens";
import { ARCHIVE_SLOTS } from "../archive-nav/archive-nav.variants";
import {
  accountBandVariants,
  accountNameVariants,
} from "./account-band.variants";

/**
 * GATE DE LA ENMIENDA E11 (c) — el extremo DERECHO de la banda superior.
 *
 * Es el gemelo del que ya protege al wordmark en `archive-nav.tokens.test.ts`
 * ("la pestaña que comparte columna con el wordmark no lo alcanza"), pero con la
 * **ranura 6 como peor caso** en vez de la 2. Nació porque el riesgo de esta
 * feature no era un test que cayera, sino uno que **no existía**: los
 * invariantes verticales de la banda sólo estaban asertados para la izquierda,
 * donde la columna 1 nunca baja de la ranura 2. Desde E10 la columna 6 **sí**
 * puede caer en la ranura 6, y ahí el techo que le queda a un control colocado
 * a la derecha son 10px en reposo y 2px con el puntero encima: cualquier control
 * de un objetivo táctil se solaparía con la pestaña en 4 de las 6 rutas, con
 * toda la suite en verde y el defecto descubierto por el usuario en pantalla
 * (que es como nacieron E5, E8, E9 y E10).
 *
 * **Sigue siendo obligatorio aunque el control viva fuera del elemento `nav`**
 * (E11 a): la colisión es geométrica, no del árbol del DOM.
 *
 * Todo lo que se mide aquí se DERIVA: las longitudes salen de `globals.css` y la
 * posición de la banda sale de las **clases reales** que emite su `cva` pasadas
 * por `cn()` — que es exactamente lo que acaba en el atributo del elemento. Si
 * alguien saca la banda del flujo para superponerla al cajón, el offset derivado
 * cae a cero y este bloque se pone rojo.
 */
const GLOBALS_CSS = readFileSync(
  fileURLToPath(new URL("../../../../app/globals.css", import.meta.url)),
  "utf8",
);

interface Rgb {
  r: number;
  g: number;
  b: number;
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

function isDeclared(name: string): boolean {
  return new RegExp(String.raw`^\s*${name}:`, "m").test(GLOBALS_CSS);
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
 * Los tokens que la geometría ha leído como LONGITUD, apuntados por el propio
 * lector según los lee.
 *
 * Se descubren en vez de enumerarse a mano: una lista escrita aquí se queda
 * atrás en cuanto la derivación consuma un token más, y el control positivo
 * pasaría a vigilar menos de lo que el gate usa sin que nadie lo note (es el
 * patrón de las deudas 40/43/71).
 */
const LENGTH_TOKENS_READ = new Set<string>();

/**
 * Una longitud de la geometría de la banda, **con la unidad comprobada**
 * (deuda 158).
 *
 * ANTES ERA LA LECTURA PERMISIVA QUE DEJÓ PASAR EL BLOQUEANTE B2: hacía
 * `Number.parseFloat` y sólo rechazaba si salía un no-número. `Number.parseFloat`
 * **descarta el sufijo en silencio**, así que para ella `44`, `44px` y `44em` son
 * el mismo número y **toda la aritmética de este archivo cuadraba igual con los
 * tres**.
 *
 * Aquí lo que se calcula es una colisión geométrica: cuántos píxeles quedan
 * libres encima de la pestaña más alta del archivero y cuántos ocupa la banda.
 * Si a uno de esos tokens se le cae la unidad, en el navegador la declaración es
 * inválida y la propiedad cae a su valor inicial —o sea, la altura mínima o el
 * respiro que la cuenta da por supuestos **no existen**— mientras el gate sigue
 * afirmando que no hay solape. Con `em` la cuenta se hace con un número y la
 * pantalla usa otro ~16 veces mayor. Los dos casos son el defecto que este gate
 * existe para impedir, con la suite en verde.
 *
 * El criterio de a qué tokens se les puede exigir unidad —y a cuáles no— está
 * escrito en `isAbsolutePxLength`. Todo lo que lee esta función se consume como
 * longitud CSS: entra de lleno.
 *
 * Toma el `css` por parámetro para que el control positivo pueda correr **la
 * derivación real de este gate** contra copias mutadas del CSS de verdad. Un
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
        `se calcula aquí. Las dos cosas dejan el solape sin vigilar (deuda 158).`,
    );
  }
  return Number.parseFloat(value);
}

function color(name: string): Rgb {
  const value = resolved(name);
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) {
    throw new Error(`El token ${name} no es un color hexadecimal: ${value}`);
  }
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
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
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/* ------------------------------------------------------------------ *
 * Lectura de las clases REALES del componente.
 *
 * Ni un solo nombre de utilidad se escribe literal en este archivo: Tailwind
 * escanea también los tests, y una clase citada como ejemplo se convierte en
 * CSS de producción (y una inválida rompe el build entero). Los prefijos se
 * arman por concatenación, igual que en `layout.test.tsx`.
 * ------------------------------------------------------------------ */
const frag = (...parts: string[]) => parts.join("");

const BAND_CLASSES = cn(accountBandVariants()).split(" ");
const NAME_CLASSES = cn(accountNameVariants()).split(" ");
const GHOST_CLASSES = cn(buttonVariants({ variant: "ghost" })).split(" ");

/** Token consumido por una utilidad en forma canónica: `utilidad-(--token)`. */
function tokenOf(classes: string[], utility: string): string {
  const prefix = `${utility}-(`;
  const found = classes
    .filter((candidate) => candidate.startsWith(prefix))
    .map((candidate) => candidate.slice(prefix.length, -1));
  if (found.length !== 1) {
    throw new Error(
      `Se esperaba UNA utilidad ${utility} con token; encontradas ${found.length}`,
    );
  }
  return found[0] as string;
}

/**
 * Color consumido por una utilidad con nombre de la paleta (`prefijo-rol`). El
 * rol se acepta sólo si `@theme` declara su alias de color, que es lo que hace
 * existir la utilidad: así `text-xs` no se confunde con un color y el par que se
 * mide es el que el componente produce de verdad.
 */
function paletteColorOf(classes: string[], utility: string): Rgb {
  const pattern = new RegExp(`^${utility}-([a-z0-9-]+)$`);
  const roles = classes
    .map((candidate) => candidate.match(pattern)?.[1])
    .filter((role): role is string => Boolean(role))
    .filter((role) => isDeclared(`--color-${role}`));
  if (roles.length !== 1) {
    throw new Error(
      `Se esperaba UN color de paleta con prefijo ${utility}; encontrados ${roles.length}`,
    );
  }
  return color(`--color-${roles[0] as string}`);
}

const BG = frag("b", "g");
const TEXT = frag("te", "xt");
const MIN_HEIGHT = frag("min", "-h");
const PADDING_BLOCK = frag("p", "y");
const PADDING_INLINE = frag("p", "x");
const HIDDEN = frag("hid", "den");
const CURRENT_COLOR = `${TEXT}-${frag("curr", "ent")}`;

/** Marcadores de "esto ya no está en el flujo del shell". */
const OUT_OF_FLOW = [
  frag("abso", "lute"),
  frag("fix", "ed"),
  frag("stic", "ky"),
];
const TRANSFORM = frag("trans", "late");
const NEGATIVE_MARGIN = /^-m[a-z]?-/;

/* ------------------------------------------------------------------ *
 * Geometría
 * ------------------------------------------------------------------ */

/**
 * TODA la geometría del gate, derivada de un texto de CSS.
 *
 * Está junta y parametrizada por `css` por un motivo de deuda 158: así el
 * control positivo del final puede correr **esta misma derivación** —la que
 * alimenta los asertos de verdad— contra copias mutadas del `globals.css` real,
 * en vez de conformarse con probar el ayudante por su cuenta.
 *
 * - `bandHeight`: alto que ocupa la banda. Es una **cota inferior**: el control
 *   es un objetivo táctil (el mismo token que la banda declara como alto mínimo)
 *   más los dos respiros verticales; su relleno y su borde propios sólo pueden
 *   hacerla más alta, y todo lo que crezca empeora el caso de la superposición,
 *   nunca lo mejora. Los dos tokens salen de las clases reales de la banda.
 * - `worstCaseTabTop*`: techo libre que el archivero deja por encima de la
 *   pestaña de la ÚLTIMA columna en el PEOR caso: la ranura 6 (desde E10,
 *   columna y ranura están desacopladas, así que la columna 6 puede caer en la
 *   de más arriba) y con el puntero encima (la pestaña crece hacia el techo,
 *   `--nav-tab-lift`).
 * - `navTop`: desplazamiento que la banda impone al techo del cajón. Se DERIVA
 *   de sus clases: una banda en el flujo empuja al nav su propio alto; una
 *   superpuesta (posicionada fuera del flujo, desplazada por transformación o
 *   metida a la fuerza con un margen negativo) no empuja nada y deja el techo
 *   del nav en 0, que es justo el escenario que este gate prohíbe.
 */
function geometry(css: string) {
  const bandHeight =
    lengthIn(css, tokenOf(BAND_CLASSES, MIN_HEIGHT)) +
    2 * lengthIn(css, tokenOf(BAND_CLASSES, PADDING_BLOCK));
  const worstCaseTabTopResting =
    lengthIn(css, "--nav-height") -
    (ARCHIVE_SLOTS - 1) * lengthIn(css, "--nav-leaf-height") -
    lengthIn(css, "--nav-tab-height");
  const worstCaseTabTopHovered =
    worstCaseTabTopResting - lengthIn(css, "--nav-tab-lift");
  const navTop = BAND_CLASSES.some(
    (candidate) =>
      OUT_OF_FLOW.includes(candidate) ||
      candidate.includes(TRANSFORM) ||
      NEGATIVE_MARGIN.test(candidate),
  )
    ? 0
    : bandHeight;
  return {
    bandHeight,
    worstCaseTabTopResting,
    worstCaseTabTopHovered,
    navTop,
  };
}

/**
 * La derivación corre **la primera vez que un test la pide**, no al cargar el
 * módulo (T6 b de la deuda 158).
 *
 * Con ella en ámbito de módulo, un token sin unidad tiraba al **importar** el
 * archivo y vitest lo contaba como error de recolección (`Tests no tests`):
 * ruidoso y con exit distinto de 0 —nunca un verde falso—, pero el rojo no decía
 * qué invariante se había roto. Desde un `beforeAll` tampoco servía: un hook que
 * lanza deja los tests como **saltados**, y un resumen lleno de "skipped" se lee
 * como si no pasara nada. Perezosa y memorizada, el fallo sale **en cada `it`
 * que depende de la geometría**, con su mensaje y su nombre.
 */
let derived: ReturnType<typeof geometry> | undefined;

function bandGeometry(): ReturnType<typeof geometry> {
  derived ??= geometry(GLOBALS_CSS);
  return derived;
}

/**
 * Foto de los tokens que la derivación lee. Se fuerza la derivación antes de
 * mirar el conjunto, y se copia: si se leyera el conjunto vivo dentro de un
 * bucle, el propio control positivo lo iría alimentando mientras itera.
 */
function geometryLengthTokens(): string[] {
  bandGeometry();
  return [...LENGTH_TOKENS_READ];
}

describe("la banda de cuenta no cabe sobre el archivero (E11 c)", () => {
  it("la pestaña de la última columna en la ranura 6 no deja techo para un control", () => {
    // 104 − 5×10 − 44 = 10 en reposo; menos los 8 que crece con el puntero, 2.
    const { bandHeight, worstCaseTabTopResting, worstCaseTabTopHovered } =
      bandGeometry();
    expect(worstCaseTabTopHovered).toBeGreaterThanOrEqual(0);
    expect(worstCaseTabTopHovered).toBeLessThan(worstCaseTabTopResting);
    expect(
      worstCaseTabTopHovered,
      `sobre el cajón sólo quedan ${worstCaseTabTopHovered}px y la banda necesita ${bandHeight}px`,
    ).toBeLessThan(bandHeight);
  });

  it("por eso va en el FLUJO: su borde inferior queda por encima del cajón", () => {
    // El invariante: entre el borde inferior de la banda y el borde superior de
    // la pestaña más alta que puede haber debajo no puede haber solape. Si
    // alguien superpone la banda, el desplazamiento del cajón cae a 0 y esto
    // se pone rojo.
    const { bandHeight, worstCaseTabTopHovered, navTop } = bandGeometry();
    const worstCaseTabTop = navTop + worstCaseTabTopHovered;
    expect(
      bandHeight,
      `la banda ocupa hasta y=${bandHeight} y la pestaña de la columna 6 empieza en y=${worstCaseTabTop}`,
    ).toBeLessThanOrEqual(worstCaseTabTop);
  });

  it("no toca el presupuesto horizontal del carril (E11 a)", () => {
    // El archivero queda intacto: el margen derecho del carril sigue derivado
    // del izquierdo y la banda sólo LEE ese token para alinearse con él.
    expect(declaration("--nav-tab-inset-end")).toContain("--nav-tab-inset-start");
    expect(declaration(tokenOf(BAND_CLASSES, PADDING_INLINE))).toContain(
      "--nav-tab-inset-start",
    );
  });

  it("rige de 320px a desktop: sin variante responsive y sin ocultarse (E11 b)", () => {
    // Por debajo de `--bp-archive` no hay archivero y el `BottomNav` no recibe
    // la sesión: si la banda se escondiera en algún ancho, ahí no quedaría
    // ninguna superficie capaz de alojarla (la deuda 19, bien enunciada).
    for (const candidate of [...BAND_CLASSES, ...NAME_CLASSES]) {
      expect(/^[a-z0-9@-]+:/.test(candidate), candidate).toBe(false);
    }
    expect(BAND_CLASSES).not.toContain(HIDDEN);
  });
});

describe("legibilidad de la banda de cuenta", () => {
  const BAND_BG = paletteColorOf(BAND_CLASSES, BG);
  const BAND_FG = paletteColorOf(BAND_CLASSES, TEXT);
  const NAME_FG = paletteColorOf(NAME_CLASSES, TEXT);
  const FOCUS = color("--focus");
  const LEAF_FACE = color("--nav-leaf-face");

  it("la banda declara su primer plano junto a su fondo", () => {
    // La regla que dejó escrita la deuda 32, y que aquí no es cosmética: el
    // botón de salir es la variante fantasma, que HEREDA el color del contexto.
    expect(GHOST_CLASSES).toContain(CURRENT_COLOR);
    expect(() => paletteColorOf(GHOST_CLASSES, TEXT)).toThrow();
  });

  it("el texto que hereda el botón de salir se lee sobre el fondo de la banda", () => {
    expect(contrast(BAND_FG, BAND_BG)).toBeGreaterThanOrEqual(4.5);
  });

  it("el nombre atenuado también se lee", () => {
    expect(contrast(NAME_FG, BAND_BG)).toBeGreaterThanOrEqual(4.5);
  });

  it("el anillo de foco se distingue del fondo de la banda", () => {
    expect(contrast(FOCUS, BAND_BG)).toBeGreaterThanOrEqual(3);
  });

  it("y NO se distinguiría sobre la cara de una hoja: otra razón para no apoyarse en el cajón", () => {
    // Hallazgo de `explore_auth_shell_blast_radius.md` que la deuda 31 no
    // cubría: midió el anillo contra el fondo de la app y las tres superficies
    // claras, pero no contra la cara de la hoja del archivero. Sale 2.92:1, por
    // debajo del mínimo de 3:1 para componentes de interfaz. No es un defecto
    // vigente porque el control no se apoya ahí — y este test es lo que fija que
    // no puede empezar a apoyarse sin que nadie se entere.
    expect(contrast(FOCUS, LEAF_FACE)).toBeLessThan(3);
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

/**
 * CONTROL POSITIVO DE LA UNIDAD (deuda 158).
 *
 * Lo que hay que demostrar **no** es que `isAbsolutePxLength` funcione —eso ya
 * está probado donde vive—, sino que **este gate la está usando de verdad**. Por
 * eso los tres tests llaman a `geometry()`, que es la MISMA función que produce
 * los números de los asertos de arriba, contra copias mutadas del `globals.css`
 * de verdad.
 *
 * Y se corre en las CUATRO direcciones, no sólo en la que ya funcionaba: sin
 * unidad, `em`, `rem` y el `px` bueno. Ésa fue la lección del bloqueante B2 —un
 * control positivo corrido en una sola dirección la daba por buena— y es la
 * razón por la que esta deuda existe.
 *
 * Se muta **cada token que la derivación lee**, descubiertos por el propio
 * lector, no una muestra elegida a mano.
 */
describe("control positivo: el gate se pone ROJO si a una longitud le falta su unidad de píxeles", () => {
  /**
   * El número de un token, **sin su unidad**, para fabricar mutantes. Se saca
   * quitando el sufijo del texto y no llamando a `lengthIn`: si el mutante se
   * construyera con el lector estricto, las cuatro direcciones dependerían de
   * que el CSS real ya estuviera bien y la de "sigue verde con px" no probaría
   * nada por su cuenta.
   */
  function bareNumber(token: string): string {
    return resolvedIn(GLOBALS_CSS, token).replace(/[a-z%]+$/i, "");
  }

  it("la derivación lee al menos una longitud (si no, no habría nada que vigilar)", () => {
    expect(geometryLengthTokens().length).toBeGreaterThan(0);
  });

  it("una longitud SIN UNIDAD pone el gate en rojo (declaración inválida: la propiedad cae a su valor inicial)", () => {
    for (const token of geometryLengthTokens()) {
      const value = bareNumber(token);
      expect(
        () => geometry(withValue(GLOBALS_CSS, token, value)),
        `con ${token}: ${value} (sin unidad) el gate TIENE que caer`,
      ).toThrow();
    }
  });

  it("una longitud en UNIDADES RELATIVAS pone el gate en rojo (la geometría real no es la que se calcula)", () => {
    for (const token of geometryLengthTokens()) {
      for (const unit of ["em", "rem"]) {
        const value = `${bareNumber(token)}${unit}`;
        expect(
          () => geometry(withValue(GLOBALS_CSS, token, value)),
          `con ${token}: ${value} el gate TIENE que caer`,
        ).toThrow();
      }
    }
  });

  it("y sigue VERDE con la misma longitud escrita en píxeles", () => {
    for (const token of geometryLengthTokens()) {
      const value = `${bareNumber(token)}px`;
      expect(
        () => geometry(withValue(GLOBALS_CSS, token, value)),
        `con ${token}: ${value} el gate tiene que SEGUIR pasando`,
      ).not.toThrow();
    }
  });
});
