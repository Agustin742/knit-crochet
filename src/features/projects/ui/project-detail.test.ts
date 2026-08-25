import { describe, expect, it } from "vitest";

import type { LinkedYarn } from "@/features/projects/types";
import { PROJECT_STATUSES } from "@/shared/config";

import {
  DETAIL_TABS,
  DETAIL_TAB_LABELS,
  PROJECT_STATUS_LABELS,
  finishedSessions,
  linkableYarns,
  linkedYarnLabel,
  moreMatchesHint,
  needlesLabel,
  runningSession,
  sessionElapsedSeconds,
  stepLabel,
  toggleStep,
  totalSessionSeconds,
} from "./project-detail";
import { toYarnChoices } from "./project-filters";
import type { SerializedCraftSession } from "./types";

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
   * **Las cuatro de RFC-03 §2, en su orden, y ni una más.** La lista se compara
   * EXACTA por lo mismo que en la tanda 1, cuando sólo había una: **E3(d)**
   * prohíbe pintar lo que todavía no lleva a ningún lado, así que una pestaña
   * nueva sólo puede entrar aquí **en el mismo commit** que trae su contenido.
   * Y falla también en la otra dirección, la de quitar una sin querer.
   */
  it("publica exactamente las cuatro secciones del cajón", () => {
    expect([...DETAIL_TABS]).toEqual([
      "general",
      "progress",
      "yarns",
      "sessions",
    ]);
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

/* ============================================================================
   Las funciones puras de los tres tabs pesados (tanda 2 de #21).
   ============================================================================ */

describe("stepLabel (una línea de la checklist)", () => {
  it("numera desde uno, como cuenta quien teje", () => {
    expect(stepLabel({ key: "Montaje", value: "40 puntos" }, 0)).toBe(
      "1. Montaje: 40 puntos",
    );
  });

  /** Un patrón escrito de corrido no tiene títulos, y no por eso está roto. */
  it("sin clave usa sólo el texto, sin separador colgando", () => {
    expect(stepLabel({ key: "", value: "Cerrar en redondo" }, 2)).toBe(
      "3. Cerrar en redondo",
    );
  });

  it("sin texto usa sólo la clave", () => {
    expect(stepLabel({ key: "Bloqueo", value: "   " }, 1)).toBe("2. Bloqueo");
  });

  /** Un paso vacío deja el número, que es lo único cierto que queda de él. */
  it("un paso vacío se queda en su número", () => {
    expect(stepLabel({ key: " ", value: "" }, 0)).toBe("1.");
  });
});

describe("toggleStep (el conjunto entero que espera el endpoint)", () => {
  it("marca el paso y devuelve la lista ordenada", () => {
    expect(toggleStep([2, 0], 1)).toEqual([0, 1, 2]);
  });

  it("volver a tocarlo lo desmarca", () => {
    expect(toggleStep([0, 1, 2], 1)).toEqual([0, 2]);
  });

  /**
   * `completedSteps` llega del servidor ya normalizado, pero un payload con
   * repetidos no puede duplicar nada acá: es un conjunto, no una bolsa.
   */
  it("no deja duplicados aunque se los den", () => {
    expect(toggleStep([1, 1, 3], 0)).toEqual([0, 1, 3]);
  });

  it("no muta la lista que recibe", () => {
    const original = [1, 2];
    toggleStep(original, 5);
    expect(original).toEqual([1, 2]);
  });
});

describe("linkedYarnLabel (marca · tipo · color)", () => {
  function linked(patch: Partial<LinkedYarn> = {}): LinkedYarn {
    return {
      id: "y1",
      colorName: "Crudo",
      colorFamily: "neutral",
      brandName: "Manos",
      typeName: "Merino",
      ...patch,
    };
  }

  it("junta las tres partes con el separador del sistema", () => {
    expect(linkedYarnLabel(linked())).toBe("Manos · Merino · Crudo");
  });

  /**
   * `brandName` y `typeName` salen de un JOIN, así que una fila sin nombre es
   * posible; lo que no puede aparecer es un separador suelto en la cara del
   * usuario.
   */
  it("una parte vacía no deja separadores colgando", () => {
    expect(linkedYarnLabel(linked({ typeName: "  " }))).toBe("Manos · Crudo");
  });
});

describe("linkableYarns (lo que el buscador puede ofrecer)", () => {
  const inventory = toYarnChoices([
    { id: "a", colorName: "Crudo", colorFamily: "neutral" },
    { id: "b", colorName: "Petróleo", colorFamily: "blue" },
    { id: "c", colorName: "Bordó", colorFamily: "red" },
  ]);

  function linked(id: string, colorName: string): LinkedYarn {
    return {
      id,
      colorName,
      colorFamily: "neutral",
      brandName: "Manos",
      typeName: "Merino",
    };
  }

  it("sin texto ofrece todo el inventario", () => {
    expect(linkableYarns(inventory, [], "").map((choice) => choice.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  /**
   * Ofrecer una lana ya enlazada daría un botón cuyo efecto no se ve: el enlace
   * es idempotente y responde 200 sin cambiar nada.
   */
  it("no ofrece lo que ya está enlazado", () => {
    expect(
      linkableYarns(inventory, [linked("b", "Petróleo")], "").map(
        (choice) => choice.id,
      ),
    ).toEqual(["a", "c"]);
  });

  /** Mismo comparador que la búsqueda de la lista: sin tildes y sin mayúsculas. */
  it("busca sin tildes ni mayúsculas", () => {
    expect(
      linkableYarns(inventory, [], "  BORDO ").map((choice) => choice.id),
    ).toEqual(["c"]);
  });

  it("sin coincidencias devuelve la lista vacía", () => {
    expect(linkableYarns(inventory, [], "mostaza")).toEqual([]);
  });
});

describe("moreMatchesHint", () => {
  it("concuerda en singular", () => {
    expect(moreMatchesHint(1)).toContain("1 lana más");
  });

  it("y en plural", () => {
    expect(moreMatchesHint(4)).toContain("4 lanas más");
  });
});

describe("sessionElapsedSeconds (el reloj del cronómetro)", () => {
  /**
   * **El año se DERIVA del reloj, nunca se escribe** (deuda 164). Y el instante
   * base se construye en hora **local**, así que la cuenta es la misma en
   * cualquier zona horaria en la que corra la suite.
   */
  const base = new Date(new Date().getFullYear() - 1, 2, 5, 19, 30);
  const startIso = base.toISOString();

  it("cuenta los segundos enteros entre el arranque y el ahora", () => {
    expect(sessionElapsedSeconds(startIso, base.getTime() + 90_000)).toBe(90);
  });

  it("descarta la fracción de segundo en vez de redondear hacia arriba", () => {
    expect(sessionElapsedSeconds(startIso, base.getTime() + 1999)).toBe(1);
  });

  /**
   * El sello del arranque lo pone el **servidor** y la resta se hace con el
   * reloj del navegador: que vaya por detrás es un caso real, no teórico, y
   * "-00:03" en la cara del usuario es peor que un cero.
   */
  it("con el reloj del navegador atrasado devuelve cero, nunca negativo", () => {
    expect(sessionElapsedSeconds(startIso, base.getTime() - 5000)).toBe(0);
  });

  it("un sello ilegible se cuenta como cero", () => {
    expect(sessionElapsedSeconds("no es una fecha", base.getTime())).toBe(0);
  });
});

describe("las tres lecturas del historial de sesiones", () => {
  const base = new Date(new Date().getFullYear() - 1, 2, 5, 19, 30);

  function session(
    patch: Partial<SerializedCraftSession> = {},
  ): SerializedCraftSession {
    return {
      id: "s1",
      userId: "u",
      projectId: "p",
      start: base.toISOString(),
      end: new Date(base.getTime() + 3_600_000).toISOString(),
      duration: 3600,
      ...patch,
    };
  }

  /** La sesión abierta es la que NO tiene fin: es la única señal que existe. */
  it("encuentra la sesión en marcha por su fin nulo", () => {
    const running = session({ id: "s2", end: null, duration: 0 });

    expect(runningSession([session(), running])?.id).toBe("s2");
  });

  it("sin ninguna abierta devuelve null", () => {
    expect(runningSession([session()])).toBeNull();
  });

  it("el historial son las cerradas: la que corre se ve en el cronómetro", () => {
    const running = session({ id: "s2", end: null, duration: 0 });

    expect(finishedSessions([session(), running]).map((one) => one.id)).toEqual([
      "s1",
    ]);
  });

  it("el total suma lo cronometrado, incluida la abierta", () => {
    expect(
      totalSessionSeconds([
        session(),
        session({ id: "s2", duration: 600 }),
        session({ id: "s3", end: null, duration: 0 }),
      ]),
    ).toBe(4200);
  });

  it("sin sesiones el total es cero, no NaN", () => {
    expect(totalSessionSeconds([])).toBe(0);
  });
});
