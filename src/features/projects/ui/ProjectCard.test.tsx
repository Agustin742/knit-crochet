// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/shared/config";
import { formatDuration } from "@/shared/lib/format";

import { ProjectCard, quickStartLabel } from "./ProjectCard";
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
   * EL GATE ADITIVO DEL QUICK-START (#20, enmienda E1(e)/E1(f) del RFC-03).
   *
   * Hasta #20 este test decía "no hay NINGÚN botón, nunca". #20 añade el
   * quick-start y por eso el gate se **reescribe**, no se borra: sigue siendo de
   * dos direcciones, pero ahora las dos direcciones son la prop.
   *
   * **Sin `onQuickStart` la tarjeta no monta ningún control**, que es la
   * invariante que su consumidor de #19 —el Dashboard, que no pasa la acción—
   * conserva intacta; **con la prop monta exactamente uno**. Así el añadido no
   * puede colarse "de serie" en pantallas que no lo pidieron, y tampoco puede
   * quedarse en un slot muerto que ningún consumidor usa.
   *
   * Los enlaces siguen en cero en las dos direcciones: en #20 **la tarjeta no es
   * tocable** (E1(f)). El drawer es #21 y no existe, y un `button` dentro de un
   * `a` sería marcado inválido que el `axe` de más abajo marcaría.
   */
  it("mounts no control at all without the quick-start prop", () => {
    render(cardWith());

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("mounts exactly one control with the quick-start prop, and no link", () => {
    render(<ProjectCard project={BUFANDA} onQuickStart={() => {}} />);

    expect(screen.queryAllByRole("button")).toHaveLength(1);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  /** Con N tarjetas iguales, "Empezar a tejer" a secas no dice de cuál habla. */
  it("names the quick-start after the project and calls back on click", async () => {
    const onQuickStart = vi.fn();
    render(<ProjectCard project={BUFANDA} onQuickStart={onQuickStart} />);

    const button = screen.getByRole("button", {
      name: quickStartLabel(BUFANDA.name),
    });
    await userEvent.click(button);

    expect(onQuickStart).toHaveBeenCalledTimes(1);
  });

  /**
   * `loading` del primitivo `Button` ya traduce a `disabled` + `aria-busy`: el
   * anti-doble-click y el anuncio accesible no se reimplementan aquí.
   */
  it("disables and marks the quick-start as busy while the request is in flight", async () => {
    const onQuickStart = vi.fn();
    render(
      <ProjectCard
        project={BUFANDA}
        onQuickStart={onQuickStart}
        quickStartPending
      />,
    );

    const button = screen.getByRole("button", {
      name: quickStartLabel(BUFANDA.name),
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onQuickStart).not.toHaveBeenCalled();
  });

  it("has no axe violations (with and without photo)", async () => {
    const withPhoto = render(cardWith());
    expect(await axe(withPhoto.container)).toHaveNoViolations();
    withPhoto.unmount();

    const without = render(cardWith({ image: null }));
    expect(await axe(without.container)).toHaveNoViolations();
  });

  it("has no axe violations with the quick-start mounted", async () => {
    const { container } = render(
      <ProjectCard project={BUFANDA} onQuickStart={() => {}} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
