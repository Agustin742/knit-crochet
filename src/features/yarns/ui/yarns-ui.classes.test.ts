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
 * Gate de CSS COMPILADO para los dos componentes de `/lanas` (deuda 170,
 * mitad `features/yarns/ui/`). Mismo mecanismo que
 * `projects-ui.classes.test.ts`: la técnica vive en
 * `shared/ui/testing/class-names-from-source.ts`, este archivo sólo dice qué
 * componentes cubre y qué fuentes externas se les admiten.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const COMPONENTS = ["YarnCard.tsx", "YarnsView.tsx"];

/**
 * Los únicos identificadores que un atributo de clase puede traer de fuera
 * del archivo:
 *
 * - `className` — la prop que `YarnCard` recibe de quien la monta.
 * - `swatchClass` (deuda 168/170, #23) — `YarnCard` compone `Swatch` +
 *   `yarnSwatchClass` (`shared/config`) fuera de cualquier `className`, igual
 *   que `YarnColorSwatch` en `YarnsTab.tsx`; su cobertura real la mide
 *   `yarn-swatch.classes.test.ts`, no este barrido.
 */
const EXTERNAL_SOURCES = ["className", "swatchClass"];

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
    expect([...new Set(empty)].sort()).toEqual([...EXTERNAL_SOURCES].sort());
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
