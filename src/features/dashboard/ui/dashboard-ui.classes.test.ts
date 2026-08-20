import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import {
  type Extraction,
  compileGlobalsCss,
  emitsRule,
  extractClassNames,
  rulesFor,
  writtenClassAttributes,
} from "@/shared/ui/testing/class-names-from-source";

import { metricGridColumns } from "./MetricsPanel";
import { METRIC_KEYS } from "./metrics-display";

/**
 * GATE DE LA ENMIENDA E13 (b) + (c) + (d) — LA REJILLA DE MÉTRICAS Y EL USO DE
 * `Card` EN EL DASHBOARD.
 *
 * **Por qué existe.** E13(d): *"sin gate, E13 no se considera implementada, y el
 * gate tiene que llegar al CSS compilado"*. Y hay un aviso concreto que este
 * archivo tiene que honrar, el de la enmienda **E12(b)**: **las variantes son
 * MIN-WIDTH**. Una columna escrita para "desaparecer hacia abajo" **no compila a
 * nada** y no lo denuncia nadie: el nombre queda en el atributo, la regla no
 * existe y la pantalla se dibuja como si nunca se hubiera escrito. Por eso acá
 * no se comprueba que la clase esté puesta, se comprueba **qué emite** y **bajo
 * qué condición**.
 *
 * **Las tres cosas que asegura:**
 *
 * 1. La rejilla de métricas declara **tantas columnas como métricas elegidas**
 *    (1 → ancho completo, 2 → mitades, 3 → tercios), leído del `grid-template`
 *    del CSS compilado, no del nombre de la clase.
 * 2. El panel **usa de verdad** esa correspondencia: el juego de clases que el
 *    fuente escribe es exactamente el que la función produce. Volver a una
 *    rejilla fija deja fuera un caso y el test cae.
 * 3. **Ningún control lleva `Card`** (E13 c). `Card` es para contenido, y las
 *    que quedan en estos tres archivos son **tres**, todas de contenido: la
 *    tarjeta de métrica, su silueta de carga y la silueta de la tarjeta de
 *    proyecto. Las dos que envolvían un **control** —el paso a paso del año y el
 *    selector de orden— son las que se fueron.
 *
 * La técnica de barrido está en `shared/ui/testing/class-names-from-source.ts`
 * (la de la deuda 146, subida a pieza compartida). **Ni un nombre de clase
 * aparece literal acá**, tampoco en la prosa: Tailwind escanea los tests. Lo que
 * sí se escribe al literal son **nombres de propiedad CSS y de componente**, que
 * no son candidatos a clase.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const COMPONENTS = [
  "MetricsPanel.tsx",
  "DashboardView.tsx",
  "ActiveProjectsPanel.tsx",
];

/**
 * Fuentes externas admitidas, comparadas **exactas**:
 *
 * - `cn` — el ayudante de fusión del design system, que tiene sus propios gates.
 * - `inputClasses` — la piel del control de texto, también del design system.
 *
 * Si mañana aparece otra, el gate se pone rojo y obliga a decidir qué hacer con
 * ella en vez de perderla en silencio.
 */
const EXTERNAL_SOURCES = ["cn", "inputClasses"];

/** Nombres de propiedad CSS y de componente. No son candidatos a clase. */
const GRID_TEMPLATE_COLUMNS = "grid-template-columns";
const CARD = "Card";

/**
 * Las `Card` que quedan en estos tres archivos tras E13(c). Son **TRES**, y las
 * tres envuelven **contenido**, que es lo único que E13(c) permite:
 *
 * - `MetricsPanel.tsx` → **2**: la tarjeta de métrica y su silueta de carga, que
 *   dibuja el hueco de esa misma tarjeta mientras llegan los datos.
 * - `ActiveProjectsPanel.tsx` → **1**: la silueta de la tarjeta de proyecto.
 * - `DashboardView.tsx` → **0**.
 *
 * Las que se fueron son las dos que envolvían un **control**: el paso a paso del
 * año y el selector de orden. Ésa es la frontera de la enmienda —contenido sí,
 * control no—, no "cuántas quedan".
 *
 * Se cuenta por archivo y con número exacto: un `toBeLessThan` dejaría volver a
 * meter una alrededor de un control el día que se quite otra de contenido.
 */
const ALLOWED_CARDS: Record<string, number> = {
  "MetricsPanel.tsx": 2,
  "DashboardView.tsx": 0,
  "ActiveProjectsPanel.tsx": 1,
};

function componentPath(fileName: string): string {
  return fileURLToPath(new URL(`./${fileName}`, import.meta.url));
}

/** Cuántas veces se MONTA un componente con ese nombre en el JSX del archivo. */
function countJsxElements(filePath: string, tagName: string): number {
  const tree = ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  let found = 0;
  const visit = (node: ts.Node): void => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText() === tagName
    ) {
      found += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
}

/**
 * Cuántas columnas declara de verdad esta clase en el CSS compilado, y bajo qué
 * condición. `undefined` si la clase no declara columnas.
 */
function declaredColumns(
  css: string,
  className: string,
): { columns: number; conditions: string[] } | undefined {
  for (const rule of rulesFor(css, className)) {
    for (const declaration of rule.declarations) {
      if (declaration.property !== GRID_TEMPLATE_COLUMNS) {
        continue;
      }
      const repeats = declaration.value.match(/repeat\(\s*(\d+)/);
      if (repeats?.[1] !== undefined) {
        return {
          columns: Number.parseInt(repeats[1], 10),
          conditions: rule.conditions,
        };
      }
    }
  }
  return undefined;
}

const EXTRACTED = new Map<string, Extraction>(
  COMPONENTS.map((fileName) => [
    fileName,
    extractClassNames(componentPath(fileName)),
  ]),
);

/** Todas las cantidades de métricas que la app puede llegar a pintar. */
const COUNTS = METRIC_KEYS.map((_, index) => index + 1);

let css = "";

beforeAll(async () => {
  css = await compileGlobalsCss();
}, COMPILE_TIMEOUT_MS);

describe("el barrido de clases del Dashboard no se deja nada", () => {
  it("encuentra clases y atributos en los tres componentes", () => {
    for (const fileName of COMPONENTS) {
      const found = EXTRACTED.get(fileName);
      expect(found, fileName).toBeDefined();
      expect(found?.attributes, fileName).toBeGreaterThan(3);
      expect(found?.classes.length, fileName).toBeGreaterThan(10);
    }
  });

  it("ve tantos atributos de clase como hay escritos en el fuente", () => {
    for (const fileName of COMPONENTS) {
      const found = EXTRACTED.get(fileName);
      expect(
        (found?.attributes ?? 0) + (found?.objectProperties ?? 0),
        fileName,
      ).toBe(writtenClassAttributes(componentPath(fileName)));
    }
  });

  it("no queda ninguna forma de expresión sin seguir ni sin denunciar", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.unhandled, fileName).toEqual([]);
    }
  });

  it("ningún atributo de clase llega por un camino que el barrido no atraviesa", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.bypassed, fileName).toEqual([]);
    }
  });

  it("no resuelve ninguna clase por un nombre pisado ni reasignado", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.ambiguous, fileName).toEqual([]);
    }
  });

  it("sólo deja sin resolver lo que se declara fuera del archivo", () => {
    const external = new Set<string>();
    for (const fileName of COMPONENTS) {
      for (const name of EXTRACTED.get(fileName)?.external ?? []) {
        external.add(name);
      }
    }
    expect([...external].sort()).toEqual([...EXTERNAL_SOURCES].sort());
  });
});

describe("cada clase del Dashboard emite una regla real en el CSS compilado", () => {
  for (const fileName of COMPONENTS) {
    it(`${fileName}: Tailwind genera todas sus utilidades`, () => {
      const found = EXTRACTED.get(fileName)?.classes ?? [];
      const inert = found.filter((className) => !emitsRule(css, className));

      expect(
        inert,
        `estas clases de ${fileName} no generan ninguna regla: se quedan inertes en el atributo`,
      ).toEqual([]);
    });
  }
});

describe("la rejilla de métricas tiene tantas columnas como métricas elegidas (E13 b)", () => {
  /**
   * El tope de la escala no cambia: siguen siendo tres métricas conmutables y
   * superponibles (RFC-02 §1). Lo que cambia es que no se reserva sitio para lo
   * que no está. Si mañana hubiera una cuarta métrica, este test obliga a
   * ampliar la correspondencia en vez de dejarla corta en silencio.
   */
  it("cubre todas las cantidades que la app puede pintar", () => {
    expect(COUNTS.length).toBe(METRIC_KEYS.length);
    const produced = COUNTS.map((count) => metricGridColumns(count));
    expect(new Set(produced).size).toBe(COUNTS.length);
  });

  for (const count of [1, 2, 3]) {
    it(`con ${count} métrica(s), el CSS compilado declara ${count} columna(s)`, () => {
      const classes = metricGridColumns(count).split(/\s+/).filter(Boolean);

      const inert = classes.filter((className) => !emitsRule(css, className));
      expect(
        inert,
        "clases inertes: el nombre está en el atributo pero Tailwind no generó nada",
      ).toEqual([]);

      const declaring = classes
        .map((className) => ({
          className,
          declared: declaredColumns(css, className),
        }))
        .filter(
          (entry): entry is { className: string; declared: { columns: number; conditions: string[] } } =>
            entry.declared !== undefined,
        );

      expect(
        declaring.length,
        "ninguna de las clases de la rejilla declara columnas en el CSS compilado",
      ).toBeGreaterThan(0);

      /* La última gana en la cascada de Tailwind, y es la que decide el ancho
         donde la rejilla está desplegada. Es la que tiene que valer la cuenta. */
      const widest = declaring[declaring.length - 1] as (typeof declaring)[number];
      expect(widest.declared.columns, widest.className).toBe(count);

      /* La base va SIN condición: es lo que se ve en la pantalla más estrecha. */
      const base = declaring[0] as (typeof declaring)[number];
      expect(base.declared.conditions).toEqual([]);
      expect(base.declared.columns).toBe(1);
    });
  }

  /**
   * **EL AVISO DE E12(b), COMPROBADO Y NO CREÍDO.** Las variantes son
   * *min-width*: cada columna extra tiene que aparecer **hacia arriba**, dentro
   * de una condición de ancho mínimo. Una escrita para desaparecer hacia abajo
   * no compila a nada, y el único sitio donde eso se ve es el compilado.
   */
  it("las columnas extra viven en una condición de ancho MÍNIMO", () => {
    for (const count of [2, 3]) {
      const classes = metricGridColumns(count).split(/\s+/).filter(Boolean);
      const extra = classes
        .map((className) => ({ className, declared: declaredColumns(css, className) }))
        .filter((entry) => (entry.declared?.columns ?? 0) > 1);

      expect(extra.length, `con ${count} métricas`).toBeGreaterThan(0);

      for (const entry of extra) {
        const conditions = entry.declared?.conditions ?? [];
        expect(conditions.length, entry.className).toBeGreaterThan(0);
        expect(
          conditions.some(
            (condition) =>
              /width\s*>=/.test(condition) || /min-width/.test(condition),
          ),
          `${entry.className}: la condición no es de ancho mínimo, así que no aparece hacia arriba`,
        ).toBe(true);
      }
    }
  });

  /**
   * **Que la correspondencia exista no sirve si el panel no la usa.** Se compara
   * el juego de clases que declaran columnas en el FUENTE contra el que produce
   * la función: volver a una rejilla fija deja uno de los tres casos sin
   * escribir y el conjunto ya no coincide.
   */
  it("el panel escribe exactamente las clases de esa correspondencia", () => {
    const written = new Set(
      (EXTRACTED.get("MetricsPanel.tsx")?.classes ?? []).filter(
        (className) => declaredColumns(css, className) !== undefined,
      ),
    );
    const produced = new Set(
      COUNTS.flatMap((count) => metricGridColumns(count).split(/\s+/)).filter(
        Boolean,
      ),
    );

    expect([...written].sort()).toEqual([...produced].sort());
  });
});

describe("`Card` es para contenido: ningún control la lleva (E13 c)", () => {
  for (const fileName of COMPONENTS) {
    it(`${fileName}: monta las tarjetas justas`, () => {
      expect(countJsxElements(componentPath(fileName), CARD)).toBe(
        ALLOWED_CARDS[fileName],
      );
    });
  }
});
