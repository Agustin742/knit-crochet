import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guardrail token-first (SDD §9 / RFC-01 §3): ningún componente hardcodea color,
 * tamaño, radio, borde ni sombra. Todo valor visual referencia un token
 * (`var(--…)` o utilidad Tailwind respaldada por `@theme`). Los VALORES viven
 * sólo en `globals.css`; los componentes nunca los repiten.
 *
 * BARRIDO POR RECORRIDO DE DIRECTORIOS, no lista fija (#33). Antes nombraba 18
 * archivos a mano y un componente nuevo quedaba sin vigilar hasta que alguien se
 * acordara de registrarlo — el patrón de las deudas 40, 43 y 71, que ya había
 * aparecido cuatro veces en tres guardrails distintos. Misma medicina que usa
 * `canonical-tailwind-classes.test.ts`, con su mismo seguro: un test aparte
 * comprueba que el barrido encuentra de verdad los archivos, porque un recorrido
 * roto devuelve cero archivos y cero infractores, es decir verde.
 *
 * LA RAÍZ ES `src/`, NO `src/shared/ui/` (#19, enmienda E2.3 del RFC-02). El
 * barrido estaba anclado al design system, así que `features/<x>/ui/` —donde
 * viven las páginas, que es la mitad de la UI que queda por escribir— nacía sin
 * vigilancia: un color hexadecimal o un tamaño en píxeles ahí no hacía fallar
 * nada. Es el mismo agujero que la lista fija, un piso más arriba, y taparlo
 * cuesta lo mismo que dejarlo abierto para las once páginas de #19 a #30. El
 * otro guardrail, el de sintaxis canónica, ya barría `src/` entero.
 *
 * Al ampliar, los archivos preexistentes se comprobaron **antes** de tocar el
 * test: cero infractores entre los 203 fuentes que ya había en `src/`, así que
 * no hizo falta excluir nada. **No hay allowlist, y no se abre una "por si
 * acaso"**: una lista vacía es una invitación a meter la primera excepción sin
 * motivo escrito.
 *
 * Excepción explícita documentada: en `three/ascii-yarn/` los números de
 * geometría, luces y cámara son unidades de mundo 3D portadas de
 * `template/ascii-yarn.js`, no CSS. No hacen falta reglas especiales porque
 * ninguno lleva unidad `px` ni color literal; lo que sí se exige ahí es que el
 * color visible y el tamaño de fuente del ASCII salgan de tokens.
 */
const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));

/** Fuentes de componente: se excluyen tests y declaraciones de tipos. */
function collectComponentFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectComponentFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) continue;
    if (entry.name.endsWith(".d.ts")) continue;
    found.push(full);
  }
  return found.sort();
}

const COMPONENT_FILES = collectComponentFiles(SRC_DIR);
const RELATIVE_FILES = COMPONENT_FILES.map((file) => relative(SRC_DIR, file));

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_COLOR = /\brgba?\(/;
const PX_LITERAL = /\b\d+(?:\.\d+)?px\b/;

describe("el barrido cubre la UI de toda la app", () => {
  it("encuentra los fuentes de src/", () => {
    expect(COMPONENT_FILES.length).toBeGreaterThan(100);
  });

  it("llega a las cuatro capas del design system", () => {
    for (const layer of [
      ["shared", "ui", "primitives", "button", "button.variants.ts"],
      ["shared", "ui", "primitives", "dialog", "Dialog.tsx"],
      ["shared", "ui", "feedback", "state-panel", "StatePanel.tsx"],
      ["shared", "ui", "layout", "archive-nav", "ArchiveNav.tsx"],
      ["shared", "ui", "three", "ascii-yarn", "AsciiYarnScene.tsx"],
    ]) {
      expect(RELATIVE_FILES).toContain(layer.join(sep));
    }
  });

  /**
   * La mitad NUEVA del seguro (#19). Sin ella, la raíz se podría volver a
   * estrechar a `shared/ui/` sin que nada avisara: el recorrido seguiría
   * encontrando >100 archivos y llegando a las cuatro capas, que es todo lo que
   * el seguro viejo comprobaba. Estas tres rutas sólo existen fuera del design
   * system, así que son las que atan la raíz a `src/`.
   */
  it("llega también a la UI de features y a las páginas", () => {
    for (const outside of [
      ["features", "dashboard", "ui", "DashboardView.tsx"],
      ["features", "projects", "ui", "ProjectCard.tsx"],
      ["app", "(app)", "page.tsx"],
    ]) {
      expect(RELATIVE_FILES).toContain(outside.join(sep));
    }
  });

  it("no vigila los propios tests (citan clases a propósito)", () => {
    expect(
      RELATIVE_FILES.filter((file) => file.includes(".test.")),
      "el barrido se metió en los tests",
    ).toEqual([]);
  });
});

describe("components are token-first (no hardcoded values)", () => {
  for (const relative of RELATIVE_FILES) {
    const source = readFileSync(join(SRC_DIR, relative), "utf8");

    it(`has no raw hex/rgb colors in ${relative}`, () => {
      expect(HEX_COLOR.test(source), `hex color found in ${relative}`).toBe(
        false,
      );
      expect(RGB_COLOR.test(source), `rgb()/rgba() found in ${relative}`).toBe(
        false,
      );
    });

    it(`has no raw px sizes in ${relative}`, () => {
      expect(PX_LITERAL.test(source), `raw px value found in ${relative}`).toBe(
        false,
      );
    });
  }
});
