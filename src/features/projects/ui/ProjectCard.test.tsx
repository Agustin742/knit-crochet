// @vitest-environment happy-dom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@/shared/config";
import { formatClock, formatDuration } from "@/shared/lib/format";

import {
  ProjectCard,
  type ProjectCardTimer,
  ProjectPhoto,
  openDetailLabel,
  quickStartLabel,
  quickStopLabel,
  runningTimerLabel,
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

/**
 * El cronómetro de la tarjeta, parado y sin acciones que hagan nada. Es **un
 * solo objeto** porque el control es uno: no hay forma de pasar "está corriendo"
 * sin pasar también con qué pararlo.
 */
function timerProps(
  patch: Partial<ProjectCardTimer> = {},
): ProjectCardTimer {
  return { session: null, onStart: () => {}, onStop: () => {}, ...patch };
}

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
   * EL GATE ADITIVO DEL CRONÓMETRO (#20 E1(e)/E1(f), reescrito por **E7 (b1)**).
   *
   * Hasta #20 este test decía "no hay NINGÚN botón, nunca". #20 añadió el
   * quick-start y el gate se reescribió con la prop como las dos direcciones.
   * **E7 lo vuelve a reescribir por el mismo motivo**: el quick-start ya no es
   * "sólo arrancar" sino un control que **se transforma**, así que lo que decide
   * si hay control es una sola prop, `timer`, que trae el estado y **las dos**
   * acciones juntas.
   *
   * **Sin `timer` la tarjeta no monta ningún control**, que es la invariante que
   * su consumidor de #19 —el Dashboard, que no la pasa— conserva intacta; **con
   * la prop monta exactamente uno, corra o no corra el cronómetro**.
   *
   * Los enlaces siguen en cero en las dos direcciones, también ahora que el tap
   * al detalle existe (#21): la tarjeta **no** es un enlace ni envuelve a sus
   * controles en uno, porque un `button` dentro de un `a` sería marcado inválido
   * que el `axe` de más abajo marcaría (E1(f)).
   */
  it("mounts no control at all without the timer prop", () => {
    render(cardWith());

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("mounts exactly one control with the timer prop, and no link", () => {
    render(<ProjectCard project={BUFANDA} timer={timerProps()} />);

    expect(screen.queryAllByRole("button")).toHaveLength(1);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  /** Con N tarjetas iguales, "Empezar a tejer" a secas no dice de cuál habla. */
  it("names the quick-start after the project and calls back on click", async () => {
    const onStart = vi.fn();
    render(<ProjectCard project={BUFANDA} timer={timerProps({ onStart })} />);

    const button = screen.getByRole("button", {
      name: quickStartLabel(BUFANDA.name),
    });
    await userEvent.click(button);

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  /**
   * `loading` del primitivo `Button` ya traduce a `disabled` + `aria-busy`: el
   * anti-doble-click y el anuncio accesible no se reimplementan aquí.
   */
  it("disables and marks the quick-start as busy while the request is in flight", async () => {
    const onStart = vi.fn();
    render(
      <ProjectCard
        project={BUFANDA}
        timer={timerProps({ onStart, pending: true })}
      />,
    );

    const button = screen.getByRole("button", {
      name: quickStartLabel(BUFANDA.name),
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onStart).not.toHaveBeenCalled();
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
      <ProjectCard project={BUFANDA} timer={timerProps()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * EL BOTÓN QUE SE TRANSFORMA Y EL RELOJ DE LA TARJETA (RFC-03, enmienda **E7
 * (b1)** y **(b2)**), con el **reloj intervenido**: un test que espera segundos
 * de verdad es lento y, con la máquina cargada, miente.
 *
 * **Lo que este bloque SÍ mide:** que hay **un** control y que cambia de papel,
 * de nombre accesible y de acción con el estado; que el reloj arranca en el
 * segundo real que llega del servidor y avanza solo; que hay **un** intervalo y
 * sólo cuando corre; y que **nada de esto se anuncia segundo a segundo**.
 *
 * **Lo que NO puede medir, y no se simula:** que el botón ocupe *el mismo sitio
 * y la misma caja táctil* en los dos estados. `happy-dom` no maqueta ni mide
 * cajas. Lo más cerca que se puede llegar —y se llega— es que el **nodo del DOM
 * sea el mismo** al cambiar de estado, o sea que React lo reusa en su sitio en
 * vez de montar otro. El resto es verificación en navegador.
 */
describe("ProjectCard — el cronómetro se ve y se para desde la tarjeta (E7 b)", () => {
  const NOW = new Date("2026-08-26T12:00:00.000Z");
  const FAKED_TIMERS = ["Date", "setInterval", "clearInterval"] as const;

  /** Una sesión abierta que arrancó hace `seconds` segundos. */
  function running(seconds: number) {
    return { start: new Date(NOW.getTime() - seconds * 1000).toISOString() };
  }

  /** Avanza el reloj y deja que React pinte lo que ese avance provocó. */
  async function tick(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...FAKED_TIMERS] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parado ofrece empezar y no pinta ningún reloj", () => {
    render(<ProjectCard project={BUFANDA} timer={timerProps()} />);

    expect(
      screen.getByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    ).toBeInTheDocument();
    expect(screen.queryByText(formatClock(0))).toBeNull();
  });

  /**
   * **El defecto que E7 vino a arreglar**, medido: con una sesión abierta el
   * botón ofrecía «Empezar a tejer», o sea una acción que ya no corresponde.
   */
  it("corriendo ofrece parar, y ya no ofrece empezar", () => {
    render(
      <ProjectCard project={BUFANDA} timer={timerProps({ session: running(0) })} />,
    );

    expect(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: quickStartLabel(BUFANDA.name) }),
    ).toBeNull();
  });

  it("corriendo llama a parar, nunca a empezar", async () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(
      <ProjectCard
        project={BUFANDA}
        timer={timerProps({ session: running(30), onStart, onStop })}
      />,
    );

    /* `user-event` con el reloj intervenido: se le pasa el `advanceTimers` de
       vitest para que sus esperas internas no se queden colgadas. */
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(
      screen.getByRole("button", { name: quickStopLabel(BUFANDA.name) }),
    );

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  /**
   * **Se TRANSFORMA, no se añade otro** (E7 b1, y la deuda 142 de fondo). Dos
   * asertos, y cada uno dice una cosa distinta:
   *
   * 1. sigue habiendo **exactamente un** botón en los dos estados;
   * 2. es **el mismo nodo del DOM**: React lo reusa en su sitio en vez de
   *    desmontar uno y montar otro al lado.
   */
  it("es el MISMO botón el que cambia de papel, no un segundo botón", () => {
    const { rerender } = render(
      <ProjectCard project={BUFANDA} timer={timerProps()} />,
    );
    const parado = screen.getByRole("button");

    rerender(
      <ProjectCard
        project={BUFANDA}
        timer={timerProps({ session: running(10) })}
      />,
    );
    const corriendo = screen.getByRole("button");

    expect(screen.queryAllByRole("button")).toHaveLength(1);
    expect(corriendo).toBe(parado);
  });

  /**
   * **El reloj arranca en el segundo REAL** (E7 b2): el arranque lo pone el
   * servidor, así que una sesión que venía de antes no puede empezar a contar en
   * cero al pintar la lista. Es la mitad del pedido del usuario que la marca
   * efímera no podía cumplir.
   */
  it("cuenta desde el arranque que llegó del servidor, no desde cero", () => {
    render(
      <ProjectCard project={BUFANDA} timer={timerProps({ session: running(65) })} />,
    );

    expect(screen.getByText(formatClock(65))).toBeInTheDocument();
    expect(screen.queryByText(formatClock(0))).toBeNull();
  });

  it("avanza solo, sin volver a pedir nada", async () => {
    render(
      <ProjectCard project={BUFANDA} timer={timerProps({ session: running(65) })} />,
    );

    await tick(5_000);

    expect(screen.getByText(formatClock(70))).toBeInTheDocument();
  });

  /**
   * **UN intervalo, y sólo mientras corre.** Con los tres temporizadores
   * intervenidos, `vi.getTimerCount()` cuenta exclusivamente los del componente,
   * así que esto se puede afirmar de verdad y no por inspección del código.
   */
  it("no programa ningún intervalo con el cronómetro parado", () => {
    render(<ProjectCard project={BUFANDA} timer={timerProps()} />);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("programa exactamente un intervalo mientras corre y lo limpia al desmontar", () => {
    const { unmount } = render(
      <ProjectCard project={BUFANDA} timer={timerProps({ session: running(5) })} />,
    );

    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("deja de contar cuando la sesión se cierra", async () => {
    const { rerender } = render(
      <ProjectCard project={BUFANDA} timer={timerProps({ session: running(65) })} />,
    );

    rerender(<ProjectCard project={BUFANDA} timer={timerProps()} />);

    expect(screen.queryByText(formatClock(65))).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  /**
   * **EL `aria-live` NO VA EN EL RELOJ DE SEGUNDOS** (enmienda **E4 (a)**): un
   * aviso por segundo convierte un lector de pantalla en un metrónomo. Y acá pesa
   * el doble que en el cajón, porque en una rejilla puede haber **varios**
   * cronómetros corriendo a la vez: serían N metrónomos.
   *
   * Lo que se ancla es que la tarjeta **no monta ninguna región viva**. Los
   * cambios de estado los anuncia la única región de la página, que vive en la
   * vista (`ProjectsView`), no en cada tarjeta.
   */
  it("no monta ninguna región viva por tarjeta", () => {
    const { container } = render(
      <ProjectCard project={BUFANDA} timer={timerProps({ session: running(65) })} />,
    );

    expect(container.querySelector("[role=status]")).toBeNull();
    expect(container.querySelector("[role=alert]")).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  /**
   * Lo que **sí** oye quien no ve la pantalla: el estado y el tiempo en grano de
   * **minuto**, leídos a demanda. Los dígitos de segundos son decoración
   * (`aria-hidden`) porque su texto cambia sesenta veces más a menudo y no aporta
   * nada dicho en voz alta.
   */
  it("da el tiempo en minutos al lector de pantalla y esconde los segundos", () => {
    render(
      <ProjectCard project={BUFANDA} timer={timerProps({ session: running(65) })} />,
    );

    const digits = screen.getByText(formatClock(65));
    expect(digits).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(runningTimerLabel(65))).toBeInTheDocument();
    expect(runningTimerLabel(65)).toContain(formatDuration(65));
    expect(runningTimerLabel(65)).not.toContain(formatClock(65));
  });

  /**
   * El nombre accesible de la tarjeta es el del proyecto **y nada más**: el
   * Dashboard compara los nombres de sus encabezados de nivel 3 con una lista
   * exacta. Es la misma invariante que protegía la marca efímera que E7 (b4)
   * retira, aplicada a lo que ocupa ahora su sitio.
   */
  it("mantiene el reloj fuera del nombre accesible del encabezado", () => {
    render(
      <ProjectCard project={BUFANDA} timer={timerProps({ session: running(65) })} />,
    );

    const heading = screen.getByRole("heading", { name: BUFANDA.name });
    expect(heading.textContent).toBe(BUFANDA.name);
    expect(within(heading).queryByText(formatClock(65))).toBeNull();
  });

  it("parar con la petición en vuelo está desactivado y no vuelve a llamar", async () => {
    const onStop = vi.fn();
    render(
      <ProjectCard
        project={BUFANDA}
        timer={timerProps({ session: running(5), onStop, pending: true })}
      />,
    );

    const button = screen.getByRole("button", {
      name: quickStopLabel(BUFANDA.name),
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(button);

    expect(onStop).not.toHaveBeenCalled();
  });

  it("no tiene violaciones de axe con el cronómetro corriendo y el tap montado", async () => {
    const { container } = render(
      <ProjectCard
        project={BUFANDA}
        timer={timerProps({ session: running(65) })}
        onOpenDetail={() => {}}
      />,
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
    const onStart = vi.fn();
    render(
      <ProjectCard
        project={BUFANDA}
        onOpenDetail={onOpenDetail}
        timer={timerProps({ onStart })}
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
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("has no axe violations with both controls mounted", async () => {
    const { container } = render(
      <ProjectCard
        project={BUFANDA}
        onOpenDetail={() => {}}
        timer={timerProps()}
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
