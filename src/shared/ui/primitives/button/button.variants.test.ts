import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn } from "../../lib/cn";
import { type CardVariants, cardVariants } from "../card/card.variants";
import { type ButtonVariants, buttonVariants } from "./button.variants";

/**
 * Contrato de las variantes del botón. Dos defectos reales lo motivan:
 *
 * - **Deuda 13:** el interlineado declarado en las clases base no llegaba a
 *   aplicarse. `cn()` es `twMerge(clsx(...))`, y para `twMerge` un tamaño de
 *   texto y un interlineado son el MISMO conflicto (en Tailwind cada tamaño trae
 *   su propio `line-height`): la variante de tamaño entra después de las bases,
 *   así que se llevaba por delante el interlineado. Por eso todo lo que se
 *   asierta aquí se mide sobre la salida de `cn()` y no sobre el string que
 *   devuelve `cva`, que es justo donde el defecto se veía bien y no se veía.
 * - **Deuda 17:** la variante fantasma fijaba un primer plano propio y quedaba
 *   ilegible —de hecho invisible— sobre las superficies oscuras.
 *
 * NOTA sobre nombres de clase: Tailwind escanea también los `.test.ts`, así que
 * ninguno se escribe literal; se arman por concatenación en runtime (misma regla
 * que `canonical-tailwind-classes.test.ts` y el `@source not` de `globals.css`).
 */
const util = (...parts: string[]) => parts.join("");

/** El mismo pipeline que aplica el componente: `cn(buttonVariants(...), ...)`. */
function classesOf(props: ButtonVariants, extra?: string): string[] {
  return cn(buttonVariants(props), extra).split(" ").filter(Boolean);
}

/** Clases sin variante delante (`hover:`, `disabled:`, `focus-visible:`). */
function plainClasses(classes: string[]): string[] {
  return classes.filter((entry) => !entry.includes(":"));
}

/**
 * Cada tamaño declarado en la `cva`. Es un `Record` sobre el tipo de la variante
 * a propósito: si mañana se añade un tamaño y no se registra aquí, el typecheck
 * cae y nadie puede añadirlo sin pasar por este gate.
 */
const SIZES: Record<NonNullable<ButtonVariants["size"]>, true> = {
  md: true,
  icon: true,
};

const VARIANTS: Record<NonNullable<ButtonVariants["variant"]>, true> = {
  primary: true,
  secondary: true,
  danger: true,
  ghost: true,
};

/**
 * Las superficies claras del design system sobre las que puede acabar un botón
 * fantasma. Mismo `Record` tipado que arriba: una variante nueva de `Card` que
 * no se registre aquí rompe el typecheck en vez de quedarse sin medir.
 */
const CARD_VARIANTS: Record<NonNullable<CardVariants["variant"]>, true> = {
  raised: true,
  flat: true,
};

const TIGHT_SUFFIX = util("/", "tight");
/** Utilidad de tamaño de texto que se lleva el interlineado pegado. */
const SIZED_WITH_TIGHT_LEADING = new RegExp(
  `^${util("text", "-")}[a-z0-9-]+\\${TIGHT_SUFFIX}$`,
);
const LOOSE_TIGHT_LEADING = util("leading", "-tight");

describe("interlineado del botón (deuda 13)", () => {
  for (const size of Object.keys(SIZES) as (keyof typeof SIZES)[]) {
    it(`el tamaño ${size} conserva su interlineado después de cn()`, () => {
      const classes = classesOf({ size });
      expect(
        classes.some((entry) => SIZED_WITH_TIGHT_LEADING.test(entry)),
        `el tamaño ${size} sale de cn() sin interlineado declarado: ${classes.join(" ")}`,
      ).toBe(true);
    });
  }

  it("declarar el interlineado suelto ANTES del tamaño no habría sobrevivido", () => {
    // La demostración del defecto, con las mismas piezas que tenía el código:
    // interlineado en las bases, tamaño en la variante. `twMerge` se queda con
    // lo último y el interlineado desaparece del atributo `class`.
    const merged = cn(LOOSE_TIGHT_LEADING, util("text", "-base")).split(" ");
    expect(merged).not.toContain(LOOSE_TIGHT_LEADING);
  });

  it("TODA combinación tamaño×variante sale con el interlineado pegado al tamaño", () => {
    // Asierta la PRESENCIA de lo bueno, no la ausencia de lo malo. La ausencia
    // del interlineado suelto se cumple igual cuando el interlineado desaparece
    // del todo: bastaría un `compoundVariants` con un tamaño de texto dentro
    // —los compound se aplican DESPUÉS de `size`— para llevarse tamaño e
    // interlineado de golpe con el resto de los tests en verde.
    for (const size of Object.keys(SIZES) as (keyof typeof SIZES)[]) {
      for (const variant of Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]) {
        const classes = classesOf({ size, variant });
        expect(
          classes.some((entry) => SIZED_WITH_TIGHT_LEADING.test(entry)),
          `${variant}/${size} sale de cn() sin el tamaño que lleva el interlineado pegado: ${classes.join(" ")}`,
        ).toBe(true);
        expect(
          classes,
          `${variant}/${size} vuelve a declarar el interlineado por separado`,
        ).not.toContain(LOOSE_TIGHT_LEADING);
      }
    }
  });

  it("un llamador todavía puede cambiar el interlineado desde className", () => {
    const override = util("leading", "-base");
    expect(classesOf({ size: "md" }, override)).toContain(override);
  });
});

describe("variante fantasma legible sobre cualquier superficie (deuda 17)", () => {
  const GHOST = classesOf({ variant: "ghost" });
  const INHERITED_TEXT = util("text", "-current");
  const INHERITED_BORDER = util("border", "-current");

  it("no fija primer plano propio: lo hereda de la superficie", () => {
    expect(GHOST).toContain(INHERITED_TEXT);
    const ownColors = plainClasses(GHOST).filter(
      (entry) =>
        entry.startsWith(util("text", "-")) &&
        entry !== INHERITED_TEXT &&
        !SIZED_WITH_TIGHT_LEADING.test(entry),
    );
    expect(
      ownColors,
      `la variante fantasma vuelve a fijar un color de texto: ${ownColors.join(" ")}`,
    ).toEqual([]);
  });

  it("el borde que aparece con el puntero encima hereda igual", () => {
    expect(GHOST).toContain(util("hover", ":", INHERITED_BORDER));
  });

  it("las variantes sólidas SÍ siguen fijando su par fondo/primer plano", () => {
    // El arreglo es de la fantasma, no de todas: una variante con fondo propio
    // tiene que fijar también su primer plano, porque no puede heredarlo del
    // contexto sin arriesgarse a pintar sobre su propio fondo.
    for (const variant of ["primary", "secondary", "danger"] as const) {
      const classes = plainClasses(classesOf({ variant }));
      expect(
        classes.some((entry) => entry.startsWith(util("bg", "-"))),
        `${variant} sin fondo propio`,
      ).toBe(true);
      expect(
        classes.some(
          (entry) =>
            entry.startsWith(util("text", "-")) &&
            !SIZED_WITH_TIGHT_LEADING.test(entry),
        ),
        `${variant} sin primer plano propio`,
      ).toBe(true);
    }
  });
});

/**
 * La mitad de la deuda 17 que no se ve en los nombres de clase: heredar sólo
 * sirve si lo heredado se lee. Se mide con la misma fórmula de luminancia
 * relativa de WCAG que usa `archive-nav.tokens.test.ts`, leyendo los valores
 * declarados en `globals.css` (los componentes no repiten valores: token-first).
 *
 * REGLA DE ESTE BLOQUE, que costó una review: **cada par que se mide tiene que
 * salir de un camino que el código pueda producir de verdad**, derivado de las
 * clases que declaran los componentes, no elegido a mano. La primera versión
 * asertaba el primer plano oscuro contra la tarjeta elevada —14.65:1, verde— y
 * ese par era **inalcanzable**: desde que la variante fantasma hereda, lo que
 * recibe encima de una tarjeta es lo que la tarjeta declare, y no declaraba
 * nada, así que el valor real era 1.14:1. Un test verde certificando el caso
 * roto. Es el patrón de las deudas 18, 22 y 23 ("el test mide tokens, el layout
 * consume clases") y aquí se cierra derivando las superficies de `cardVariants`
 * y el color heredado de la regla `body` de `globals.css`.
 */
describe("contraste real de lo que hereda la variante fantasma (deuda 17)", () => {
  const GLOBALS_CSS = readFileSync(
    fileURLToPath(new URL("../../../../app/globals.css", import.meta.url)),
    "utf8",
  );

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

  function channels(name: string): [number, number, number] {
    const hex = resolved(name).match(/^#([0-9a-f]{6})$/i)?.[1];
    if (!hex) {
      throw new Error(`El token ${name} no es un color hexadecimal opaco`);
    }
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }

  function luminance(name: string): number {
    const [r, g, b] = channels(name);
    const linear = (value: number) => {
      const srgb = value / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  }

  function contrast(one: string, other: string): number {
    const first = luminance(one);
    const second = luminance(other);
    return (
      (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
    );
  }

  /** Declaraciones de una regla CSS de `globals.css` (`body`, p. ej.). */
  function ruleOf(selector: string): string {
    const match = GLOBALS_CSS.match(
      new RegExp(String.raw`(?:^|[};])\s*${selector}\s*\{([^}]*)\}`, "m"),
    );
    const declarations = match?.[1];
    if (declarations === undefined) {
      throw new Error(`No hay regla \`${selector}\` en globals.css`);
    }
    return declarations;
  }

  /** Token al que apunta una propiedad de esa regla (`color`, `background-color`). */
  function tokenOfProperty(declarations: string, property: string): string {
    const match = declarations.match(
      new RegExp(String.raw`(?:^|;)\s*${property}:\s*var\((--[a-z0-9-]+)\)`, "m"),
    );
    const token = match?.[1];
    if (token === undefined) {
      throw new Error(`La regla no declara \`${property}\` con un token`);
    }
    return token;
  }

  const BODY = ruleOf("body");
  /**
   * Lo que hereda CUALQUIER cosa que no declare primer plano propio: la app es
   * oscura y `globals.css` pone el crema en el `body`. Es el color que recibe la
   * variante fantasma cuando su ancestro no dice nada.
   */
  const INHERITED_FROM_BODY = tokenOfProperty(BODY, "color");
  const APP_SURFACE = tokenOfProperty(BODY, "background-color");

  /** Utilidad `bg-…`/`text-…` → token de rol (los alias de `@theme` son 1:1). */
  function tokenOfUtility(classes: string[], prefix: string): string | undefined {
    const found = classes.find(
      (entry) =>
        entry.startsWith(prefix) &&
        !entry.includes(":") &&
        !SIZED_WITH_TIGHT_LEADING.test(entry),
    );
    return found ? `--${found.slice(prefix.length)}` : undefined;
  }

  /**
   * Cada superficie CLARA sobre la que un botón fantasma puede acabar de verdad,
   * derivada de las clases que declara `cardVariants` — no de una lista escrita
   * a mano. Si la tarjeta declara primer plano, es ése el que hereda el botón;
   * si no declara ninguno, hereda el del `body` y el par se mide igual, que es
   * lo que hace caer el test cuando el defecto existe.
   */
  const LIGHT_SURFACES = (
    Object.keys(CARD_VARIANTS) as (keyof typeof CARD_VARIANTS)[]
  ).map((variant) => {
    const classes = cn(cardVariants({ variant })).split(" ").filter(Boolean);
    const background = tokenOfUtility(classes, util("bg", "-"));
    if (background === undefined) {
      throw new Error(`La variante ${variant} de Card no declara fondo`);
    }
    return {
      variant,
      background,
      foreground: tokenOfUtility(classes, util("text", "-")) ?? INHERITED_FROM_BODY,
    };
  });

  it("el primer plano que la variante fijaba antes era INVISIBLE sobre el fondo de la app", () => {
    // No es "poco legible": el primer plano por defecto y el fondo de la app son
    // el mismo tono de la escala de marca. Éste es el defecto que se arregló.
    expect(contrast("--fg", APP_SURFACE)).toBeLessThan(1.5);
  });

  it("lo que hereda sobre la superficie oscura de la app sí se lee", () => {
    // Par derivado entero de la regla `body`: fondo y color heredado son los dos
    // que declara, así que es el escenario real del shell.
    expect(contrast(INHERITED_FROM_BODY, APP_SURFACE)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  for (const surface of LIGHT_SURFACES) {
    it(`lo que hereda dentro de una tarjeta ${surface.variant} también se lee`, () => {
      // GATE de la regresión que destapó la review: mientras la tarjeta no
      // declare su primer plano, `surface.foreground` es el crema del `body` y
      // esto da 1.14 (o 1.08 en la plana) y CAE. No hay forma de tenerlo verde
      // sin que el par sea legible de verdad.
      expect(
        contrast(surface.foreground, surface.background),
        `un botón fantasma dentro de una Card ${surface.variant} hereda ${surface.foreground} sobre ${surface.background}`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("el anillo de foco se ve sobre el fondo oscuro", () => {
    // Umbral de componente de interfaz (no de texto). Sobre las superficies
    // claras más apagadas este mismo anillo se queda corto: ver deuda 31.
    expect(contrast("--focus", APP_SURFACE)).toBeGreaterThanOrEqual(3);
  });
});
