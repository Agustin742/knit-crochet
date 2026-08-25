// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DIALOG_CLOSE_LABEL } from "@/shared/ui";

import {
  DETAIL_ERROR_TITLE,
  DETAIL_LOADING_MESSAGE,
  DETAIL_LOADING_REGION_LABEL,
  ProjectDetailDrawer,
} from "./ProjectDetailDrawer";
import { CRAFT_TYPE_LABELS } from "./project-filters";
import {
  DETAIL_TABS_LABEL,
  DETAIL_TAB_LABELS,
  GENERAL_FIELD_LABELS,
  NO_END_DATE,
  NO_NEEDLES,
  NO_NOTES,
  PROJECT_STATUS_LABELS,
} from "./project-detail";
import {
  NETWORK_ERROR_MESSAGE,
  projectDetailEndpoint,
} from "./projects-client";
import type {
  ProjectCardData,
  SerializedProject,
  SerializedProjectDetail,
} from "./types";

/**
 * **Los años se DERIVAN del reloj, nunca se escriben a mano** (deuda 164): un
 * fixture con el año en duro empieza a mentir el 1 de enero y sigue verde
 * mientras tanto. Lo que se afirma es el día y el mes, que sí son del fixture.
 */
const LAST_YEAR = String(new Date().getUTCFullYear() - 1);
const START_ISO = `${LAST_YEAR}-03-05T00:00:00.000Z`;
const START_TEXT = `5 de marzo de ${LAST_YEAR}`;
const END_ISO = `${LAST_YEAR}-07-21T00:00:00.000Z`;
const END_TEXT = `21 de julio de ${LAST_YEAR}`;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function project(patch: Partial<SerializedProject> = {}): SerializedProject {
  return {
    id: "bufanda",
    userId: "u",
    name: "Bufanda de invierno",
    image: null,
    type: "knitting",
    status: "in_progress",
    rounds: 12,
    targetRounds: 40,
    progress: 30,
    needles: [4, 4.5],
    startDate: START_ISO,
    endDate: null,
    time: 0,
    patternId: null,
    completedSteps: [],
    notes: "Punto elástico 2x2.",
    createdAt: START_ISO,
    updatedAt: START_ISO,
    ...patch,
  };
}

/** Lo que la lista ya tiene y le pasa al cajón: id, nombre, foto, progreso, tipo. */
function card(from: SerializedProject): ProjectCardData {
  return {
    id: from.id,
    name: from.name,
    image: from.image,
    progress: from.progress,
    time: from.time,
    type: from.type,
  };
}

const fetchSpy = vi.fn();

type Scenario = {
  detail?: SerializedProjectDetail;
  status?: number;
  error?: string;
  /** La petición no llega a salir (red caída). */
  offline?: boolean;
};

function serve(next: Scenario = {}) {
  fetchSpy.mockImplementation((url: string) => {
    if (next.offline === true) {
      return Promise.reject(new Error("sin red"));
    }
    const status = next.status ?? 200;
    void url;
    return Promise.resolve(
      status === 200
        ? jsonResponse(200, next.detail ?? { project: project(), yarns: [] })
        : jsonResponse(status, { error: next.error ?? "roto" }),
    );
  });
}

/**
 * La misma respuesta, pero **retenida** hasta que el test la suelte. Es la única
 * forma honesta de mirar el estado de carga: un doble que resuelve al instante
 * no deja ver el fotograma que un usuario con red lenta sí ve.
 */
function serveLater(): () => void {
  let release = () => {};
  fetchSpy.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        release = () => {
          resolve(jsonResponse(200, { project: project(), yarns: [] }));
        };
      }),
  );
  return () => {
    release();
  };
}

/**
 * Montado **como lo monta la página**: la tarjeta de la lista es quien abre el
 * cajón, así que el disparador es un control de verdad y el foco tiene a dónde
 * volver. Un doble que abriera el cajón "ya abierto" mediría un estado que la
 * aplicación no puede alcanzar (REGLA 7).
 */
function DrawerHarness({ data }: { data?: SerializedProject }) {
  const row = data ?? project();
  const [open, setOpen] = useState(false);

  return (
    <main>
      <button type="button" onClick={() => setOpen(true)}>
        {`Ver detalle de ${row.name}`}
      </button>
      <ProjectDetailDrawer
        project={open ? card(row) : null}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}

/**
 * Monta la pantalla con **un solo** proyecto: el mismo que la lista le pasa al
 * cajón y el mismo que responde el endpoint. Son dos caminos distintos hacia el
 * mismo dato —la tarjeta pone el título, la petición pone el contenido— y
 * separarlos en el doble mediría un estado que producción no puede alcanzar
 * (REGLA 7).
 */
function renderDrawer(data = project(), scenario: Scenario = {}) {
  serve({ detail: { project: data, yarns: [] }, ...scenario });
  return render(<DrawerHarness data={data} />);
}

function trigger(name = "Ver detalle de Bufanda de invierno"): HTMLElement {
  return screen.getByRole("button", { name });
}

function drawer(): HTMLElement {
  return screen.getByRole("dialog");
}

/** Espera a que la región viva del cajón se calle: la carga terminó. */
async function settle() {
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL })
        .textContent,
    ).toBe(""),
  );
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  await settle();
  return drawer();
}

/** El valor del par etiqueta-valor, leído por su etiqueta. */
function fieldValue(label: string): string {
  const term = within(drawer()).getByText(label);
  return term.parentElement?.querySelector("dd")?.textContent ?? "";
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  serve();
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
  /* El cajón ES el `Dialog`, así que bloquea el scroll del documento mientras
     está abierto. Si un test lo dejara puesto, el siguiente arrancaría con el
     fondo bloqueado y mediría otra cosa (deuda 101). Se limpia ANTES de
     comprobar para que un rojo no arrastre en cascada. */
  const leftover = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "";
  expect(leftover, "el cajón se fue sin soltar el bloqueo").toBe("");
});

describe("ProjectDetailDrawer — montaje", () => {
  it("cerrado no monta nada ni pide nada (smoke)", () => {
    render(<DrawerHarness />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("se abre con el nombre del proyecto como título y pide su detalle", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);

    const panel = await open(user);

    expect(panel).toHaveAccessibleName("Bufanda de invierno");
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      projectDetailEndpoint("bufanda"),
    );
  });

  it("anuncia la carga en su propia región viva mientras viaja la petición", async () => {
    const user = userEvent.setup();
    const release = serveLater();
    render(<DrawerHarness />);

    await user.click(trigger());
    // La región del cajón lleva su propio nombre: la de la lista se llama
    // distinto, y dos regiones homónimas vuelven ambiguo el selector (deuda 114).
    expect(
      screen.getByRole("status", { name: DETAIL_LOADING_REGION_LABEL }),
    ).toHaveTextContent(DETAIL_LOADING_MESSAGE);

    release();
    await settle();
  });
});

describe("ProjectDetailDrawer — tab General (RFC-03 §2)", () => {
  it("monta el carril de pestañas con la que ya tiene contenido", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);

    const list = screen.getByRole("tablist", { name: DETAIL_TABS_LABEL });
    expect(
      within(list).getByRole("tab", { name: DETAIL_TAB_LABELS.general }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("enseña tipo, estado, agujas, fechas y notas", async () => {
    const user = userEvent.setup();
    renderDrawer(project({ endDate: END_ISO }));
    await open(user);

    expect(fieldValue(GENERAL_FIELD_LABELS.type)).toBe(
      CRAFT_TYPE_LABELS.knitting,
    );
    expect(fieldValue(GENERAL_FIELD_LABELS.status)).toBe(
      PROJECT_STATUS_LABELS.in_progress,
    );
    expect(fieldValue(GENERAL_FIELD_LABELS.needles)).toBe("4 mm · 4,5 mm");
    expect(fieldValue(GENERAL_FIELD_LABELS.startDate)).toBe(START_TEXT);
    expect(fieldValue(GENERAL_FIELD_LABELS.endDate)).toBe(END_TEXT);
    expect(fieldValue(GENERAL_FIELD_LABELS.notes)).toBe("Punto elástico 2x2.");
  });

  /**
   * Los tres huecos que un proyecto recién creado tiene de verdad: `needles` es
   * `[]`, `endDate` es `null` y `notes` es la cadena vacía. No es un doble
   * inventado — son los defectos de la tabla.
   */
  it("un proyecto sin agujas, sin fin y sin notas dice qué falta, no un vacío", async () => {
    const user = userEvent.setup();
    renderDrawer(project({ needles: [], endDate: null, notes: "" }));
    await open(user);

    expect(fieldValue(GENERAL_FIELD_LABELS.needles)).toBe(NO_NEEDLES);
    expect(fieldValue(GENERAL_FIELD_LABELS.endDate)).toBe(NO_END_DATE);
    expect(fieldValue(GENERAL_FIELD_LABELS.notes)).toBe(NO_NOTES);
  });

  /** E3(d): lo que todavía no existe no se promete en pantalla. */
  it("no pinta ningún botón sin destino", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const panel = await open(user);

    const controls = within(panel)
      .getAllByRole("button")
      .map((button) => button.textContent);

    // El único botón del cajón es el de cerrar (la pestaña es `role="tab"`):
    // ni "Editar" (#22) ni "crear patrón" (#26-28), ni desactivados, ni
    // "próximamente". La lista se compara EXACTA para que caiga también el día
    // que alguien añada un control sin destino.
    expect(controls).toEqual([DIALOG_CLOSE_LABEL]);
    expect(
      within(panel).queryByRole("link"),
      "un enlace a una ruta que todavía no existe",
    ).toBeNull();
  });
});

describe("ProjectDetailDrawer — error", () => {
  it("un fallo de red se cuenta con su reintento, dentro del cajón", async () => {
    const user = userEvent.setup();
    renderDrawer(project(), { offline: true });
    await open(user);

    expect(
      within(drawer()).getByRole("heading", { name: DETAIL_ERROR_TITLE }),
    ).toBeInTheDocument();
    expect(within(drawer()).getByText(NETWORK_ERROR_MESSAGE)).toBeInTheDocument();
  });

  it("reintentar vuelve a pedir y pinta el detalle", async () => {
    const user = userEvent.setup();
    renderDrawer(project(), { offline: true });
    await open(user);

    serve();
    await user.click(within(drawer()).getByRole("button", { name: /intent/i }));
    await settle();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fieldValue(GENERAL_FIELD_LABELS.status)).toBe(
      PROJECT_STATUS_LABELS.in_progress,
    );
  });
});

describe("ProjectDetailDrawer — teclado y foco (RFC-03 §5)", () => {
  it("al abrir, el foco entra en el cajón y no se escapa tabulando", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const panel = await open(user);

    expect(panel).toHaveFocus();

    for (let step = 0; step < 5; step++) {
      await user.tab();
      expect(
        panel.contains(document.activeElement),
        `el foco se escapó del cajón en el paso ${step + 1}`,
      ).toBe(true);
    }
  });

  it("Escape cierra y devuelve el foco a quien lo abrió", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await open(user);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("el control de cierre también cierra", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const panel = await open(user);

    await user.click(
      within(panel).getByRole("button", { name: DIALOG_CLOSE_LABEL }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ProjectDetailDrawer — accesibilidad", () => {
  it("no tiene violaciones de axe con el detalle cargado", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<DrawerHarness />);
    await open(user);

    // `baseElement` y no `container`: el cajón vive en un portal al `body`.
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
