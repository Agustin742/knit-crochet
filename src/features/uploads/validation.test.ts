import { describe, expect, it } from "vitest";

import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/features/uploads";

/**
 * Ancla del contrato cerrado (PRD §11.9). Es el **único** sitio del feature
 * donde un literal está justificado: aquí el literal *es* el contrato, y lo que
 * se mide es que el código no se haya alejado de él. El resto de tests derivan
 * su valor de estas constantes y deben seguir haciéndolo — mezclar las dos
 * mitades es la deuda 18/22/23 ("el test mide una cosa y el código consume otra").
 *
 * Sin este archivo, abrir la lista blanca o decuplicar el tope dejaba la suite
 * entera en verde: lo midió el reviewer de la feature 15 con dos mutaciones.
 */
describe("features/uploads contract anchors (PRD §11.9)", () => {
  it("accepts exactly the three types of the whitelist, no more and no less", () => {
    expect([...ACCEPTED_IMAGE_TYPES]).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    // Explícito a propósito: `toContain` no detecta lo que SOBRA, que es
    // justamente el riesgo de una lista blanca (PRD §11.9: "lo no enumerado se
    // rechaza"). Un formato nuevo entra tocando este test, nunca por descuido.
    expect(ACCEPTED_IMAGE_TYPES).toHaveLength(3);
  });

  it("caps the upload at 4 MB", () => {
    expect(MAX_IMAGE_BYTES).toBe(4 * 1024 * 1024);
  });

  /**
   * El tope no es una preferencia: es lo que cabe. Las funciones de Vercel
   * limitan el cuerpo de petición a 4,5 MB **a nivel de infraestructura** (no
   * configurable) y devuelven `413 FUNCTION_PAYLOAD_TOO_LARGE` antes de que el
   * handler exista, así que un tope por encima certificaría un caso que en
   * producción siempre falla y con un error que no es nuestro `{ error }`.
   * Quien suba el tope tiene que resolver antes el límite de la plataforma.
   */
  it("stays below the request body limit of the platform", () => {
    const VERCEL_REQUEST_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;

    expect(MAX_IMAGE_BYTES).toBeLessThan(VERCEL_REQUEST_BODY_LIMIT_BYTES);
  });
});
