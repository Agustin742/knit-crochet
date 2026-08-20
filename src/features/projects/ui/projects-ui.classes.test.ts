import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  type Extraction,
  compileGlobalsCss,
  emitsRule,
  extractClassNames,
  writtenClassAttributes,
} from "@/shared/ui/testing/class-names-from-source";

/**
 * Gate de CSS COMPILADO para los tres componentes de `/proyectos` (deuda 146).
 *
 * **La técnica ya no vive acá.** Se movió entera a
 * `shared/ui/testing/class-names-from-source.ts` al escribir el gate de la
 * enmienda E13, que pide exactamente lo mismo para el caparazón y para el
 * Dashboard. El porqué de cada decisión —por qué se deriva del FUENTE y no de un
 * archivo de variantes, por qué se denuncia en vez de adivinar, y por qué la
 * comparación contra el CSS exige frontera de fin de nombre— está escrito ahí,
 * junto al código que lo implementa. Lo que queda en este archivo es lo que es
 * **propio de `/proyectos`**: qué componentes se cubren y qué fuentes externas
 * se les admiten.
 *
 * **Ni un nombre de clase aparece literal en este archivo**, y hay que cumplirlo
 * también en la PROSA: Tailwind escanea los tests, así que una utilidad citada
 * de ejemplo se convierte en CSS de producción (una inválida rompería el build).
 * Por eso las utilidades se nombran en castellano y a lo que se escribe al
 * literal se le exige no ser un candidato a clase: **nombres de archivo y de
 * identificador**.
 */
const COMPILE_TIMEOUT_MS = 120_000;

/** Los tres componentes de la lista de proyectos, por nombre de archivo. */
const COMPONENTS = [
  "ProjectsView.tsx",
  "ProjectCard.tsx",
  "ProjectsToolbar.tsx",
];

/**
 * Los únicos identificadores que un atributo de clase puede traer **de fuera del
 * archivo**, y por eso no se resuelven acá:
 *
 * - `className` — la prop que el llamador pasa a `ProjectCard`; su valor lo pone
 *   quien la monta, y esos sitios están cubiertos por su propio archivo.
 * - `inputClasses` — viene del design system (`shared/ui`), o sea de la capa que
 *   tiene sus propios gates.
 *
 * **También entra acá una función de otro archivo que se llame desde un atributo
 * de clase**: lo que devuelve no se puede seguir desde este fuente, así que su
 * nombre se registra igual que el de una constante importada.
 *
 * La lista se comprueba **exacta**: si mañana aparece otra fuente de clases que
 * este gate no sabe seguir, el test se pone rojo y obliga a decidir qué hacer
 * con ella, en vez de perderla en silencio.
 */
const EXTERNAL_SOURCES = ["className", "inputClasses"];

function componentPath(fileName: string): string {
  return fileURLToPath(new URL(`./${fileName}`, import.meta.url));
}

const EXTRACTED = new Map<string, Extraction>(
  COMPONENTS.map((fileName) => [
    fileName,
    extractClassNames(componentPath(fileName)),
  ]),
);

let css = "";

beforeAll(async () => {
  css = await compileGlobalsCss();
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
   * atributo de clase, el AST vería menos de los que hay escritos.
   */
  it("ve tantos atributos de clase como hay escritos en el fuente", () => {
    for (const fileName of COMPONENTS) {
      const written = writtenClassAttributes(componentPath(fileName));
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
   * archivo**, arrays con unión, ternarios y concatenaciones. Lo que no sabe
   * seguir no lo adivina: lo registra. Este test exige que hoy no quede ninguna
   * forma sin seguir en los tres componentes.
   */
  it("no queda ninguna forma de expresión sin seguir ni sin denunciar", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.unhandled, fileName).toEqual([]);
    }
  });

  /**
   * Los dos caminos por los que un atributo de clase puede llegar al DOM **sin
   * pasar por el barrido**, y que costaron dos verdes falsos con la clase inerte
   * puesta: un **atributo esparcido** y el atributo de clase como **propiedad de
   * un literal de objeto**. Hoy no hay ninguno en los tres componentes, así que
   * el test nace verde y se pone rojo el día que aparezca uno — que es justo
   * cuando hay que decidir.
   */
  it("ningún atributo de clase llega por un camino que el barrido no atraviesa", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.bypassed, fileName).toEqual([]);
    }
  });

  /**
   * **Dos formas de que el inicializador de un nombre no sea lo que ese nombre
   * vale**, y las dos perdían clases en silencio: declarado dos veces y
   * reasignado después de su inicializador. Ninguna de las dos se resuelve
   * —haría falta interpretar el programa—: se denuncian, y sólo si el nombre
   * llega a usarse para resolver un atributo de clase.
   */
  it("no resuelve ninguna clase por un nombre pisado ni reasignado", () => {
    for (const fileName of COMPONENTS) {
      expect(EXTRACTED.get(fileName)?.ambiguous, fileName).toEqual([]);
    }
  });

  /**
   * Los únicos atributos de clase que pueden quedar vacíos son los que traen su
   * valor de fuera del archivo, y son exactamente los de `EXTERNAL_SOURCES`.
   * Comprobado en las dos direcciones: una fuente externa nueva pone el gate en
   * rojo.
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
    /* Un atributo de clase puede quedar vacío SÓLO por depender de uno de esos
       dos nombres. `inputClasses` aparece dos veces, así que se comparan
       conjuntos y no cuentas: lo que importa es que no haya ni un motivo
       distinto. */
    expect([...new Set(empty)].sort()).toEqual([...EXTERNAL_SOURCES].sort());
  });
});

describe("cada clase de /proyectos emite una regla real en el CSS compilado", () => {
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
