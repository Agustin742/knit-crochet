// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/shared/config";
import { formatDuration } from "@/shared/lib/format";

import { ProjectCard } from "./ProjectCard";
import type { ProjectCardData } from "./types";

const BUFANDA: ProjectCardData = {
  id: "project-1",
  name: "Bufanda de invierno",
  image: "https://res.cloudinary.com/demo/image/upload/bufanda.jpg",
  progress: 42,
  time: SECONDS_PER_HOUR * 3 + SECONDS_PER_MINUTE * 20,
};

function cardWith(patch: Partial<ProjectCardData> = {}) {
  return <ProjectCard project={{ ...BUFANDA, ...patch }} />;
}

afterEach(cleanup);

describe("ProjectCard", () => {
  it("renders the four pieces of RFC-02 §2: photo, name, progress and time", () => {
    const { container } = render(cardWith());

    expect(
      screen.getByRole("heading", { name: BUFANDA.name }),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      BUFANDA.image,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(
      screen.getByText(formatDuration(BUFANDA.time), { exact: false }),
    ).toBeInTheDocument();
  });

  /**
   * `progress` llega ya en 0-100 entero desde el servicio (`progress.ts` hace el
   * `Math.round` y el clamp), que es exactamente la escala del primitivo: se le
   * pasa **directo**, sin convertir. Si alguien lo dividiera por 100 "para
   * normalizarlo", esto cae.
   */
  it("hands the 0-100 percentage straight to the bar", () => {
    render(cardWith({ progress: 42 }));

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "42",
    );
  });

  /** Con varias tarjetas, "Progreso" a secas no dice de qué proyecto habla. */
  it("names the bar after the project", () => {
    render(cardWith());

    expect(
      screen.getByRole("progressbar", { name: `Progreso de ${BUFANDA.name}` }),
    ).toBeInTheDocument();
  });

  /** El tiempo del dominio son SEGUNDOS: mostrarlos crudos diría "12000". */
  it("shows the cached time as a readable duration, not as raw seconds", () => {
    render(cardWith());

    expect(screen.getByText("3 h 20 min")).toBeInTheDocument();
    expect(screen.queryByText(String(BUFANDA.time))).toBeNull();
  });

  it("keeps the photo frame when there is no photo", () => {
    const { container } = render(cardWith({ image: null }));

    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.getByRole("heading", { name: BUFANDA.name }),
    ).toBeInTheDocument();
  });

  /**
   * La foto es decorativa (el nombre va justo debajo): con texto alternativo, un
   * lector de pantalla diría el nombre del proyecto dos veces seguidas. Con
   * `alt=""` la imagen sale del árbol accesible, así que el par se mide en los
   * dos sitios: el atributo está vacío Y no queda ningún rol de imagen que
   * anunciar.
   */
  it("leaves the photo out of the accessibility tree as decoration", () => {
    const { container } = render(cardWith());

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("defaults the name to a third-level heading and honours the level asked for", () => {
    const { unmount } = render(cardWith());
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    unmount();

    render(<ProjectCard project={BUFANDA} headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  /**
   * NO lleva quick-start de cronómetro (enmienda E2.1): es de #20 y es aditivo.
   * El gate va en las dos direcciones de verdad — no hay NINGÚN botón — para que
   * no se cuele "preparando" el hueco con un control muerto.
   */
  it("mounts no action control: the quick-start belongs to #20", () => {
    render(cardWith());

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("has no axe violations (with and without photo)", async () => {
    const withPhoto = render(cardWith());
    expect(await axe(withPhoto.container)).toHaveNoViolations();
    withPhoto.unmount();

    const without = render(cardWith({ image: null }));
    expect(await axe(without.container)).toHaveNoViolations();
  });
});
