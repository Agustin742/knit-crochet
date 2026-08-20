import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn } from "../../lib/cn";
import {
  FIELD_TONES,
  fieldLabelVariants,
  fieldMessageVariants,
} from "./field.variants";

/**
 * GATE DE CONTRASTE DEL TONO DEL CAMPO (enmienda E13 c de RFC-01).
 *
 * **Qué se está protegiendo.** Al sacar la `Card` de los controles del
 * Dashboard, la etiqueta, la ayuda y el error del campo pasan a leerse **sobre
 * el fondo oscuro de la app**. La `Card` no era decoración: era lo que hacía
 * legible ese texto, y su comentario en el fuente lo decía. Quitar el marco sin
 * mirar el contraste convierte un defecto visual en uno de accesibilidad, que es
 * peor y además invisible para el resto de la suite: `axe` con `happy-dom` no
 * resuelve colores heredados a través de utilidades de Tailwind, así que un
 * texto ilegible **le sale verde**.
 *
 * Por eso los ratios se calculan acá, de los tokens, con la misma fórmula de
 * WCAG que ya usan `button.variants.test.ts` y `archive-nav.tokens.test.ts`.
 *
 * **También se comprueba el par que motivó `--danger-inverse`**: el rojo de
 * error normal NO llega sobre el espresso. Ese aserto no está de adorno — es el
 * que impide que alguien "simplifique" el tono inverso reusando `--danger` y
 * deje el mensaje de error por debajo del mínimo.
 *
 * Ni un nombre de clase aparece literal en este archivo: Tailwind escanea los
 * tests. Los colores se leen de los tokens y las clases salen de las variantes.
 */
const GLOBALS_CSS = readFileSync(
  fileURLToPath(new URL("../../../../app/globals.css", import.meta.url)),
  "utf8",
);

/** Mínimo de WCAG AA para texto normal. */
const TEXT_CONTRAST_MINIMUM = 4.5;

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
  return value.trim();
}

/** Sigue la cadena de referencias hasta el valor literal. */
function resolved(name: string): string {
  const value = declaration(name);
  const reference = value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];
  return reference ? resolved(reference) : value;
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

/** Los tres textos del campo, tal y como los pinta el tono inverso. */
const INVERSE_TEXT_TOKENS = [
  "--fg-inverse",
  "--fg-inverse-muted",
  "--danger-inverse",
];

describe("el campo en tono inverso se lee sobre el fondo de la app", () => {
  for (const token of INVERSE_TEXT_TOKENS) {
    it(`${token} llega al mínimo de texto contra el fondo`, () => {
      expect(contrast(color(token), color("--bg"))).toBeGreaterThanOrEqual(
        TEXT_CONTRAST_MINIMUM,
      );
    });
  }

  /**
   * El motivo por el que `--danger-inverse` existe. Si algún día este aserto
   * fallara sería porque el rojo normal ya sirve sobre el fondo oscuro, y
   * entonces el token de más habría que quitarlo — no ignorarlo.
   */
  it("el rojo de error normal NO sirve sobre el fondo oscuro", () => {
    expect(contrast(color("--danger"), color("--bg"))).toBeLessThan(
      TEXT_CONTRAST_MINIMUM,
    );
  });

  /** Y el normal sigue sirviendo donde le toca: sobre la superficie clara. */
  it("el rojo de error normal sirve sobre la superficie elevada", () => {
    expect(
      contrast(color("--danger"), color("--surface-raised")),
    ).toBeGreaterThanOrEqual(TEXT_CONTRAST_MINIMUM);
  });
});

describe("los dos tonos del campo se distinguen de verdad", () => {
  it("declara exactamente los dos tonos", () => {
    expect([...FIELD_TONES]).toEqual(["default", "inverse"]);
  });

  /**
   * Un tono que produjera las mismas clases que el otro sería un `prop` decorado
   * que no cambia nada, y la etiqueta seguiría invisible con toda la suite en
   * verde. Se compara la salida REAL de las variantes, pasada por `cn()`, que es
   * lo que acaba en el atributo.
   */
  it("la etiqueta cambia de color entre tonos", () => {
    expect(cn(fieldLabelVariants({ tone: "inverse" }))).not.toBe(
      cn(fieldLabelVariants({ tone: "default" })),
    );
  });

  it("el pie cambia de color entre tonos, con y sin error", () => {
    for (const invalid of [false, true]) {
      expect(cn(fieldMessageVariants({ tone: "inverse", invalid }))).not.toBe(
        cn(fieldMessageVariants({ tone: "default", invalid })),
      );
    }
  });

  /** Ayuda y error tampoco pueden salir iguales: el error tiene que destacar. */
  it("dentro de cada tono, el error se distingue de la ayuda", () => {
    for (const tone of FIELD_TONES) {
      expect(cn(fieldMessageVariants({ tone, invalid: true }))).not.toBe(
        cn(fieldMessageVariants({ tone, invalid: false })),
      );
    }
  });

  /** Sin tono explícito se sigue dibujando para superficie clara. */
  it("el tono por defecto es el de superficie clara", () => {
    expect(cn(fieldLabelVariants({}))).toBe(
      cn(fieldLabelVariants({ tone: "default" })),
    );
    expect(cn(fieldMessageVariants({}))).toBe(
      cn(fieldMessageVariants({ tone: "default", invalid: false })),
    );
  });
});
