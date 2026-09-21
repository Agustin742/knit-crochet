import { describe, expect, it } from "vitest";

import { brandBlockedBody, typeBlockedBody } from "./yarn-copy";

/**
 * Copy del aviso de bloqueo 409 (design D4, backlog 24 slice S2b): pluraliza
 * como `stockLabel` y omite la cláusula cuyo conteo es 0. Los dos contadores
 * en 0 a la vez no puede pasar — el servidor no manda 409 en ese caso — así
 * que no hay caso de "ambos 0" que probar.
 */
describe("brandBlockedBody — pluraliza y omite la cláusula en 0", () => {
  it("singular en los dos contadores", () => {
    expect(brandBlockedBody(1, 1)).toBe(
      "Esta marca todavía tiene 1 tipo y 1 lana. Borrá el tipo y la lana antes de eliminar la marca.",
    );
  });

  it("plural en los dos contadores", () => {
    expect(brandBlockedBody(2, 5)).toBe(
      "Esta marca todavía tiene 2 tipos y 5 lanas. Borrá los tipos y las lanas antes de eliminar la marca.",
    );
  });

  it("omite la cláusula de tipos cuando ese contador es 0", () => {
    expect(brandBlockedBody(0, 3)).toBe(
      "Esta marca todavía tiene 3 lanas. Borrá las lanas antes de eliminar la marca.",
    );
  });

  it("omite la cláusula de lanas cuando ese contador es 0", () => {
    expect(brandBlockedBody(2, 0)).toBe(
      "Esta marca todavía tiene 2 tipos. Borrá los tipos antes de eliminar la marca.",
    );
  });
});

describe("typeBlockedBody — pluraliza el conteo de lanas", () => {
  it("singular", () => {
    expect(typeBlockedBody(1)).toBe(
      "Este tipo todavía tiene 1 lana. Borrá la lana antes de eliminar el tipo.",
    );
  });

  it("plural", () => {
    expect(typeBlockedBody(4)).toBe(
      "Este tipo todavía tiene 4 lanas. Borrá las lanas antes de eliminar el tipo.",
    );
  });
});
