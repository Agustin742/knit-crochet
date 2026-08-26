import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

import { confirmDialogActionsVariants } from "./confirm-dialog/confirm-dialog.variants";
import {
  fileInputControlVariants,
  fileInputFileNameVariants,
  fileInputTriggerVariants,
  fileInputVariants,
} from "./file-input/file-input.variants";
import { selectClasses } from "./select/Select";
import { textareaClasses } from "./textarea/Textarea";

/**
 * Contrato VISUAL de los cuatro controles nuevos de la enmienda **E6** del
 * RFC-03 (#22, tanda 1).
 *
 * **Se mide sobre el CSS COMPILADO, no sobre el fuente**, por el mismo motivo
 * que los gates del shimmer y del segmentado: una utilidad que Tailwind **no
 * genera** es una cadena inerte dentro del atributo de clase. Leyendo el fuente
 * sale verde igual; leyendo la salida del compilador, no.
 *
 * **Y va todo en UN archivo a propósito.** Compilar el CSS de la app cuesta
 * segundos y cada archivo de test lo recompila entero: cuatro gates separados
 * pagarían cuatro veces la misma factura para responder preguntas del mismo
 * tamaño. Es la única desviación respecto del `<componente>.tokens.test.ts` de
 * los vecinos, y se paga con la organización interna (un `describe` por pieza).
 *
 * Lo que más importa acá es el **anillo de foco del selector de archivo**: su
 * input real es invisible, así que el anillo se dibuja en el hermano visible con
 * `peer-focus-visible:`. Si esas utilidades no se generaran, el control existiría
 * **sin foco visible** y ningún test de comportamiento lo notaría: `happy-dom` no
 * maqueta y `axe` no ve píxeles.
 *
 * Ningún nombre de clase se escribe a mano: todos se DERIVAN de las mismas
 * constantes que usan los componentes (y Tailwind escanea también los tests, así
 * que una clase literal acá sería CSS de producción).
 */
const COMPILE_TIMEOUT_MS = 120_000;

const GLOBALS_CSS = fileURLToPath(
  new URL("../../../app/globals.css", import.meta.url),
);

function classesOf(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

/** Nombre de clase → selector, con el escapado que hace Tailwind. */
function selectorFor(className: string): string {
  return `.${className.replace(/[^\w-]/g, (char) => `\\${char}`)}`;
}

const PIEZAS = {
  desplegable: classesOf(selectClasses),
  areaDeTexto: classesOf(textareaClasses),
  selectorDeArchivo: [
    ...new Set([
      ...classesOf(fileInputVariants()),
      ...classesOf(fileInputControlVariants()),
      ...classesOf(fileInputTriggerVariants()),
      ...classesOf(fileInputFileNameVariants({ empty: true })),
      ...classesOf(fileInputFileNameVariants({ empty: false })),
    ]),
  ],
  confirmacion: classesOf(confirmDialogActionsVariants()),
} as const;

/**
 * Fragmentos armados EN RUNTIME. Ninguno se escribe entero: Tailwind escanea
 * también los tests y un ejemplo literal se convierte en CSS de producción.
 */
const FRAGMENT = {
  hermanoConFoco: ["peer", "focus", "visible"].join("-"),
  anilloColor: ["outline", "(color"].join("-"),
  anilloGrosor: ["outline", "(length"].join("-"),
  anilloDesplazamiento: ["outline", "offset"].join("-"),
  ocultoParaLaVista: ["sr", "only"].join("-"),
  cursor: ["cursor", "pointer"].join("-"),
  redimensionado: ["resize", "y"].join("-"),
  separacion: ["gap", "("].join("-"),
} as const;

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

/** La regla que Tailwind emitió para una clase: selector completo + cuerpo. */
function ruleFor(className: string): { selector: string; body: string } {
  const escaped = selectorFor(className).replace(
    /[.*+?^${}()|[\]\\]/g,
    (char) => `\\${char}`,
  );
  const match = css.match(
    new RegExp(String.raw`(${escaped}(?:[^{,]*)?)\{([^}]*)\}`),
  );
  const selector = match?.[1];
  const body = match?.[2];
  if (selector === undefined || body === undefined) {
    throw new Error(`la clase ${className} no generó ninguna regla`);
  }
  return { selector: collapse(selector), body: collapse(body) };
}

function unaClaseCon(piezas: readonly string[], fragmento: string): string {
  const found = piezas.find((className) => className.includes(fragmento));
  if (found === undefined) {
    throw new Error(`ninguna clase de la pieza contiene ${fragmento}`);
  }
  return found;
}

beforeAll(async () => {
  const source = readFileSync(GLOBALS_CSS, "utf8");
  const result = await postcss([tailwindcss()]).process(source, {
    from: GLOBALS_CSS,
  });
  css = result.css;
  declarations = collectDeclarations(css);
}, COMPILE_TIMEOUT_MS);

describe("E6 — las clases que nombran los controles nuevos existen de verdad", () => {
  for (const [pieza, clases] of Object.entries(PIEZAS)) {
    it(`Tailwind genera cada utilidad de ${pieza}`, () => {
      expect(clases.length).toBeGreaterThan(0);
      for (const className of clases) {
        expect(css, `${className} no generó ninguna regla`).toContain(
          selectorFor(className),
        );
      }
    });
  }
});

describe("selector de archivo — el input invisible sigue siendo enfocable", () => {
  /**
   * El invariante que rompería esconderlo con `display:none`: sin él, el input
   * saldría del orden de tabulación y quien navega por teclado se quedaría sin
   * ninguna forma de abrir el selector. `happy-dom` **no** puede medir esto —no
   * aplica hojas de estilo al orden de foco—, así que se mide acá o no se mide.
   */
  it("la utilidad que lo esconde recorta y posiciona, pero no lo apaga", () => {
    const { body } = ruleFor(
      unaClaseCon(PIEZAS.selectorDeArchivo, FRAGMENT.ocultoParaLaVista),
    );

    expect(body).toContain("position: absolute");
    expect(body).not.toContain("display: none");
    expect(body).not.toContain("visibility: hidden");
  });
});

describe("selector de archivo — el anillo de foco se dibuja en el hermano visible", () => {
  const anillo = () =>
    PIEZAS.selectorDeArchivo.filter((className) =>
      className.includes(FRAGMENT.hermanoConFoco),
    );

  it("las utilidades del anillo apuntan al hermano del control enfocado", () => {
    const clases = anillo();
    expect(clases.length).toBeGreaterThan(0);

    for (const className of clases) {
      // El combinador de hermano es lo que hace que el anillo aparezca en el
      // disparador cuando el foco está en el input, que es todo el truco.
      expect(ruleFor(className).selector).toContain("~");
    }
  });

  it("el anillo usa el color de foco del sistema", () => {
    const { body } = ruleFor(unaClaseCon(anillo(), FRAGMENT.anilloColor));
    expect(body).toContain("var(--focus)");
  });

  /**
   * **La pregunta que abrió `Select` y se cierra acá.** `cn()` descarta la
   * utilidad de trazo pelada al fundirla con la de grosor (medido), así que
   * quedaba por comprobar si el anillo seguía teniendo **estilo de trazo**: sin
   * `outline-style`, el grosor no pinta nada. La forma de longitud declara el
   * estilo por su cuenta, y su variable trae `solid` como valor inicial. O sea
   * que la fusión **no deja ningún control sin anillo** — ni acá ni en `Input`.
   */
  it("el anillo declara grosor Y estilo de trazo, con el grosor del sistema", () => {
    const { body } = ruleFor(unaClaseCon(anillo(), FRAGMENT.anilloGrosor));

    expect(body).toContain("var(--border-width-heavy)");
    expect(body).toContain("outline-style");

    const estilo = body.match(/outline-style:\s*var\((--[a-z0-9-]+)\)/)?.[1];
    expect(estilo, "el estilo de trazo no sale de una variable").toBeDefined();
    const declarado = css.match(
      new RegExp(
        String.raw`@property ${estilo}\s*\{[^}]*initial-value:\s*([^;]+);`,
      ),
    )?.[1];
    expect(collapse(declarado ?? "")).toBe("solid");
  });

  /**
   * Hacia FUERA, no hacia dentro: `--focus` y `--accent` son el mismo rosa, y un
   * anillo por dentro del disparador secundario se comería su borde.
   */
  it("el anillo se dibuja hacia fuera, con el desplazamiento del sistema", () => {
    const { body } = ruleFor(
      unaClaseCon(anillo(), FRAGMENT.anilloDesplazamiento),
    );

    expect(body).toContain("var(--border-width-heavy)");
    expect(body).not.toContain("-var(");
    expect(body).not.toContain("calc(");
    expect(raw("--border-width-heavy").startsWith("-")).toBe(false);
  });
});

describe("desplegable y área de texto — lo que añaden sobre el control de texto", () => {
  it("el desplegable dice con el puntero que se abre", () => {
    const { body } = ruleFor(unaClaseCon(PIEZAS.desplegable, FRAGMENT.cursor));
    expect(body).toContain("cursor: pointer");
  });

  /**
   * Sólo en vertical: dejarlo crecer a lo ancho rompería la columna del
   * formulario y el tope de contenido de la app (RFC-01, E13).
   */
  it("el área de texto sólo se redimensiona en vertical", () => {
    const { body } = ruleFor(
      unaClaseCon(PIEZAS.areaDeTexto, FRAGMENT.redimensionado),
    );
    expect(body).toContain("resize: vertical");
  });
});

describe("confirmación — la fila de salidas separa con el espaciado del sistema", () => {
  it("el hueco entre las dos salidas sale de un token", () => {
    const { body } = ruleFor(
      unaClaseCon(PIEZAS.confirmacion, FRAGMENT.separacion),
    );

    expect(body).toContain("var(--space-3)");
    expect(raw("--space-3")).toBeTruthy();
  });
});
