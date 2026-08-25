import { describe, expect, it } from "vitest";

import { PROJECT_STATUSES } from "@/shared/config";

import {
  DETAIL_TABS,
  DETAIL_TAB_LABELS,
  PROJECT_STATUS_LABELS,
  needlesLabel,
} from "./project-detail";

describe("PROJECT_STATUS_LABELS", () => {
  /**
   * **Derivado del enum, no copiado**: si mañana el dominio gana un estado y
   * nadie le escribe su nombre en español, esto cae en vez de pintar la clave
   * cruda del backend en la cara de quien teje. (El `Record` ya lo cierra en
   * compilación; esto lo cierra también en la dirección contraria, la de un
   * `Record` con claves de más.)
   */
  it("nombra exactamente los estados que existen", () => {
    expect(Object.keys(PROJECT_STATUS_LABELS).sort()).toEqual(
      [...PROJECT_STATUSES].sort(),
    );
  });

  it("los nombres están en español y no repiten", () => {
    const names = Object.values(PROJECT_STATUS_LABELS);

    expect(new Set(names).size).toBe(names.length);
    expect(PROJECT_STATUS_LABELS.in_progress).toBe("En curso");
  });
});

describe("DETAIL_TABS", () => {
  /**
   * **Hoy hay UNA pestaña, y está escrito a propósito** (E3(a) parte #21 en dos
   * tandas; E3(d) prohíbe pintar lo que todavía no lleva a ningún lado). Cuando
   * la tanda 2 añada Progreso, Lanas y Sesiones, este número cambia **en el
   * mismo commit** que las añade, no antes.
   */
  it("sólo publica la pestaña que ya tiene contenido", () => {
    expect([...DETAIL_TABS]).toEqual(["general"]);
  });

  it("cada pestaña tiene su nombre visible", () => {
    for (const tab of DETAIL_TABS) {
      expect(DETAIL_TAB_LABELS[tab]).not.toBe("");
    }
  });
});

describe("needlesLabel", () => {
  it("junta las medidas con la coma decimal del idioma", () => {
    expect(needlesLabel([4, 4.5])).toBe("4 mm · 4,5 mm");
  });

  it("una sola aguja no arrastra separador", () => {
    expect(needlesLabel([8])).toBe("8 mm");
  });

  /** `null` y no cadena vacía: el texto de la ausencia lo elige el componente. */
  it("sin agujas devuelve null", () => {
    expect(needlesLabel([])).toBeNull();
  });
});
