// @vitest-environment happy-dom
import { createRef } from "react";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SegmentedControl, type SegmentedControlOption } from "./SegmentedControl";

const GROUP_LABEL = "Estado del proyecto";

/**
 * Anotadas con el parámetro por defecto (`string`): así queda escrito que hacer
 * genérico el primitivo (deuda 148) **no rompió a ningún consumidor ya escrito**.
 *
 * **Ojo con leerlas como si estuvieran protegidas: no lo están.** Anotar así
 * colapsa `TValue` a `string`, o sea que en los tests que usan `OPTIONS` el
 * `value` no lo comprueba el tipo — es el hueco que el JSDoc del componente
 * enumera, y por eso el ancla de tipo usa `INFERRED_OPTIONS` y no éstas.
 */
const OPTIONS: readonly SegmentedControlOption[] = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

/**
 * Las mismas, pero **sin anotar**: así el juego de valores se infiere y `TValue`
 * queda en `"active" | "inactive"`, que es lo que hace un consumidor real
 * (`STATUS_OPTIONS` en `ProjectsToolbar`).
 */
const INFERRED_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;

function renderControl(
  value = "active",
  onValueChange: (next: string) => void = () => {},
) {
  return render(
    <SegmentedControl
      label={GROUP_LABEL}
      options={OPTIONS}
      value={value}
      onValueChange={onValueChange}
    />,
  );
}

function optionNamed(name: string): HTMLElement {
  const group = screen.getByRole("group", { name: GROUP_LABEL });
  return within(group).getByRole("button", { name });
}

afterEach(cleanup);

describe("SegmentedControl", () => {
  it("es un grupo con nombre y una opción por entrada", () => {
    renderControl();

    const group = screen.getByRole("group", { name: GROUP_LABEL });
    expect(within(group).getAllByRole("button")).toHaveLength(OPTIONS.length);
    expect(optionNamed("Activos")).toBeInTheDocument();
    expect(optionNamed("Inactivos")).toBeInTheDocument();
  });

  /**
   * LA INVARIANTE DEL CONTROL, y el motivo de que exista el primitivo: **siempre
   * hay exactamente una elegida**. No se comprueba sólo que la elegida esté
   * marcada, sino que **el resto no lo está** — un `ToggleGroup` podía tener dos
   * marcadas o ninguna y nadie se enteraba.
   */
  it("marca exactamente una opción, nunca ninguna ni dos", () => {
    renderControl("inactive");

    const pressed = screen
      .getAllByRole("button")
      .filter((option) => option.getAttribute("aria-pressed") === "true");

    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toBe(optionNamed("Inactivos"));
    expect(optionNamed("Activos")).toHaveAttribute("aria-pressed", "false");
  });

  /**
   * **Ancla de TIPO, no de comportamiento** (deuda 148). Quien la sostiene es
   * `pnpm typecheck`: `value` va envuelto en `NoInfer`, así que `TValue` sale
   * sólo de `options` y un valor ajeno al juego es un error de compilación. Si
   * mañana alguien desata `value` de `options`, el `@ts-expect-error` se queda
   * **sin error que esperar** y `tsc` se pone rojo por directiva sin usar.
   *
   * **Usa `INFERRED_OPTIONS` y no `OPTIONS`, y ahí está media gracia:** con las
   * anotadas (`readonly SegmentedControlOption[]`) `TValue` colapsa a `string` y
   * este `@ts-expect-error` no tendría error que esperar. La protección **existe
   * cuando `options` se deja inferir**, y este test es también dónde eso se lee.
   *
   * Se renderiza además —forzando el tipo— para dejar escrito **lo que el tipo
   * no cierra**: quien se salte esa protección se queda sin ninguna pulsada, y el
   * primitivo no se inventa una elegida por su cuenta.
   */
  it("el tipo rechaza un value que no es el de ninguna opción", () => {
    render(
      <SegmentedControl
        label={GROUP_LABEL}
        options={INFERRED_OPTIONS}
        // @ts-expect-error — no es el `value` de ninguna de las dos opciones
        value="cualquier-otra-cosa"
        onValueChange={() => {}}
      />,
    );

    const pressed = screen
      .getAllByRole("button")
      .filter((option) => option.getAttribute("aria-pressed") === "true");

    expect(pressed).toHaveLength(0);
  });

  /**
   * La otra mitad de la deuda 148, **la que el tipo no puede cerrar**: nada en
   * TypeScript impide listar dos opciones con el mismo `value`. Antes salían
   * **dos** pulsadas y el JSDoc juraba que eso no se podía ni representar; ahora
   * la elegida es una POSICIÓN, así que se marca la primera y ninguna más.
   */
  it("con dos opciones del mismo valor marca la primera y sólo la primera", () => {
    render(
      <SegmentedControl
        label={GROUP_LABEL}
        options={[
          { value: "active", label: "Activos" },
          { value: "active", label: "Activos otra vez" },
        ]}
        value="active"
        onValueChange={() => {}}
      />,
    );

    const pressed = screen
      .getAllByRole("button")
      .filter((option) => option.getAttribute("aria-pressed") === "true");

    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toBe(optionNamed("Activos"));
    expect(optionNamed("Activos otra vez")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  /**
   * El genérico obligó a envolver el `forwardRef` en una aserción de tipo (los
   * genéricos no sobreviven a su firma). La aserción **no toca el runtime**, y
   * esto es lo que lo comprueba en vez de darlo por hecho.
   */
  it("sigue reenviando el ref al carril", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SegmentedControl
        ref={ref}
        label={GROUP_LABEL}
        options={INFERRED_OPTIONS}
        value="active"
        onValueChange={() => {}}
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.dataset.slot).toBe("segmented-control");
  });

  it("avisa con el valor de la opción tocada", async () => {
    const onValueChange = vi.fn();
    renderControl("active", onValueChange);

    await userEvent.click(optionNamed("Inactivos"));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("inactive");
  });

  /**
   * Volver a tocar la ya elegida **no la apaga**: en un excluyente no existe
   * "ninguna". Avisa igual, con el mismo valor, para que el consumidor no tenga
   * que adivinar si hubo o no interacción.
   */
  it("no se puede quedar sin ninguna elegida al retocar la actual", async () => {
    const onValueChange = vi.fn();
    renderControl("active", onValueChange);

    await userEvent.click(optionNamed("Activos"));

    expect(onValueChange).toHaveBeenCalledWith("active");
    expect(optionNamed("Activos")).toHaveAttribute("aria-pressed", "true");
  });

  /** Botones nativos: el tabulador los alcanza y Enter los activa, sin cablear teclado. */
  it("se recorre y se activa con el teclado", async () => {
    const onValueChange = vi.fn();
    renderControl("active", onValueChange);

    await userEvent.tab();
    expect(optionNamed("Activos")).toHaveFocus();

    await userEvent.tab();
    expect(optionNamed("Inactivos")).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("inactive");
  });

  /**
   * `type="button"` fijo: dentro de un formulario, un segmentado que enviara el
   * formulario al elegir sería la deuda 39 en otro disfraz.
   */
  it("nunca envía el formulario que lo contenga", () => {
    renderControl();

    for (const option of screen.getAllByRole("button")) {
      expect(option).toHaveAttribute("type", "button");
    }
  });

  it("respeta una opción deshabilitada sin perder la elegida", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label={GROUP_LABEL}
        options={[OPTIONS[0]!, { ...OPTIONS[1]!, disabled: true }]}
        value="active"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(optionNamed("Inactivos"));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(optionNamed("Activos")).toHaveAttribute("aria-pressed", "true");
  });

  it("fusiona el className del llamador sin perder el suyo", () => {
    const extra = ["w", "full"].join("-");
    const { container } = render(
      <SegmentedControl
        label={GROUP_LABEL}
        options={OPTIONS}
        value="active"
        onValueChange={() => {}}
        className={extra}
      />,
    );

    const track = container.querySelector('[data-slot="segmented-control"]');
    expect(track?.className).toContain(extra);
    expect(track?.className.split(" ").length).toBeGreaterThan(1);
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = renderControl();

    expect(await axe(container)).toHaveNoViolations();
  });
});
