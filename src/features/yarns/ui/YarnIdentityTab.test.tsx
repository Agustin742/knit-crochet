// @vitest-environment happy-dom
import { createRef, type ComponentProps } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BrandTreeState } from "./brands-client";
import { emptyYarnFormValues, type YarnFormValues } from "./yarn-form";
import { YarnIdentityTab } from "./YarnIdentityTab";

const READY_CATALOG: BrandTreeState = {
  status: "ready",
  entries: [
    {
      brand: { id: "brand-a", userId: "user-a", name: "Manos del Uruguay" },
      types: [
        { id: "type-a", brandId: "brand-a", name: "Fingering" },
        { id: "type-b", brandId: "brand-a", name: "DK" },
      ],
    },
    {
      brand: { id: "brand-b", userId: "user-a", name: "Malabrigo" },
      types: [{ id: "type-c", brandId: "brand-b", name: "Worsted" }],
    },
  ],
};

const VALUES: YarnFormValues = {
  ...emptyYarnFormValues(),
  brandId: "brand-a",
  typeId: "type-b",
  colorName: "Azul noche",
  colorCode: "AZ-42",
  colorFamily: "blue",
  image: "https://cdn.test/yarn.jpg",
};

function renderTab(
  overrides: Partial<ComponentProps<typeof YarnIdentityTab>> = {},
) {
  const props: ComponentProps<typeof YarnIdentityTab> = {
    values: VALUES,
    errors: {},
    onChange: vi.fn(),
    disabled: false,
    catalog: READY_CATALOG,
    onRetryCatalog: vi.fn(),
    onCreateBrand: vi.fn(async () => ({ ok: true as const })),
    onCreateType: vi.fn(async () => ({ ok: true as const })),
    photo: {
      fileName: "lana.jpg",
      uploading: false,
      onFile: vi.fn(),
      onRemove: vi.fn(),
      error: undefined,
    },
    brandRef: createRef<HTMLSelectElement>(),
    typeRef: createRef<HTMLSelectElement>(),
    colorNameRef: createRef<HTMLInputElement>(),
    colorCodeRef: createRef<HTMLInputElement>(),
    colorFamilyRef: createRef<HTMLButtonElement>(),
    imageRef: createRef<HTMLInputElement>(),
    ...overrides,
  };

  return { ...render(<YarnIdentityTab {...props} />), props };
}

describe("YarnIdentityTab — identidad de la lana", () => {
  afterEach(cleanup);

  it("renderiza marca, tipo, color, código, familia de color y foto", () => {
    renderTab();

    expect(screen.getByRole("combobox", { name: "Marca" })).toHaveValue("brand-a");
    expect(screen.getByRole("combobox", { name: "Tipo" })).toHaveValue("type-b");
    expect(screen.getByLabelText("Color")).toHaveValue("Azul noche");
    expect(screen.getByLabelText("Código de color")).toHaveValue("AZ-42");
    expect(screen.getByRole("group", { name: /Familia de color/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Foto")).toBeInTheDocument();
  });

  it("desactiva el campo Tipo hasta que haya marca elegida", () => {
    renderTab({ values: { ...VALUES, brandId: "", typeId: "" } });

    expect(screen.getByRole("combobox", { name: "Tipo" })).toBeDisabled();
  });

  it("emite onChange para marca, tipo, color, código y familia", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderTab({ onChange, values: { ...VALUES, colorName: "", colorCode: "" } });

    await user.selectOptions(screen.getByRole("combobox", { name: "Marca" }), "brand-b");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tipo" }), "type-a");
    await user.type(screen.getByLabelText("Color"), "Rojo");
    await user.type(screen.getByLabelText("Código de color"), "R-1");
    await user.click(screen.getByRole("button", { name: "Rojo" }));

    expect(onChange).toHaveBeenCalledWith({ brandId: "brand-b", typeId: "" });
    expect(onChange).toHaveBeenCalledWith({ typeId: "type-a" });
    expect(onChange).toHaveBeenCalledWith({ colorName: "R" });
    expect(onChange).toHaveBeenCalledWith({ colorCode: "R" });
    expect(onChange).toHaveBeenCalledWith({ colorFamily: "red" });
  });

  it("muestra errores de cada campo de identidad", () => {
    renderTab({
      errors: {
        brandId: "Elegí una marca.",
        typeId: "Elegí un tipo.",
        colorName: "Ingresá el color.",
        colorCode: "Ingresá el código.",
        colorFamily: "Elegí una familia de color.",
        image: "No se pudo subir la foto.",
      },
    });

    for (const message of [
      "Elegí una marca.",
      "Elegí un tipo.",
      "Ingresá el color.",
      "Ingresá el código.",
      "Elegí una familia de color.",
      "No se pudo subir la foto.",
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
  });

  it("la foto muestra fileName/uploading y elegir un archivo llama onFile", async () => {
    const user = userEvent.setup();
    const onFile = vi.fn();
    const { rerender, props } = renderTab({
      photo: {
        fileName: "ovillo.png",
        uploading: true,
        onFile,
        onRemove: vi.fn(),
      },
    });

    expect(screen.getByText("ovillo.png")).toBeInTheDocument();
    expect(screen.getByText("Subiendo foto…")).toBeInTheDocument();
    expect(screen.getByLabelText("Foto")).toBeDisabled();

    rerender(
      <YarnIdentityTab
        {...props}
        photo={{ fileName: "ovillo.png", uploading: false, onFile, onRemove: vi.fn() }}
      />,
    );

    const file = new File(["image"], "nueva.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Foto"), file);

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("permite quitar la foto existente", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderTab({ photo: { fileName: "ovillo.png", uploading: false, onFile: vi.fn(), onRemove } });

    await user.click(screen.getByRole("button", { name: "Quitar foto" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("propaga refs a sus seis campos enfocables", () => {
    const brandRef = createRef<HTMLSelectElement>();
    const typeRef = createRef<HTMLSelectElement>();
    const colorNameRef = createRef<HTMLInputElement>();
    const colorCodeRef = createRef<HTMLInputElement>();
    const colorFamilyRef = createRef<HTMLButtonElement>();
    const imageRef = createRef<HTMLInputElement>();

    renderTab({
      brandRef,
      typeRef,
      colorNameRef,
      colorCodeRef,
      colorFamilyRef,
      imageRef,
    });

    expect(brandRef.current).toBe(screen.getByRole("combobox", { name: "Marca" }));
    expect(typeRef.current).toBe(screen.getByRole("combobox", { name: "Tipo" }));
    expect(colorNameRef.current).toBe(screen.getByLabelText("Color"));
    expect(colorCodeRef.current).toBe(screen.getByLabelText("Código de color"));
    expect(colorFamilyRef.current).toBe(screen.getByRole("button", { name: "Azul" }));
    expect(imageRef.current).toBe(screen.getByLabelText("Foto"));
  });

  it("render smoke", () => {
    const { container } = renderTab();
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
