// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
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

  it("mounts ArchiveNav as a landmark with the 6 pages", () => {
    render(<ArchiveNav />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    expect(within(nav).getAllByRole("link")).toHaveLength(6);
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Stash" })).toBeInTheDocument();
  });

  it("mounts BottomNav as a landmark with 6 touch links", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: BOTTOM_NAV });
    expect(within(nav).getAllByRole("link")).toHaveLength(6);
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

describe("shell wiring (user + logout callback)", () => {
  it("shows the user name in the archive utils", () => {
    render(<ArchiveNav user={{ name: "Ada" }} />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("calls onLogout when 'Salir' is clicked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<ArchiveNav user={{ name: "Ada" }} onLogout={onLogout} />);
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

describe("motion degrades (no JS animation; CSS transitions only)", () => {
  it("declares token-based transitions the global reduced-motion media overrides", () => {
    render(<ArchiveNav />);
    const nav = screen.getByRole("navigation", { name: ARCHIVE_NAV });
    const folder = within(nav).getByRole("link", { name: "Dashboard" });
    expect(folder.className).toContain("transition-");
  });
});

describe("a11y (axe)", () => {
  it("has no violations in ArchiveNav", async () => {
    const { container } = render(<ArchiveNav user={{ name: "Ada" }} onLogout={vi.fn()} />);
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
