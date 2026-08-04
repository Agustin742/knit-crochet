// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { AppShell } from "./app-shell";
import { ArchiveNav } from "./archive-nav";
import { BottomNav } from "./bottom-nav";

const pathnameMock = vi.fn<() => string>(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

afterEach(() => {
  cleanup();
  pathnameMock.mockReturnValue("/");
});

const ARCHIVE_NAV = "Navegación principal";
const BOTTOM_NAV = "Navegación principal (móvil)";

describe("layout shell (smoke)", () => {
  it("mounts AppShell with its content", () => {
    render(
      <AppShell>
        <p>Contenido</p>
      </AppShell>,
    );
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the injected background inside the 3D slot", () => {
    const { container } = render(
      <AppShell background={<span data-testid="bg-scene" />}>
        <p>Contenido</p>
      </AppShell>,
    );
    const slot = container.querySelector("[data-slot='bg-3d']");
    expect(slot).not.toBeNull();
    expect(slot?.querySelector("[data-testid='bg-scene']")).not.toBeNull();
  });

  it("mounts ArchiveNav as a landmark with the 6 pages", () => {
    render(<ArchiveNav />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    expect(within(nav).getAllByRole("link")).toHaveLength(6);
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Stash" })).toBeInTheDocument();
  });

  it("stacks one leaf per page, in the order of the list", () => {
    render(<ArchiveNav />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    const leaves = [...nav.querySelectorAll("[data-slot='leaf']")];
    expect(leaves).toHaveLength(6);
    // El orden del DOM es el orden de lectura y de tabulación, y NO cambia al
    // navegar: lo que se reordena en pantalla es el apilado (por orden de
    // flexión) y la profundidad (por token). El markup se queda quieto.
    const labels = leaves.map((leaf) =>
      leaf.querySelector("[data-slot='tab']")?.getAttribute("aria-label"),
    );
    expect(labels).toEqual([
      "Dashboard",
      "Proyectos",
      "Lanas",
      "Patrones",
      "Calculadoras",
      "Stash",
    ]);
  });

  it("hangs a tab from the edge of every leaf", () => {
    render(<ArchiveNav />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    const tabs = [...nav.querySelectorAll("[data-slot='tab']")];
    expect(tabs).toHaveLength(6);
    expect(tabs[4]?.textContent).toContain("Calculadoras");
  });

  it("mounts BottomNav as a landmark with 6 touch links", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: BOTTOM_NAV });
    expect(within(nav).getAllByRole("link")).toHaveLength(6);
  });
});

describe("el cajón tiene ranuras finitas (la rampa se deriva de los ítems)", () => {
  const page = (n: number) => ({ label: `Página ${n}`, href: `/p${n}` });

  it("con más ítems que ranuras no apila dos pestañas en la misma columna", () => {
    const items = Array.from({ length: 9 }, (_, index) => page(index + 1));
    render(<ArchiveNav items={items} />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    const columns = [...nav.querySelectorAll("[data-slot='leaf']")].map(
      (leaf) => leaf.getAttribute("data-column"),
    );
    expect(columns).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(new Set(columns).size).toBe(columns.length);
  });

  it("con menos ítems reparte el carril entre los que hay", () => {
    render(<ArchiveNav items={[page(1), page(2), page(3)]} />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    const columns = [...nav.querySelectorAll("[data-slot='track']")].map(
      (track) => track.getAttribute("data-columns"),
    );
    expect(columns).toEqual(["3", "3", "3"]);
  });
});

describe("active by route (usePathname, not scroll-spy)", () => {
  it("marks Dashboard active on '/'", () => {
    pathnameMock.mockReturnValue("/");
    render(<ArchiveNav />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Proyectos" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks Proyectos active on '/proyectos' (and only that one)", () => {
    pathnameMock.mockReturnValue("/proyectos");
    render(<ArchiveNav />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    expect(within(nav).getByRole("link", { name: "Proyectos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps a subroute active (e.g. /proyectos/42 → Proyectos)", () => {
    pathnameMock.mockReturnValue("/proyectos/42");
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: BOTTOM_NAV });
    expect(within(nav).getByRole("link", { name: "Proyectos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the active route on its tab (accent + page tone)", () => {
    const tabClassesOf = () => {
      const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
      return [...nav.querySelectorAll("[data-slot='tab']")].map(
        (node) => node.className,
      );
    };

    pathnameMock.mockReturnValue("/");
    const first = render(<ArchiveNav />);
    const onRoot = tabClassesOf();
    first.unmount();

    pathnameMock.mockReturnValue("/lanas");
    render(<ArchiveNav />);
    const onLanas = tabClassesOf();

    // Lanas es la tercera de la lista: al activarse, su pestaña cambia de piel
    // (tono de página + etiqueta en acento) y Dashboard deja de tenerla. Nadie
    // más se entera: la marca de activa vive en la pestaña, no en el cajón.
    expect(onLanas[2]).not.toBe(onRoot[2]);
    expect(onLanas[0]).not.toBe(onRoot[0]);
    expect(onLanas.filter((skin, index) => skin !== onRoot[index])).toHaveLength(
      2,
    );
  });

  it("does NOT mark Dashboard active on a non-root route (exact match for '/')", () => {
    pathnameMock.mockReturnValue("/lanas");
    render(<ArchiveNav />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: "Lanas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

/**
 * Este bloque decía "acepta user/onLogout pero NO los renderiza" y era verdad:
 * la enmienda E7 sacó los utils del nav porque se ofrecía "Salir" sin ninguna
 * sesión abierta, y las props se quedaron en la firma esperando a la pantalla de
 * auth. Se REESCRIBIÓ, no se borró, al cablear la sesión (deuda 29).
 *
 * El invariante original se conserva entero: **el archivero no aloja el control
 * de cuenta**. Lo que cambia es que ahora hay dónde alojarlo — la banda propia
 * del shell (E11 a) — y que el nav ya ni siquiera acepta esas props: tenerlas y
 * tirarlas era una promesa muerta en el contrato del design system.
 */
describe("el control de cuenta vive FUERA del nav (E7 + E11 a)", () => {
  it("lo monta el shell en su banda, y el cajón no se entera", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    const { container } = render(
      <AppShell user={{ name: "Ada" }} onLogout={onLogout}>
        <p>Contenido</p>
      </AppShell>,
    );

    const band = container.querySelector("[data-slot='account-band']");
    expect(band).not.toBeNull();
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    // Ni por el árbol del DOM ni por el marcado: el nav sigue siendo 6 hojas.
    expect(nav.contains(band)).toBe(false);
    expect(within(nav).queryByText("Ada")).toBeNull();
    expect(within(nav).queryByRole("button", { name: "Salir" })).toBeNull();

    const inBand = within(band as HTMLElement);
    expect(inBand.getByText("Ada")).toBeInTheDocument();
    await user.click(inBand.getByRole("button", { name: "Salir" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("la banda va POR ENCIMA del cajón, no superpuesta a él", () => {
    const { container } = render(
      <AppShell user={{ name: "Ada" }} onLogout={vi.fn()}>
        <p>Contenido</p>
      </AppShell>,
    );

    const band = container.querySelector("[data-slot='account-band']");
    const header = container.querySelector("header");
    // En el flujo y antes del archivero: lo empuja hacia abajo en vez de
    // taparlo. La cuenta de por qué eso es obligatorio (la pestaña de la
    // columna 6 deja 2 de techo con el puntero encima) está en
    // `account-band.tokens.test.ts`.
    expect(band).not.toBeNull();
    expect(header).not.toBeNull();
    const position = (band as Element).compareDocumentPosition(
      header as Node,
    );
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("el control de salir es un BOTÓN, no un enlace", () => {
    // Un enlace dentro del nav rompería el invariante 8-bis (E8); fuera del nav
    // seguiría siendo la semántica equivocada para una acción.
    const { container } = render(
      <AppShell user={{ name: "Ada" }} onLogout={vi.fn()}>
        <p>Contenido</p>
      </AppShell>,
    );

    const band = container.querySelector("[data-slot='account-band']");
    expect(within(band as HTMLElement).queryAllByRole("link")).toHaveLength(0);
  });

  it("sin sesión no hay banda: no se ofrece salir a un visitante (E7)", () => {
    const { container } = render(
      <AppShell>
        <p>Contenido</p>
      </AppShell>,
    );

    expect(container.querySelector("[data-slot='account-band']")).toBeNull();
    expect(screen.queryByRole("button", { name: "Salir" })).toBeNull();
  });

  it("con usuario pero sin cableado tampoco: media sesión no se ofrece", () => {
    // El escenario de la deuda 29: la cadena cortada dos capas más arriba dejaba
    // un botón que no hacía nada. Que no aparezca es visible; que aparezca muerto
    // no lo es.
    const { container } = render(
      <AppShell user={{ name: "Ada" }}>
        <p>Contenido</p>
      </AppShell>,
    );

    expect(container.querySelector("[data-slot='account-band']")).toBeNull();
  });
});

/*
 * Las clases se arman por concatenación en todo este bloque: Tailwind escanea
 * también los tests, y un nombre citado literalmente se convertiría en una
 * utilidad real del CSS de producción.
 */
const POINTER = ["pointer", "events"].join("-");
const BLOCKED = `${POINTER}-none`;
const SENSITIVE = `${POINTER}-auto`;
const HOVER = ["hover", ""].join(":");
const FOCUS = ["focus-visible", ""].join(":");
const GROUP_MARKER = ["gro", "up"].join("");
const ORDER_FIRST = ["order", "first"].join("-");
const height = (token: string) => `h-(${token})`;

const navOf = () => screen.getByRole("navigation", { name: ARCHIVE_NAV });
const slotsOf = (slot: string) => [
  ...navOf().querySelectorAll(`[data-slot='${slot}']`),
];

describe("el puntero lo captura la pestaña, y SÓLO la pestaña (E8)", () => {
  it("el canto a todo el ancho no es un enlace: lo es la pestaña", () => {
    render(<ArchiveNav />);
    const leaves = slotsOf("leaf");
    const tabs = slotsOf("tab");

    expect(leaves).toHaveLength(6);
    // Antes el enlace ERA la hoja entera, un canto a todo el ancho del shell:
    // la franja navegaba desde cualquier x, sin señal visual de ser clicable.
    for (const leaf of leaves) {
      expect(leaf.tagName).not.toBe("A");
      expect(leaf.querySelectorAll("a")).toHaveLength(1);
    }
    // Todos los enlaces del cajón son pestañas, y todas las pestañas lo son.
    const links = [...navOf().querySelectorAll("a")];
    expect(links).toHaveLength(tabs.length);
    expect(links.every((link, index) => link === tabs[index])).toBe(true);
    for (const tab of tabs) {
      expect(tab.getAttribute("href")).toBeTruthy();
    }
  });

  it("ni el canto ni el carril reciben el puntero; la pestaña sí", () => {
    render(<ArchiveNav />);
    const tracks = slotsOf("track");

    // El carril mide lo mismo que la pestaña de alto y todo el shell de ancho:
    // si capturara, sus 5 columnas VACÍAS activarían la hoja equivocada (la de
    // mayor profundidad se tragaba media navegación).
    for (const leaf of slotsOf("leaf")) {
      expect(leaf.className).toContain(BLOCKED);
    }
    expect(tracks).toHaveLength(6);
    for (const track of tracks) {
      expect(track.className).toContain(BLOCKED);
      expect(track.className).not.toContain(SENSITIVE);
    }
    for (const tab of slotsOf("tab")) {
      expect(tab.className).toContain(SENSITIVE);
    }
  });

  it("el hover y el foco cuelgan de la pestaña, no de un grupo en la hoja", () => {
    render(<ArchiveNav />);

    // El defecto medido: el marcador de grupo estaba en la hoja completa y el
    // lift de la pestaña colgaba de él, así que el puntero la levantaba desde
    // el otro extremo de la pantalla.
    for (const slot of ["leaf", "sheet", "track"]) {
      for (const node of slotsOf(slot)) {
        expect(node.className.split(" ")).not.toContain(GROUP_MARKER);
        expect(node.className).not.toContain(HOVER);
        expect(node.className).not.toContain(FOCUS);
      }
    }
    for (const tab of slotsOf("tab")) {
      expect(tab.className).toContain(HOVER);
      // El anillo de foco por teclado vive ahora en el propio enlace.
      expect(tab.className).toContain(`${FOCUS}outline`);
    }
  });
});

describe("la pestaña levantada sigue atada a su hoja (E9)", () => {
  it("no se desplaza: crece hacia arriba con la base anclada", () => {
    render(<ArchiveNav />);
    const [tab] = slotsOf("tab");

    // Desplazarla destapaba la franja de canto que cubría en reposo (y con ella
    // el filo claro de 1px, que aparecía cruzando justo por debajo). Creciendo,
    // lo que cubría en reposo sólo puede aumentar.
    expect(tab?.className).toContain(height("--nav-tab-height"));
    expect(tab?.className).toContain(`${HOVER}${height("--nav-tab-height-lifted")}`);
    expect(tab?.className).toContain(`${FOCUS}${height("--nav-tab-height-lifted")}`);
    expect(tab?.className).not.toContain(["trans", "late"].join(""));
  });
});

describe("la hoja activa es la hoja ABIERTA (E10)", () => {
  it("dibuja 5 cantos, no 6: la activa no dibuja el suyo", () => {
    pathnameMock.mockReturnValue("/lanas");
    render(<ArchiveNav />);

    // Con 6 cantos el cajón enseñaba 7 hojas para 6 páginas: el área de
    // contenido ya se lee como una hoja más.
    expect(slotsOf("sheet")).toHaveLength(5);
    const open = slotsOf("leaf")[2];
    expect(open?.getAttribute("data-open")).toBe("true");
    expect(open?.querySelector("[data-slot='sheet']")).toBeNull();
  });

  it("la abierta pierde la CARA, no la ranura: la escalera no arranca plana", () => {
    pathnameMock.mockReturnValue("/");
    render(<ArchiveNav />);

    // Sin ranura, la pestaña de la hoja abierta y la del canto más bajo caían
    // al mismo nivel (las dos a ras del contenido) y el escalonado arrancaba
    // plano. Conservándola, la abierta se queda donde está y suben los 5 cantos.
    for (const leaf of slotsOf("leaf")) {
      expect(leaf.className).toContain(height("--nav-leaf-height"));
      expect(leaf.className.split(" ")).not.toContain(["h", "0"].join("-"));
    }
  });

  it("la activa baja al fondo del cajón y las otras 5 se apilan en orden", () => {
    pathnameMock.mockReturnValue("/lanas");
    render(<ArchiveNav />);
    const leaves = slotsOf("leaf");

    // La ranura 1 es el fondo (la que pinta encima de todas); el cajón se apila
    // en columna invertida, así que el fondo es el primero del orden de flexión.
    expect(leaves[2]?.className).toContain(ORDER_FIRST);
    expect(leaves.map((leaf) => leaf.getAttribute("data-depth"))).toEqual([
      "2", // Dashboard
      "3", // Proyectos
      "1", // Lanas (activa, al fondo)
      "4", // Patrones
      "5", // Calculadoras
      "6", // Stash
    ]);
    for (const leaf of leaves) {
      if (leaf !== leaves[2]) {
        expect(leaf.className).not.toContain(ORDER_FIRST);
      }
    }
  });

  it("sin ninguna ruta de la lista activa conserva el orden y sus 6 cantos", () => {
    pathnameMock.mockReturnValue("/ruta-que-no-esta-en-el-nav");
    render(<ArchiveNav />);

    expect(slotsOf("sheet")).toHaveLength(6);
    expect(slotsOf("leaf").map((leaf) => leaf.getAttribute("data-depth"))).toEqual(
      ["1", "2", "3", "4", "5", "6"],
    );
  });

  it("la columna la fija el índice de lista, no la posición en el stack", () => {
    const columnsByLabel = () =>
      Object.fromEntries(
        slotsOf("leaf").map((leaf) => [
          leaf.querySelector("[data-slot='tab']")?.getAttribute("aria-label") ??
            "",
          leaf.getAttribute("data-column"),
        ]),
      );
    const depths = () =>
      slotsOf("leaf").map((leaf) => leaf.getAttribute("data-depth"));

    pathnameMock.mockReturnValue("/");
    const first = render(<ArchiveNav />);
    const onRootColumns = columnsByLabel();
    const onRootDepths = depths();
    first.unmount();

    pathnameMock.mockReturnValue("/stash");
    render(<ArchiveNav />);

    // Es el acotamiento del coste de derogar E1: al navegar, una misma página
    // cambia de ALTURA, nunca de columna. La memoria espacial vive en la x.
    expect(columnsByLabel()).toEqual(onRootColumns);
    expect(onRootColumns.Dashboard).toBe("1");
    expect(onRootColumns.Stash).toBe("6");
    // Y el test no es trivial: el stack SÍ se reordenó entre las dos rutas.
    expect(depths()).not.toEqual(onRootDepths);
  });
});

describe("motion degrades (no JS animation; CSS transitions only)", () => {
  it("declares token-based transitions the global reduced-motion media overrides", () => {
    render(<ArchiveNav />);
    // Lo único que se mueve al pasar el puntero es la pestaña: el canto de la
    // hoja ya no encoge (al ser opaco, encogerlo abría un hueco al fondo).
    const [tab] = slotsOf("tab");
    const [sheet] = slotsOf("sheet");
    expect(tab?.className).toContain("transition-");
    expect(sheet?.className).not.toContain("transition-");
  });
});

describe("a11y (axe)", () => {
  it("has no violations in ArchiveNav", async () => {
    const { container } = render(<ArchiveNav />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations in BottomNav", async () => {
    const { container } = render(<BottomNav />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations in AppShell", async () => {
    const { container } = render(
      <AppShell user={{ name: "Ada" }} onLogout={vi.fn()}>
        <h1>Panel</h1>
      </AppShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
