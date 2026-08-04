import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn } from "../../lib/cn";
import { buttonVariants } from "../../primitives/button/button.variants";
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

function isDeclared(name: string): boolean {
  return new RegExp(String.raw`^\s*${name}:`, "m").test(GLOBALS_CSS);
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
 * Alto que ocupa la banda. Es una **cota inferior**: el control es un objetivo
 * táctil (el mismo token que la banda declara como alto mínimo) más los dos
 * respiros verticales; su relleno y su borde propios sólo pueden hacerla más
 * alta, y todo lo que crezca empeora el caso de la superposición, nunca lo
 * mejora. Los dos tokens salen de las clases reales de la banda.
 */
const BAND_HEIGHT =
  length(tokenOf(BAND_CLASSES, MIN_HEIGHT)) +
  2 * length(tokenOf(BAND_CLASSES, PADDING_BLOCK));

/**
 * Techo libre que el archivero deja por encima de la pestaña de la ÚLTIMA
 * columna en el PEOR caso: la ranura 6 (desde E10, columna y ranura están
 * desacopladas, así que la columna 6 puede caer en la de más arriba) y con el
 * puntero encima (la pestaña crece hacia el techo, `--nav-tab-lift`).
 */
const WORST_CASE_TAB_TOP_RESTING =
  length("--nav-height") -
  (ARCHIVE_SLOTS - 1) * length("--nav-leaf-height") -
  length("--nav-tab-height");
const WORST_CASE_TAB_TOP_HOVERED =
  WORST_CASE_TAB_TOP_RESTING - length("--nav-tab-lift");

/**
 * Desplazamiento que la banda impone al techo del cajón. Se DERIVA de sus
 * clases: una banda en el flujo empuja al nav su propio alto; una superpuesta
 * (posicionada fuera del flujo, desplazada por transformación o metida a la
 * fuerza con un margen negativo) no empuja nada y deja el techo del nav en 0,
 * que es justo el escenario que este gate prohíbe.
 */
const NAV_TOP = BAND_CLASSES.some(
  (candidate) =>
    OUT_OF_FLOW.includes(candidate) ||
    candidate.includes(TRANSFORM) ||
    NEGATIVE_MARGIN.test(candidate),
)
  ? 0
  : BAND_HEIGHT;

describe("la banda de cuenta no cabe sobre el archivero (E11 c)", () => {
  it("la pestaña de la última columna en la ranura 6 no deja techo para un control", () => {
    // 104 − 5×10 − 44 = 10 en reposo; menos los 8 que crece con el puntero, 2.
    expect(WORST_CASE_TAB_TOP_HOVERED).toBeGreaterThanOrEqual(0);
    expect(WORST_CASE_TAB_TOP_HOVERED).toBeLessThan(
      WORST_CASE_TAB_TOP_RESTING,
    );
    expect(
      WORST_CASE_TAB_TOP_HOVERED,
      `sobre el cajón sólo quedan ${WORST_CASE_TAB_TOP_HOVERED}px y la banda necesita ${BAND_HEIGHT}px`,
    ).toBeLessThan(BAND_HEIGHT);
  });

  it("por eso va en el FLUJO: su borde inferior queda por encima del cajón", () => {
    // El invariante: entre el borde inferior de la banda y el borde superior de
    // la pestaña más alta que puede haber debajo no puede haber solape. Si
    // alguien superpone la banda, `NAV_TOP` cae a 0 y esto se pone rojo.
    const worstCaseTabTop = NAV_TOP + WORST_CASE_TAB_TOP_HOVERED;
    expect(
      BAND_HEIGHT,
      `la banda ocupa hasta y=${BAND_HEIGHT} y la pestaña de la columna 6 empieza en y=${worstCaseTabTop}`,
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
