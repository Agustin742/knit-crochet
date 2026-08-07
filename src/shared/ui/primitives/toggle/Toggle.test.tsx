// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Toggle } from "./Toggle";
import { ToggleGroup } from "./ToggleGroup";

afterEach(cleanup);

/**
 * Los dos consumidores reales del control (RFC-02 §1), montados como los va a
 * montar la página: el estado vive ARRIBA y es un conjunto, porque lo que define
 * a este primitivo es que varios puedan estar activos a la vez.
 */
function MultiSelect({
  label,
  options,
  initial = [],
}: {
  label: string;
  options: string[];
  initial?: string[];
}) {
  const [active, setActive] = useState<string[]>(initial);

  return (
    <ToggleGroup label={label}>
      {options.map((option) => (
        <Toggle
          key={option}
          pressed={active.includes(option)}
          onPressedChange={(pressed) =>
            setActive((current) =>
              pressed
                ? [...current, option]
                : current.filter((entry) => entry !== option),
            )
          }
        >
          {option}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

const METRICS = ["Horas", "Proyectos", "Metros"];
const CRAFT_TYPES = ["Dos agujas", "Crochet"];

function pressedState(names: string[]): Record<string, string | null> {
  return Object.fromEntries(
    names.map((name) => [
      name,
      screen.getByRole("button", { name }).getAttribute("aria-pressed"),
    ]),
  );
}

describe("Toggle — contrato ARIA (REGLA 2a)", () => {
  it("ancla el atributo y sus dos valores al literal del contrato", () => {
    // Éste es el sitio donde el literal ES el contrato: `aria-pressed` es lo que
    // convierte un botón en un conmutador, y "false" tiene que estar PRESENTE —
    // un botón sin el atributo no se anuncia como conmutable, y ese defecto
    // pasaría desapercibido con cualquier aserción de "no está activo".
    render(
      <>
        <Toggle pressed>Activo</Toggle>
        <Toggle pressed={false}>Inactivo</Toggle>
      </>,
    );

    expect(screen.getByRole("button", { name: "Activo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Inactivo" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("NO es un Tabs: ni tablist, ni tab, ni radio en el árbol", () => {
    render(<MultiSelect label="Métricas" options={METRICS} initial={["Horas"]} />);

    for (const role of ["tablist", "tab", "radiogroup", "radio"] as const) {
      expect(
        screen.queryAllByRole(role),
        `apareció un role ${role}: eso promete exactamente uno activo`,
      ).toEqual([]);
    }
    expect(screen.getAllByRole("button")).toHaveLength(METRICS.length);
  });

  it("el grupo se anuncia con su nombre y contiene a los conmutadores", () => {
    render(<MultiSelect label="Tipo de tejido" options={CRAFT_TYPES} />);

    const group = screen.getByRole("group", { name: "Tipo de tejido" });
    expect(within(group).getAllByRole("button")).toHaveLength(
      CRAFT_TYPES.length,
    );
  });
});

describe("Toggle — conmutable", () => {
  it("es type=button (no envía el formulario que lo contenga)", () => {
    render(<Toggle pressed={false}>Horas</Toggle>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("avisa del estado AL QUE PASA, no del actual", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    const { rerender } = render(
      <Toggle pressed={false} onPressedChange={onPressedChange}>
        Horas
      </Toggle>,
    );

    await user.click(screen.getByRole("button", { name: "Horas" }));
    expect(onPressedChange).toHaveBeenLastCalledWith(true);

    rerender(
      <Toggle pressed onPressedChange={onPressedChange}>
        Horas
      </Toggle>,
    );
    await user.click(screen.getByRole("button", { name: "Horas" }));
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
    expect(onPressedChange).toHaveBeenCalledTimes(2);
  });

  it("no guarda estado propio: sin el prop, no se mueve", async () => {
    const user = userEvent.setup();
    render(<Toggle pressed={false}>Horas</Toggle>);

    const toggle = screen.getByRole("button", { name: "Horas" });
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("conmuta con teclado (Enter y Espacio) y es alcanzable con Tab", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle pressed={false} onPressedChange={onPressedChange}>
        Horas
      </Toggle>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Horas" })).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onPressedChange).toHaveBeenCalledTimes(2);
    expect(onPressedChange).toHaveBeenNthCalledWith(1, true);
    expect(onPressedChange).toHaveBeenNthCalledWith(2, true);
  });

  it("deshabilitado no conmuta", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle pressed={false} disabled onPressedChange={onPressedChange}>
        Horas
      </Toggle>,
    );

    await user.click(screen.getByRole("button", { name: "Horas" }));
    expect(onPressedChange).not.toHaveBeenCalled();
  });
});

describe("Toggle — SUPERPONIBLE (varios activos a la vez)", () => {
  it("el selector de métrica admite las tres a la vez", async () => {
    const user = userEvent.setup();
    render(<MultiSelect label="Métricas" options={METRICS} initial={["Horas"]} />);

    expect(pressedState(METRICS)).toEqual({
      Horas: "true",
      Proyectos: "false",
      Metros: "false",
    });

    await user.click(screen.getByRole("button", { name: "Proyectos" }));
    await user.click(screen.getByRole("button", { name: "Metros" }));

    // El gate del control: encender una NO apaga a las otras. Con selección
    // única aquí quedaría una sola en "true" y esto cae.
    expect(pressedState(METRICS)).toEqual({
      Horas: "true",
      Proyectos: "true",
      Metros: "true",
    });
  });

  it("apagar una deja a las demás encendidas", async () => {
    const user = userEvent.setup();
    render(<MultiSelect label="Métricas" options={METRICS} initial={METRICS} />);

    await user.click(screen.getByRole("button", { name: "Proyectos" }));

    expect(pressedState(METRICS)).toEqual({
      Horas: "true",
      Proyectos: "false",
      Metros: "true",
    });
  });

  it("los dos botones de tipo se combinan", async () => {
    const user = userEvent.setup();
    render(<MultiSelect label="Tipo de tejido" options={CRAFT_TYPES} />);

    for (const type of CRAFT_TYPES) {
      await user.click(screen.getByRole("button", { name: type }));
    }

    expect(pressedState(CRAFT_TYPES)).toEqual({
      "Dos agujas": "true",
      Crochet: "true",
    });
  });

  it("admite el conjunto vacío (ninguno activo)", async () => {
    const user = userEvent.setup();
    render(<MultiSelect label="Métricas" options={METRICS} initial={["Horas"]} />);

    await user.click(screen.getByRole("button", { name: "Horas" }));

    expect(pressedState(METRICS)).toEqual({
      Horas: "false",
      Proyectos: "false",
      Metros: "false",
    });
  });
});

describe("Toggle — presentación y accesibilidad", () => {
  it("el estado activo se pinta desde el propio aria-pressed", () => {
    // El estilo del activo NO depende de una clase que el llamador pase: sale
    // del atributo, así que la pista visual y la semántica no se pueden
    // desincronizar. Se comprueba sobre el DOM: misma clase en los dos estados,
    // distinto atributo.
    render(
      <>
        <Toggle pressed>Activo</Toggle>
        <Toggle pressed={false}>Inactivo</Toggle>
      </>,
    );

    const active = screen.getByRole("button", { name: "Activo" });
    const inactive = screen.getByRole("button", { name: "Inactivo" });
    expect(active.className).toBe(inactive.className);
    expect(active.getAttribute("aria-pressed")).not.toBe(
      inactive.getAttribute("aria-pressed"),
    );

    const pressedPrefix = ["aria-pressed", ":"].join("");
    const conditional = active.className
      .split(" ")
      .filter((entry) => entry.startsWith(pressedPrefix));
    expect(
      conditional.length,
      "el estado activo no tiene ninguna clase condicionada al atributo",
    ).toBeGreaterThan(0);
    // Regla de superficies: quien elige fondo elige también primer plano.
    const background = [pressedPrefix, "bg", "-"].join("");
    const foreground = [pressedPrefix, "text", "-"].join("");
    expect(conditional.some((entry) => entry.startsWith(background))).toBe(true);
    expect(conditional.some((entry) => entry.startsWith(foreground))).toBe(true);
  });

  it("fusiona className sin perder las clases del control", () => {
    render(
      <Toggle pressed={false} className="custom-class">
        Horas
      </Toggle>,
    );

    const toggle = screen.getByRole("button", { name: "Horas" });
    expect(toggle).toHaveClass("custom-class");
    expect(toggle.className).toContain("bg-surface-raised");
  });

  it("no tiene violaciones de axe en sus estados", async () => {
    const { container } = render(
      <main>
        <ToggleGroup label="Métricas">
          <Toggle pressed>Horas</Toggle>
          <Toggle pressed={false}>Proyectos</Toggle>
          <Toggle pressed={false} disabled>
            Metros
          </Toggle>
        </ToggleGroup>
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
