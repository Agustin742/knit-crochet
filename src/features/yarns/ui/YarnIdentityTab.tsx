"use client";

import type { RefObject } from "react";

import { Button, Field, FileInput, Input } from "@/shared/ui";

import type { BrandTreeState } from "./brands-client";
import { ChooseOrCreateField, type InlineCreateOutcome } from "./ChooseOrCreateField";
import { ColorFamilyPicker } from "./ColorFamilyPicker";
import type { YarnFormErrors, YarnFormValues } from "./yarn-form";

export interface YarnIdentityTabPhotoProps {
  fileName?: string | null;
  uploading: boolean;
  onFile: (file: File | null) => void;
  onRemove: () => void;
  error?: string;
}

export interface YarnIdentityTabProps {
  values: YarnFormValues;
  errors: YarnFormErrors;
  onChange: (patch: Partial<YarnFormValues>) => void;
  disabled: boolean;
  catalog: BrandTreeState;
  onRetryCatalog: () => void;
  onCreateBrand: (name: string) => Promise<InlineCreateOutcome>;
  onCreateType: (name: string) => Promise<InlineCreateOutcome>;
  photo: YarnIdentityTabPhotoProps;
  brandRef?: RefObject<HTMLSelectElement | null>;
  typeRef?: RefObject<HTMLSelectElement | null>;
  colorNameRef?: RefObject<HTMLInputElement | null>;
  colorCodeRef?: RefObject<HTMLInputElement | null>;
  colorFamilyRef?: RefObject<HTMLButtonElement | null>;
  imageRef?: RefObject<HTMLInputElement | null>;
}

const BRAND_LABEL = "Marca";
const BRAND_PLACEHOLDER = "Elegí una marca";
const BRAND_CREATE_TRIGGER = "Nueva marca";
const BRAND_CREATE_FIELD = "Nombre de la marca";
const TYPE_LABEL = "Tipo";
const TYPE_PLACEHOLDER = "Elegí un tipo";
const TYPE_CREATE_TRIGGER = "Nuevo tipo";
const TYPE_CREATE_FIELD = "Nombre del tipo";
const COLOR_NAME_LABEL = "Color";
const COLOR_CODE_LABEL = "Código de color";
const PHOTO_LABEL = "Foto";
const REMOVE_PHOTO_LABEL = "Quitar foto";
const UPLOADING_PHOTO_LABEL = "Subiendo foto…";

export function YarnIdentityTab({
  values,
  errors,
  onChange,
  disabled,
  catalog,
  onRetryCatalog,
  onCreateBrand,
  onCreateType,
  photo,
  brandRef,
  typeRef,
  colorNameRef,
  colorCodeRef,
  colorFamilyRef,
  imageRef,
}: YarnIdentityTabProps) {
  const brandOptions =
    catalog.status === "ready"
      ? catalog.entries.map((entry) => entry.brand)
      : [];
  const selectedBrand =
    catalog.status === "ready"
      ? catalog.entries.find((entry) => entry.brand.id === values.brandId)
      : undefined;
  const typeOptions = selectedBrand?.types ?? [];
  const catalogStatus = catalog.status;
  const typeDisabled = disabled || values.brandId === "";

  return (
    <div className="flex flex-col gap-(--space-4)">
      <ChooseOrCreateField
        label={BRAND_LABEL}
        placeholder={BRAND_PLACEHOLDER}
        options={brandOptions}
        value={values.brandId}
        onValueChange={(brandId) => {
          onChange({ brandId });
        }}
        status={catalogStatus}
        onRetry={onRetryCatalog}
        createTriggerLabel={BRAND_CREATE_TRIGGER}
        createFieldLabel={BRAND_CREATE_FIELD}
        onCreate={onCreateBrand}
        error={errors.brandId}
        disabled={disabled}
        selectRef={brandRef ?? { current: null }}
      />

      <ChooseOrCreateField
        label={TYPE_LABEL}
        placeholder={TYPE_PLACEHOLDER}
        options={typeOptions}
        value={values.typeId}
        onValueChange={(typeId) => {
          onChange({ typeId });
        }}
        status={catalogStatus}
        onRetry={onRetryCatalog}
        createTriggerLabel={TYPE_CREATE_TRIGGER}
        createFieldLabel={TYPE_CREATE_FIELD}
        onCreate={onCreateType}
        error={errors.typeId}
        disabled={typeDisabled}
        selectRef={typeRef ?? { current: null }}
      />

      <Field label={COLOR_NAME_LABEL} error={errors.colorName} className="min-w-0">
        <Input
          ref={colorNameRef}
          value={values.colorName}
          disabled={disabled}
          onChange={(event) => {
            onChange({ colorName: event.target.value });
          }}
        />
      </Field>

      <Field label={COLOR_CODE_LABEL} error={errors.colorCode} className="min-w-0">
        <Input
          ref={colorCodeRef}
          value={values.colorCode}
          disabled={disabled}
          onChange={(event) => {
            onChange({ colorCode: event.target.value });
          }}
        />
      </Field>

      <ColorFamilyPicker
        value={values.colorFamily}
        onValueChange={(colorFamily) => {
          onChange({ colorFamily });
        }}
        error={errors.colorFamily}
        disabled={disabled}
        focusRef={colorFamilyRef}
      />

      <Field label={PHOTO_LABEL} error={errors.image ?? photo.error} className="min-w-0">
        <FileInput
          ref={imageRef}
          accept="image/*"
          fileName={photo.fileName}
          disabled={disabled || photo.uploading}
          onFileChange={photo.onFile}
        />
      </Field>
      <div className="flex flex-col gap-(--space-2) sm:flex-row sm:items-center sm:justify-between">
        {photo.uploading ? (
          <p className="font-body text-sm leading-base text-fg-muted" role="status">
            {UPLOADING_PHOTO_LABEL}
          </p>
        ) : (
          <span className="sr-only">La foto no se está subiendo.</span>
        )}
        {photo.fileName ? (
          <Button variant="secondary" disabled={disabled || photo.uploading} onClick={photo.onRemove}>
            {REMOVE_PHOTO_LABEL}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
