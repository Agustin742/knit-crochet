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
 * Gate de CSS COMPILADO para los componentes de `/lanas` (deuda 170, mitad
 * `features/yarns/ui/`). Mismo mecanismo que `projects-ui.classes.test.ts`:
 * la técnica vive en `shared/ui/testing/class-names-from-source.ts`, este
 * archivo sólo dice qué componentes cubre y qué fuentes externas se les
 * admiten.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const COMPONENTS = [
  "YarnCard.tsx",
  "YarnsView.tsx",
  "YarnBrandTree.tsx",
  "ColorFamilyFilter.tsx",
  "YarnFilterPanel.tsx",
  "YarnCatalogPanel.tsx",
  "YarnDetailDrawer.tsx",
  "ColorFamilyPicker.tsx",
  "NeedleRangeField.tsx",
  "YarnTechnicalTab.tsx",
];

/**
 * Los únicos identificadores que un atributo de clase puede traer de fuera
 * del archivo:
 *
 * - `className` — la prop que `YarnCard` recibe de quien la monta.
 * - `yarnSwatchClass` (deuda 168, #23) — devuelve la clase de la familia de
 *   color desde `shared/config`. Su cobertura real la mide
 *   `yarn-swatch.classes.test.ts` contra el CSS compilado, que es más fuerte
 *   que este barrido: recorre las 13 familias y exige que cada clase emita una
 *   regla de verdad.
 * - `yarn` (deuda 195) — el argumento de esa llamada (`yarn.colorFamily`) es un
 *   dato que viene por props, no una fuente de clases. Se declara igual porque
 *   el barrido denuncia la raíz de todo acceso a propiedad en vez de ignorarla.
 * - `family` (S4b, #23) — mismo trato que `yarn`, pero del otro lado de la
 *   llamada: `ColorFamilyFilter` recorre `COLOR_FAMILIES` con `.map((family) =>
 *   …)` y pasa ese parámetro de vuelta a `yarnSwatchClass(family)`. El barrido
 *   no rastrea parámetros de función como declaraciones propias del archivo
 *   (sólo `const`/`function` de nivel de módulo), así que `family` es, para
 *   él, tan "de fuera" como `yarn` — aunque las dos nazcan del todo dentro de
 *   este mismo archivo.
 * - (histórico) `swatchClass` — `YarnCard` componía `Swatch` +
 *   `yarnSwatchClass` (`shared/config`) fuera de cualquier `className`, igual
 *   que `YarnColorSwatch` en `YarnsTab.tsx`; su cobertura real la mide
 *   `yarn-swatch.classes.test.ts`, no este barrido.
 */
const EXTERNAL_SOURCES = ["className", "family", "yarn", "yarnSwatchClass"];

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

describe("el barrido de clases de /lanas no se deja nada", () => {
  it("encuentra clases y atributos en cada componente", () => {
    for (const fileName of COMPONENTS) {
      const found = EXTRACTED.get(fileName);
      expect(found, fileName).toBeDefined();
      expect(found?.attributes, fileName).toBeGreaterThan(0);
      expect(found?.classes.length, fileName).toBeGreaterThan(0);
    }
  });

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
    const empty: string[] = [];

    for (const fileName of COMPONENTS) {
      const found = EXTRACTED.get(fileName);
      empty.push(...(found?.emptyAttributes ?? []));
      for (const name of found?.external ?? []) {
        external.add(name);
      }
    }

    expect([...external].sort()).toEqual([...EXTERNAL_SOURCES].sort());
    /* `external` se compara EXACTO: una fuente nueva que el barrido no sepa
       seguir pone el gate en rojo hasta que alguien decida qué hacer con ella.
       Esa garantía no se toca.

       Los motivos de los atributos vacíos, en cambio, se comprueban por
       PERTENENCIA y no por igualdad (deuda 195). Los dos conjuntos miden cosas
       distintas —uno junta TODOS los puntos externos del archivo, el otro UN
       motivo por atributo sin resolver—, así que coinciden sólo en el caso más
       simple. Exigirles igualdad obligaba a contorsionar el FUENTE hasta que
       ambos nombraran lo mismo. Lo que de verdad hay que garantizar es que
       ningún atributo quede vacío por un motivo NO aprobado: */
    for (const reason of new Set(empty)) {
      expect(EXTERNAL_SOURCES, `motivo sin aprobar: ${reason}`).toContain(reason);
    }
  });
});

describe("cada clase de /lanas emite una regla real en el CSS compilado", () => {
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
