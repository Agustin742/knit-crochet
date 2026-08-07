// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type RefObject, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { cn } from "../../lib/cn";
import { DIALOG_CLOSE_LABEL, Dialog } from "./Dialog";
import { DIALOG_SIZES, dialogPanelVariants } from "./dialog.variants";

function rootOverflow(): string {
  return document.documentElement.style.overflow;
}

afterEach(() => {
  cleanup();
  /* El bloqueo de scroll vive en el módulo (un elemento raíz, un contador
     compartido): si un test lo dejara puesto, el siguiente arrancaría con el
     fondo bloqueado y mediría otra cosa. Se comprueba, y se limpia ANTES de
     comprobar: así un rojo aquí no arrastra en cascada a todos los tests que
     vengan detrás, que es como un fallo pequeño se disfraza de catástrofe. */
  const leftover = rootOverflow();
  document.documentElement.style.overflow = "";

  expect(leftover, "un diálogo se fue sin soltar el bloqueo").toBe("");
});

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

    // Si viviera en el flujo, el `main` del `AppShell` lo encerraría en su
    // contexto de apilamiento y quedaría por debajo del nav por mucho que su
    // token de z-index valga más. El porqué completo, con los tres tokens y sus
    // valores, vive en `dialog.portal.tokens.test.ts` (deuda 94).
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

/**
 * Dos diálogos en la misma página, cada uno con su interruptor. Sirve para el
 * caso que un `boolean` global resuelve mal: uno abierto sobre otro.
 */
function TwoDialogs({ first, second }: { first: boolean; second: boolean }) {
  return (
    <main>
      <Dialog open={first} onClose={() => {}} title="Primero" />
      <Dialog open={second} onClose={() => {}} title="Segundo" />
    </main>
  );
}

describe("Dialog — invariante 4: el fondo no hace scroll (deuda 87)", () => {
  it("bloquea el scroll del elemento raíz mientras está abierto", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    expect(rootOverflow()).toBe("");
    await openDialog(user);

    // Sin esto, el usuario gira la rueda para ver un campo de abajo del modal y
    // lo que se mueve es la página de detrás.
    expect(rootOverflow()).toBe("hidden");
  });

  it("lo devuelve al cerrar", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await openDialog(user);

    await user.keyboard("{Escape}");

    expect(rootOverflow()).toBe("");
  });

  it("lo suelta aunque el diálogo se DESMONTE sin cerrarse", () => {
    // La página navega con el modal abierto. Si el bloqueo dependiera de pasar
    // por `onClose`, el fondo se quedaría sin scroll para siempre.
    const { unmount } = render(<TwoDialogs first second={false} />);
    expect(rootOverflow()).toBe("hidden");

    unmount();

    expect(rootOverflow()).toBe("");
  });

  it("con dos abiertos, cerrar el de ARRIBA no devuelve el scroll", () => {
    const { rerender } = render(<TwoDialogs first second />);
    expect(rootOverflow()).toBe("hidden");

    rerender(<TwoDialogs first second={false} />);

    // El de abajo sigue abierto: devolver el scroll aquí sería el bug de la
    // deuda 87 reaparecido dentro del propio arreglo.
    expect(rootOverflow()).toBe("hidden");

    rerender(<TwoDialogs first={false} second={false} />);
    expect(rootOverflow()).toBe("");
  });

  it("con dos abiertos, cerrar el de ABAJO tampoco lo devuelve", () => {
    // El orden de cierre no tiene por qué ser el inverso al de apertura: es lo
    // que distingue un contador de referencias de guardar el valor previo y ya.
    const { rerender } = render(<TwoDialogs first second />);

    rerender(<TwoDialogs first={false} second />);
    expect(rootOverflow()).toBe("hidden");

    rerender(<TwoDialogs first={false} second={false} />);
    expect(rootOverflow()).toBe("");
  });

  it("restaura el overflow que ya hubiera, no un valor fijo", () => {
    const previous = "scroll";
    document.documentElement.style.overflow = previous;

    try {
      const { unmount } = render(<TwoDialogs first second={false} />);
      expect(rootOverflow()).toBe("hidden");
      unmount();

      expect(rootOverflow()).toBe(previous);
    } finally {
      // El valor previo lo puso este test, no el diálogo. Se deshace pase lo que
      // pase, para que el aserto de `afterEach` siga midiendo lo que dice medir.
      document.documentElement.style.overflow = "";
    }
  });
});

/**
 * Modal con foco inicial configurable. `target` elige a dónde apunta la prop, y
 * los tres casos malos existen para comprobar el repliegue, no por adorno.
 */
function InitialFocusHarness({
  target,
}: {
  target?: "field" | "unmounted" | "disabled" | "outside";
}) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const unmountedRef = useRef<HTMLInputElement>(null);
  const disabledRef = useRef<HTMLInputElement>(null);
  const outsideRef = useRef<HTMLButtonElement>(null);

  const targets: Record<string, RefObject<HTMLElement | null>> = {
    field: fieldRef,
    // Nunca se cuelga de ningún elemento: `current` se queda en null.
    unmounted: unmountedRef,
    disabled: disabledRef,
    outside: outsideRef,
  };

  return (
    <main>
      <button type="button" onClick={() => setOpen(true)}>
        Nuevo dos agujas
      </button>
      <button type="button" ref={outsideRef}>
        Fuera del modal
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo proyecto"
        initialFocusRef={target ? targets[target] : undefined}
      >
        <input aria-label="Nombre" ref={fieldRef} />
        <input aria-label="Rondas" disabled ref={disabledRef} />
        <button type="button">Guardar</button>
      </Dialog>
    </main>
  );
}

describe("Dialog — foco inicial configurable (deuda 90)", () => {
  it("SIN la prop, sigue enfocando el panel exactamente como antes", async () => {
    const user = userEvent.setup();
    render(<InitialFocusHarness />);
    const dialog = await openDialog(user);

    // El default no cambia: quien ya usaba el componente no se entera de nada.
    expect(dialog).toHaveFocus();
  });

  it("enfoca el campo pedido cuando la prop apunta a uno de dentro", async () => {
    const user = userEvent.setup();
    render(<InitialFocusHarness target="field" />);
    await openDialog(user);

    // El caso de #19: el modal es un formulario y lo correcto es el primer campo.
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveFocus();
  });

  it("no rompe la trampa: desde el campo pedido, tabular sigue dando la vuelta", async () => {
    const user = userEvent.setup();
    render(<InitialFocusHarness target="field" />);
    const dialog = await openDialog(user);

    for (let step = 0; step < 6; step++) {
      await user.tab();
      expect(
        dialog.contains(document.activeElement),
        `el foco se escapó en el paso ${step + 1}`,
      ).toBe(true);
    }
  });

  it("repliega al panel si el elemento pedido no llegó a montarse", async () => {
    const user = userEvent.setup();
    render(<InitialFocusHarness target="unmounted" />);
    const dialog = await openDialog(user);

    // Quedarse sin enfocar nada dejaría el foco en el `body`, es decir a quien
    // navega por teclado tirado al principio del documento.
    expect(dialog).toHaveFocus();
  });

  it("repliega al panel si el elemento pedido no es enfocable", async () => {
    const user = userEvent.setup();
    render(<InitialFocusHarness target="disabled" />);
    const dialog = await openDialog(user);

    expect(dialog).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Rondas" })).not.toHaveFocus();
  });

  it("repliega al panel si el elemento pedido está FUERA del diálogo", async () => {
    const user = userEvent.setup();
    render(<InitialFocusHarness target="outside" />);
    const dialog = await openDialog(user);

    // Obedecer aquí sería abrir el modal con el foco detrás del velo.
    expect(dialog).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Fuera del modal" }),
    ).not.toHaveFocus();
  });

  it("el foco sigue volviendo al disparador al cerrar", async () => {
    const user = userEvent.setup();
    render(<InitialFocusHarness target="field" />);
    const opener = screen.getByRole("button", { name: "Nuevo dos agujas" });
    await openDialog(user);

    await user.keyboard("{Escape}");

    expect(opener).toHaveFocus();
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
