import { describe, expect, it } from "vitest";

import { NEEDLE_SIZES } from "@/shared/config";

import {
  MAX_NEEDLES,
  addNeedle,
  createFormTitle,
  editFormTitle,
  emptyFields,
  fieldsOf,
  needleChoices,
  parseTargetRounds,
  patternOptionLabel,
  projectPatch,
  removeNeedle,
} from "./project-form";
import type { SerializedPattern, SerializedProject } from "./types";

function project(patch: Partial<SerializedProject> = {}): SerializedProject {
  return {
    id: "p",
    userId: "u",
    name: "Bufanda",
    image: null,
    type: "knitting",
    status: "in_progress",
    rounds: 12,
    targetRounds: 40,
    progress: 30,
    needles: [4, 5],
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: null,
    time: 0,
    patternId: null,
    completedSteps: [],
    notes: "Con lana gruesa",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("títulos del formulario (RFC-03 §1: crear y editar son el mismo modal)", () => {
  it("el alta nombra la clase de tejido que eligió el botón de origen", () => {
    expect(createFormTitle("knitting")).toBe("Nuevo proyecto de dos agujas");
    expect(createFormTitle("crochet")).toBe("Nuevo proyecto de crochet");
  });

  /**
   * Editar dice QUÉ se edita: el modal se abre encima del cajón de detalle, y un
   * título genérico obligaría a mirar detrás del velo para saber sobre qué
   * proyecto se está escribiendo.
   */
  it("la edición nombra el proyecto", () => {
    expect(editFormTitle("Bufanda de invierno")).toBe(
      "Editar Bufanda de invierno",
    );
  });
});

describe("parseTargetRounds (lo mismo que acepta el backend)", () => {
  it("acepta un entero no negativo", () => {
    expect(parseTargetRounds("40")).toBe(40);
    expect(parseTargetRounds("0")).toBe(0);
    expect(parseTargetRounds("  7 ")).toBe(7);
  });

  /**
   * **Vacío es cero, no un error.** Un proyecto que arranca sin meta es el caso
   * normal —es el default de la tabla—, así que obligar a teclear un 0 sería
   * pedir un dato que la aplicación ya sabe.
   */
  it("trata el campo vacío como 'sin meta'", () => {
    expect(parseTargetRounds("")).toBe(0);
    expect(parseTargetRounds("   ")).toBe(0);
  });

  it("rechaza lo que el endpoint rechazaría", () => {
    expect(parseTargetRounds("-3")).toBeNull();
    expect(parseTargetRounds("4,5")).toBeNull();
    expect(parseTargetRounds("4.5")).toBeNull();
    expect(parseTargetRounds("muchas")).toBeNull();
  });
});

describe("agujas (enmienda E6 e: el control vive en la feature)", () => {
  it("el tope es el del esquema", () => {
    expect(MAX_NEEDLES).toBe(20);
  });

  it("añade ordenando de menor a mayor", () => {
    expect(addNeedle([5], 3.5)).toEqual([3.5, 5]);
    expect(addNeedle([3.5, 5], 4)).toEqual([3.5, 4, 5]);
  });

  /**
   * Anotar dos veces la misma medida no dice nada que la lista no dijera ya, y
   * el filtro de agujas es de **contención**: buscar "4 mm" encuentra igual el
   * proyecto con una que con dos.
   */
  it("no repite una medida ya anotada", () => {
    expect(addNeedle([4], 4)).toEqual([4]);
  });

  /**
   * ⚠️ La lista de veinte se construye **a mano y no desde `NEEDLE_SIZES`**: el
   * catálogo tiene **diecisiete** medidas, así que cortarlo por veinte devuelve
   * las diecisiete y el aserto pasaría por el camino equivocado —la medida ya
   * estaría dentro—, sin llegar nunca a comprobar el tope. Es el verde-falso que
   * este repo tiene fichado cinco veces (160, 167, 174, 176) y que este mismo
   * test cometió antes de corregirse.
   *
   * Corolario, escrito para que nadie lo redescubra: **por la interfaz el tope
   * es inalcanzable**, porque sólo se puede elegir del catálogo cerrado y sin
   * repetir. La guarda existe porque `addNeedle` es una función pública y el
   * esquema del endpoint la exige, no porque haya una pantalla que la dispare.
   */
  it("no pasa del tope", () => {
    const lleno = Array.from({ length: MAX_NEEDLES }, (_, index) => index + 1);
    expect(lleno).not.toContain(2.5);

    expect(addNeedle(lleno, 2.5)).toEqual(lleno);
  });

  it("quita la medida pedida y deja el resto", () => {
    expect(removeNeedle([3.5, 4, 5], 4)).toEqual([3.5, 5]);
    expect(removeNeedle([3.5, 4], 9)).toEqual([3.5, 4]);
  });

  /**
   * Lo ya anotado **no se vuelve a ofrecer**: es el mismo criterio que
   * `linkableYarns` en el tab Lanas. Ofrecer algo cuyo efecto no se ve —añadir
   * lo que ya está— es un control que parece roto.
   */
  it("ofrece las medidas del catálogo menos las ya anotadas", () => {
    const choices = needleChoices([4, 5]);

    expect(choices).not.toContain(4);
    expect(choices).not.toContain(5);
    expect(choices).toHaveLength(NEEDLE_SIZES.length - 2);
    expect(choices[0]).toBe(NEEDLE_SIZES[0]);
  });
});

describe("patternOptionLabel (E6 a: sólo ELEGIR de biblioteca)", () => {
  const pattern: SerializedPattern = {
    id: "pat",
    userId: "u",
    name: "Gorro básico",
    image: null,
    type: "crochet",
    instructions: [],
    metadata: [],
    inLibrary: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  /**
   * La clase de tejido va en la etiqueta porque la lista **no se filtra por el
   * tipo elegido en el formulario**: el tipo se puede cambiar con el modal
   * abierto, y filtrar dejaría caer en silencio el patrón ya elegido.
   */
  it("nombra el patrón y su clase de tejido", () => {
    expect(patternOptionLabel(pattern)).toBe("Gorro básico · Crochet");
  });
});

describe("fieldsOf / emptyFields", () => {
  it("el alta arranca con el tipo que eligió el botón y nada más", () => {
    expect(emptyFields("crochet")).toEqual({
      name: "",
      type: "crochet",
      targetRounds: 0,
      needles: [],
      notes: "",
      image: null,
      patternId: null,
    });
  });

  it("la edición arranca con lo que el proyecto tiene hoy", () => {
    expect(fieldsOf(project({ image: "https://cdn/x.png", patternId: "pat" }))).toEqual({
      name: "Bufanda",
      type: "knitting",
      targetRounds: 40,
      needles: [4, 5],
      notes: "Con lana gruesa",
      image: "https://cdn/x.png",
      patternId: "pat",
    });
  });

  /**
   * Copia el array de agujas en vez de compartirlo: el formulario lo muta al
   * añadir y quitar, y compartir la referencia dejaría el "antes" mutando con el
   * "después", que es cómo un parche sale vacío sin que nadie entienda por qué.
   */
  it("no comparte el array de agujas con el proyecto", () => {
    const source = project();
    const fields = fieldsOf(source);
    fields.needles.push(9);

    expect(source.needles).toEqual([4, 5]);
  });
});

describe("projectPatch (PATCH manda SÓLO lo que cambió)", () => {
  const before = fieldsOf(project());

  it("no manda nada cuando nada cambió", () => {
    expect(projectPatch(before, fieldsOf(project()))).toEqual({});
  });

  it("manda sólo el campo tocado", () => {
    expect(projectPatch(before, { ...before, name: "Bufanda larga" })).toEqual({
      name: "Bufanda larga",
    });
  });

  it("compara las agujas por contenido, no por referencia", () => {
    expect(projectPatch(before, { ...before, needles: [4, 5] })).toEqual({});
    expect(projectPatch(before, { ...before, needles: [4] })).toEqual({
      needles: [4],
    });
  });

  /**
   * Quitar la foto y quitar el patrón son cambios **a `null`**, no ausencias: si
   * el parche los omitiera, el endpoint dejaría el valor viejo y el usuario
   * vería que su acción no hizo nada.
   */
  it("manda el nulo cuando se quita la foto o el patrón", () => {
    const conFoto = fieldsOf(project({ image: "https://cdn/x.png", patternId: "pat" }));

    expect(projectPatch(conFoto, { ...conFoto, image: null })).toEqual({
      image: null,
    });
    expect(projectPatch(conFoto, { ...conFoto, patternId: null })).toEqual({
      patternId: null,
    });
  });

  it("manda varios campos a la vez", () => {
    expect(
      projectPatch(before, {
        ...before,
        targetRounds: 60,
        notes: "",
        type: "crochet",
      }),
    ).toEqual({ targetRounds: 60, notes: "", type: "crochet" });
  });
});
