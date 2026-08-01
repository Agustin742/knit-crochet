import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Guardrail del alcance de escaneo de Tailwind (v4 `@source not`).
 *
 * Tailwind busca candidatos a clase en TODO el repo, incluidos los .md. Un
 * informe de `progress/` que citaba una clase con comodín generó
 * `var(--dur-*)`: CSS inválido que rompió `pnpm dev`. `globals.css` acota el
 * escaneo a `src/` y excluye `progress/`, `docs/` y `template/`; estos tests
 * fallan si ese alcance se ensancha o si `globals.css` deja de compilar.
 *
 * La compilación real tarda unos segundos: los hooks llevan timeout explícito.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const GLOBALS_CSS = fileURLToPath(new URL("./globals.css", import.meta.url));
const REPO_ROOT = new URL("../../", import.meta.url);

/** Firma de un `var(--…)` con comodín: CSS inválido, el bug original. */
const INVALID_VAR = /var\(--[a-z-]*\*/g;

/**
 * Carnadas: clases válidas pero irrepetibles, sembradas en cada carpeta
 * excluida. Si Tailwind escanea el archivo, su valor aparece en la salida.
 */
const BAITS = [
  { file: "progress/tailwind-source-guard.tmp.md", size: "9971px" },
  { file: "docs/tailwind-source-guard.tmp.md", size: "9972px" },
  { file: "template/tailwind-source-guard.tmp.md", size: "9973px" },
];

async function compileGlobalsCss(): Promise<string> {
  const source = readFileSync(GLOBALS_CSS, "utf8");
  const result = await postcss([tailwindcss()]).process(source, {
    from: GLOBALS_CSS,
  });
  return result.css;
}

describe("globals.css compila y no emite CSS inválido", () => {
  let css = "";

  beforeAll(async () => {
    css = await compileGlobalsCss();
  }, COMPILE_TIMEOUT_MS);

  it("genera el CSS del design system", () => {
    expect(css).toContain("--accent");
  });

  it("sigue escaneando las clases reales de src/**", () => {
    expect(css).toContain(".bg-surface");
  });

  it("no contiene ningún var(--…*) inválido", () => {
    const matches = css.match(INVALID_VAR);
    expect(matches, `CSS inválido generado: ${matches?.join(", ")}`).toBeNull();
  });
});

describe("progress/, docs/ y template/ están fuera del escaneo de Tailwind", () => {
  let css = "";

  beforeAll(async () => {
    for (const bait of BAITS) {
      writeFileSync(
        new URL(bait.file, REPO_ROOT),
        `Archivo temporal de test: clase de prueba \`text-[${bait.size}]\`.\n`,
        "utf8",
      );
    }
    css = await compileGlobalsCss();
  }, COMPILE_TIMEOUT_MS);

  afterAll(() => {
    for (const bait of BAITS) {
      rmSync(new URL(bait.file, REPO_ROOT), { force: true });
    }
  });

  for (const bait of BAITS) {
    it(`ignora las clases citadas en ${bait.file}`, () => {
      expect(
        css.includes(bait.size),
        `Tailwind escaneó ${bait.file}: el alcance de escaneo de globals.css se ensanchó`,
      ).toBe(false);
    });
  }
});
