// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";
import { DIALOG_CLOSE_LABEL, Dialog } from "./Dialog";
import { DIALOG_SIZES, dialogPanelVariants } from "./dialog.variants";

afterEach(cleanup);

/**
 * El modal montado como lo va a montar una página: un disparador que lo abre,
 * otro control fuera (para poder ver si el foco se escapa) y contenido con
 * varias paradas de tabulación dentro.
 */
function DialogHarness({
  onClose,
  description,
  dismissOnScrimClick,
}: {
  onClose?: () => void;
  description?: string;
  dismissOnScrimClick?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <main>
      <button type="button" onClick={() => setOpen(true)}>
        Nuevo dos agujas
      </button>
      <button type="button">Fuera del modal</button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
        title="Nuevo proyecto"
        description={description}
        dismissOnScrimClick={dismissOnScrimClick}
      >
        <input aria-label="Nombre" />
        <button type="button">Guardar</button>
      </Dialog>
    </main>
  );
}

function panel(): HTMLElement {
  return screen.getByRole("dialog", { name: "Nuevo proyecto" });
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Nuevo dos agujas" }));
  return panel();
}

describe("Dialog — contrato (REGLA 2a)", () => {
  it("ancla los nombres de los tamaños públicos", () => {
    // `toEqual` y no `toContain`: cae al añadir un tamaño Y al quitar uno.
    expect([...DIALOG_SIZES].sort()).toEqual(["lg", "md"]);
  });

  it("ancla el contrato ARIA del modal al literal", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const dialog = await openDialog(user);

    // Aquí el literal ES el contrato: sin `aria-modal="true"` el lector de
    // pantalla sigue leyendo la página de detrás como si el modal no existiera.
    expect(dialog).toHaveAttribute("role", "dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Nuevo proyecto");
  });

  it("ancla la etiqueta del control de cierre", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const dialog = await openDialog(user);

    expect(
      within(dialog).getByRole("button", { name: DIALOG_CLOSE_LABEL }),
    ).toBeInTheDocument();
    expect(DIALOG_CLOSE_LABEL).toBe("Cerrar");
  });
});

describe("Dialog — montaje", () => {
  it("no monta nada mientras está cerrado (smoke)", () => {
    render(<DialogHarness />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se monta en un portal al body, fuera del árbol de la página", async () => {
    const user = userEvent.setup();
    const { container } = render(<DialogHarness />);
    const dialog = await openDialog(user);

    // Si viviera en el flujo, un ancestro con `transform` lo encerraría por
    // debajo del nav por mucho que su token de z-index valga más.
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("aplica el tamaño por defecto y el pedido, con className fusionado", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const dialog = await openDialog(user);

    // Salida real de `cn()` sobre el DOM, no el string crudo de `cva`.
    for (const entry of cn(dialogPanelVariants({})).split(" ")) {
      expect(dialog.className.split(" ")).toContain(entry);
    }
  });

  it("describe el diálogo sólo cuando hay descripción", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DialogHarness />);
    expect(await openDialog(user)).not.toHaveAttribute("aria-describedby");
    unmount();

    render(<DialogHarness description="Elegí un nombre y arrancá." />);
    const described = await openDialog(user);
    expect(described).toHaveAccessibleDescription("Elegí un nombre y arrancá.");
  });
});

describe("Dialog — invariante 1: el foco queda atrapado dentro", () => {
  it("al abrir, el foco entra en el diálogo", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const dialog = await openDialog(user);

    expect(dialog).toHaveFocus();
  });

  it("tabular en círculo nunca saca el foco del diálogo", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const dialog = await openDialog(user);

    // Más vueltas que paradas hay dentro: si el ciclo se escapa una sola vez,
    // cae. Los controles de la página quedan detrás del velo, así que llegar a
    // ellos con el teclado sería llegar a algo que no se puede ver ni usar.
    const outside = screen.getByRole("button", { name: "Fuera del modal" });
    const opener = screen.getByRole("button", { name: "Nuevo dos agujas" });

    for (let step = 0; step < 8; step++) {
      await user.tab();
      expect(
        dialog.contains(document.activeElement),
        `el foco se escapó en el paso ${step + 1}: ${document.activeElement?.outerHTML}`,
      ).toBe(true);
      expect(document.activeElement).not.toBe(outside);
      expect(document.activeElement).not.toBe(opener);
    }
  });

  it("tabular hacia atrás tampoco lo saca", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const dialog = await openDialog(user);

    for (let step = 0; step < 8; step++) {
      await user.tab({ shift: true });
      expect(
        dialog.contains(document.activeElement),
        `el foco se escapó hacia atrás en el paso ${step + 1}`,
      ).toBe(true);
    }
  });

  it("el ciclo recorre TODAS las paradas del diálogo, en orden", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const dialog = await openDialog(user);

    // Derivado del DOM: la lista no se copia a mano, se lee del diálogo real.
    const stops = [
      ...dialog.querySelectorAll<HTMLElement>("button, input"),
    ].filter((element) => !element.hasAttribute("disabled"));
    expect(stops.length).toBeGreaterThan(1);

    const visited: HTMLElement[] = [];
    for (let step = 0; step < stops.length + 1; step++) {
      await user.tab();
      visited.push(document.activeElement as HTMLElement);
    }

    expect(visited.slice(0, stops.length)).toEqual(stops);
    // La vuelta completa: la parada siguiente a la última es la primera.
    expect(visited[stops.length]).toBe(stops[0]);
  });
});

describe("Dialog — invariante 2: Escape cierra", () => {
  it("cierra con Escape y avisa al llamador", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);
    await openDialog(user);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cierra con Escape desde cualquier control de dentro", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await openDialog(user);

    await user.tab();
    await user.tab();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("también cierra con el control de cierre y con el clic en el velo", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: DIALOG_CLOSE_LABEL }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const reopened = await openDialog(user);
    // Un clic DENTRO del panel no cierra: sólo el velo.
    await user.click(reopened);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const scrim = document.querySelector("[data-slot='dialog-scrim']");
    if (!(scrim instanceof HTMLElement)) {
      throw new Error("el diálogo no pintó su velo");
    }
    await user.click(scrim);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("respeta que el velo NO cierre cuando se apaga", async () => {
    const user = userEvent.setup();
    render(<DialogHarness dismissOnScrimClick={false} />);
    await openDialog(user);

    const scrim = document.querySelector("[data-slot='dialog-scrim']");
    if (!(scrim instanceof HTMLElement)) {
      throw new Error("el diálogo no pintó su velo");
    }
    await user.click(scrim);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("Dialog — invariante 3: el foco vuelve al disparador", () => {
  it("al cerrar con Escape, el foco vuelve a quien lo abrió", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Nuevo dos agujas" });
    await openDialog(user);

    await user.keyboard("{Escape}");

    // Sin esto, quien navega por teclado reaparece al principio del documento
    // y tiene que recorrerlo entero para volver a donde estaba.
    expect(opener).toHaveFocus();
  });

  it("vuelve al disparador aunque se cierre desde el control de cierre", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Nuevo dos agujas" });
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: DIALOG_CLOSE_LABEL }),
    );

    expect(opener).toHaveFocus();
  });

  it("vuelve al disparador REAL, no a uno cualquiera de la página", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const outside = screen.getByRole("button", { name: "Fuera del modal" });

    // Se abre desde el teclado, con el foco puesto en el disparador.
    await user.tab();
    const opener = screen.getByRole("button", { name: "Nuevo dos agujas" });
    expect(opener).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(opener).toHaveFocus();
    expect(outside).not.toHaveFocus();
  });
});

describe("Dialog — accesibilidad", () => {
  it("no tiene violaciones de axe con el modal abierto", async () => {
    const user = userEvent.setup();
    render(<DialogHarness description="Elegí un nombre y arrancá." />);
    await openDialog(user);

    // Sobre `document.body`: el diálogo vive en el portal, así que el contenedor
    // de RTL no lo contiene y medirlo ahí no mediría nada.
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
