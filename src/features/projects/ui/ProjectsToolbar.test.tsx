// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { cardVariants } from "@/shared/ui";

import {
  MORE_FILTERS_LABEL,
  ProjectsToolbar,
  SEARCH_LABEL,
  STATUS_GROUP_LABEL,
  TYPE_GROUP_LABEL,
} from "./ProjectsToolbar";

/**
 * EL GATE VISUAL DEL TOOLBAR (enmienda E2 del RFC-03, deudas 136 y 142).
 *
 * Existe porque #20 se cerró **verde, con `axe` y con review aprobado**, y la
 * pantalla se veía mal: la suite de #20 ataba roles y contratos de red, y
 * **nadie ataba la disposición**. Medido en `explore_fix20_red_de_tests.md` §2A:
 * *"el toolbar no tiene ni un solo test de estructura… se puede empeorar sin que
 * nada avise"*. Esto es lo que avisa.
 *
 * Lo que se ancla es lo que E2 decidió, no la maqueta entera: **una sola
 * superficie**, **elevada**, **etiquetas visibles** y **dos primitivas
 * distintas** para dos comportamientos distintos. El resto (huecos, orden,
 * anchos) sigue siendo libre a propósito.
 *
 * Ninguna clase de Tailwind se escribe literal aquí: las del `Card` se importan
 * de sus variantes y las que se buscan se arman por concatenación (Tailwind
 * escanea también los tests).
 */
const SR_ONLY = ["sr", "only"].join("-");
const INVERSE_FOREGROUND = ["text", "fg", "inverse"].join("-");

const NOOP = () => {};

function renderToolbar() {
  return render(
    <ProjectsToolbar
      status="active"
      onStatusChange={NOOP}
      types={[]}
      onToggleType={NOOP}
      search=""
      onSearchChange={NOOP}
      needle={null}
      onNeedleChange={NOOP}
      yarnId={null}
      onYarnChange={NOOP}
      yarnChoices={[]}
    />,
  );
}

function classesOf(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

/** La tarjeta más cercana por encima de un nodo, reconocida por sus variantes. */
function enclosingCard(node: Element | null): Element | null {
  const wanted = classesOf(cardVariants());
  let current: Element | null = node;

  while (current !== null) {
    const own = new Set(classesOf(current.className));
    if (wanted.every((className) => own.has(className))) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function allCards(root: Element): Element[] {
  return [...root.querySelectorAll("div")].filter((node) => {
    const own = new Set(classesOf(node.className));
    return classesOf(cardVariants()).every((className) => own.has(className));
  });
}

afterEach(cleanup);

describe("toolbar de proyectos — una sola superficie (E2(b))", () => {
  /**
   * El defecto medido: medio toolbar sobre el fondo de la app y medio sobre una
   * tarjeta elevada, que el ojo leía como un diálogo abierto. Se comprueba por
   * IDENTIDAD de nodo, no contando tarjetas: los cuatro controles tienen que
   * estar dentro de **la misma**.
   */
  it("los cuatro controles viven dentro de la MISMA tarjeta", () => {
    const { container } = renderToolbar();

    const surfaces = [
      screen.getByRole("group", { name: STATUS_GROUP_LABEL }),
      screen.getByRole("group", { name: TYPE_GROUP_LABEL }),
      screen.getByLabelText(SEARCH_LABEL),
      container.querySelector("details"),
    ].map((node) => enclosingCard(node));

    for (const surface of surfaces) {
      expect(surface, "un control quedó fuera de la tarjeta").not.toBeNull();
    }
    expect(new Set(surfaces).size).toBe(1);
  });

  it("hay exactamente una tarjeta en todo el toolbar", () => {
    const { container } = renderToolbar();

    expect(allCards(container)).toHaveLength(1);
  });

  /**
   * **La variante elevada es obligatoria, y no por gusto**: es la única
   * superficie clara del sistema donde el anillo de foco llega al mínimo de
   * contraste (deuda 31: 3.13 en la elevada contra 2.95 en la plana). Si alguien
   * la pasa a plana, el foco de teclado deja de cumplir y ningún otro gate lo ve
   * —`axe` deja el contraste en `incomplete`, medido—.
   */
  it("esa tarjeta es la variante elevada, no la plana", () => {
    const { container } = renderToolbar();
    const card = allCards(container)[0];
    const own = new Set(classesOf(card?.className ?? ""));

    const raised = classesOf(cardVariants({ variant: "raised" }));
    const flatOnly = classesOf(cardVariants({ variant: "flat" })).filter(
      (className) => !raised.includes(className),
    );

    for (const className of raised) {
      expect(own.has(className), `falta ${className}`).toBe(true);
    }
    for (const className of flatOnly) {
      expect(own.has(className), `sobra ${className}`).toBe(false);
    }
  });

  /**
   * Trampa simétrica y medida: dentro de la tarjeta, el crema del primer plano
   * inverso se lee a 1.14:1 sobre la superficie elevada — la deuda 32 al revés.
   * El `summary` estaba fuera y ahora está dentro, así que cambia de signo.
   */
  it("el desplegable no se queda con el primer plano de fuera de la tarjeta", () => {
    const { container } = renderToolbar();
    const summary = container.querySelector("summary");

    expect(summary?.textContent).toBe(MORE_FILTERS_LABEL);
    expect(classesOf(summary?.className ?? "")).not.toContain(
      INVERSE_FOREGROUND,
    );
  });
});

describe("toolbar de proyectos — los dos grupos se ven y se distinguen (E2(c))", () => {
  /**
   * Antes los nombres de los grupos existían **sólo** como nombre accesible:
   * quien miraba la pantalla veía cuatro botones iguales en fila sin saber que
   * eran dos grupos. La etiqueta visible es la mitad barata del arreglo.
   */
  it.each([
    ["estado", STATUS_GROUP_LABEL],
    ["tipo", TYPE_GROUP_LABEL],
  ])("el grupo de %s lleva su etiqueta a la vista", (_name, label) => {
    renderToolbar();
    const visible = screen.getByText(label);

    expect(classesOf(visible.className)).not.toContain(SR_ONLY);
    expect(visible.id).not.toBe("");
    expect(
      screen.getByRole("group", { name: label }),
    ).toHaveAttribute("aria-labelledby", visible.id);
  });

  /**
   * EL DEFECTO QUE ORIGINÓ TODO EL LOTE: dos controles con la misma pinta
   * prometen el mismo comportamiento. El estado es **excluyente** y el tipo es
   * **acumulable**, así que no pueden salir de la misma primitiva. La forma
   * concreta (carril continuo, sin hueco, la elegida rellena) la mide
   * `segmented-control.tokens.test.ts` sobre el CSS compilado; aquí se ancla que
   * **son piezas distintas**.
   */
  it("el estado y el tipo no son la misma primitiva", () => {
    renderToolbar();

    const statusGroup = screen.getByRole("group", { name: STATUS_GROUP_LABEL });
    const typeGroup = screen.getByRole("group", { name: TYPE_GROUP_LABEL });

    expect(statusGroup.dataset.slot).toBe("segmented-control");
    expect(typeGroup.dataset.slot).toBe("toggle-group");
    expect(statusGroup.dataset.slot).not.toBe(typeGroup.dataset.slot);

    expect(
      statusGroup.querySelectorAll('[data-slot="toggle"]'),
    ).toHaveLength(0);
    expect(
      within(typeGroup).getAllByRole("button").length,
    ).toBeGreaterThan(0);
  });
});

describe("toolbar de proyectos — el copy no explica el andamiaje (E2(f))", () => {
  /**
   * `SEARCH_HINT` decía *"…sobre los proyectos ya cargados, sin volver a
   * pedirlos"*: le explicaba al usuario la decisión E1(a). Un campo llamado
   * "Buscar" no necesita explicación, y esa pista era además la causa de que la
   * tarjeta midiera casi el triple que los botones de al lado.
   */
  it("el campo de buscar no arrastra ninguna explicación", () => {
    renderToolbar();
    const search = screen.getByLabelText(SEARCH_LABEL);

    expect(search).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText(/sin volver a pedirlos/i)).toBeNull();
  });
});

describe("toolbar de proyectos — accesibilidad", () => {
  it("no tiene violaciones de axe", async () => {
    const { container } = renderToolbar();

    expect(await axe(container)).toHaveNoViolations();
  });
});
