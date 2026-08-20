import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import ts from "typescript";

/**
 * HERRAMIENTA COMPARTIDA DE LOS GATES DE CSS COMPILADO.
 *
 * Nace de `src/features/projects/ui/projects-ui.classes.test.ts` (deuda 146),
 * que es donde se pagó el precio de descubrir cada agujero. Aquel archivo tenía
 * la técnica entera dentro y era el único que la usaba; la enmienda E13 pide el
 * mismo gate para el caparazón y para el Dashboard, así que la pieza sube acá
 * **una vez** en vez de copiarse tres. Copiarla habría significado que el
 * próximo agujero se arregla en un sitio y sigue abierto en los otros dos —que
 * es exactamente cómo nacieron las deudas 40, 43 y 71.
 *
 * **El problema que resuelve.** Una utilidad que Tailwind **no genera** es una
 * cadena inerte en el atributo de clase: no rompe nada, no avisa, y la pantalla
 * simplemente no tiene ese estilo. `happy-dom` no maqueta, `axe` no mide píxeles
 * y los tests de comportamiento leen roles, así que **una clase inventada sale
 * verde en toda la suite**. Es la REGLA 7 (medir la salida, no la intención)
 * aplicada al CSS.
 *
 * **Cómo.** Se parsea el fuente con el compilador de TypeScript (no con
 * expresiones regulares a ojo), se recorren los atributos de clase que aparecen
 * en el JSX y se resuelve lo que cada uno vale —cadenas, plantillas, constantes
 * y funciones **del propio archivo**, arrays con unión, ternarios y
 * concatenaciones—, y cada nombre resultante se busca en el CSS que sale del
 * compilador de Tailwind.
 *
 * **Lo que promete NO es entenderlo todo: es no callarse.** Cada camino que el
 * barrido no atraviesa queda registrado y pone el gate en rojo en vez de
 * desaparecer. Resolver el ámbito de verdad sería medio compilador; denunciar
 * cuesta cuatro líneas. Caminos denunciados:
 *
 * - forma de expresión que el resolvedor no sigue → `unhandled`;
 * - identificador o función **de otro archivo** → `external`, con lista exacta;
 * - nombre **declarado dos veces** o **reasignado** después de su inicializador
 *   → `ambiguous`;
 * - atributo de clase que llega por un **atributo esparcido** o como **propiedad
 *   de un literal de objeto** → `bypassed`.
 *
 * Los tres últimos nacieron de verdes falsos medidos, no de imaginarlos.
 *
 * **Ni un nombre de clase aparece literal en este archivo**, y hay que cumplirlo
 * también en la PROSA: Tailwind escanea `src/**`, así que una utilidad citada de
 * ejemplo se convierte en CSS de producción (una inválida rompería el build). La
 * primera versión del gate original metió una regla real en el CSS **por dos
 * palabras de un comentario**. Por eso acá las utilidades se nombran en
 * castellano.
 */

/** El atributo del que cuelga todo. No es una clase: es el nombre del atributo. */
export const CLASS_ATTRIBUTE = "className";

const GLOBALS_CSS = fileURLToPath(
  new URL("../../../app/globals.css", import.meta.url),
);

/** Compila `globals.css` de verdad. Es la única fuente de CSS de la app. */
export async function compileGlobalsCss(): Promise<string> {
  const source = readFileSync(GLOBALS_CSS, "utf8");
  const result = await postcss([tailwindcss()]).process(source, {
    from: GLOBALS_CSS,
  });
  return result.css;
}

/** Nombre de clase → selector, con el escapado que hace Tailwind. */
export function selectorFor(className: string): string {
  return `.${className.replace(/[^\w-]/g, (char) => `\\${char}`)}`;
}

function selectorPattern(className: string): RegExp {
  const selector = selectorFor(className).replace(
    /[.*+?^${}()|[\]\\]/g,
    (char) => `\\${char}`,
  );
  /* FRONTERA DE FIN DE NOMBRE, y acá está la diferencia con buscar por
     subcadena: a una utilidad recortada le sigue sobrando texto dentro del
     selector de la buena, así que la subcadena aparece igual y el gate la da por
     válida estando INERTE en el atributo. Lo destapó el reviewer de la deuda 146
     metiendo una utilidad recortada y viendo el gate en verde.
     Qué cuenta como "todavía parte del nombre": letra, dígito, guion bajo, guion
     —y una barra invertida, porque Tailwind escapa así los caracteres especiales
     de una utilidad—. Sin esa última exclusión, el nombre corto daría por buena
     su versión con variante o con valor. */
  return new RegExp(`${selector}(?![\\w\\\\-])`);
}

/** ¿Tailwind emitió una regla **para esta clase exacta**? */
export function emitsRule(css: string, className: string): boolean {
  return selectorPattern(className).test(css);
}

/**
 * **Igualdad de nombre de token**, reexportada desde `css-tokens.ts` para que
 * los gates que ya consumen esta pieza no tengan que importar dos módulos.
 *
 * Vive allá y no acá porque un test de DOM también la necesita y no puede pagar
 * el compilador de Tailwind que este archivo arrastra. Su porqué —el verde falso
 * que la ronda 1 de E13 dejó pasar con el tope apuntando a un token inexistente—
 * está escrito en su propio módulo.
 */
export { tokensIn, usesToken } from "./css-tokens";

/** Una regla realmente emitida por Tailwind para una clase. */
export interface EmittedRule {
  /** Declaraciones de la regla, en orden: propiedad → valor. */
  declarations: { property: string; value: string }[];
  /**
   * Condiciones de las reglas-arroba que la envuelven, de fuera hacia dentro
   * (p. ej. la consulta de medios de una variante responsive). Las capas no
   * cuentan: no condicionan nada, sólo ordenan.
   */
  conditions: string[];
}

/**
 * Las reglas que el CSS compilado trae **para esta clase exacta**, con sus
 * declaraciones y las condiciones que las envuelven.
 *
 * Existe porque comprobar que una clase "emite algo" no basta cuando lo que hay
 * que verificar es **qué** emite: que el tope de ancho sea el token y no otra
 * cosa, o que una variante responsive viva de verdad dentro de una consulta de
 * ancho MÍNIMO (enmienda E12 b: las variantes son min-width, y una columna
 * escrita para desaparecer hacia abajo no compila a nada).
 */
export function rulesFor(css: string, className: string): EmittedRule[] {
  const pattern = selectorPattern(className);
  const found: EmittedRule[] = [];

  postcss.parse(css).walkRules((rule) => {
    if (!pattern.test(rule.selector)) {
      return;
    }

    const conditions: string[] = [];
    let parent: postcss.Container | postcss.Document | undefined = rule.parent;
    while (parent !== undefined && parent.type === "atrule") {
      const atRule = parent as postcss.AtRule;
      if (atRule.name !== "layer") {
        conditions.unshift(`@${atRule.name} ${atRule.params}`.trim());
      }
      parent = atRule.parent;
    }

    const declarations: { property: string; value: string }[] = [];
    rule.each((node) => {
      if (node.type === "decl") {
        declarations.push({ property: node.prop, value: node.value });
      }
    });

    found.push({ declarations, conditions });
  });

  return found;
}

export interface Extraction {
  classes: string[];
  /** Atributos de clase encontrados en el árbol. */
  attributes: number;
  /**
   * Por cada atributo que no produjo ni una clase, **de quién dependía**: el
   * nombre del identificador si era una referencia directa, y si no la forma de
   * expresión. Todos tienen que venir de fuera del archivo.
   */
  emptyAttributes: string[];
  /** Atributos de clase declarados como propiedad de un literal de objeto. */
  objectProperties: number;
  /**
   * Caminos por los que un atributo de clase puede llegar **sin pasar por el
   * barrido**: atributos esparcidos y propiedades de objeto. Debe ir vacío.
   */
  bypassed: string[];
  /** Identificadores que este archivo no declara (incluidas funciones llamadas). */
  external: string[];
  /** Nombres declarados dos veces y usados para resolver clases. Debe ir vacío. */
  ambiguous: string[];
  /** Formas de expresión que el resolvedor no sabe seguir. Debe quedar vacío. */
  unhandled: string[];
}

function tokensOf(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

/**
 * Cuenta cuántos atributos de clase hay **escritos en el texto crudo**, para
 * contrastar contra lo que vio el árbol.
 *
 * Cuenta las dos formas de **dar** un valor —la de atributo y la de propiedad de
 * objeto, o sea el nombre seguido de igual o de dos puntos—, y no las de
 * **declararlo**: ni la firma de tipo ni la desestructuración llevan ninguna de
 * las dos justo detrás del nombre. La forma con dos puntos entró en la cuenta
 * porque sin ella **las dos redes tenían el mismo agujero**: un objeto esparcido
 * no escribe el atributo en ninguna parte, así que ni el árbol lo veía ni el
 * texto crudo lo delataba. Una segunda red que falla donde falla la primera no
 * es una segunda red.
 */
export function writtenClassAttributes(filePath: string): number {
  const source = readFileSync(filePath, "utf8");
  return [...source.matchAll(new RegExp(`${CLASS_ATTRIBUTE}\\s*[=:]`, "g"))]
    .length;
}

/**
 * Saca del fuente todas las clases que acaban en un atributo de clase.
 *
 * Se resuelve **por AST**, no por expresión regular: una regex tendría que
 * adivinar dónde acaba una expresión de JSX, y lo que se le escape se pierde sin
 * hacer ruido — que es exactamente el fallo que estos gates vienen a impedir.
 */
export function extractClassNames(filePath: string): Extraction {
  const source = readFileSync(filePath, "utf8");
  const tree = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  /* Declaraciones del propio archivo, a cualquier profundidad: una constante
     puede vivir dentro de una función o en el módulo.

     El índice es por NOMBRE, no por ámbito: dos constantes homónimas en
     funciones distintas se pisarían y ganaría la última, o sea otra vía de
     perder clases en silencio. No se resuelve el ámbito (sería medio
     compilador) — se **detecta la colisión**: los nombres repetidos van a
     `shadowed`, y si alguno se usa de verdad para resolver un atributo de clase
     el gate lo denuncia en vez de elegir uno de los dos a ciegas. */
  const locals = new Map<string, ts.Node>();
  const shadowed = new Set<string>();
  const collectLocals = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      if (locals.has(node.name.text)) {
        shadowed.add(node.name.text);
      }
      locals.set(node.name.text, node.initializer);
    }
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      if (locals.has(node.name.text)) {
        shadowed.add(node.name.text);
      }
      locals.set(node.name.text, node);
    }
    ts.forEachChild(node, collectLocals);
  };
  collectLocals(tree);

  /* Nombres a los que se ASIGNA algo en algún punto del archivo. El barrido
     resuelve un identificador por su INICIALIZADOR, así que una clase añadida
     después se perdería entera y en silencio, con las clases escritas en
     TypeScript corriente dentro del propio archivo. No se simula la ejecución
     (eso ya sería un intérprete): se **denuncia** si un nombre reasignado llega
     a usarse para resolver un atributo de clase. */
  const reassigned = new Set<string>();
  const collectAssignments = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      ts.isIdentifier(node.left) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      reassigned.add(node.left.text);
    }
    ts.forEachChild(node, collectAssignments);
  };
  collectAssignments(tree);

  const external = new Set<string>();
  const ambiguous = new Set<string>();
  const unhandled = new Set<string>();

  function resolve(node: ts.Node, seen: Set<ts.Node>): string[] {
    if (seen.has(node)) {
      return [];
    }
    seen.add(node);

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return tokensOf(node.text);
    }
    if (ts.isTemplateExpression(node)) {
      return [
        ...tokensOf(node.head.text),
        ...node.templateSpans.flatMap((span) => [
          ...resolve(span.expression, seen),
          ...tokensOf(span.literal.text),
        ]),
      ];
    }
    if (ts.isJsxExpression(node)) {
      return node.expression === undefined ? [] : resolve(node.expression, seen);
    }
    if (ts.isParenthesizedExpression(node)) {
      return resolve(node.expression, seen);
    }
    if (ts.isConditionalExpression(node)) {
      return [
        ...resolve(node.whenTrue, seen),
        ...resolve(node.whenFalse, seen),
      ];
    }
    if (ts.isBinaryExpression(node)) {
      return [...resolve(node.left, seen), ...resolve(node.right, seen)];
    }
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.flatMap((element) => resolve(element, seen));
    }
    if (ts.isIdentifier(node)) {
      const declaration = locals.get(node.text);
      if (declaration === undefined) {
        external.add(node.text);
        return [];
      }
      /* Dos formas de que el inicializador NO sea la verdad del nombre, y las
         dos se denuncian en vez de resolverse a ciegas:
         - declarado dos veces (el índice es por nombre, no por ámbito);
         - reasignado después de declararse, que es donde se perdían clases
           escritas en TypeScript corriente dentro del propio archivo. */
      if (shadowed.has(node.text) || reassigned.has(node.text)) {
        ambiguous.add(node.text);
      }
      return resolve(declaration, seen);
    }
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
      const returned: string[] = [];
      if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
        return resolve(node.body, seen);
      }
      const visitReturns = (child: ts.Node): void => {
        if (ts.isReturnStatement(child) && child.expression !== undefined) {
          returned.push(...resolve(child.expression, seen));
        }
        ts.forEachChild(child, visitReturns);
      };
      if (node.body !== undefined) {
        visitReturns(node.body);
      }
      return returned;
    }
    if (ts.isCallExpression(node)) {
      /* Método sobre algo (una unión de array, por ejemplo): las clases están en
         el receptor, y el receptor se resuelve como cualquier otra expresión —si
         es un identificador de fuera, cae en `external` y se denuncia—. */
      if (ts.isPropertyAccessExpression(node.expression)) {
        return [
          ...resolve(node.expression.expression, seen),
          ...node.arguments.flatMap((argument) => resolve(argument, seen)),
        ];
      }
      /* Función propia del archivo: las clases están en lo que DEVUELVE, no en
         lo que recibe — por eso sus argumentos no se miran, o entrarían
         identificadores que no son clases. */
      if (ts.isIdentifier(node.expression) && locals.has(node.expression.text)) {
        return resolve(locals.get(node.expression.text) as ts.Node, seen);
      }
      /* Función de OTRO archivo. Acá estaba el peor agujero de la primera
         versión del gate original (lo destapó el reviewer): se devolvían los
         argumentos como si fueran el resultado, así que con un solo argumento
         resoluble el atributo salía "no vacío" y **las clases que la función
         devuelve de verdad no se comprobaban jamás** — verde con una clase
         inerte en el DOM. Ahora la llamada se registra como fuente externa: los
         argumentos se siguen mirando (pueden ser clases), pero el nombre llamado
         entra en `external`, y como la lista de fuentes externas se compara
         EXACTA, aparecer ahí pone el gate en rojo hasta que alguien decida qué
         hacer con esa función. */
      if (ts.isIdentifier(node.expression)) {
        external.add(node.expression.text);
        return node.arguments.flatMap((argument) => resolve(argument, seen));
      }
      unhandled.add(ts.SyntaxKind[node.expression.kind]);
      return [];
    }

    unhandled.add(ts.SyntaxKind[node.kind]);
    return [];
  }

  const classes = new Set<string>();
  const emptyAttributes: string[] = [];
  const bypassed: string[] = [];
  let attributes = 0;
  let objectProperties = 0;

  const visit = (node: ts.Node): void => {
    /* Un atributo esparcido puede traer clases sin que aparezca el nombre del
       atributo — ni con un igual detrás, así que se le escapaba TAMBIÉN al
       contraste contra el texto crudo: las dos redes tenían el mismo agujero, y
       la segunda existe justamente para tapar lo que se le pasa a la primera.
       Seguir de dónde sale el objeto sería resolver el ámbito; lo que este gate
       promete es **denunciar en vez de callar**, así que se denuncia. */
    if (ts.isJsxSpreadAttribute(node)) {
      bypassed.push(node.getText().slice(0, 60));
    }
    /* Lo mismo por el otro lado: el atributo de clase como propiedad de un
       literal de objeto (el que se esparce, o el que se pasa a un componente).
       No se cuenta como atributo resuelto — se denuncia, y además entra en la
       aritmética del contraste contra el texto crudo. */
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText() === CLASS_ATTRIBUTE
    ) {
      objectProperties += 1;
      bypassed.push(node.getText().slice(0, 60));
    }
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText() === CLASS_ATTRIBUTE &&
      node.initializer !== undefined
    ) {
      attributes += 1;
      const found = resolve(node.initializer, new Set());
      if (found.length === 0) {
        const inner = ts.isJsxExpression(node.initializer)
          ? node.initializer.expression
          : undefined;
        /* El motivo se nombra por el identificador del que dependía —la
           referencia directa o la función llamada— para que el mensaje del rojo
           diga QUÉ hay que decidir, y no sólo "una expresión". */
        const named =
          inner === undefined
            ? undefined
            : ts.isIdentifier(inner)
              ? inner.text
              : ts.isCallExpression(inner) && ts.isIdentifier(inner.expression)
                ? inner.expression.text
                : undefined;
        emptyAttributes.push(named ?? ts.SyntaxKind[node.initializer.kind]);
      }
      for (const className of found) {
        classes.add(className);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);

  return {
    classes: [...classes],
    attributes,
    objectProperties,
    emptyAttributes,
    bypassed,
    external: [...external],
    ambiguous: [...ambiguous],
    unhandled: [...unhandled],
  };
}
