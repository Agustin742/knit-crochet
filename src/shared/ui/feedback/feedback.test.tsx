// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Button } from "../primitives/button/Button";
import { EmptyState } from "./empty-state/EmptyState";
import { ERROR_STATE_RETRY_LABEL, ErrorState } from "./error-state/ErrorState";
import {
  STATE_PANEL_HEADING_LEVELS,
  StatePanel,
} from "./state-panel/StatePanel";
import { STATE_PANEL_TONES } from "./state-panel/state-panel.variants";

afterEach(cleanup);

function panelOf(slot: "empty-state" | "error-state"): HTMLElement {
  const node = document.querySelector(`[data-slot='${slot}']`);
  if (!(node instanceof HTMLElement)) {
    throw new Error(`${slot} no montó`);
  }
  return node;
}

describe("feedback — contrato (REGLA 2a)", () => {
  it("ancla los nombres de los tonos del panel", () => {
    // `toEqual` y no `toContain`: cae al añadir un tono Y al quitar uno.
    expect([...STATE_PANEL_TONES].sort()).toEqual(["danger", "neutral"]);
  });

  it("ancla los niveles de encabezado admitidos", () => {
    expect([...STATE_PANEL_HEADING_LEVELS]).toEqual([2, 3, 4]);
  });

  it("ancla la etiqueta del reintento", () => {
    expect(ERROR_STATE_RETRY_LABEL).toBe("Reintentar");
  });
});

describe("EmptyState", () => {
  it("monta título, descripción y acción (smoke)", () => {
    render(
      <EmptyState
        title="Todavía no tejiste nada en 2026"
        description="Empezá un proyecto y aparecerá acá."
        action={<Button variant="primary">Nuevo dos agujas</Button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Todavía no tejiste nada en 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Empezá un proyecto y aparecerá acá."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nuevo dos agujas" }),
    ).toBeInTheDocument();
  });

  it("se anuncia como región con el nombre de su título", () => {
    render(<EmptyState title="Todavía no hay patrones" />);

    expect(
      screen.getByRole("region", { name: "Todavía no hay patrones" }),
    ).toBe(panelOf("empty-state"));
  });

  it("funciona sin descripción ni acción", () => {
    render(<EmptyState title="Sin lanas" />);

    const panel = panelOf("empty-state");
    expect(panel).toBeInTheDocument();
    expect(panel.querySelector("p")).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("NO interrumpe: no es una alerta", () => {
    // La diferencia de fondo con `ErrorState`. Un vacío que se anuncia solo
    // interrumpe a quien navega con lector de pantalla sin tener nada urgente
    // que decir.
    render(<EmptyState title="Sin proyectos" />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = render(
      <main>
        <EmptyState
          title="Todavía no tejiste nada en 2026"
          description="Empezá un proyecto y aparecerá acá."
          action={<Button variant="primary">Nuevo crochet</Button>}
        />
        <EmptyState title="Sin lanas" />
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("ErrorState", () => {
  it("monta título, descripción y se anuncia como alerta (smoke)", () => {
    render(
      <ErrorState
        title="Se enredó la madeja"
        description="No pudimos traer tus métricas."
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBe(panelOf("error-state"));
    expect(alert).toHaveAccessibleName("Se enredó la madeja");
    expect(
      screen.getByText("No pudimos traer tus métricas."),
    ).toBeInTheDocument();
  });

  it("ofrece reintentar y avisa al llamador", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState title="Se enredó la madeja" onRetry={onRetry} />);

    const retry = screen.getByRole("button", { name: ERROR_STATE_RETRY_LABEL });
    await user.click(retry);

    expect(onRetry).toHaveBeenCalledTimes(1);
    // Dentro de un formulario, un reintento que enviara el formulario sería la
    // trampa de las deudas 39 y 43.
    expect(retry).toHaveAttribute("type", "button");
  });

  it("sin onRetry no monta ningún botón muerto", () => {
    render(<ErrorState title="Se enredó la madeja" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("permite cambiar la etiqueta del reintento", () => {
    render(
      <ErrorState
        title="Se enredó la madeja"
        onRetry={() => {}}
        retryLabel="Probar de nuevo"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Probar de nuevo" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: ERROR_STATE_RETRY_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("una acción propia gana sobre el reintento por defecto", () => {
    render(
      <ErrorState
        title="Se enredó la madeja"
        onRetry={() => {}}
        action={<Button>Volver al inicio</Button>}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Volver al inicio" }),
    ).toBeInTheDocument();
  });

  it("es alcanzable con teclado", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState title="Se enredó la madeja" onRetry={onRetry} />);

    await user.tab();
    expect(
      screen.getByRole("button", { name: ERROR_STATE_RETRY_LABEL }),
    ).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("no tiene violaciones de axe, con y sin reintento", async () => {
    const { container } = render(
      <main>
        <ErrorState
          title="Se enredó la madeja"
          description="No pudimos traer tus métricas."
          onRetry={() => {}}
        />
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();

    cleanup();
    const bare = render(
      <main>
        <ErrorState title="Se enredó la madeja" />
      </main>,
    );

    expect(await axe(bare.container)).toHaveNoViolations();
  });
});

describe("feedback — base compartida", () => {
  it("los dos estados salen del mismo panel y sólo cambian de tono", () => {
    render(
      <>
        <EmptyState title="Vacío" />
        <ErrorState title="Error" />
      </>,
    );

    const empty = panelOf("empty-state");
    const error = panelOf("error-state");

    // Misma composición (mismas clases de layout), distinto tono: es lo que
    // justifica la base común.
    const layoutOf = (node: HTMLElement) =>
      node.className
        .split(" ")
        .filter((entry) => !entry.includes("border-") && !entry.includes("shadow-"));
    expect(layoutOf(empty)).toEqual(layoutOf(error));
    expect(empty.className).not.toBe(error.className);
  });

  it("respeta el nivel de encabezado que le pidan", () => {
    for (const level of STATE_PANEL_HEADING_LEVELS) {
      cleanup();
      render(<EmptyState title="Sin datos" headingLevel={level} />);

      expect(
        screen.getByRole("heading", { name: "Sin datos", level }),
      ).toBeInTheDocument();
    }
  });

  it("fusiona className sin perder las clases del panel", () => {
    render(<StatePanel title="Base" className="custom-class" />);

    const node = screen.getByRole("region", { name: "Base" });
    expect(node).toHaveClass("custom-class");
    expect(node.className).toContain("bg-surface");
  });
});
