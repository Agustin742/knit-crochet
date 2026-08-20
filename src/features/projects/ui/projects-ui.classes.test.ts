import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Gate de CSS COMPILADO para los tres componentes de `/proyectos` (deuda 146).
 *
 * **El problema que resuelve.** Una utilidad que Tailwind **no genera** es una
 * cadena inerte en el atributo `class`: no rompe nada, no avisa, y la pantalla
 * simplemente no tiene ese estilo. Ningún gate del repo lo veía. `happy-dom` no
 * maqueta, `axe` no mide píxeles y los tests de comportamiento leen roles, así
 * que **una clase inventada salía verde en toda la suite**. Es la REGLA 7
 * (medir la salida, no la intención) aplicada al CSS. El único sitio donde ya se
 * medía era `segmented-control.tokens.test.ts`, para un solo primitivo.
 *
 * **Por qué NO se copió la técnica del segmentado.** Aquel gate deriva cada
 * nombre de clase de `segmented-control.variants.ts`, que es donde viven TODAS
 * las clases del primitivo por construcción (`cva`). Estos tres componentes son
 * composiciones de página: las clases se escriben **sueltas, dentro del propio
 * JSX**, así que no hay ningún archivo de variantes del que derivarlas.
 *
 * **Por qué NO se extrajeron a un archivo de variantes por componente** (la otra
 * opción sobre la mesa): eso mueve el literal de sitio pero **no cierra el
 * agujero**. El día siguiente alguien escribe una clase suelta en el JSX —que es
 * lo natural en una composición de página— y vuelve a quedar fuera del gate. El
 * gate pasaría a depender de la disciplina, que es justo lo que un gate existe
 * para no necesitar. Además dejaría el JSX de tres pantallas hablando por
 * referencias a un objeto de estilos, para ganar cero cobertura.
 *
 * **Lo que se hace en su lugar: derivar del FUENTE.** Se parsea el TSX con el
 * compilador de TypeScript (no con expresiones regulares a ojo), se recorren los
 * `className` que aparecen como atributo y se resuelve lo que cada uno vale
 * —cadenas, plantillas, constantes y funciones **del propio archivo**, arrays con
 * `join`, ternarios y concatenaciones—, y cada nombre resultante se busca en el
 * CSS que sale del compilador. Cubre lo que hay hoy **y lo que se escriba
 * mañana**, sin registrar nada a mano; mismo criterio que
 * `canonical-tailwind-classes.test.ts`, que barre `src/**` por recorrido en vez
 * de por lista fija.
 *
 * **Lo que el gate promete NO es entenderlo todo: es no callarse.** Aquí no se
 * dice "se recogen todos los `className`" —eso decía la versión anterior y era
 * falso, con clases inertes llegando al DOM y ocho tests en verde—. Lo que se
 * garantiza es que **cada camino que el barrido no atraviesa queda registrado y
 * pone el gate en rojo** en vez de desaparecer. Resolver el ámbito de verdad sería
 * medio compilador; denunciar cuesta cuatro líneas. Caminos hoy denunciados:
 *
 * - forma de expresión que el resolvedor no sigue → `unhandled`;
 * - identificador o función **de otro archivo** → `external`, con lista exacta;
 * - nombre **declarado dos veces** o **reasignado** después de su inicializador
 *   (`let x = "…"; x += "…"`) → `ambiguous`;
 * - `className` que llega por un **atributo esparcido** o como **propiedad de un
 *   literal de objeto** → `bypassed`.
 *
 * Los tres últimos nacieron de verdes falsos medidos, no de imaginarlos.
 *
 * **La comparación contra el CSS exige frontera de nombre, y ahí este gate va MÁS
 * LEJOS que el del segmentado.** Buscar el punto más el nombre como subcadena
 * —que es lo que hace el gate del primitivo para comprobar existencia— da por
 * buena cualquier clase que sea **prefijo** de una real: a una utilidad recortada
 * le sigue sobrando texto dentro de un selector más largo y la subcadena aparece
 * igual. Anclar a la llave de apertura tampoco basta, porque lo que hay en medio
 * admite justo esas letras que faltan. Por eso aquí se exige que **el nombre
 * termine ahí**: el carácter siguiente no puede ser uno que todavía forme parte
 * del nombre de clase (letra, dígito, guion bajo, guion, o una barra invertida
 * que escape al siguiente). Lo destapó el reviewer del lote metiendo una utilidad
 * recortada y viendo el gate en verde.
 *
 * **Ni un nombre de clase aparece literal en este archivo**, y hay que
 * cumplirlo también en la PROSA: Tailwind escanea los tests, así que una utilidad
 * citada de ejemplo se convierte en CSS de producción (una inválida rompería el
 * build). No vale sólo con no escribir clases en el código: la primera versión de
 * este archivo metió una regla real en el CSS **por dos palabras de un
 * comentario** —el nombre en inglés de las utilidades de flujo y de rejilla—, y se
 * comprobó compilando `globals.css` dos veces. Por eso aquí las utilidades se
 * nombran en castellano y a lo que se escribe al literal se le exige no ser un
 * candidato a clase: **nombres de archivo y de identificador**.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const GLOBALS_CSS = fileURLToPath(
  new URL("../../../app/globals.css", import.meta.url),
);

/** Los tres componentes de la lista de proyectos, por nombre de archivo. */
const COMPONENTS = [
  "ProjectsView.tsx",
  "ProjectCard.tsx",
  "ProjectsToolbar.tsx",
];

/** El atributo del que cuelga todo. No es una clase: es el nombre del atributo. */
const CLASS_ATTRIBUTE = "className";

/**
 * Los únicos identificadores que un `className` puede traer **de fuera del
 * archivo**, y por eso no se resuelven aquí:
 *
 * - `className` — la prop que el llamador pasa a `ProjectCard`; su valor lo pone
 *   quien la monta, y esos sitios están cubiertos por su propio archivo.
 * - `inputClasses` — viene del design system (`shared/ui`), o sea de la capa que
 *   tiene sus propios gates.
 *
 * **También entra aquí una función de otro archivo que se llame desde un
 * `className`** (`algo(...)`): lo que devuelve no se puede seguir desde este
 * fuente, así que su nombre se registra igual que el de una constante importada.
 *
 * La lista se comprueba **exacta**: si mañana aparece otra fuente de clases que
 * este gate no sabe seguir, el test se pone rojo y obliga a decidir qué hacer
 * con ella, en vez de perderla en silencio.
 */
const EXTERNAL_SOURCES = ["className", "inputClasses"];

function componentPath(fileName: string): string {
  return fileURLToPath(new URL(`./${fileName}`, import.meta.url));
}

/** Nombre de clase → selector, con el escapado que hace Tailwind. */
function selectorFor(className: string): string {
  return `.${className.replace(/[^\w-]/g, (char) => `\\${char}`)}`;
}

/**
 * ¿Tailwind emitió una regla **para esta clase exacta**?
 *
 * La comparación por subcadena no sirve, y no es un detalle teórico: una utilidad
 * a la que le falta la última letra es prefijo de la buena, así que su selector
 * aparece dentro del de la otra y el gate la da por buena estando **inerte** en el
 * atributo. Por eso se exige **frontera de fin de nombre**: detrás del selector no
 * puede venir un carácter que todavía forme parte del nombre de la clase.
 *
 * Qué cuenta como "todavía parte del nombre": letra, dígito, guion bajo, guion —y
 * una **barra invertida**, porque Tailwind escapa así los caracteres especiales de
 * una utilidad (los dos puntos de una variante, los paréntesis de un token, la
 * barra de una altura de línea). Sin esa última exclusión, el nombre corto de una
 * utilidad daría por buena su versión con variante o con valor.
 */
function emitsRule(className: string): boolean {
  const selector = selectorFor(className).replace(
    /[.*+?^${}()|[\]\\]/g,
    (char) => `\\${char}`,
  );
  return new RegExp(`${selector}(?![\\w\\\\-])`).test(css);
}

function tokensOf(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

type Extraction = {
  classes: string[];
  /** Atributos `className` encontrados en el árbol. */
  attributes: number;
  /**
   * Por cada atributo que no produjo ni una clase, **de quién dependía**: el
   * nombre del identificador si era una referencia directa, y si no la forma de
   * expresión. Todos tienen que venir de fuera del archivo.
   */
  emptyAttributes: string[];
  /** Propiedades `className` dentro de un literal de objeto. */
  objectProperties: number;
  /**
   * Caminos por los que un `className` puede llegar **sin pasar por el barrido**:
   * atributos esparcidos y `className` como propiedad de objeto. Debe ir vacío.
   */
  bypassed: string[];
  /** Identificadores que este archivo no declara (incluidas funciones llamadas). */
  external: string[];
  /** Nombres declarados dos veces y usados para resolver clases. Debe ir vacío. */
  ambiguous: string[];
  /** Formas de expresión que el resolvedor no sabe seguir. Debe quedar vacío. */
  unhandled: string[];
};

/**
 * Saca del fuente todas las clases que acaban en un `className`.
 *
 * Se resuelve **por AST**, no por expresión regular: una regex tendría que
 * adivinar dónde acaba una expresión de JSX, y lo que se le escape se pierde sin
 * hacer ruido — que es exactamente el fallo que este gate viene a impedir.
 */
function extractClasses(filePath: string): Extraction {
  const source = readFileSync(filePath, "utf8");
  const tree = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  /* Declaraciones del propio archivo, a cualquier profundidad: `frame` vive
     dentro de una función y `CREATE_LINK_CLASSES` en el módulo.

     El índice es por NOMBRE, no por ámbito: dos constantes homónimas en funciones
     distintas se pisarían y ganaría la última, o sea otra vía de perder clases en
     silencio. No se resuelve el ámbito (sería medio compilador) — se **detecta la
     colisión**: los nombres repetidos van a `shadowed`, y si alguno se usa de
     verdad para resolver un `className` el gate lo denuncia en vez de elegir uno
     de los dos a ciegas. Hoy no hay ninguno en estos tres archivos. */
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

  /* Nombres a los que se ASIGNA algo en algún punto del archivo (`=`, `+=`, …).
     El barrido resuelve un identificador por su INICIALIZADOR, así que una clase
     añadida después —`let x = "…"; x += " …";`— se perdería entera y en silencio,
     con las clases escritas en TypeScript corriente dentro del propio archivo. No
     se simula la ejecución (eso ya sería un intérprete): se **denuncia** si un
     nombre reasignado llega a usarse para resolver un `className`. */
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
      /* Dos formas de que el inicializador NO sea la verdad del nombre, y las dos
         se denuncian en vez de resolverse a ciegas:
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
      /* Método sobre algo (`[...].join(" ")`): las clases están en el receptor, y
         el receptor se resuelve como cualquier otra expresión —si es un
         identificador de fuera, cae en `external` y se denuncia—. */
      if (ts.isPropertyAccessExpression(node.expression)) {
        return [
          ...resolve(node.expression.expression, seen),
          ...node.arguments.flatMap((argument) => resolve(argument, seen)),
        ];
      }
      /* Función propia del archivo (`quickStartNoticeClasses(...)`): las clases
         están en lo que DEVUELVE, no en lo que recibe — por eso sus argumentos no
         se miran, o entrarían identificadores que no son clases. */
      if (ts.isIdentifier(node.expression) && locals.has(node.expression.text)) {
        return resolve(locals.get(node.expression.text) as ts.Node, seen);
      }
      /* Función de OTRO archivo. Aquí estaba el peor agujero de la primera
         versión (lo destapó el reviewer): se devolvían los argumentos como si
         fueran el resultado, así que con un solo argumento resoluble el atributo
         salía "no vacío" y **las clases que la función devuelve de verdad no se
         comprobaban jamás** — verde con una clase inerte en el DOM. Ahora la
         llamada se registra como fuente externa: los argumentos se siguen mirando
         (pueden ser clases), pero el nombre llamado entra en `external`, y como la
         lista de fuentes externas se compara EXACTA, aparecer ahí pone el gate en
         rojo hasta que alguien decida qué hacer con esa función. */
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
    /* Un atributo esparcido (`{...props}`) puede traer clases sin que aparezca la
       palabra `className` como atributo — ni con un `=` detrás, así que se le
       escapaba TAMBIÉN al contraste contra el texto crudo: las dos redes tenían el
       mismo agujero, y la segunda existe justamente para tapar lo que se le pasa a
       la primera. Seguir de dónde sale el objeto sería resolver el ámbito; lo que
       este gate promete es **denunciar en vez de callar**, así que se denuncia. */
    if (ts.isJsxSpreadAttribute(node)) {
      bypassed.push(node.getText().slice(0, 60));
    }
    /* Lo mismo por el otro lado: `className` como propiedad de un literal de
       objeto (el que se esparce, o el que se pasa a un componente). No se cuenta
       como atributo resuelto — se denuncia, y además entra en la aritmética del
       contraste contra el texto crudo. */
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
        /* El motivo se nombra por el identificador del que dependía —la referencia
           directa o la función llamada— para que el mensaje del rojo diga QUÉ hay
           que decidir, y no sólo "una expresión". */
        const named =
          inner === undefined
            ? undefined
            : ts.isIdentifier(inner)
              ? inner.text
              : ts.isCallExpression(inner) && ts.isIdentifier(inner.expression)
                ? inner.expression.text
                : undefined;
        emptyAttributes.push(
          named ?? ts.SyntaxKind[node.initializer.kind],
        );
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

const EXTRACTED = new Map(
  COMPONENTS.map((fileName) => [
    fileName,
    extractClasses(componentPath(fileName)),
  ]),
);

let css = "";

beforeAll(async () => {
  const source = readFileSync(GLOBALS_CSS, "utf8");
  const result = await postcss([tailwindcss()]).process(source, {
    from: GLOBALS_CSS,
  });
  css = result.css;
}, COMPILE_TIMEOUT_MS);

describe("el barrido de clases de /proyectos no se deja nada", () => {
  /**
   * Sin esto, un resolvedor roto —que devolviera cero clases— dejaría el gate en
   * verde perpetuo: el número de abajo es la diferencia entre medir y aparentar.
   */
  it("encuentra clases y atributos en los tres componentes", () => {
    for (const fileName of COMPONENTS) {
      const found = EXTRACTED.get(fileName);
      expect(found, fileName).toBeDefined();
      expect(found?.attributes, fileName).toBeGreaterThan(5);
      expect(found?.classes.length, fileName).toBeGreaterThan(15);
    }
  });

  /**
   * Contraste contra el texto crudo: si el recorrido del árbol se saltara un
   * `className`, el AST vería menos de los que hay escritos.
   *
   * Cuenta las dos formas de **dar** un valor —la de atributo y la de propiedad de
   * objeto, o sea el nombre seguido de igual o de dos puntos—, y no las de
   * **declararlo**: ni la firma de tipo (`className?: string`) ni la
   * desestructuración llevan ninguna de las dos justo detrás del nombre. La forma
   * con dos puntos entró en la cuenta porque sin ella **las dos redes tenían el
   * mismo agujero**: un objeto esparcido no escribe el atributo en ninguna parte,
   * así que ni el AST lo veía ni el texto crudo lo delataba (deuda 146, tercera
   * vía de verde falso). Una segunda red que falla donde falla la primera no es
   * una segunda red.
   */
  it("ve tantos className como hay escritos en el fuente", () => {
    for (const fileName of COMPONENTS) {
      const source = readFileSync(componentPath(fileName), "utf8");
      const written = [
        ...source.matchAll(new RegExp(`${CLASS_ATTRIBUTE}\s*[=:]`, "g")),
      ].length;
      const found = EXTRACTED.get(fileName);

      expect(
        (found?.attributes ?? 0) + (found?.objectProperties ?? 0),
        fileName,
      ).toBe(written);
    }
  });

  /**
   * **Alcance, dicho sin absolutos** (la deuda 148 aplicada a este archivo): el
   * resolvedor sigue cadenas, plantillas, constantes y funciones **del propio
   * archivo**, arrays con `join`, ternarios y concatenaciones. Lo que no sabe
   * seguir no lo adivina: lo registra. Este test exige que hoy no quede ninguna
   * forma sin seguir en los tres componentes.
   */
  it("no queda ninguna forma de expresión sin seguir ni sin denunciar", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.unhandled, fileName).toEqual([]);
    }
  });

  /**
   * Los dos caminos por los que un `className` puede llegar al DOM **sin pasar por
   * el barrido**, y que costaron dos verdes falsos con la clase inerte puesta:
   *
   * - un **atributo esparcido**, que es idiomático en React y no escribe el nombre
   *   del atributo en ninguna parte del JSX;
   * - `className` como **propiedad de un literal de objeto**, que es lo que ese
   *   objeto esparcido suele llevar dentro.
   *
   * Seguir de dónde sale el objeto sería resolver el ámbito, o sea medio
   * compilador. **Lo que este gate promete no es entenderlo todo: es no callarse.**
   * Hoy no hay ninguno en los tres componentes, así que el test nace verde y se
   * pone rojo el día que aparezca uno — que es justo cuando hay que decidir.
   */
  it("ningún className llega por un camino que el barrido no atraviesa", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.bypassed, fileName).toEqual([]);
    }
  });

  /**
   * **Dos formas de que el inicializador de un nombre no sea lo que ese nombre
   * vale**, y las dos perdían clases en silencio:
   *
   * - **declarado dos veces** — el índice de `locals` es por nombre y no por
   *   ámbito (ver su comentario), así que la segunda declaración pisa a la
   *   primera y el barrido elegiría una a ciegas;
   * - **reasignado** — `let x = "…"; x += " …";` es TypeScript corriente, las
   *   clases están escritas **dentro del archivo**, y aun así el resolvedor sólo
   *   miraba el inicializador. Fue la peor de las vías de verde falso medidas,
   *   justamente por eso.
   *
   * Ninguna de las dos se resuelve —haría falta interpretar el programa—: se
   * denuncian, y sólo si el nombre llega a usarse para resolver un `className`.
   */
  it("no resuelve ninguna clase por un nombre pisado ni reasignado", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.ambiguous, fileName).toEqual([]);
    }
  });

  /**
   * Los únicos `className` que pueden quedar vacíos son los que traen su valor de
   * fuera del archivo, y son exactamente los de `EXTERNAL_SOURCES`. Comprobado en
   * las dos direcciones: una fuente externa nueva pone el gate en rojo.
   */
  it("sólo deja sin resolver lo que se declara fuera del archivo", () => {
    const external = new Set<string>();
    const empty: string[] = [];

    for (const fileName of COMPONENTS) {
      const found = EXTRACTED.get(fileName);
      empty.push(...(found?.emptyAttributes ?? []));
      for (const name of found?.external ?? []) {
        external.add(name);
      }
    }

    expect([...external].sort()).toEqual([...EXTERNAL_SOURCES].sort());
    /* Un `className` puede quedar vacío SÓLO por depender de uno de esos dos
       nombres. `inputClasses` aparece dos veces, así que se comparan conjuntos y
       no cuentas: lo que importa es que no haya ni un motivo distinto. */
    expect([...new Set(empty)].sort()).toEqual([...EXTERNAL_SOURCES].sort());
  });
});

describe("cada clase de /proyectos emite una regla real en el CSS compilado", () => {
  for (const fileName of COMPONENTS) {
    it(`${fileName}: Tailwind genera todas sus utilidades`, () => {
      const found = EXTRACTED.get(fileName)?.classes ?? [];
      const inert = found.filter((className) => !emitsRule(className));

      expect(
        inert,
        `estas clases de ${fileName} no generan ninguna regla: se quedan inertes en el atributo`,
      ).toEqual([]);
    });
  }
});
