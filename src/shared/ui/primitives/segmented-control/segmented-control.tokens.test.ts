import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

import {
  segmentedControlOptionVariants,
  segmentedControlVariants,
} from "./segmented-control.variants";

/**
 * Contrato VISUAL del segmentado (enmienda E2(c) del RFC-03, deuda 142).
 *
 * **Se mide sobre el CSS COMPILADO, no sobre el fuente**, por la misma razón que
 * el gate del shimmer: una utilidad que Tailwind **no genera** es una cadena
 * inerte en el atributo de clase. Leyendo el fuente sale verde igual; leyendo la
 * salida del compilador, no. Aquí importa el doble, porque la mitad de las
 * clases de este primitivo son formas cortas de token que se escriben a mano.
 *
 * Qué se ancla y por qué: la decisión de E2(c) es de FORMA —"un solo contenedor
 * continuo, sin separación entre opciones, la elegida rellena"—, y la forma no
 * la mide ningún test de comportamiento. `happy-dom` no maqueta, `axe` no ve
 * píxeles y `color-contrast` de `axe` sale siempre `incomplete` (medido). O sea
 * que **sin este archivo, alguien puede devolver el segmentado a cuatro fichas
 * sueltas y la suite entera sigue verde**: es exactamente lo que pasó con #20.
 *
 * Ningún nombre de clase se copia a mano: todos se DERIVAN de las variantes, así
 * que renombrar una y olvidarse aquí no puede pasar (y Tailwind escanea también
 * los tests, así que una clase literal en este archivo sería CSS de producción).
 */
const COMPILE_TIMEOUT_MS = 120_000;

const GLOBALS_CSS = fileURLToPath(
  new URL("../../../../app/globals.css", import.meta.url),
);

const OPTION_POSITIONS = ["only", "first", "middle", "last"] as const;

/** Nombre de clase → selector, con el escapado que hace Tailwind. */
function selectorFor(className: string): string {
  return `.${className.replace(/[^\w-]/g, (char) => `\\${char}`)}`;
}

function classesOf(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

/**
 * Fragmentos de clase armados EN RUNTIME. Ninguno se escribe entero en el
 * fuente: Tailwind escanea también los tests y una clase citada como ejemplo se
 * convierte en CSS de producción (una inválida rompe el build).
 */
const FRAGMENT = {
  fill: ["bg", "accent"].join("-"),
  fillForeground: ["text", "accent", "fg"].join("-"),
  touch: ["touch", "target"].join("-"),
  focusRing: ["outline", "(color"].join("-"),
  focusOffset: ["outline", "offset"].join("-"),
  radius: ["round", "ed"].join(""),
  shadow: ["shadow", "-"].join(""),
} as const;

const TRACK_CLASSES = classesOf(segmentedControlVariants());

const OPTION_CLASSES = [
  ...new Set(
    OPTION_POSITIONS.flatMap((position) =>
      [false, true].flatMap((divided) =>
        classesOf(segmentedControlOptionVariants({ position, divided })),
      ),
    ),
  ),
];

/** Sólo las que añade el divisor, o sea la diferencia entre dividida y no. */
const DIVIDER_CLASSES = classesOf(
  segmentedControlOptionVariants({ position: "middle", divided: true }),
).filter(
  (className) =>
    !classesOf(
      segmentedControlOptionVariants({ position: "middle", divided: false }),
    ).includes(className),
);

let css = "";
let declarations = new Map<string, string>();

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

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

/** Cuerpo de la regla que Tailwind emitió para una clase. */
function ruleBody(className: string): string {
  const selector = selectorFor(className).replace(
    /[.*+?^${}()|[\]\\]/g,
    (char) => `\\${char}`,
  );
  const match = css.match(
    new RegExp(String.raw`${selector}(?:[^{,]*)?\{([^}]*)\}`),
  );
  const body = match?.[1];
  if (body === undefined) {
    throw new Error(`la clase ${className} no generó ninguna regla`);
  }
  return collapse(body);
}

beforeAll(async () => {
  const source = readFileSync(GLOBALS_CSS, "utf8");
  const result = await postcss([tailwindcss()]).process(source, {
    from: GLOBALS_CSS,
  });
  css = result.css;
  declarations = collectDeclarations(css);
}, COMPILE_TIMEOUT_MS);

describe("segmentado — las clases que nombra existen de verdad en el CSS", () => {
  it("Tailwind genera cada utilidad del carril", () => {
    expect(TRACK_CLASSES.length).toBeGreaterThan(0);
    for (const className of TRACK_CLASSES) {
      expect(css, `${className} no generó ninguna regla`).toContain(
        selectorFor(className),
      );
    }
  });

  it("Tailwind genera cada utilidad de las opciones, en las cuatro posiciones", () => {
    expect(OPTION_CLASSES.length).toBeGreaterThan(0);
    for (const className of OPTION_CLASSES) {
      expect(css, `${className} no generó ninguna regla`).toContain(
        selectorFor(className),
      );
    }
  });
});

describe("segmentado — un solo contenedor continuo, sin hueco entre opciones", () => {
  /**
   * El corazón de E2(c). Lo que separa dos opciones es una LÍNEA compartida, no
   * un espacio: por eso se comprueba que el divisor declara un borde izquierdo
   * con el grosor del sistema, y no cualquier cosa que "también se vea".
   */
  it("las opciones se separan con una línea, no con espacio", () => {
    expect(DIVIDER_CLASSES.length).toBeGreaterThan(0);

    const declared = DIVIDER_CLASSES.map((className) => ruleBody(className));
    const borderWidth = declared.find((body) =>
      body.includes("border-left-width"),
    );

    expect(borderWidth, "el divisor no declara borde izquierdo").toBeDefined();
    expect(borderWidth).toContain("var(--border-width)");
    expect(substitute(borderWidth ?? "")).toContain(resolved("--border-width"));
  });

  /**
   * Prueba en negativo, y es la que impide volver atrás: **ninguna** utilidad de
   * separación puede aparecer ni en el carril ni en las opciones. Con un hueco,
   * el control vuelve a prometer "podés marcar varias" — que es el defecto
   * medido de E1(i).
   */
  it("no hay ni una utilidad de separación en todo el control", () => {
    // Armadas por concatenación: Tailwind escanea también los tests.
    const spacing = [
      ["gap", "-"].join(""),
      ["space", "-x-"].join(""),
      ["space", "-y-"].join(""),
      ["m", "x-"].join(""),
      ["m", "l-"].join(""),
      ["m", "r-"].join(""),
      ["m", "s-"].join(""),
      ["m", "e-"].join(""),
    ];

    for (const className of [...TRACK_CLASSES, ...OPTION_CLASSES]) {
      for (const prefix of spacing) {
        expect(
          className.startsWith(prefix),
          `${className} mete separación en un control que no la admite`,
        ).toBe(false);
      }
    }
  });

  /**
   * La elevación es del CARRIL, no de cada opción: una sola pieza. Cuatro
   * sombras en fila es exactamente la pinta que tenían los cuatro `Toggle`.
   */
  it("la sombra dura la lleva el carril y ninguna opción", () => {
    const raised = TRACK_CLASSES.filter((name) =>
      name.startsWith(FRAGMENT.shadow),
    );

    expect(raised).toHaveLength(1);
    expect(
      OPTION_CLASSES.filter((name) => name.startsWith(FRAGMENT.shadow)),
    ).toHaveLength(0);
    /* Tailwind INLINEA el valor del token de sombra y le mete su propia
       variable de color con respaldo, así que no queda ningún `var(--shadow-*)`
       que buscar: se deshace ese envoltorio y se compara contra el valor crudo
       del token. La sombra del carril ES la del sistema, no una parecida. */
    const shadow = ruleBody(raised[0] ?? "").replace(
      /var\(--tw-shadow-color,\s*([^)]*\))\)/g,
      "$1",
    );
    expect(shadow).toContain(raw("--shadow-hard"));
  });
});

describe("segmentado — la elegida se dice rellenando, no hundiendo", () => {
  it("la opción elegida se rellena con el acento del sistema", () => {
    const filled = OPTION_CLASSES.find((name) => name.includes(FRAGMENT.fill));
    expect(filled, "ninguna clase rellena la opción elegida").toBeDefined();

    const body = ruleBody(filled ?? "");
    expect(body).toContain("background-color");
    expect(substitute(body)).toContain(resolved("--accent"));
  });

  it("la opción elegida se trae su propio primer plano", () => {
    const foreground = OPTION_CLASSES.find((name) =>
      name.includes(FRAGMENT.fillForeground),
    );
    expect(foreground).toBeDefined();
    expect(substitute(ruleBody(foreground ?? ""))).toContain(
      resolved("--accent-fg"),
    );
  });

  /**
   * El `Toggle` se DESPLAZA al presionarse (gesto de botón apretado). Aquí ese
   * gesto rompería la continuidad del carril, así que no está — y se comprueba,
   * porque copiar las clases del `Toggle` es la regresión natural.
   */
  it("ninguna opción se desplaza ni encoge su sombra al elegirse", () => {
    const moves = [["trans", "form"].join(""), ["trans", "late"].join("")];

    for (const className of OPTION_CLASSES) {
      for (const gesture of moves) {
        expect(className.includes(gesture), className).toBe(false);
      }
    }
  });
});

describe("segmentado — accesibilidad y tokens", () => {
  it("cada opción llega al objetivo táctil del sistema", () => {
    const touch = OPTION_CLASSES.find((name) => name.includes(FRAGMENT.touch));
    expect(touch).toBeDefined();
    expect(ruleBody(touch ?? "")).toContain("var(--touch-target)");
  });

  /**
   * El anillo va POR FUERA de la opción, con desplazamiento positivo: `--focus`
   * y `--accent` son el mismo rosa, así que un anillo por dentro de la elegida
   * sería rosa sobre rosa. Fuera cae sobre la superficie elevada que envuelve al
   * toolbar, donde el anillo sí llega al mínimo (deuda 31).
   */
  it("el anillo de foco usa el token de foco y se dibuja hacia fuera", () => {
    const ring = OPTION_CLASSES.find((name) =>
      name.includes(FRAGMENT.focusRing),
    );
    const offset = OPTION_CLASSES.find((name) =>
      name.includes(FRAGMENT.focusOffset),
    );

    expect(ring).toBeDefined();
    expect(offset).toBeDefined();
    expect(ruleBody(ring ?? "")).toContain("var(--focus)");

    const offsetBody = ruleBody(offset ?? "");
    expect(offsetBody).toContain("var(--border-width)");
    expect(offsetBody).not.toContain("-var(");
    expect(offsetBody).not.toContain("calc(");
  });

  it("el carril redondea con el radio del sistema", () => {
    const rounded = TRACK_CLASSES.find((name) =>
      name.includes(FRAGMENT.radius),
    );
    expect(rounded).toBeDefined();
    expect(substitute(ruleBody(rounded ?? ""))).toContain(resolved("--radius-md"));
  });
});
