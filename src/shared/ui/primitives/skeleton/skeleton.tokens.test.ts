import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

import {
  SKELETON_ANIMATED_CLASSES,
  SKELETON_STILL_CLASSES,
} from "./skeleton.variants";

/**
 * Contrato del shimmer del bloque de carga (deuda 86).
 *
 * **Se mide sobre el CSS COMPILADO, no sobre el fuente** (REGLA 7 aplicada a
 * UI). El motivo es literal: una regla de fotogramas declarada pero **no
 * emitida** no anima nada, y una utilidad que Tailwind no genera es una clase
 * inerte en el `class` del elemento. Leyendo `globals.css` como texto los dos
 * fallos se ven verdes; leyendo la salida del compilador, no. Es la misma
 * técnica de `src/app/globals-css.test.ts`.
 *
 * Qué se ancla al literal y por qué (REGLA 2a): los números son **el port del
 * template** (`template/template-src.html` línea 140 para `.kc-skeleton`, línea
 * 25 para su regla de fotogramas). Ahí el literal ES el contrato, igual que lo
 * fueron los números del ovillo en RFC-01 §3 D2-bis: no son una preferencia que
 * se pueda ajustar a ojo, son la definición del efecto. Lo que NO se copia a
 * mano son los nombres de las clases del componente: se importan de sus
 * variantes, así que renombrar una y olvidarse aquí no puede pasar.
 *
 * El defecto que este gate existe para impedir es el que tenía la primera
 * versión: la utilidad de latido que Tailwind trae de fábrica, que compila una
 * duración y una curva ajenas al sistema de tokens y que el guardrail de
 * no-hardcode **no puede ver** porque no lleva ni `px` ni color.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const GLOBALS_CSS = fileURLToPath(
  new URL("../../../../app/globals.css", import.meta.url),
);

/** Los valores del template, escritos a mano UNA vez: aquí el literal es el contrato. */
const TEMPLATE = {
  keyframes: "kc-shimmer",
  duration: "1400ms",
  timing: "linear",
  iteration: "infinite",
  band: "200px",
  angle: "90deg",
  stops: ["25%", "50%", "75%"],
} as const;

/** Nombre de clase → selector, con el escapado que hace Tailwind. */
function selectorFor(className: string): string {
  return `.${className.replace(/[^\w-]/g, (char) => `\\${char}`)}`;
}

let css = "";
let declarations = new Map<string, string>();

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Primera declaración gana: el bloque de tema del compilado va primero. */
function collectDeclarations(source: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of source.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value && !found.has(name)) {
      found.set(name, collapse(value));
    }
  }
  return found;
}

function raw(token: string): string {
  const value = declarations.get(token);
  if (value === undefined) {
    throw new Error(`${token} no llegó al CSS compilado`);
  }
  return value;
}

/** Sustituye cada `var(--x)` por su valor, en cascada. */
function substitute(value: string): string {
  return value.replace(/var\((--[a-z0-9-]+)\)/g, (_, reference: string) =>
    substitute(raw(reference)),
  );
}

function resolved(token: string): string {
  return substitute(raw(token));
}

function keyframeBlock(name: string): string {
  const match = css.match(
    new RegExp(String.raw`@keyframes\s+${name}\s*\{([\s\S]*?)\n\}`, "m"),
  );
  const body = match?.[1];
  if (body === undefined) {
    throw new Error(`la regla de fotogramas ${name} no se emitió`);
  }
  return body;
}

function keyframeStops(name: string): Map<string, string> {
  const stops = new Map<string, string>();
  for (const match of keyframeBlock(name).matchAll(/(\d+%)\s*\{([^}]*)\}/g)) {
    const [, offset, body] = match;
    if (offset && body) {
      stops.set(offset, substitute(collapse(body)));
    }
  }
  return stops;
}

beforeAll(async () => {
  const source = readFileSync(GLOBALS_CSS, "utf8");
  const result = await postcss([tailwindcss()]).process(source, {
    from: GLOBALS_CSS,
  });
  css = result.css;
  declarations = collectDeclarations(css);
}, COMPILE_TIMEOUT_MS);

describe("shimmer del Skeleton — el port del template (REGLA 2a)", () => {
  it("la animación resuelve a los valores del template", () => {
    expect(resolved("--animate-skeleton")).toBe(
      [
        TEMPLATE.keyframes,
        TEMPLATE.duration,
        TEMPLATE.timing,
        TEMPLATE.iteration,
      ].join(" "),
    );
  });

  it("la banda mide lo que mide en el template, y gobierna el tamaño del fondo", () => {
    expect(resolved("--skeleton-band")).toBe(TEMPLATE.band);
    // El tamaño del fondo DERIVA de la banda: no son dos números sueltos que
    // alguien pueda desincronizar.
    expect(raw("--skeleton-band-size")).toContain("var(--skeleton-band)");
    expect(resolved("--skeleton-band-size")).toBe(`${TEMPLATE.band} 100%`);
  });

  it("el degradado es el del template: ángulo, tres paradas y dos superficies del sistema", () => {
    const gradient = raw("--skeleton-gradient");

    expect(gradient).toContain(TEMPLATE.angle);
    for (const stop of TEMPLATE.stops) {
      expect(gradient).toContain(stop);
    }
    // Los colores se NOMBRAN, no se escriben: el degradado sigue a la paleta.
    expect(gradient).toContain("var(--surface-sunken)");
    expect(gradient).toContain("var(--brand-cream)");
    expect(resolved("--skeleton-gradient")).toContain(
      resolved("--surface-sunken"),
    );
    expect(resolved("--skeleton-gradient")).toContain(resolved("--brand-cream"));
  });

  it("la regla de fotogramas SE EMITE y recorre de menos una banda a más una banda", () => {
    const stops = keyframeStops(TEMPLATE.keyframes);

    expect([...stops.keys()].sort()).toEqual(["0%", "100%"]);
    expect(stops.get("0%")).toBe(
      `background-position: calc(-1 * ${TEMPLATE.band}) 0;`,
    );
    expect(stops.get("100%")).toBe(`background-position: ${TEMPLATE.band} 0;`);
  });
});

describe("shimmer del Skeleton — sale de tokens, no de valores de fábrica", () => {
  it("la duración y la curva se referencian, no se escriben dentro de la animación", () => {
    // El corazón de la deuda 86: antes la duración y la curva las ponía Tailwind
    // por defecto y no eran tokens de este sistema.
    const animation = raw("--animate-skeleton");

    expect(animation).toContain("var(--dur-shimmer)");
    expect(animation).toContain("var(--ease-loop)");
  });

  it("los dos tokens de movimiento llegan al CSS compilado con su valor", () => {
    expect(resolved("--dur-shimmer")).toBe(TEMPLATE.duration);
    expect(resolved("--ease-loop")).toBe(TEMPLATE.timing);
  });

  it("el Skeleton no vuelve al latido de opacidad de fábrica", () => {
    // Armado por concatenación: ningún nombre de clase aparece literal en este
    // archivo (Tailwind escanea también los tests).
    const builtInPulse = ["animate", "pulse"].join("-");

    expect(SKELETON_ANIMATED_CLASSES).not.toContain(builtInPulse);
  });
});

describe("shimmer del Skeleton — las clases que nombra el componente existen de verdad", () => {
  it("Tailwind genera cada utilidad del estado animado", () => {
    for (const className of SKELETON_ANIMATED_CLASSES) {
      expect(css, `${className} no generó ninguna regla`).toContain(
        selectorFor(className),
      );
    }
  });

  it("Tailwind genera cada utilidad del estado quieto", () => {
    for (const className of SKELETON_STILL_CLASSES) {
      expect(css, `${className} no generó ninguna regla`).toContain(
        selectorFor(className),
      );
    }
  });
});
