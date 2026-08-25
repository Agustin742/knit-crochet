// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { LinkedYarn } from "@/features/projects/types";

import { MAX_YARN_RESULTS, YarnsTab } from "./YarnsTab";
import { toYarnChoices } from "./project-filters";
import {
  ALL_YARNS_LINKED,
  EMPTY_INVENTORY,
  INVENTORY_UNAVAILABLE,
  NO_LINKED_YARNS,
  NO_YARN_MATCHES,
  UNLINK_SHORT_LABEL,
  YARN_SEARCH_LABEL,
  linkYarnLabel,
  linkedYarnLabel,
  moreMatchesHint,
  unlinkYarnLabel,
} from "./project-detail";
import {
  NETWORK_ERROR_MESSAGE,
  projectYarnEndpoint,
  projectYarnsEndpoint,
} from "./projects-client";
import type { YarnOption } from "./types";

const PROJECT_ID = "bufanda";

const INVENTORY: YarnOption[] = [
  { id: "y-crudo", colorName: "Crudo", colorFamily: "neutral" },
  { id: "y-petroleo", colorName: "Petróleo", colorFamily: "blue" },
  { id: "y-bordo", colorName: "Bordó", colorFamily: "red" },
];

function linked(patch: Partial<LinkedYarn> = {}): LinkedYarn {
  return {
    id: "y-crudo",
    colorName: "Crudo",
    colorFamily: "neutral",
    brandName: "Manos",
    typeName: "Merino",
    ...patch,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fetchSpy = vi.fn();

/**
 * Doble del backend de enlaces **con sus reglas de verdad** (REGLA 7):
 *
 * - enlazar es **idempotente**: 201 si crea el enlace, 200 si ya existía, y
 *   devuelve **sólo ids** — sin marca ni tipo, que salen de un JOIN que sólo
 *   hace el detalle del proyecto;
 * - desenlazar responde **204 sin cuerpo**, tanto si había enlace como si no.
 *   Ese 204 es justo el caso que rompía el camino feliz del cliente, que llamaba
 *   a `json()` sobre una respuesta vacía.
 */
function serveBackend(state: { yarns: LinkedYarn[] }) {
  fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";

    if (url === projectYarnsEndpoint(PROJECT_ID) && method === "POST") {
      const { yarnId } = JSON.parse(String(init?.body)) as { yarnId: string };
      const option = INVENTORY.find((one) => one.id === yarnId);
      const already = state.yarns.some((one) => one.id === yarnId);
      if (!already && option !== undefined) {
        state.yarns = [
          ...state.yarns,
          linked({
            id: option.id,
            colorName: option.colorName,
            colorFamily: option.colorFamily,
          }),
        ];
      }
      return Promise.resolve(
        jsonResponse(already ? 200 : 201, {
          yarnIds: state.yarns.map((one) => one.id),
        }),
      );
    }

    if (method === "DELETE" && url.startsWith(projectYarnsEndpoint(PROJECT_ID))) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    return Promise.resolve(jsonResponse(404, { error: "ruta no servida" }));
  });
}

/**
 * Montado **como lo monta el cajón**: el cajón es el dueño de las lanas
 * enlazadas, refresca el detalle tras enlazar —porque el endpoint de enlace no
 * devuelve los nombres— y quita en local tras desenlazar. Un doble que dejara la
 * lista congelada mediría un componente que en producción no existe.
 */
function YarnsHarness({
  initial,
  inventory,
  inventoryUnavailable = false,
  refresh,
  remove,
}: {
  initial: LinkedYarn[];
  inventory: ReturnType<typeof toYarnChoices>;
  inventoryUnavailable?: boolean;
  refresh: () => LinkedYarn[];
  remove: (yarnId: string) => LinkedYarn[];
}) {
  const [yarns, setYarns] = useState(initial);

  return (
    <main>
      <YarnsTab
        projectId={PROJECT_ID}
        yarns={yarns}
        inventory={inventory}
        inventoryUnavailable={inventoryUnavailable}
        onRefreshDetail={() => {
          setYarns(refresh());
          return Promise.resolve();
        }}
        onUnlinked={(yarnId) => {
          setYarns(remove(yarnId));
        }}
      />
    </main>
  );
}

function renderYarns({
  initial = [],
  inventory = toYarnChoices(INVENTORY),
  inventoryUnavailable = false,
}: {
  initial?: LinkedYarn[];
  inventory?: ReturnType<typeof toYarnChoices>;
  inventoryUnavailable?: boolean;
} = {}) {
  /* El estado del servidor vive FUERA del componente: mutarlo desde dentro
     sería modificar una prop, que es lo que hace la aplicación de verdad — el
     cajón lee del servidor, no escribe en él. */
  const server = { yarns: [...initial] };
  serveBackend(server);

  return render(
    <YarnsHarness
      initial={server.yarns}
      inventory={inventory}
      inventoryUnavailable={inventoryUnavailable}
      refresh={() => [...server.yarns]}
      remove={(yarnId) => {
        server.yarns = server.yarns.filter((one) => one.id !== yarnId);
        return [...server.yarns];
      }}
    />,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
});

describe("YarnsTab — las lanas enlazadas (RFC-03 §2)", () => {
  it("etiqueta cada lana con marca, tipo y color", () => {
    renderYarns({ initial: [linked()] });

    expect(
      screen.getByText(linkedYarnLabel(linked())),
    ).toBeInTheDocument();
  });

  /**
   * La muestra de color es **decorativa**: el nombre del color va en el texto de
   * al lado, y un color no es algo que un lector de pantalla pueda transmitir.
   * Lo que se comprueba es que existe una y sólo una por lana, y que no aporta
   * texto.
   */
  it("pinta una muestra de color por lana, oculta al lector de pantalla", () => {
    const { container } = renderYarns({ initial: [linked()] });
    const row = screen.getByText(linkedYarnLabel(linked())).parentElement;
    const swatches = container.querySelectorAll('[aria-hidden="true"]');

    expect(row?.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(row?.firstElementChild).toHaveTextContent("");
    expect(swatches.length).toBeGreaterThan(0);
  });

  it("sin ninguna enlazada lo dice, en vez de dejar el hueco vacío", () => {
    renderYarns();

    expect(screen.getByText(NO_LINKED_YARNS)).toBeInTheDocument();
  });
});

describe("YarnsTab — enlazar y desenlazar", () => {
  it("enlazar una lana la mete en la lista con su marca y su tipo", async () => {
    const user = userEvent.setup();
    renderYarns();

    const choice = toYarnChoices(INVENTORY)[1];
    await user.click(
      screen.getByRole("button", {
        name: linkYarnLabel(choice?.label ?? ""),
      }),
    );

    const expected = linkedYarnLabel(
      linked({ id: "y-petroleo", colorName: "Petróleo", colorFamily: "blue" }),
    );
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  /**
   * Ya enlazada, deja de ofrecerse: enlazarla otra vez responde 200 sin cambiar
   * nada, o sea un botón cuyo efecto no se ve.
   */
  it("lo ya enlazado deja de ofrecerse en el buscador", async () => {
    const user = userEvent.setup();
    renderYarns();

    const choice = toYarnChoices(INVENTORY)[1];
    const label = linkYarnLabel(choice?.label ?? "");
    await user.click(screen.getByRole("button", { name: label }));

    expect(await screen.findByText(/Petróleo/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: label })).toBeNull();
  });

  it("desenlazar la quita de la lista", async () => {
    const user = userEvent.setup();
    renderYarns({ initial: [linked()] });

    const label = linkedYarnLabel(linked());
    await user.click(
      screen.getByRole("button", { name: unlinkYarnLabel(label) }),
    );

    expect(await screen.findByText(NO_LINKED_YARNS)).toBeInTheDocument();
    expect(screen.queryByText(label)).toBeNull();
  });

  /** El 204 sin cuerpo: si el cliente lo leyera como JSON, esto saldría en rojo. */
  it("el desenlace llega a la ruta de la lana y no se lee como un fallo", async () => {
    const user = userEvent.setup();
    renderYarns({ initial: [linked()] });

    await user.click(
      screen.getByRole("button", {
        name: unlinkYarnLabel(linkedYarnLabel(linked())),
      }),
    );

    await screen.findByText(NO_LINKED_YARNS);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      projectYarnEndpoint(PROJECT_ID, "y-crudo"),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("un fallo al desenlazar se cuenta y la lana se queda", async () => {
    const user = userEvent.setup();
    renderYarns({ initial: [linked()] });
    fetchSpy.mockRejectedValue(new Error("sin red"));

    const label = linkedYarnLabel(linked());
    await user.click(
      screen.getByRole("button", { name: unlinkYarnLabel(label) }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      NETWORK_ERROR_MESSAGE,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("YarnsTab — el buscador", () => {
  it("filtra el inventario sin tildes ni mayúsculas", async () => {
    const user = userEvent.setup();
    renderYarns();

    await user.type(screen.getByLabelText(YARN_SEARCH_LABEL), "BORDO");

    expect(
      screen.getByRole("button", { name: linkYarnLabel("Bordó") }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: linkYarnLabel("Crudo") })).toBeNull();
  });

  it("sin coincidencias lo dice", async () => {
    const user = userEvent.setup();
    renderYarns();

    await user.type(screen.getByLabelText(YARN_SEARCH_LABEL), "mostaza");

    expect(screen.getByText(NO_YARN_MATCHES)).toBeInTheDocument();
  });

  /**
   * Con TODO el inventario ya enlazado el mensaje es otro: no es que la búsqueda
   * no encuentre nada, es que no queda nada por enlazar. Mismo criterio que la
   * enmienda **E2(e)** aplicó a los vacíos de la lista.
   */
  it("con todo enlazado dice que no queda nada por enlazar", () => {
    renderYarns({
      initial: INVENTORY.map((one) =>
        linked({
          id: one.id,
          colorName: one.colorName,
          colorFamily: one.colorFamily,
        }),
      ),
    });

    expect(screen.getByText(ALL_YARNS_LINKED)).toBeInTheDocument();
  });

  /** Un muro de botones dentro de un cajón no es un selector: lo que sobra se cuenta. */
  it("acota los resultados y dice cuántos quedaron fuera", () => {
    const many = Array.from({ length: MAX_YARN_RESULTS + 3 }, (_, index) => ({
      id: `y-${String(index)}`,
      colorName: `Color ${String(index)}`,
      colorFamily: "neutral" as const,
    }));
    renderYarns({ inventory: toYarnChoices(many) });

    expect(screen.getAllByRole("button")).toHaveLength(MAX_YARN_RESULTS);
    expect(screen.getByText(moreMatchesHint(3))).toBeInTheDocument();
  });

  it("un inventario vacío no ofrece buscador", () => {
    renderYarns({ inventory: [] });

    expect(screen.getByText(EMPTY_INVENTORY)).toBeInTheDocument();
    expect(screen.queryByLabelText(YARN_SEARCH_LABEL)).toBeNull();
  });

  /**
   * **"No se pudo traer" no es "no tenés"**, y decirle lo segundo a quien tiene
   * cincuenta lanas es la misma mentira que E2(e) corrigió en la lista.
   */
  it("un inventario que no se pudo traer se distingue de uno vacío", () => {
    renderYarns({ inventory: [], inventoryUnavailable: true });

    expect(screen.getByText(INVENTORY_UNAVAILABLE)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_INVENTORY)).toBeNull();
  });
});

describe("YarnsTab — accesibilidad y alcance", () => {
  it("no tiene violaciones de axe con lanas enlazadas y buscador", async () => {
    const { container } = renderYarns({ initial: [linked()] });

    expect(await axe(container)).toHaveNoViolations();
  });

  /** E3(d): ningún control de este tab lleva a algo que todavía no existe. */
  it("sólo monta controles de enlazar y desenlazar", () => {
    const { container } = renderYarns({ initial: [linked()] });
    const names = within(container)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? "");

    expect(names[0]).toBe(unlinkYarnLabel(linkedYarnLabel(linked())));
    expect(names.slice(1).every((name) => name.startsWith("Enlazar"))).toBe(true);
    expect(within(container).queryByRole("link")).toBeNull();
    expect(
      within(container).getAllByRole("button")[0],
    ).toHaveTextContent(UNLINK_SHORT_LABEL);
  });
});
