// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { type TabItem, Tabs } from "./Tabs";

afterEach(cleanup);

const GROUP_LABEL = "Secciones del proyecto";

type Section = "general" | "progreso" | "sesiones";

const SECTIONS: readonly TabItem<Section>[] = [
  { value: "general", label: "General", content: "Bufanda de invierno" },
  { value: "progreso", label: "Progreso", content: "12 vueltas" },
  { value: "sesiones", label: "Sesiones", content: "Tres sesiones" },
];

/** Montado como lo monta una página: el estado vive en quien lo usa. */
function TabsHarness({
  onValueChange,
  initial = "general",
}: {
  onValueChange?: (value: Section) => void;
  initial?: Section;
}) {
  const [value, setValue] = useState<Section>(initial);

  return (
    <main>
      <button type="button">Antes</button>
      <Tabs
        label={GROUP_LABEL}
        tabs={SECTIONS}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
      />
      <button type="button">Después</button>
    </main>
  );
}

function tablist(): HTMLElement {
  return screen.getByRole("tablist", { name: GROUP_LABEL });
}

function tab(name: string): HTMLElement {
  return within(tablist()).getByRole("tab", { name });
}

describe("Tabs — contrato ARIA (REGLA 2a)", () => {
  it("monta los tres roles del patrón (smoke)", () => {
    render(<TabsHarness />);

    expect(tablist()).toBeInTheDocument();
    expect(within(tablist()).getAllByRole("tab")).toHaveLength(SECTIONS.length);
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Bufanda de invierno",
    );
  });

  it("marca exactamente una pestaña y etiqueta el panel con ella", () => {
    render(<TabsHarness />);

    const tabs = within(tablist()).getAllByRole("tab");
    const selected = tabs.filter(
      (candidate) => candidate.getAttribute("aria-selected") === "true",
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAccessibleName("General");
    // El panel se anuncia con el nombre de su pestaña, no con uno propio.
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("General");
  });

  /**
   * Con los paneles montados a demanda, un `aria-controls` en las pestañas no
   * elegidas apuntaría a un `id` que no existe: atributo ARIA inválido, y `axe`
   * lo marca. Lo lleva **sólo** la elegida, y apunta al panel que sí está.
   */
  it("sólo la pestaña elegida apunta a un panel, y ese panel existe", () => {
    render(<TabsHarness />);

    const target = tab("General").getAttribute("aria-controls");
    expect(target).not.toBeNull();
    expect(document.getElementById(target ?? "")).toHaveRole("tabpanel");

    expect(tab("Progreso")).not.toHaveAttribute("aria-controls");
    expect(tab("Sesiones")).not.toHaveAttribute("aria-controls");
  });

  it("no monta el contenido de las pestañas que no están elegidas", () => {
    render(<TabsHarness />);

    expect(screen.queryByText("12 vueltas")).not.toBeInTheDocument();
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });
});

describe("Tabs — teclado", () => {
  it("el carril es UNA sola parada de tabulación", async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);

    await user.click(screen.getByRole("button", { name: "Antes" }));
    await user.tab();
    expect(tab("General")).toHaveFocus();

    // La siguiente parada es el panel, no la segunda pestaña: si el tabulador
    // recorriera las N pestañas, el carril sería una trampa de tabulación.
    await user.tab();
    expect(screen.getByRole("tabpanel")).toHaveFocus();
  });

  it("las flechas mueven el foco y cambian de pestaña", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TabsHarness onValueChange={onValueChange} />);

    tab("General").focus();
    await user.keyboard("{ArrowRight}");

    expect(onValueChange).toHaveBeenCalledWith("progreso");
    expect(tab("Progreso")).toHaveFocus();
    expect(tab("Progreso")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("12 vueltas");
  });

  it("la flecha izquierda vuelve atrás", async () => {
    const user = userEvent.setup();
    render(<TabsHarness initial="progreso" />);

    tab("Progreso").focus();
    await user.keyboard("{ArrowLeft}");

    expect(tab("General")).toHaveFocus();
    expect(tab("General")).toHaveAttribute("aria-selected", "true");
  });

  it("da la vuelta en los dos extremos", async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);

    tab("General").focus();
    await user.keyboard("{ArrowLeft}");
    expect(tab("Sesiones")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(tab("General")).toHaveFocus();
  });

  it("Home y End van a los extremos", async () => {
    const user = userEvent.setup();
    render(<TabsHarness initial="progreso" />);

    tab("Progreso").focus();
    await user.keyboard("{End}");
    expect(tab("Sesiones")).toHaveFocus();

    await user.keyboard("{Home}");
    expect(tab("General")).toHaveFocus();
  });

  it("el clic también elige", async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);

    await user.click(tab("Sesiones"));

    expect(tab("Sesiones")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Tres sesiones");
  });
});

describe("Tabs — accesibilidad", () => {
  it("no tiene violaciones de axe", async () => {
    const { container } = render(<TabsHarness />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
