import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Guardrail del HUECO del ovillo ASCII (RFC-01 §3, enmienda E12 e — deuda 118).
 *
 * QUÉ PROTEGE, en una frase: **todo sitio que aloje un ovillo tiene que apagar
 * su hueco por debajo de `--bp-tablet`**, y el contenedor de ese hueco no puede
 * reservarle una pista propia a ese ancho.
 *
 * POR QUÉ EXISTE. Por debajo de `--bp-tablet`, `useViewportSupports3d` no monta
 * la escena — pero `AsciiYarn` **no devuelve `null`**: devuelve igual su host
 * `h-full w-full` con la escena vacía dentro. Así que el hueco NO desaparece
 * solo. Si además el contenedor declara dos columnas, la segunda pista `1fr`
 * existe y **reclama su mitad del ancho** con nada dentro; y como
 * `minmax(0, 1fr)` deja que una pista baje por debajo de su contenido mínimo,
 * no hay scroll horizontal que avise: el formulario simplemente se aplasta
 * (medido: 47px de ancho útil a 390px de ventana, con 91px de columna vacía al
 * lado — `explore_deuda118_responsive_auth.md` §2.4). El JS quita la escena;
 * **el CSS tiene que quitar el hueco**.
 *
 * Y POR QUÉ NO EXISTÍA. Éste es el hallazgo de método de E12: **cero gates
 * medían esto**. Se podía borrar la variante responsive de `DashboardHero` y de
 * los tres paneles del Dashboard y la suite entera salía verde. `axe` tampoco lo
 * ve, porque todo el hueco es `aria-hidden`. El agujero era invisible para todos
 * los guardrails que había.
 *
 * TRES DECISIONES DE DISEÑO DE ESTE GATE, y el motivo de cada una:
 *
 * 1. **Se mide sobre el CSS COMPILADO (REGLA 7).** Una clase puede existir en el
 *    JSX y no compilar a ninguna regla: es justo el error que describe E12(b)
 *    (las variantes de este repo son MIN-WIDTH, `tablet:` = `(width >= 768px)`;
 *    no hay ni un `@custom-variant` en `src/`, así que una variante escrita en
 *    clave max-width no genera nada). Leyendo sólo los nombres de clase, ese
 *    fallo sale verde. Misma técnica que `src/app/globals-css.test.ts` y
 *    `skeleton.tokens.test.ts`: se compila `globals.css` con postcss y se
 *    asierta sobre la salida. El ancho de la media query **no se escribe a
 *    mano**: se lee `--bp-tablet` de `globals.css`, que es el MISMO token que
 *    `useViewportSupports3d` consulta con `matchMedia`.
 *
 * 2. **Los anfitriones SE DESCUBREN, no se enumeran.** Una lista fija es el
 *    patrón que este repo ya pagó cuatro veces (deudas 40/43/71/91): el
 *    anfitrión nuevo nace sin vigilancia hasta que alguien se acuerde de
 *    registrarlo. Aquí se recorre `src/**`, se busca cada sitio que renderiza un
 *    ovillo y se resuelve su elemento anfitrión — incluso cuando el ovillo se
 *    ENTREGA a otro componente como prop (es el caso del caparazón), que se
 *    resuelve abriendo el archivo de ese componente y buscando dónde pinta la
 *    prop.
 *
 * 3. **Seguro anti-descubrimiento-roto**, con el molde de
 *    `breakpoint-tokens.test.ts:79-82`. Si el recorrido deja de casar, el bucle
 *    genera CERO casos y el archivo sale verde con el guardrail apagado. Por eso
 *    el inventario de hoy se escribe a mano UNA vez, aquí y sólo aquí: en ese
 *    `it` el literal ES lo que se protege.
 *
 * QUIÉN ESTÁ EXENTO Y POR QUÉ NO ES UNA ALLOWLIST. El invariante habla de
 * **espacio reservado en el flujo**. Un anfitrión fuera de flujo (posicionado
 * `fixed` o `absolute`) no reserva ni un píxel de la caja de nadie, así que no
 * puede dejar hueco: es el caso de la capa de fondo del `AppShell`. La exención
 * **se deriva de sus clases reales**, igual que hace `account-band.tokens.test.ts`
 * para decidir si la banda va en el flujo o superpuesta — no hay lista de
 * nombres perdonados, y el día que alguien meta esa capa en el flujo, cae aquí.
 */
const COMPILE_TIMEOUT_MS = 120_000;

const SRC_DIR = fileURLToPath(new URL("../", import.meta.url));
const GLOBALS_CSS = fileURLToPath(new URL("./globals.css", import.meta.url));
const GLOBALS_SOURCE = readFileSync(GLOBALS_CSS, "utf8");

/** Componente que renderiza el ovillo; su nombre es la firma que se busca. */
const YARN_COMPONENT = "AsciiYarn";

/** Lo que un anfitrión EN EL FLUJO tiene que declarar para no dejar hueco. */
const OFF_BELOW_TABLET = "hidden";
const ON_FROM_TABLET = "tablet:block";

/** Clases que sacan un elemento del flujo: no reserva espacio, no deja hueco. */
const OUT_OF_FLOW = ["fixed", "absolute"];

/* ------------------------------------------------------------------ *
 * Recorrido de fuentes
 * ------------------------------------------------------------------ */

function collectSourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectSourceFiles(full));
      continue;
    }
    if (!/\.tsx$/.test(entry.name)) continue;
    if (/\.(test|spec)\.tsx$/.test(entry.name)) continue;
    found.push(full);
  }
  return found.sort();
}

const SOURCE_FILES = collectSourceFiles(SRC_DIR);

/* ------------------------------------------------------------------ *
 * Lectura de la estructura JSX
 *
 * No es un parser de JSX y no pretende serlo: se apoya en que el fuente pasa
 * por Prettier, así que toda etiqueta de apertura empieza una línea y su `>`
 * termina otra. Si esa suposición se rompiera, el recorrido devolvería otra
 * cosa y el seguro anti-descubrimiento-roto lo caza.
 * ------------------------------------------------------------------ */

interface Tag {
  /** Nombre de la etiqueta (`div`, `AppShell`). */
  name: string;
  /** Texto completo de la etiqueta de apertura, con sus props. */
  text: string;
  /** Línea (base 0) en que empieza y en que se cierra el `>`. */
  from: number;
  to: number;
  closing: boolean;
  /** Se abre y se cierra sola: no tiene hijos que alojar. */
  empty: boolean;
}

function parseTags(lines: string[]): Tag[] {
  const tags: Tag[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = (lines[index] ?? "").trim();

    if (line.startsWith("</")) {
      tags.push({
        name: /^<\/([A-Za-z][\w.]*)/.exec(line)?.[1] ?? "",
        text: line,
        from: index,
        to: index,
        closing: true,
        empty: false,
      });
      index += 1;
      continue;
    }

    if (!/^<[A-Za-z]/.test(line)) {
      index += 1;
      continue;
    }

    let text = line;
    let to = index;
    while (!text.endsWith(">") && to + 1 < lines.length) {
      to += 1;
      text = `${text} ${(lines[to] ?? "").trim()}`;
    }

    const name = /^<([A-Za-z][\w.]*)/.exec(text)?.[1] ?? "";
    const selfClosing = text.endsWith("/>");
    const balanced = new RegExp(String.raw`</${name}>$`).test(text);

    tags.push({
      name,
      text,
      from: index,
      to,
      closing: false,
      empty: selfClosing || balanced,
    });
    index = to + 1;
  }

  return tags;
}

interface Placement {
  /** Cadena de ancestros abiertos justo antes de la línea buscada. */
  chain: Tag[];
  /** Etiqueta en cuyas PROPS cae la línea buscada (entrega por prop). */
  carrier: Tag | undefined;
}

/** Dónde vive la línea `target` dentro del árbol JSX del archivo. */
function locate(lines: string[], target: number): Placement {
  const stack: Tag[] = [];

  for (const tag of parseTags(lines)) {
    if (!tag.closing && tag.from <= target && target <= tag.to) {
      // La propia etiqueta del ovillo no es su anfitrión: lo aloja quien la
      // envuelve. Cualquier OTRA etiqueta que contenga esa línea la tiene
      // dentro de sus props, es decir se le ENTREGA el ovillo.
      if (tag.name === YARN_COMPONENT) return { chain: [...stack], carrier: undefined };
      return { chain: [...stack], carrier: tag };
    }
    if (tag.from > target) break;
    if (tag.closing) {
      stack.pop();
      continue;
    }
    if (!tag.empty) stack.push(tag);
  }

  return { chain: [...stack], carrier: undefined };
}

/** `className="…"` literal de una etiqueta. `undefined` si no es una cadena. */
function classesOf(tag: Tag): string[] | undefined {
  const match = /className="([^"]*)"/.exec(tag.text);
  if (match?.[1] === undefined) return undefined;
  return match[1].split(/\s+/).filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * Descubrimiento de anfitriones
 * ------------------------------------------------------------------ */

interface YarnHost {
  /** Archivo en que se escribe el ovillo. */
  siteFile: string;
  /** Dónde se escribe el ovillo (`archivo:línea`, base 1). */
  site: string;
  /** Dónde vive el elemento que lo aloja (puede ser otro archivo). */
  hostFile: string;
  hostTag: string;
  hostClasses: string[];
  /** Clases del contenedor del anfitrión. `undefined` si no es literal. */
  parentClasses: string[] | undefined;
  outOfFlow: boolean;
}

function fileNamed(name: string): string {
  const hit = SOURCE_FILES.find((file) => basename(file) === `${name}.tsx`);
  if (hit === undefined) {
    throw new Error(
      `El ovillo se entrega a <${name}>, pero no hay ningún ${name}.tsx en src/: ` +
        `el descubrimiento no puede resolver quién lo aloja.`,
    );
  }
  return hit;
}

/** Resuelve el elemento que aloja de verdad al ovillo escrito en `file:line`. */
function resolveHost(file: string, line: number): { chain: Tag[]; file: string } {
  const lines = readFileSync(file, "utf8").split("\n");
  const { chain, carrier } = locate(lines, line);

  if (carrier === undefined) return { chain, file };

  // El ovillo va dentro de las PROPS de otra etiqueta. Si esa etiqueta es un
  // elemento del DOM es un error de lectura; si es un componente, el ovillo se
  // le ENTREGA y el anfitrión real está dentro de ese componente.
  if (!/^[A-Z]/.test(carrier.name)) {
    throw new Error(
      `${relative(SRC_DIR, file)}:${line + 1}: el ovillo cae dentro de las props ` +
        `de <${carrier.name}>, que no es un componente. El recorrido está roto.`,
    );
  }

  const prop = new RegExp(String.raw`(\w+)=\{[^{}]*<${YARN_COMPONENT}`).exec(
    carrier.text,
  )?.[1];
  if (prop === undefined) {
    throw new Error(
      `${relative(SRC_DIR, file)}:${line + 1}: el ovillo se entrega a ` +
        `<${carrier.name}> pero no se pudo leer por qué prop.`,
    );
  }

  const ownerFile = fileNamed(carrier.name);
  const ownerLines = readFileSync(ownerFile, "utf8").split("\n");
  const slotLine = ownerLines.findIndex((text) => text.trim() === `{${prop}}`);
  if (slotLine === -1) {
    throw new Error(
      `${basename(ownerFile)} recibe el ovillo por la prop \`${prop}\` pero no se ` +
        `encontró dónde la pinta: el descubrimiento no puede resolver el anfitrión.`,
    );
  }

  return { chain: locate(ownerLines, slotLine).chain, file: ownerFile };
}

function discoverHosts(): YarnHost[] {
  const hosts: YarnHost[] = [];

  for (const file of SOURCE_FILES) {
    const lines = readFileSync(file, "utf8").split("\n");

    lines.forEach((text, index) => {
      if (!new RegExp(String.raw`<${YARN_COMPONENT}\b`).test(text)) return;

      const { chain, file: hostFile } = resolveHost(file, index);
      const host = chain.at(-1);
      if (host === undefined) {
        throw new Error(
          `${relative(SRC_DIR, file)}:${index + 1}: el ovillo no tiene ningún ` +
            `elemento que lo aloje. El recorrido está roto.`,
        );
      }

      const hostClasses = classesOf(host);
      if (hostClasses === undefined) {
        throw new Error(
          `${relative(SRC_DIR, hostFile)}: el anfitrión <${host.name}> del ovillo ` +
            `no declara un \`className\` literal, así que este gate no puede ` +
            `juzgarlo. Si el hueco pasa a gobernarse desde otro sitio, hay que ` +
            `enseñárselo a este archivo — no dejarlo sin vigilar.`,
        );
      }

      hosts.push({
        siteFile: relative(SRC_DIR, file).replaceAll("\\", "/"),
        site: `${relative(SRC_DIR, file).replaceAll("\\", "/")}:${index + 1}`,
        hostFile: relative(SRC_DIR, hostFile).replaceAll("\\", "/"),
        hostTag: host.name,
        hostClasses,
        parentClasses: chain.at(-2) ? classesOf(chain.at(-2) as Tag) : undefined,
        outOfFlow: hostClasses.some((name) => OUT_OF_FLOW.includes(name)),
      });
    });
  }

  return hosts.sort((a, b) => a.site.localeCompare(b.site));
}

const HOSTS = discoverHosts();
const IN_FLOW = HOSTS.filter((host) => !host.outOfFlow);

/* ------------------------------------------------------------------ *
 * CSS compilado
 * ------------------------------------------------------------------ */

function tokenValue(name: string): string {
  const match = new RegExp(String.raw`^\s*${name}:\s*([^;]+);`, "m").exec(
    GLOBALS_SOURCE,
  );
  const value = match?.[1]?.trim();
  if (value === undefined) {
    throw new Error(`El token ${name} no está declarado en globals.css`);
  }
  return value;
}

/** El ancho no se escribe a mano: sale del token que lee `matchMedia`. */
const TABLET_WIDTH = tokenValue("--bp-tablet");
const TABLET_PRELUDE = `@media (width >= ${TABLET_WIDTH})`;

/** Nombre de clase → selector, con el escapado que hace Tailwind. */
function selectorFor(className: string): string {
  return `.${className.replace(/[^\w-]/g, (char) => `\\${char}`)}`;
}

/** Todo lo que hay dentro de los bloques con ese preludio, concatenado. */
function mediaBody(css: string, prelude: string): string {
  const bodies: string[] = [];
  let cursor = css.indexOf(prelude);

  while (cursor !== -1) {
    const open = css.indexOf("{", cursor);
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      else if (css[index] === "}") {
        depth -= 1;
        if (depth === 0) {
          bodies.push(css.slice(open + 1, index));
          cursor = css.indexOf(prelude, index);
          break;
        }
      }
    }
    if (depth !== 0) break;
  }

  return bodies.join("\n");
}

let css = "";
let tabletBody = "";

beforeAll(async () => {
  const result = await postcss([tailwindcss()]).process(GLOBALS_SOURCE, {
    from: GLOBALS_CSS,
  });
  css = result.css;
  tabletBody = mediaBody(css, TABLET_PRELUDE);
}, COMPILE_TIMEOUT_MS);

/* ------------------------------------------------------------------ *
 * Los gates
 * ------------------------------------------------------------------ */

describe("el descubrimiento de anfitriones del ovillo no está roto", () => {
  /**
   * Seguro obligatorio (molde de `breakpoint-tokens.test.ts:79-82`). Sin él, un
   * recorrido que dejara de casar devolvería cero anfitriones, cero casos
   * generados y VERDE con el guardrail apagado. El inventario de hoy se escribe
   * a mano **aquí y sólo aquí**, porque en este `it` el literal ES el contrato.
   *
   * Si añades un ovillo nuevo, este test cae: añádelo a la lista **después** de
   * comprobar que su anfitrión cumple el invariante. Es el aviso, no el estorbo.
   *
   * El inventario se escribe sin números de línea a propósito: un comentario de
   * más no debe ponerlo en rojo. Lo que ancla es **qué archivos alojan un ovillo
   * y quién resulta ser el anfitrión** — incluida la resolución a través de la
   * prop del caparazón, que es la parte del recorrido que más fácil se rompe.
   */
  it("encuentra los cuatro ovillos que hay hoy y a quién los aloja", () => {
    expect(
      HOSTS.map((host) => `${host.siteFile} → ${host.hostFile} <${host.hostTag}>`),
    ).toEqual([
      "app/(auth)/login/page.tsx → app/(auth)/login/page.tsx <div>",
      "app/(auth)/register/page.tsx → app/(auth)/register/page.tsx <div>",
      "features/auth/ui/AppShellClient.tsx → shared/ui/layout/app-shell/AppShell.tsx <div>",
      "features/dashboard/ui/DashboardHero.tsx → features/dashboard/ui/DashboardHero.tsx <div>",
    ]);
  });

  /**
   * La clasificación también puede colapsar en silencio: si todos cayeran del
   * lado "fuera de flujo" no quedaría ni un caso que comprobar, y si todos
   * cayeran del lado contrario sería que la lectura de clases dejó de funcionar.
   */
  it("clasifica tres anfitriones en el flujo y uno fuera de él", () => {
    expect(IN_FLOW.map((host) => host.siteFile)).toEqual([
      "app/(auth)/login/page.tsx",
      "app/(auth)/register/page.tsx",
      "features/dashboard/ui/DashboardHero.tsx",
    ]);
    expect(
      HOSTS.filter((host) => host.outOfFlow).map((host) => host.hostFile),
    ).toEqual(["shared/ui/layout/app-shell/AppShell.tsx"]);
  });
});

describe("todo hueco de ovillo en el flujo se apaga por debajo de --bp-tablet", () => {
  for (const host of IN_FLOW) {
    it(`${host.site} apaga su hueco`, () => {
      expect(
        host.hostClasses,
        `el anfitrión de ${host.site} (${host.hostFile}) no se apaga por debajo ` +
          `de --bp-tablet: el ovillo no se monta ahí, pero su hueco se queda.`,
      ).toContain(OFF_BELOW_TABLET);
      expect(
        host.hostClasses,
        `el anfitrión de ${host.site} nunca se enciende: el ovillo se montaría ` +
          `dentro de una caja oculta.`,
      ).toContain(ON_FROM_TABLET);
    });
  }

  /**
   * La otra mitad del daño, y es independiente: `display: none` saca al hijo del
   * layout, pero **no borra la pista**. Un contenedor que declare dos columnas
   * en la base sigue partiendo el ancho en dos con la segunda vacía. Por eso el
   * reparto lateral sólo puede existir a partir de `--bp-tablet`.
   */
  for (const host of IN_FLOW) {
    it(`${host.site} no tiene su hueco en un contenedor de dos columnas en la base`, () => {
      const parent = host.parentClasses;
      expect(
        parent,
        `no se pudo leer el \`className\` del contenedor del hueco de ${host.site}`,
      ).toBeDefined();

      const reserving = (parent ?? []).filter(
        (name) =>
          /^grid-cols-(\d+)$/.test(name) &&
          Number(/^grid-cols-(\d+)$/.exec(name)?.[1]) > 1,
      );
      const sideBySide = (parent ?? []).filter((name) => name === "flex-row");

      expect(
        [...reserving, ...sideBySide],
        `el contenedor del hueco de ${host.site} reparte el ancho ya en la base: ` +
          `por debajo de --bp-tablet el ovillo no está, pero su mitad sí.`,
      ).toEqual([]);
    });
  }
});

describe("las clases que apagan el hueco LLEGAN al CSS compilado (REGLA 7)", () => {
  it("la media query de tablet se emite con el ancho de --bp-tablet", () => {
    expect(
      css,
      `Tailwind no emitió ${TABLET_PRELUDE}: las variantes de tablet no compilan ` +
        `a nada y todo lo que dependa de ellas es una clase inerte.`,
    ).toContain(TABLET_PRELUDE);
    expect(tabletBody.length).toBeGreaterThan(0);
  });

  it("apagar el hueco compila de verdad a display:none", () => {
    const rule = new RegExp(
      String.raw`${selectorFor(OFF_BELOW_TABLET)}\s*\{[^}]*display:\s*none`,
    );
    expect(rule.test(css), `${OFF_BELOW_TABLET} no compila a display:none`).toBe(
      true,
    );
  });

  /**
   * El corazón de la REGLA 7 aplicada aquí: cada variante que usan los
   * anfitriones y sus contenedores tiene que aparecer **dentro** del bloque de
   * `--bp-tablet`. Una variante mal escrita, o escrita en clave max-width (que
   * en este repo no existe: no hay ni un `@custom-variant`), sigue leyéndose
   * bien en el JSX y **no genera ninguna regla**. Las clases no se enumeran: se
   * sacan de los anfitriones descubiertos.
   */
  const variants = [
    ...new Set(
      IN_FLOW.flatMap((host) => [
        ...host.hostClasses,
        ...(host.parentClasses ?? []),
      ]).filter((name) => name.startsWith("tablet:")),
    ),
  ].sort();

  it("hay variantes de tablet que comprobar", () => {
    expect(variants.length).toBeGreaterThan(0);
    expect(variants).toContain(ON_FROM_TABLET);
  });

  for (const variant of variants) {
    it(`${variant} genera una regla dentro de la media query de tablet`, () => {
      expect(
        tabletBody,
        `${variant} no generó ninguna regla dentro de ${TABLET_PRELUDE}: ` +
          `existe en el JSX y no compila a nada.`,
      ).toContain(selectorFor(variant));
    });
  }
});

describe("el inset lateral de auth es un token y sólo rige desde tablet", () => {
  /**
   * E12 (c). El valor se conserva exactamente donde el usuario lo mira (tablet y
   * desktop) y desaparece en móvil, donde eran 160 de los ~208px que se le
   * robaban al formulario. Lo que este gate impide es que vuelva a escribirse
   * como número crudo: la utilidad que lo aplicaba era invisible para
   * `no-hardcode.test.ts`, porque su `px` significa *padding-inline*.
   */
  it("el token existe en globals.css y llega al CSS compilado", () => {
    expect(tokenValue("--auth-inset-inline")).toMatch(/^\d+px$/);
    expect(css).toContain("--auth-inset-inline");
  });

  it("las páginas de auth lo consumen sólo desde --bp-tablet", () => {
    const pages = SOURCE_FILES.filter((file) =>
      relative(SRC_DIR, file).replaceAll("\\", "/").startsWith("app/(auth)/"),
    );
    expect(pages.length).toBeGreaterThan(0);

    const uses: string[] = [];
    for (const file of pages) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /(?<![\w:-])((?:[a-z]+:)*)([a-z-]+)-\(--auth-inset-inline\)/g,
      )) {
        uses.push(`${relative(SRC_DIR, file)} ${match[1]}${match[2]}`);
      }
    }

    expect(uses.length, "nadie consume --auth-inset-inline").toBeGreaterThan(0);
    expect(
      uses.filter((use) => !use.includes("tablet:")),
      `el inset lateral de auth se aplica también por debajo de --bp-tablet:\n${uses.join("\n")}`,
    ).toEqual([]);
  });
});
