import { describe, expect, it } from "vitest";

import { DEFAULT_REDIRECT, resolveNextPath } from "./next-path";

/**
 * El `?next=` viaja en la URL, así que su contenido es entrada de un tercero
 * aunque lo escriba `src/proxy.ts`. Estos casos son el gate contra el redirector
 * abierto: un enlace repartido por un atacante que, tras un login legítimo,
 * deposita al usuario en otro dominio.
 */
const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const CARRIAGE_RETURN = String.fromCharCode(13);

describe("resolveNextPath", () => {
  it("acepta la ruta interna que escribe el proxy", () => {
    expect(resolveNextPath("/projects")).toBe("/projects");
    expect(resolveNextPath("/projects/42/edit")).toBe("/projects/42/edit");
    expect(resolveNextPath("/")).toBe("/");
  });

  it("cae al Dashboard cuando no hay destino", () => {
    expect(resolveNextPath(null)).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath(undefined)).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath("")).toBe(DEFAULT_REDIRECT);
    expect(DEFAULT_REDIRECT).toBe("/");
  });

  it("rechaza URLs absolutas", () => {
    expect(resolveNextPath("https://evil.example")).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath("http://evil.example/login")).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath("HTTPS://evil.example")).toBe(DEFAULT_REDIRECT);
  });

  it("rechaza URLs protocol-relative (las dos barras y la barra invertida)", () => {
    expect(resolveNextPath("//evil.example")).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath("//evil.example/projects")).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath("/\\evil.example")).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath("\\\\evil.example")).toBe(DEFAULT_REDIRECT);
  });

  it("rechaza esquemas ejecutables y rutas relativas", () => {
    expect(resolveNextPath("javascript:alert(1)")).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath("data:text/html,<script></script>")).toBe(
      DEFAULT_REDIRECT,
    );
    expect(resolveNextPath("projects")).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath("../../etc")).toBe(DEFAULT_REDIRECT);
  });

  it("rechaza el destino con espacio delante (el navegador lo recorta)", () => {
    expect(resolveNextPath(" //evil.example")).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath(" /projects")).toBe(DEFAULT_REDIRECT);
  });

  it("rechaza caracteres de control, que el navegador elimina al normalizar", () => {
    // Tras la normalización del navegador estos tres quedan en "//evil.example".
    expect(resolveNextPath(`/${TAB}/evil.example`)).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath(`/${NEWLINE}/evil.example`)).toBe(DEFAULT_REDIRECT);
    expect(resolveNextPath(`/${CARRIAGE_RETURN}/evil.example`)).toBe(
      DEFAULT_REDIRECT,
    );
  });
});
