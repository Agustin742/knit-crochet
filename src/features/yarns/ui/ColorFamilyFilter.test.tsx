// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { COLOR_FAMILY_LABELS } from "@/shared/config";

import { ColorFamilyFilter } from "./ColorFamilyFilter";

afterEach(cleanup);

describe("ColorFamilyFilter — aria-pressed exclusivo, no un radio (design D5)", () => {
  it("marca aria-pressed en la familia activa y en ninguna otra", () => {
    render(<ColorFamilyFilter value="red" onValueChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.red }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.green }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("volver a tocar la familia activa la limpia", async () => {
    const onValueChange = vi.fn();
    render(<ColorFamilyFilter value="red" onValueChange={onValueChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.red }),
    );

    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it("tocar una familia distinta la fija, sin importar cuál estaba activa", async () => {
    const onValueChange = vi.fn();
    render(<ColorFamilyFilter value="red" onValueChange={onValueChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.green }),
    );

    expect(onValueChange).toHaveBeenCalledWith("green");
  });

  it("sin ninguna selección, tocar una familia la fija", async () => {
    const onValueChange = vi.fn();
    render(<ColorFamilyFilter onValueChange={onValueChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.blue }),
    );

    expect(onValueChange).toHaveBeenCalledWith("blue");
  });

  it("monta un control por cada familia de color, ni uno más ni uno menos", () => {
    render(<ColorFamilyFilter onValueChange={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(13);
  });
});

describe("ColorFamilyFilter — operable sólo con teclado", () => {
  it("se alcanza con Tab y se activa con Enter", async () => {
    const onValueChange = vi.fn();
    render(<ColorFamilyFilter onValueChange={onValueChange} />);

    await userEvent.tab();
    expect(
      screen.getByRole("button", { name: COLOR_FAMILY_LABELS.red }),
    ).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("red");
  });

  it("también se activa con Espacio", async () => {
    const onValueChange = vi.fn();
    render(<ColorFamilyFilter onValueChange={onValueChange} />);

    await userEvent.tab();
    await userEvent.keyboard(" ");

    expect(onValueChange).toHaveBeenCalledWith("red");
  });
});

describe("ColorFamilyFilter — accesibilidad", () => {
  it("no tiene violaciones de axe", async () => {
    const { container } = render(
      <ColorFamilyFilter value="red" onValueChange={vi.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
