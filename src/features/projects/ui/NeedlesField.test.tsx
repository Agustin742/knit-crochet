// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NEEDLE_SIZES } from "@/shared/config";

import { NeedlesField } from "./NeedlesField";
import {
  FORM_FIELD_LABELS,
  MAX_NEEDLES,
  NEEDLES_ADD_BUTTON_LABEL,
  NEEDLES_ADD_LABEL,
  NEEDLES_EMPTY,
  NEEDLES_FULL_HINT,
  NEEDLES_LIST_LABEL,
  removeNeedleLabel,
} from "./project-form";
import { needleOptionLabel } from "./ProjectsToolbar";

afterEach(cleanup);

function group(): HTMLElement {
  return screen.getByRole("group", { name: FORM_FIELD_LABELS.needles });
}

describe("NeedlesField (enmienda E6 e: el control de agujas vive en la FEATURE)", () => {
  it("es un grupo nombrado, no un campo suelto", () => {
    render(<NeedlesField needles={[]} onNeedlesChange={vi.fn()} />);

    expect(group()).toBeInTheDocument();
  });

  it("dice que no hay ninguna en vez de dejar un hueco", () => {
    render(<NeedlesField needles={[]} onNeedlesChange={vi.fn()} />);

    expect(screen.getByText(NEEDLES_EMPTY)).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: NEEDLES_LIST_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("lista las anotadas con su unidad", () => {
    render(<NeedlesField needles={[3.5, 4]} onNeedlesChange={vi.fn()} />);

    const items = within(
      screen.getByRole("list", { name: NEEDLES_LIST_LABEL }),
    ).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(needleOptionLabel(3.5));
    expect(items[1]).toHaveTextContent(needleOptionLabel(4));
  });

  it("añade la medida elegida y avisa al llamador", async () => {
    const user = userEvent.setup();
    const onNeedlesChange = vi.fn();
    render(<NeedlesField needles={[4]} onNeedlesChange={onNeedlesChange} />);

    await user.selectOptions(
      screen.getByLabelText(NEEDLES_ADD_LABEL),
      String(5),
    );
    await user.click(
      screen.getByRole("button", { name: NEEDLES_ADD_BUTTON_LABEL }),
    );

    expect(onNeedlesChange).toHaveBeenCalledWith([4, 5]);
  });

  /**
   * El desplegable **no ofrece lo ya anotado**: añadir algo que ya está no
   * cambiaría nada, o sea un control que parece roto (mismo criterio que
   * `linkableYarns` en el tab Lanas).
   */
  it("no ofrece las medidas ya anotadas", () => {
    render(<NeedlesField needles={[4]} onNeedlesChange={vi.fn()} />);

    const options = within(screen.getByLabelText(NEEDLES_ADD_LABEL))
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(options).not.toContain(needleOptionLabel(4));
    expect(options).toHaveLength(NEEDLE_SIZES.length - 1);
  });

  it("quita la medida que se le pide y deja el resto", async () => {
    const user = userEvent.setup();
    const onNeedlesChange = vi.fn();
    render(
      <NeedlesField needles={[3.5, 4]} onNeedlesChange={onNeedlesChange} />,
    );

    await user.click(screen.getByRole("button", { name: removeNeedleLabel(4) }));

    expect(onNeedlesChange).toHaveBeenCalledWith([3.5]);
  });

  /**
   * El nombre accesible del botón de quitar **nombra la medida**: en una fila de
   * N chips, "Quitar" a secas no dice cuál se quita (mismo tratamiento que
   * `unlinkYarnLabel`).
   */
  it("cada botón de quitar nombra su medida", () => {
    render(<NeedlesField needles={[3.5, 4]} onNeedlesChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: removeNeedleLabel(3.5) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: removeNeedleLabel(4) }),
    ).toBeInTheDocument();
  });

  /**
   * Sin nada que ofrecer, **el par de añadir desaparece y se dice por qué**.
   * Dejarlo puesto y desactivado sería un control que no explica su estado, y
   * dejarlo con el desplegable vacío sería un botón que no puede hacer nada.
   *
   * ⚠️ El caso que se alcanza es **"anotaste todas las medidas del catálogo"**
   * (diecisiete), **no** el tope del esquema (`MAX_NEEDLES`, veinte): sólo se
   * puede elegir del catálogo cerrado y sin repetir, así que **por la interfaz
   * el tope es inalcanzable**. Se comprueba que las dos cifras no coinciden para
   * que este test no se lea como una prueba del tope — que es justo lo que hacía
   * antes de corregirse, pasando por el camino equivocado.
   */
  it("sin medidas por ofrecer no deja añadir, y lo explica", () => {
    const lleno = [...NEEDLE_SIZES];
    expect(lleno.length).toBeLessThan(MAX_NEEDLES);

    render(<NeedlesField needles={lleno} onNeedlesChange={vi.fn()} />);

    expect(screen.getByText(NEEDLES_FULL_HINT)).toBeInTheDocument();
    expect(screen.queryByLabelText(NEEDLES_ADD_LABEL)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: NEEDLES_ADD_BUTTON_LABEL }),
    ).not.toBeInTheDocument();
  });

  /**
   * El tope **sí** se puede alcanzar con datos que no nacieron en esta pantalla:
   * `POST /api/projects` acepta veinte medidas cualesquiera, no sólo las del
   * catálogo. Ahí quedan medidas por ofrecer y aun así no se puede añadir, y el
   * control tiene que decirlo en vez de ofrecer un botón que `addNeedle`
   * rechazaría en silencio.
   */
  it("con veinte medidas de fuera del catálogo tampoco deja añadir", () => {
    const veinte = Array.from({ length: MAX_NEEDLES }, (_, index) => index + 1);
    render(<NeedlesField needles={veinte} onNeedlesChange={vi.fn()} />);

    expect(screen.getByText(NEEDLES_FULL_HINT)).toBeInTheDocument();
    expect(screen.queryByLabelText(NEEDLES_ADD_LABEL)).not.toBeInTheDocument();
  });

  it("desactivado no deja ni añadir ni quitar", () => {
    render(<NeedlesField needles={[4]} onNeedlesChange={vi.fn()} disabled />);

    expect(screen.getByLabelText(NEEDLES_ADD_LABEL)).toBeDisabled();
    expect(
      screen.getByRole("button", { name: NEEDLES_ADD_BUTTON_LABEL }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: removeNeedleLabel(4) })).toBeDisabled();
  });

  it("no tiene violaciones de axe", async () => {
    const { container } = render(
      <NeedlesField needles={[4, 5]} onNeedlesChange={vi.fn()} />,
    );

    await expect(axe(container)).resolves.toHaveNoViolations();
  });
});
