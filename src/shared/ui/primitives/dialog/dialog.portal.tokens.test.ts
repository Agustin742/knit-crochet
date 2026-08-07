import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Por qué el portal al `body` del `Dialog` es OBLIGATORIO (deuda 94).
 *
 * Esto era un comentario, y el comentario señalaba la causa equivocada: culpaba
 * a un `transform` del archivero. Ahí no hay ningún `transform` —el archivero
 * abre su contexto de apilamiento con `filter: drop-shadow(...)`— y, sobre todo,
 * sus hojas son **hermanas** del `main`, no ancestros suyas, así que su contexto
 * no puede encerrar a nada del contenido. Quien fuera a comprobarlo iba a
 * concluir que la razón ya no aplica, quitar el portal y mandar el modal detrás
 * del nav.
 *
 * **La jaula real es el `main` del `AppShell`.** Un comentario no lo impide dos
 * veces; un test sí. El argumento entero, convertido en aserciones:
 *
 * 1. El `main` está posicionado y lleva `z-index` → abre un contexto de
 *    apilamiento propio, en el escalón `--z-base`.
 * 2. El nav pinta en `--z-nav`, y lo hace FUERA del `main` (son hermanos).
 * 3. `--z-base` < `--z-nav`.
 * 4. De 1-3 se sigue que **todo descendiente del `main` queda techado por
 *    `--z-base`**: dentro de un contexto de apilamiento, el `z-index` de un
 *    descendiente sólo ordena frente a sus hermanos, nunca frente a algo de
 *    fuera. Por eso `--z-modal` (300) pierde contra `--z-nav` (100) — y ese
 *    "aunque valga 300" es justo lo que engaña al leer el CSS por encima.
 *
 * La otra mitad del contrato —que el panel de verdad **sale** del árbol de la
 * página— se mide en runtime en `Dialog.test.tsx` ("se monta en un portal al
 * body, fuera del árbol de la página").
 *
 * NOTA sobre los nombres de clase: se arman por concatenación, nunca literales.
 * Tailwind escanea también los `.test.ts` (ver `src/app/globals-css.test.ts`).
 */
const GLOBALS_CSS = readFileSync(
  fileURLToPath(new URL("../../../../app/globals.css", import.meta.url)),
  "utf8",
);

const APP_SHELL = readFileSync(
  fileURLToPath(new URL("../../layout/app-shell/AppShell.tsx", import.meta.url)),
  "utf8",
);

const ARCHIVE_NAV = readFileSync(
  fileURLToPath(
    new URL("../../layout/archive-nav/ArchiveNav.tsx", import.meta.url),
  ),
  "utf8",
);

const BOTTOM_NAV = readFileSync(
  fileURLToPath(
    new URL("../../layout/bottom-nav/BottomNav.tsx", import.meta.url),
  ),
  "utf8",
);

/** `z-(--token)`, armado en runtime para que no aparezca literal en el fuente. */
function zUtility(token: string): string {
  return `z-(${token})`;
}

/** La utilidad de posición relativa, partida en dos por el mismo motivo. */
const POSITIONED = ["rel", "ative"].join("");

function zIndex(token: string): number {
  const match = GLOBALS_CSS.match(
    new RegExp(String.raw`^\s*${token}:\s*([^;]+);`, "m"),
  );
  const value = match?.[1]?.trim();
  if (value === undefined) {
    throw new Error(`El token ${token} no está declarado en globals.css`);
  }
  const amount = Number.parseInt(value, 10);
  if (Number.isNaN(amount)) {
    throw new Error(`El token ${token} no es un z-index: ${value}`);
  }
  return amount;
}

/** El elemento `main` del caparazón, con su lista de clases. */
function mainOpeningTag(): string {
  const match = APP_SHELL.match(/<main[^>]*>/);
  const tag = match?.[0];
  if (tag === undefined) {
    throw new Error("El AppShell ya no monta un elemento main");
  }
  return tag;
}

function mainElement(): string {
  const match = APP_SHELL.match(/<main[^>]*>[\s\S]*?<\/main>/);
  const element = match?.[0];
  if (element === undefined) {
    throw new Error("El AppShell ya no monta un elemento main");
  }
  return element;
}

describe("el main del AppShell es una jaula de apilamiento", () => {
  it("está posicionado Y lleva z-index: las dos condiciones de un contexto de apilamiento", () => {
    const tag = mainOpeningTag();

    // Con una sola de las dos no habría contexto nuevo y el portal sobraría.
    expect(tag, "el main dejó de estar posicionado").toContain(POSITIONED);
    expect(tag, "el main dejó de declarar su z-index").toContain(
      zUtility("--z-base"),
    );
  });

  it("el contenido de la página vive DENTRO de esa jaula", () => {
    // Un diálogo renderizado en el flujo sería descendiente de este elemento.
    expect(mainElement()).toContain("{children}");
  });
});

describe("el nav pinta fuera de la jaula y por encima de ella", () => {
  it("los dos navs declaran el escalón de nav", () => {
    expect(ARCHIVE_NAV).toContain(zUtility("--z-nav"));
    expect(BOTTOM_NAV).toContain(zUtility("--z-nav"));
  });

  it("ninguno de los dos se monta dentro del main", () => {
    // Si estuvieran dentro compartirían jaula con el diálogo y el orden de
    // `z-index` volvería a decidirse entre ellos: el portal dejaría de hacer falta.
    const main = mainElement();

    expect(main).not.toContain("ArchiveNav");
    expect(main).not.toContain("BottomNav");
    expect(APP_SHELL).toContain("<ArchiveNav");
    expect(APP_SHELL).toContain("<BottomNav");
  });
});

describe("los tokens dicen por qué sin portal el modal pierde", () => {
  it("el escalón de la jaula es MENOR que el del nav", () => {
    // Esta es la desigualdad que hace obligatorio el portal. Si algún día
    // `--z-base` superara a `--z-nav`, esta ficha cambiaría de raíz y habría que
    // reescribir el porqué, no borrarlo.
    expect(zIndex("--z-base")).toBeLessThan(zIndex("--z-nav"));
  });

  it("el token del modal es MAYOR que el del nav, y aun así no alcanza", () => {
    // La trampa entera en una línea: el número del panel gana sobre el papel y
    // pierde en pantalla, porque dentro de la jaula sólo ordena frente a sus
    // hermanos. Sin el portal, lo que compite contra el nav es el 1 del `main`.
    expect(zIndex("--z-modal")).toBeGreaterThan(zIndex("--z-nav"));
    expect(zIndex("--z-base")).toBeLessThan(zIndex("--z-modal"));
  });

  it("el velo también queda por encima del nav y por debajo del panel", () => {
    expect(zIndex("--z-overlay")).toBeGreaterThan(zIndex("--z-nav"));
    expect(zIndex("--z-overlay")).toBeLessThan(zIndex("--z-modal"));
  });
});
