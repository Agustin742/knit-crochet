// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/shared/config";
import { formatDuration } from "@/shared/lib/format";

import {
  ProjectCard,
  ProjectPhoto,
  openDetailLabel,
  quickStartLabel,
} from "./ProjectCard";
import { CRAFT_TYPE_LABELS } from "./project-filters";
import type { ProjectCardData } from "./types";

const BUFANDA: ProjectCardData = {
  id: "project-1",
  name: "Bufanda de invierno",
  image: "https://res.cloudinary.com/demo/image/upload/bufanda.jpg",
  progress: 42,
  time: SECONDS_PER_HOUR * 3 + SECONDS_PER_MINUTE * 20,
  type: "knitting",
};

/** Texto de prueba de la marca: la tarjeta no lo elige, se lo pasan. */
const RUNNING_NOTE = "Lo arrancaste recién";

/* Fragmentos de clase armados en runtime: Tailwind escanea también los tests y
   una clase citada como ejemplo se vuelve CSS de producción. */
const SHAPE = ["aspect", "video"].join("-");
const OBJECT_FIT = ["object", "cover"].join("-");
const MUTED_FOREGROUND = ["text", "fg", "muted"].join("-");

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
   * ENMIENDA E2(g): el hueco de la foto era **el bloque más grande de la
   * tarjeta** —el 61% de su altura, medido en navegador— y era un rectángulo
   * liso con una letra diminuta (deuda 140). Ahora se lee como algo puesto a
   * propósito.
   *
   * Lo que se ancla es **lo que la enmienda decidió**, no la maqueta: que se
   * nombra la clase de tejido, que la proporción **no** cambió, y que no se cae
   * en la trampa de contraste medida. Nada de esto lo puede ver `axe`
   * (`color-contrast` sale `incomplete`) ni `happy-dom` (no maqueta).
   */
  it("names the craft on the empty photo slot", () => {
    render(cardWith({ image: null }));

    expect(screen.getByText(CRAFT_TYPE_LABELS.knitting)).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("says nothing extra when there IS a photo", () => {
    render(cardWith());

    expect(screen.queryByText(CRAFT_TYPE_LABELS.knitting)).toBeNull();
  });

  /** Si la proporción cambiara, la rejilla quedaría dentada al mezclar tarjetas. */
  it("keeps the very same frame shape with and without a photo", () => {
    const withPhoto = render(cardWith());
    const photoClasses = withPhoto.container
      .querySelector("img")
      ?.className.split(/\s+/);
    withPhoto.unmount();

    const without = render(cardWith({ image: null }));
    const slot = [...without.container.querySelectorAll("div")].find((node) =>
      node.className.includes(SHAPE),
    );
    const slotClasses = slot?.className.split(/\s+/) ?? [];

    expect(photoClasses).toContain(SHAPE);
    expect(slotClasses).toContain(SHAPE);
    // Y **una sola** proporción: una segunda utilidad de proporción ganaría en
    // el CSS y dejaría la de arriba de adorno, con el test en verde.
    const shapePrefix = ["aspect", "-"].join("");
    expect(
      slotClasses.filter((className) => className.startsWith(shapePrefix)),
    ).toEqual([SHAPE]);
    // Todo el marco es compartido, no sólo la proporción: lo único que difiere
    // es el ajuste de la imagen y la maqueta interna del hueco.
    for (const className of photoClasses ?? []) {
      if (className !== OBJECT_FIT) {
        expect(slotClasses, className).toContain(className);
      }
    }
  });

  /**
   * LA TRAMPA DE CONTRASTE, MEDIDA: sobre la superficie hundida del marco, el
   * primer plano apagado da 4.09:1 — vale para texto grande y **no** para texto
   * chico. La clase de tejido es texto chico, así que ninguno de los dos textos
   * del hueco puede usarlo. La jerarquía se hace con familia y tamaño.
   */
  it("does not lean on the muted foreground inside the sunken slot", () => {
    const { container } = render(cardWith({ image: null }));
    const slot = [...container.querySelectorAll("div")].find((node) =>
      node.className.includes(SHAPE),
    );

    for (const span of slot?.querySelectorAll("span") ?? []) {
      expect(span.className.split(/\s+/), span.textContent ?? "").not.toContain(
        MUTED_FOREGROUND,
      );
    }
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
   * Los enlaces siguen en cero en las dos direcciones, también ahora que el tap
   * al detalle existe (#21): la tarjeta **no** es un enlace ni envuelve a sus
   * controles en uno, porque un `button` dentro de un `a` sería marcado inválido
   * que el `axe` de más abajo marcaría (E1(f)).
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

  /**
   * LA MARCA DE "ESTO ACABA DE PASAR" (enmienda E2(d)).
   *
   * Se prueba **contra la invariante de la deuda 132**, no aparte: la marca es
   * un añadido a la misma tarjeta que monta el Dashboard sin la acción, así que
   * lo que hay que demostrar es que **no monta ningún control** y que **no se
   * mete en el encabezado** — el Dashboard compara los nombres de sus
   * encabezados de nivel 3 con una lista exacta.
   */
  it("does not mark anything without the note", () => {
    render(cardWith());

    expect(screen.queryByText(RUNNING_NOTE)).toBeNull();
  });

  it("shows the note without mounting a single control", () => {
    render(<ProjectCard project={BUFANDA} quickStartNote={RUNNING_NOTE} />);

    expect(screen.getByText(RUNNING_NOTE)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("keeps the note out of the heading's accessible name", () => {
    render(<ProjectCard project={BUFANDA} quickStartNote={RUNNING_NOTE} />);

    const heading = screen.getByRole("heading", { name: BUFANDA.name });
    expect(heading.textContent).toBe(BUFANDA.name);
    expect(within(heading).queryByText(RUNNING_NOTE)).toBeNull();
  });

  it("has no axe violations with the note", async () => {
    const { container } = render(
      <ProjectCard
        project={BUFANDA}
        quickStartNote={RUNNING_NOTE}
        onQuickStart={() => {}}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
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

/**
 * EL TAP AL DETALLE (RFC-03 §2, la mitad que **E1(f)** dejó pendiente hasta que
 * existiera el cajón, y que llega con #21).
 *
 * Lo que hay que demostrar son **tres** cosas, y la tercera es la que hizo que
 * esto se aplazara: que el tap existe y llama, que es alcanzable por teclado, y
 * que **convive con el quick-start sin anidar un control dentro de otro** —lo
 * que sería marcado inválido y `axe` marcaría—.
 */
describe("ProjectCard — tap al detalle (E1(f), resuelto en #21)", () => {
  it("sin la acción no monta ningún control (la invariante del Dashboard sigue en pie)", () => {
    render(cardWith());

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("con la acción monta un control con el nombre del proyecto y llama al tocarlo", async () => {
    const onOpenDetail = vi.fn();
    render(<ProjectCard project={BUFANDA} onOpenDetail={onOpenDetail} />);

    const tap = screen.getByRole("button", {
      name: openDetailLabel(BUFANDA.name),
    });
    await userEvent.click(tap);

    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });

  it("se alcanza con el tabulador", async () => {
    const onOpenDetail = vi.fn();
    render(<ProjectCard project={BUFANDA} onOpenDetail={onOpenDetail} />);

    await userEvent.tab();
    expect(
      screen.getByRole("button", { name: openDetailLabel(BUFANDA.name) }),
    ).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
  });

  /**
   * **El motivo por el que este tap no llegó en #20.** Los dos controles son
   * HERMANOS: ninguno está dentro del otro, así que el marcado es válido y los
   * dos se pueden usar con el teclado.
   */
  it("convive con el quick-start sin que uno quede dentro del otro", async () => {
    const onOpenDetail = vi.fn();
    const onQuickStart = vi.fn();
    render(
      <ProjectCard
        project={BUFANDA}
        onOpenDetail={onOpenDetail}
        onQuickStart={onQuickStart}
      />,
    );

    const tap = screen.getByRole("button", {
      name: openDetailLabel(BUFANDA.name),
    });
    const quickStart = screen.getByRole("button", {
      name: quickStartLabel(BUFANDA.name),
    });

    expect(tap.contains(quickStart)).toBe(false);
    expect(quickStart.contains(tap)).toBe(false);
    expect(screen.queryAllByRole("link")).toHaveLength(0);

    // OJO CON LO QUE MIDE ESTE ASERTO (deuda blanca D9 del review de #21 T2).
    // Mide el CABLEADO: cada botón invoca a su propio manejador y no al del otro.
    // NO mide que las dos capas convivan geométricamente: happy-dom no hace
    // hit-testing ni layout, y `userEvent.click` despacha directamente sobre el
    // elemento, así que este aserto es estructuralmente incapaz de fallar por
    // solapamiento. Que el puntero llegue de verdad al quick-start y no a la capa
    // del tap está verificado A MANO en navegador por el leader —clic real sobre
    // el quick-start: el cajón NO se abre y la sesión SÍ arranca— en
    // progress/reports/verificacion_navegador_21_t2.md, sección "RESOLUCIÓN".
    // No cites este aserto como evidencia de esa convivencia.
    await userEvent.click(quickStart);
    expect(onQuickStart).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("has no axe violations with both controls mounted", async () => {
    const { container } = render(
      <ProjectCard
        project={BUFANDA}
        onOpenDetail={() => {}}
        onQuickStart={() => {}}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * El encuadre de la foto según dónde se monte (RFC-03, enmienda **E2(g)** leída
 * con su motivo, y el hallazgo 🟠 de la verificación en navegador de la tanda 1).
 */
describe("ProjectPhoto — el encuadre depende de dónde se monta", () => {
  function frameOf(size?: "card" | "detail"): string[] {
    const { container } = render(
      <ProjectPhoto name="Bufanda" image={null} type="knitting" size={size} />,
    );
    const frame = container.firstElementChild;
    return (frame?.className ?? "").split(" ").filter((one) => one !== "");
  }

  /**
   * **En la tarjeta la proporción NO cambia con foto y sin ella** (E2(g)), y ese
   * es el caso que la rejilla necesita: si el hueco vacío midiera distinto, una
   * fila con tarjetas mixtas quedaría dentada.
   */
  /**
   * La utilidad del encuadre **se deriva**, no se escribe: es la única que
   * cambia entre los dos sitios. Escribirla al literal en un test tiene además
   * un precio conocido en este repo —Tailwind escanea los `.test.ts` y una clase
   * citada de ejemplo se convierte en CSS de producción—, así que la regla es no
   * nombrar clases en un archivo que habla de clases.
   */
  function framingUtility(size: "card" | "detail"): string {
    const other = size === "card" ? "detail" : "card";
    const [utility] = frameOf(size).filter(
      (one) => !frameOf(other).includes(one),
    );
    expect(utility, "los dos sitios encuadran igual").toBeDefined();
    return utility ?? "";
  }

  it("con foto y sin ella, la tarjeta encuadra igual", () => {
    const { container } = render(
      <ProjectCard project={{ ...BUFANDA, image: "https://ejemplo/x.jpg" }} />,
    );
    const withPhoto = (container.querySelector("img")?.className ?? "").split(
      " ",
    );

    expect(withPhoto).toContain(framingUtility("card"));
    expect(withPhoto).not.toContain(framingUtility("detail"));
  });

  /**
   * **En el cajón sí cambia, y no contradice a E2(g).** El motivo que esa
   * enmienda da para congelar la proporción es *"para que la rejilla no quede
   * dentada"*: en el cajón hay una foto y no hay rejilla, así que la razón no
   * aplica — y sí aplica la contraria, medida en Chrome, de que el panorámico se
   * comía el 47 % del alto de la ventana.
   *
   * Se compara **la diferencia**, no una medida escrita a mano: lo que este test
   * defiende es que los dos sitios no se encuadran igual y que **sólo cambia el
   * encuadre**, no el marco.
   */
  it("el cajón encuadra distinto, y sólo cambia el encuadre", () => {
    const card = frameOf("card");
    const detail = frameOf("detail");

    const onlyInCard = card.filter((one) => !detail.includes(one));
    const onlyInDetail = detail.filter((one) => !card.includes(one));

    expect(onlyInCard).toHaveLength(1);
    expect(onlyInDetail).toHaveLength(1);
    // Borde, radio, superficie y recorte son los mismos en los dos sitios.
    expect(card.filter((one) => !onlyInCard.includes(one)).length).toBeGreaterThan(
      3,
    );
  });

  /** Sin decir dónde, se comporta como en la tarjeta: es el sitio de siempre. */
  it("por defecto encuadra como la tarjeta", () => {
    expect(frameOf()).toEqual(frameOf("card"));
  });
});
