import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  compileCss,
  compileGlobalsCss,
  declarationsOf,
  emitsRule,
  extractClassNames,
  globalsCssSource,
  rulesFor,
  tokensIn,
  usesToken,
  writtenClassAttributes,
} from "../../testing/class-names-from-source";

/**
 * GATE DE LA ENMIENDA E14 — LA BARRA DE NAVEGACIÓN MÓVIL SE PEGA ABAJO.
 *
 * **Por qué existe, dicho sin rodeos.** La **deuda 165** nació porque el `nav`
 * declaraba el escalón de apilamiento del nav **y ninguna `position`**. Un
 * `z-index` sobre un elemento estático **no hace absolutamente nada**: la barra
 * quedaba al final del DOCUMENTO y no de la PANTALLA, y en un teléfono es la
 * única navegación que hay. Toda la suite salía verde igual, porque `happy-dom`
 * no maqueta, `axe` no mide píxeles y los tests de comportamiento leen roles.
 * E14 (c) lo pide explícito: *"sin gate, E14 no se considera implementada, y el
 * gate llega al CSS compilado, no a los nombres de clase"*.
 *
 * **Qué mide, en cuatro capas:**
 *
 * 1. El **barrido de clases** del fuente no se deja nada (un resolvedor roto
 *    devuelve cero clases, o sea verde perpetuo).
 * 2. Las clases que la barra escribe **llegan al CSS compilado**: una utilidad
 *    que Tailwind no genera es una cadena inerte en el atributo.
 * 3. La barra declara **`position` pegajosa** y un **desplazamiento inferior**,
 *    y las dos cosas **sin condición**. Lo de "sin condición" no es celo: las
 *    variantes de este repo son **de ancho MÍNIMO** (enmienda E12 b), así que
 *    una regla escrita *"para que aplique sólo hacia abajo"* **no compila a
 *    nada** — que es exactamente la forma en que nació la 165.
 * 4. El **área segura inferior** se reserva con un token que existe en un ámbito
 *    que aplica y que vale el inset del sistema, no con un número crudo.
 *
 * **LO QUE ESTE GATE NO PUEDE MEDIR, y se dice para que nadie lo cite como si
 * lo midiera:** que la barra se vea de verdad al entrar a una página. Eso es
 * maquetación, y la maquetación no ocurre en ningún entorno de esta suite. Lo
 * único que se comprueba acá es que **las declaraciones existan en el CSS que el
 * navegador va a recibir**. Ver también la nota sobre `viewport-fit` en
 * `docs/historial/reports/impl_deudas_165_166.md`.
 *
 * La técnica de barrido y de lectura del compilado vive en
 * `shared/ui/testing/class-names-from-source.ts` (deuda 146 subida a pieza
 * compartida); acá sólo está lo propio de la barra.
 *
 * **Ni un nombre de clase aparece literal en este archivo.** Tailwind escanea
 * también los `.test.ts` y una clase citada de ejemplo se convierte en CSS de
 * producción. Lo que sí se escribe al literal son **nombres de propiedad CSS**,
 * que no son candidatos a clase.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const BOTTOM_NAV = fileURLToPath(new URL("./BottomNav.tsx", import.meta.url));

/** El escalón de apilamiento del nav. No es una clase: es el nombre del token. */
const NAV_Z = "--z-nav";

/** El token del área segura inferior (E14 b). Tampoco es una clase. */
const SAFE_AREA = "--safe-area-bottom";

/**
 * Lo que ese token tiene que valer. Es una **función de CSS**, no una clase:
 * un número crudo acá sería justo lo que E14 (b) prohíbe, y un token que no
 * consultara al sistema no reservaría nada en un teléfono con barra de gestos.
 */
const SYSTEM_INSET = "env(safe-area-inset-bottom";

/** Propiedades CSS que se leen del compilado. No son candidatos a clase. */
const POSITION = "position";
const Z_INDEX = "z-index";
const PADDING_BOTTOM = "padding-bottom";
const INSET_BOTTOM = "bottom";

/**
 * El valor de `position` que pide E14 (a): pegajosa y **no** fija, para que la
 * barra no salga del flujo y no pueda tapar el final del contenido.
 *
 * Se arma en tiempo de ejecución porque es además el **nombre de una utilidad**
 * de Tailwind: escrito al literal, este archivo emitiría esa utilidad en el CSS
 * de producción por su cuenta, y el gate dejaría de depender del componente.
 */
const STUCK = ["stic", "ky"].join("");

/**
 * Las fuentes externas que la barra puede meter en un atributo de clase: la
 * prop de quien la monta, el ayudante de fusión del design system y las
 * variantes del acceso táctil (que viven en su propio archivo). La lista se
 * compara **exacta**: una fuente nueva pone el gate en rojo en vez de perderse.
 */
const EXTERNAL_SOURCES = ["bottomNavItemVariants", "cn", "className"];

/**
 * La forma de expresión que el resolvedor compartido **no sigue** y por eso
 * denuncia: el literal de objeto con el que el acceso táctil pide sus variantes.
 * Es el nombre del nodo del compilador de TypeScript, no una clase.
 */
const UNFOLLOWED_EXPRESSION = "ObjectLiteralExpression";

/**
 * Selectores que alcanzan a la barra desde la raíz del documento. Un token
 * declarado bajo otro selector existiría sólo donde ESE selector aplicara, que
 * es la misma trampa que la condición con otra forma.
 */
const ROOT_SELECTOR = /(^|,)\s*(:root|:host|html)\s*(,|$)/;

/**
 * Una condición que es un **límite inferior de ancho**, en las dos escrituras
 * que un compilador puede emitir: la clásica (`min-width:`) y la de rango
 * (`width >=`), que es la que sale hoy de este repo.
 */
const LOWER_WIDTH_BOUND = /min-width\s*:|width\s*>=/;

const EXTRACTED = extractClassNames(BOTTOM_NAV);

let css = "";

beforeAll(async () => {
  css = await compileGlobalsCss();
}, COMPILE_TIMEOUT_MS);

/** Las declaraciones de un token que **de verdad valen** para la barra. */
function effectiveDeclarationsIn(compiled: string, name: string) {
  return declarationsOf(compiled, name).filter(
    (entry) =>
      entry.conditions.length === 0 && ROOT_SELECTOR.test(entry.selector),
  );
}

function isDeclaredIn(compiled: string, name: string): boolean {
  return effectiveDeclarationsIn(compiled, name).length > 0;
}

/** Una declaración que alguna clase de la barra emite de verdad. */
interface NavDeclaration {
  className: string;
  value: string;
  conditions: string[];
}

/** Lo que las clases de la barra declaran para una propiedad, con su ámbito. */
function declaredByNav(compiled: string, property: string): NavDeclaration[] {
  return EXTRACTED.classes.flatMap((className) =>
    rulesFor(compiled, className).flatMap((rule) =>
      rule.declarations
        .filter((declaration) => declaration.property === property)
        .map((declaration) => ({
          className,
          value: declaration.value.trim(),
          conditions: rule.conditions,
        })),
    ),
  );
}

/** De esas, las que aplican en todos los anchos (fuera de cualquier consulta). */
function unconditioned(entries: NavDeclaration[]): NavDeclaration[] {
  return entries.filter((entry) => entry.conditions.length === 0);
}

/** Los tokens que la barra consume en una propiedad dada. */
function tokensUsedIn(compiled: string, property: string): string[] {
  const referenced = new Set<string>();
  for (const entry of declaredByNav(compiled, property)) {
    for (const token of tokensIn(entry.value)) {
      referenced.add(token);
    }
  }
  return [...referenced];
}

/** De esos, los que NO están declarados en un ámbito que aplique. */
function undeclaredTokensIn(compiled: string, property: string): string[] {
  return tokensUsedIn(compiled, property).filter(
    (token) => !isDeclaredIn(compiled, token),
  );
}

describe("el barrido de clases de la barra no se deja nada", () => {
  it("encuentra clases y atributos en el fuente de la barra", () => {
    expect(EXTRACTED.attributes).toBeGreaterThan(1);
    expect(EXTRACTED.classes.length).toBeGreaterThan(5);
  });

  it("ve tantos atributos de clase como hay escritos en el fuente", () => {
    expect(EXTRACTED.attributes + EXTRACTED.objectProperties).toBe(
      writtenClassAttributes(BOTTOM_NAV),
    );
  });

  /**
   * **La única forma que el barrido no sigue, pinchada con alfiler.** El acceso
   * táctil pide sus clases a un archivo de variantes pasándole un objeto
   * (`{ active }`), y el resolvedor compartido no entra en literales de objeto:
   * los **denuncia**, que es justo lo que promete hacer con lo que no entiende.
   *
   * **No se resuelve, y el motivo importa:** ese objeto no lleva ni una clase
   * —lleva el estado de la ruta activa—, y las clases que produce viven en
   * `bottom-nav.variants.ts`, que **E14 no toca** (el interior de la barra queda
   * explícitamente fuera de la enmienda). Enseñarle al resolvedor a entrar ahí
   * sólo movería la denuncia un nodo más adentro (el acceso a propiedad del
   * enlace) y tocaría una pieza que comparten otros tres gates, por una razón
   * que no es la de esta deuda.
   *
   * La lista se compara **EXACTA**: una forma nueva sin seguir pone el gate en
   * rojo en vez de sumarse en silencio.
   */
  it("la única forma sin seguir es la del objeto de variantes, y está denunciada", () => {
    expect(EXTRACTED.unhandled).toEqual([UNFOLLOWED_EXPRESSION]);
  });

  it("ningún atributo de clase llega por un camino que el barrido no atraviesa", () => {
    expect(EXTRACTED.bypassed).toEqual([]);
  });

  it("no resuelve ninguna clase por un nombre pisado ni reasignado", () => {
    expect(EXTRACTED.ambiguous).toEqual([]);
  });

  it("sólo deja sin resolver lo que se declara fuera del archivo", () => {
    expect([...EXTRACTED.external].sort()).toEqual([...EXTERNAL_SOURCES].sort());
  });

  /**
   * **Todas las clases resueltas salen del MISMO elemento**, el `nav`. El otro
   * atributo de clase del archivo —el del acceso táctil— lo produce una llamada
   * a un archivo de variantes, así que no aporta ni una clase acá.
   *
   * No es un detalle de contabilidad: es lo que permite que los asertos de abajo
   * digan "la barra está posicionada Y lleva el escalón" en vez de "alguna clase
   * de este archivo hace una cosa y alguna otra hace la otra", que es
   * exactamente lo que **no** basta para abrir un contexto de apilamiento.
   */
  it("todas las clases resueltas vienen de un solo atributo, el de la barra", () => {
    expect(EXTRACTED.attributes - EXTRACTED.emptyAttributes.length).toBe(1);
  });
});

describe("la barra se pega al borde inferior del viewport (E14 a)", () => {
  it("Tailwind genera todas las utilidades que la barra escribe", () => {
    const inert = EXTRACTED.classes.filter(
      (className) => !emitsRule(css, className),
    );

    expect(
      inert,
      "estas clases de la barra no generan ninguna regla: se quedan inertes en el atributo",
    ).toEqual([]);
  });

  /**
   * **El corazón del gate, y la línea que faltaba.** Sin `position` la barra es
   * un elemento estático al final del documento: exactamente la deuda 165.
   */
  it("declara una posición pegajosa, y en todos los anchos", () => {
    const positioned = declaredByNav(css, POSITION);

    expect(
      positioned,
      "ninguna clase de la barra declara position: vuelve a ser un elemento estático al final del documento",
    ).not.toEqual([]);

    const always = unconditioned(positioned);
    expect(
      always,
      "la barra sólo se posiciona bajo una consulta de medios: las variantes son de ancho MÍNIMO, así que por debajo de ese ancho —donde vive la barra— no se posiciona nada",
    ).not.toEqual([]);

    for (const entry of always) {
      expect(entry.value, entry.className).toBe(STUCK);
    }
  });

  /**
   * Una posición pegajosa **sin desplazamiento no se pega a nada**: con el
   * desplazamiento en su valor automático el elemento se comporta como uno
   * relativo y se queda donde estaba. Las dos mitades se comprueban por separado
   * a propósito, porque quitar una y dejar la otra es un fallo real y silencioso.
   */
  it("y fija su desplazamiento inferior, que es lo que hace que pegarse signifique algo", () => {
    const offsets = unconditioned(declaredByNav(css, INSET_BOTTOM));

    expect(
      offsets,
      "la barra no fija su desplazamiento inferior: una posición pegajosa sin desplazamiento no se pega a nada",
    ).not.toEqual([]);
  });
});

describe("el escalón de apilamiento deja de ser inerte (E14 a)", () => {
  /**
   * El `z-index` ya estaba escrito antes de E14 **y no hacía nada**, porque no
   * había `position`. Que siga estando —y con el token del nav— es la otra mitad
   * de que la barra pinte por encima del contenido cuando flota sobre él.
   */
  it("el escalón sale del token del nav, y sin condición", () => {
    const stacked = unconditioned(declaredByNav(css, Z_INDEX));

    expect(
      stacked,
      "ninguna clase de la barra declara z-index sin condición",
    ).not.toEqual([]);

    expect(
      stacked.some((entry) => usesToken(entry.value, NAV_Z)),
      "el z-index de la barra no consume el token del nav: o está a un número a ojo, o consume otro escalón",
    ).toBe(true);
  });

  /**
   * **La otra mitad de la pinza**, la que mata la CLASE de fallo en vez de este
   * caso: ninguna utilidad de apilamiento de la barra puede apuntar a un token
   * que no exista. Una variable sin declarar no rompe nada ruidosamente — es
   * `z-index: auto`, silencio absoluto y la barra otra vez detrás del contenido.
   */
  it("ningún escalón de la barra apunta a un token que no exista", () => {
    expect(
      tokensUsedIn(css, Z_INDEX),
      "la barra no consume ningún token en su z-index: no hay nada que comprobar, o sea que el aserto anterior medía aire",
    ).not.toEqual([]);

    expect(undeclaredTokensIn(css, Z_INDEX)).toEqual([]);
  });
});

describe("el área segura inferior del dispositivo (E14 b)", () => {
  /**
   * En un teléfono con barra de gestos, una navegación pegada al borde queda
   * **debajo del gesto del sistema** y los toques se los come el sistema
   * operativo. El relleno sale de un token, nunca de un número escrito a mano.
   */
  it("la barra reserva el área segura con un token, no con un número", () => {
    const padding = unconditioned(declaredByNav(css, PADDING_BOTTOM));

    expect(
      padding,
      "la barra no reserva ningún relleno inferior: pegada al borde, sus accesos caen sobre el área del gesto del sistema",
    ).not.toEqual([]);

    expect(
      padding.some((entry) => usesToken(entry.value, SAFE_AREA)),
      "el relleno inferior de la barra no consume el token del área segura",
    ).toBe(true);
  });

  it("ese token existe donde aplica y pregunta el inset AL SISTEMA", () => {
    const declared = effectiveDeclarationsIn(css, SAFE_AREA);

    expect(
      declared,
      "el token del área segura no está declarado en ninguna regla de raíz sin condiciones: escrito puede estar, en un ámbito que aplique no",
    ).not.toEqual([]);

    for (const entry of declared) {
      expect(
        entry.value,
        "el token del área segura no consulta al sistema: un valor fijo reservaría siempre lo mismo, que es el número crudo que E14 (b) prohíbe",
      ).toContain(SYSTEM_INSET);
    }
  });

  it("ningún relleno de la barra apunta a un token que no exista", () => {
    expect(tokensUsedIn(css, PADDING_BOTTOM)).not.toEqual([]);
    expect(undeclaredTokensIn(css, PADDING_BOTTOM)).toEqual([]);
  });
});

/**
 * CONTROLES POSITIVOS — lo que hay que demostrar no es que las funciones sepan
 * leer el compilado, sino que **este gate se pone rojo** cuando la barra pierde
 * lo que E14 le pide.
 */
describe("control positivo: las comprobaciones tienen dientes", () => {
  /**
   * **La advertencia de E12 (b), convertida en aserto.** Si `conditions` viniera
   * siempre vacío, todos los `unconditioned(...)` de arriba serían adorno y una
   * regla escrita dentro de una variante pasaría por regla incondicional.
   *
   * La clase que lo demuestra **no se escribe acá**: se busca entre las que el
   * barrido sacó del fuente, así que el control sigue vivo si mañana cambia de
   * nombre. Y de paso deja medido lo que E12 (b) advierte: la condición que
   * envuelve a una variante de este repo es un **límite INFERIOR de ancho**, o
   * sea que una regla pensada "sólo hacia abajo" no existiría en ninguna parte.
   *
   * (El límite inferior se reconoce en sus **dos** escrituras: la clásica y la
   * de rango, que es la que emite hoy el compilador de Tailwind de este repo.
   * Aceptar sólo una de las dos haría que el control se cayera con una subida de
   * versión sin que nada hubiera cambiado de verdad.)
   */
  it("las variantes de la barra SÍ salen con condición, y es un límite inferior de ancho", () => {
    const conditioned = EXTRACTED.classes.flatMap((className) =>
      rulesFor(css, className)
        .filter((rule) => rule.conditions.length > 0)
        .map((rule) => ({ className, conditions: rule.conditions })),
    );

    expect(
      conditioned,
      "ninguna clase de la barra sale envuelta en una condición: los asertos de 'sin condición' no están midiendo nada",
    ).not.toEqual([]);

    for (const entry of conditioned) {
      expect(
        LOWER_WIDTH_BOUND.test(entry.conditions.join(" ")),
        `${entry.className}: ${entry.conditions.join(" ")}`,
      ).toBe(true);
    }
  });

  /**
   * El token del área segura declarado sólo bajo una condición que ninguna
   * pantalla real cumple: en el navegador la variable **no existe**, el relleno
   * cae a su valor inicial y la barra vuelve a apoyarse en el borde. Es la misma
   * mutación con la que se midió el verde falso de la deuda 158, apuntada acá.
   */
  it("con el token del área segura metido en una consulta de medios, el gate se pone ROJO", async () => {
    /** Ancho que ninguna ventana real alcanza: la condición nunca se cumple. */
    const UNREACHABLE_WIDTH = "5000px";
    const source = globalsCssSource();
    const declaration = new RegExp(
      String.raw`^[^\S\n]*${SAFE_AREA}:\s*([^;]+);`,
      "m",
    );
    const match = source.match(declaration);
    if (match === null) {
      throw new Error(
        `No se pudo fabricar la mutación: ${SAFE_AREA} no está declarado en el texto`,
      );
    }

    const conditional = await compileCss(
      `${source.replace(declaration, "")}
@media (min-width: ${UNREACHABLE_WIDTH}) {
  :root {
    ${SAFE_AREA}: ${match[1] as string};
  }
}
`,
    );

    /* La utilidad de relleno sigue compilándose igual: lo único que cambia es
       dónde vive el token. Si esto fallara, la mutación no mediría lo que dice. */
    expect(tokensUsedIn(conditional, PADDING_BOTTOM)).toEqual(
      tokensUsedIn(css, PADDING_BOTTOM),
    );

    expect(
      undeclaredTokensIn(conditional, PADDING_BOTTOM),
      "el token declarado sólo bajo una condición TIENE que caer: por debajo de esa condición la variable no existe",
    ).toEqual([SAFE_AREA]);
  }, COMPILE_TIMEOUT_MS);

  it("y con el token declarado como está hoy, sigue VERDE", () => {
    expect(undeclaredTokensIn(css, PADDING_BOTTOM)).toEqual([]);
    expect(isDeclaredIn(css, SAFE_AREA)).toBe(true);
  });
});
