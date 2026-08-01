import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guardrail de sintaxis canónica de variables en Tailwind v4
 * (`docs/harness/conventions.md` → "Sintaxis canónica de variables en Tailwind v4").
 *
 * Consumir un token dentro de una utilidad se escribe con la forma corta de
 * paréntesis, no con la larga de corchetes envolviendo un `var()`. Ambas generan
 * el MISMO CSS, pero la larga dispara el warning `suggestCanonicalClasses` de
 * Tailwind IntelliSense en cada archivo y permite escribir la misma intención de
 * dos maneras distintas. La tabla de equivalencias está en las convenciones.
 *
 * Este test barre TODO `src/**` por recorrido de directorios (no una lista fija
 * de archivos) para que un archivo nuevo quede cubierto sin tener que acordarse
 * de registrarlo.
 *
 * ALCANCE deliberadamente estrecho: sólo se marca el caso **inequívocamente
 * convertible**, es decir una utilidad cuyo valor arbitrario es UNA sola
 * variable, con o sin data-type hint delante.
 *
 * NO se marcan (excepciones legítimas de la convención: convertirlas cambiaría
 * el CSS resultante, comprobado compilando ambas formas):
 *   - valores **compuestos** (varios valores dentro del corchete);
 *   - cualquier valor envuelto en **`calc()`**;
 *   - **propiedades arbitrarias** sin utilidad de core equivalente: hay que
 *     verificarlas una por una contra el CSS generado, no mecánicamente;
 *   - valores arbitrarios que envuelven la variable en una **función** CSS.
 *
 * NOTA sobre el propio archivo: Tailwind escanea `src/**` buscando candidatos a
 * clase, incluidos los `.test.ts`. Por eso las muestras de abajo se ARMAN por
 * concatenación en vez de escribirse literales: así ningún ejemplo de este test
 * se cuela como clase real en el CSS compilado (mismo motivo que el `@source not`
 * de `globals.css`, verificado por `src/app/globals-css.test.ts`).
 */

/** Nombre de utilidad, con o sin guiones (`p`, `min-h`, `outline-offset`). */
const UTILITY = String.raw`[a-z][a-z0-9]*(?:-[a-z0-9]+)*`;
/** Data-type hint opcional del valor arbitrario (`length:`, `color:`, `image:`). */
const TYPE_HINT = String.raw`(?:[a-z-]+:)?`;
/** Exactamente UNA variable, sin composición ni `calc()` alrededor. */
const SINGLE_VAR = String.raw`var\(\s*--[a-z0-9-]+\s*\)`;

const NON_CANONICAL_SOURCE = String.raw`(?<![\w-])${UTILITY}-\[${TYPE_HINT}${SINGLE_VAR}\]`;

const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const SCANNED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];

function collectSourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectSourceFiles(full));
      continue;
    }
    if (full === SELF) continue;
    if (SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      found.push(full);
    }
  }
  return found.sort();
}

/** Reescribe una ocurrencia no canónica a la forma corta, para el mensaje de error. */
function toCanonical(match: string): string {
  return match
    .replace("-[", "-(")
    .replace(/var\(\s*(--[a-z0-9-]+)\s*\)/, "$1")
    .replace(/\]$/, ")");
}

const SOURCE_FILES = collectSourceFiles(SRC_DIR);

describe("sintaxis canónica de variables en Tailwind v4", () => {
  it("el barrido cubre los fuentes de src/**", () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(20);
    const relatives = SOURCE_FILES.map((file) => relative(SRC_DIR, file));
    expect(relatives).toContain(join("app", "globals.css"));
    expect(relatives).toContain(
      ["shared", "ui", "primitives", "button", "button.variants.ts"].join(sep),
    );
    expect(relatives).toContain(
      ["shared", "ui", "layout", "archive-nav", "ArchiveNav.tsx"].join(sep),
    );
  });

  it("ningún archivo de src/** usa la forma larga con var() entre corchetes", () => {
    const pattern = new RegExp(NON_CANONICAL_SOURCE, "g");
    const offenders: string[] = [];

    for (const file of SOURCE_FILES) {
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, index) => {
        for (const match of line.matchAll(pattern)) {
          offenders.push(
            `${relative(SRC_DIR, file)}:${index + 1}  ${match[0]} → ${toCanonical(match[0])}`,
          );
        }
      });
    }

    expect(
      offenders,
      `Forma no canónica encontrada; usá la forma corta con paréntesis:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

/* Las muestras se arman por concatenación (ver NOTA de la cabecera): ni un solo
   nombre de clase aparece literal en el fuente.
   - `frag` pega trozos de un nombre de utilidad que POR SÍ SOLO ya sería una
     clase válida (las de borde, contorno, sombra y transición, definidas justo
     debajo): partido en dos, el extractor de Tailwind ya no lo reconoce.
   - los nombres de token se pasan con sus dos guiones delante (`--space-6`), que
     tampoco es un candidato a clase. */
const frag = (...parts: string[]) => parts.join("");
const cssVar = (name: string) => `var(${name})`;
const bracket = (utility: string, value: string) =>
  `${utility}-${"["}${value}${"]"}`;
const arbitraryProperty = (property: string, value: string) =>
  `${"["}${property}:${value}${"]"}`;
const parens = (utility: string, value: string) => `${utility}-(${value})`;

const BORDER = frag("bor", "der");
const OUTLINE = frag("outl", "ine");
const SHADOW = frag("shad", "ow");
const TRANSITION = frag("transi", "tion");

describe("el guardrail distingue lo convertible de las excepciones", () => {
  const matches = (sample: string) =>
    new RegExp(NON_CANONICAL_SOURCE).test(sample);

  const convertible: [string, string][] = [
    ["utilidad simple", bracket("p", cssVar("--space-6"))],
    ["utilidad con guion", bracket("min-h", cssVar("--touch-target"))],
    [
      "utilidad con dos guiones",
      bracket(`${OUTLINE}-offset`, cssVar("--border-width")),
    ],
    [
      "hint de tipo length",
      bracket(BORDER, `length:${cssVar("--border-width")}`),
    ],
    [
      "con variante delante",
      `focus-visible:${bracket(OUTLINE, `color:${cssVar("--focus")}`)}`,
    ],
  ];

  const exceptions: [string, string][] = [
    [
      "valor compuesto de varias variables",
      bracket(
        SHADOW,
        [
          cssVar("--border-width"),
          cssVar("--border-width"),
          "0",
          cssVar("--border"),
        ].join("_"),
      ),
    ],
    [
      "propiedad arbitraria con valor compuesto",
      arbitraryProperty(
        `background-size`,
        [cssVar("--space-4"), cssVar("--space-4")].join("_"),
      ),
    ],
    [
      "valor envuelto en calc()",
      bracket("mb", `calc(-1*${cssVar("--border-width")})`),
    ],
    [
      "propiedad arbitraria con calc()",
      arbitraryProperty(
        `${OUTLINE}-offset`,
        `calc(-1*${cssVar("--border-width-heavy")})`,
      ),
    ],
    [
      "propiedad arbitraria de una variable (se verifica caso a caso)",
      arbitraryProperty("z-index", cssVar("--z-nav")),
    ],
    [
      "variable envuelta en una función CSS",
      arbitraryProperty(
        "filter",
        `drop-${SHADOW}(${cssVar(`--${SHADOW}-paper`)})`,
      ),
    ],
    [
      "valor arbitrario sin variables",
      bracket(TRANSITION, "transform,box-shadow"),
    ],
    ["ya canónico", parens("p", "--space-6")],
    ["ya canónico con hint", parens(BORDER, "length:--border-width")],
  ];

  for (const [label, sample] of convertible) {
    it(`marca: ${label}`, () => {
      expect(matches(sample), sample).toBe(true);
    });
  }

  for (const [label, sample] of exceptions) {
    it(`no marca: ${label}`, () => {
      expect(matches(sample), sample).toBe(false);
    });
  }

  it("propone el reemplazo canónico correcto", () => {
    expect(toCanonical(bracket("p", cssVar("--space-6")))).toBe(
      parens("p", "--space-6"),
    );
    expect(
      toCanonical(bracket(BORDER, `length:${cssVar("--border-width")}`)),
    ).toBe(parens(BORDER, "length:--border-width"));
  });
});
