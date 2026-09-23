"use client";

import { type FormEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Dialog, Tabs, type TabItem } from "@/shared/ui";

import { getBrandTree, type BrandTreeState } from "./brands-client";
import { YarnIdentityTab } from "./YarnIdentityTab";
import { YarnTechnicalTab } from "./YarnTechnicalTab";
import {
  IDENTITY_TAB_LABEL,
  TECHNICAL_TAB_LABEL,
} from "./yarn-copy";
import {
  applyChange,
  emptyYarnFormValues,
  TAB_OF_FIELD,
  YARN_FORM_FIELDS,
  type YarnFormErrors,
  type YarnFormField,
  type YarnFormTab,
  type YarnFormValues,
  validateCreate,
} from "./yarn-form";
import { createYarn } from "./yarns-client";
import type { SerializedYarnRecord } from "./types";

export type YarnFormTarget = { mode: "create" };

export interface YarnFormDialogProps {
  target: YarnFormTarget | null;
  onClose: () => void;
  onSaved: (yarn: SerializedYarnRecord) => void;
  onCatalogChange: () => void;
}

export function YarnFormDialog(props: YarnFormDialogProps) {
  if (props.target === null) {
    return null;
  }

  return (
    <YarnForm
      key="create"
      target={props.target}
      onClose={props.onClose}
      onSaved={props.onSaved}
      onCatalogChange={props.onCatalogChange}
    />
  );
}

type FieldRefs = Record<YarnFormField, RefObject<HTMLElement | null>>;

function YarnForm({ onClose, onSaved }: YarnFormDialogProps & { target: YarnFormTarget }) {
  const brandRef = useRef<HTMLSelectElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const colorNameRef = useRef<HTMLInputElement>(null);
  const colorCodeRef = useRef<HTMLInputElement>(null);
  const colorFamilyRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const fiberRef = useRef<HTMLInputElement>(null);
  const needleMinRef = useRef<HTMLInputElement>(null);
  const needleMaxRef = useRef<HTMLInputElement>(null);
  const thicknessRef = useRef<HTMLInputElement>(null);
  const lotRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const refs = useMemo<FieldRefs>(() => ({
    brandId: brandRef,
    typeId: typeRef,
    colorName: colorNameRef,
    colorCode: colorCodeRef,
    colorFamily: colorFamilyRef,
    image: imageRef,
    length: lengthRef,
    fiber: fiberRef,
    needleMin: needleMinRef,
    needleMax: needleMaxRef,
    thickness: thicknessRef,
    lot: lotRef,
    quantity: quantityRef,
  }), [
    brandRef,
    typeRef,
    colorNameRef,
    colorCodeRef,
    colorFamilyRef,
    imageRef,
    lengthRef,
    fiberRef,
    needleMinRef,
    needleMaxRef,
    thicknessRef,
    lotRef,
    quantityRef,
  ]);

  const [values, setValues] = useState(emptyYarnFormValues);
  const [errors, setErrors] = useState<YarnFormErrors>({});
  const [tab, setTab] = useState<YarnFormTab>("identity");
  const [catalog, setCatalog] = useState<BrandTreeState>({ status: "loading" });
  const [uploading] = useState(false);
  const [fileName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [catalogPending] = useState(0);
  const pendingFocusRef = useRef<YarnFormField | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getBrandTree().then((result) => {
      if (!cancelled) setCatalog(result);
    });
    return () => { cancelled = true; };
  }, []);

  const focusField = useCallback((field: YarnFormField) => {
    refs[field].current?.focus();
  }, [refs]);

  useEffect(() => {
    const field = pendingFocusRef.current;
    if (field === null) return;
    pendingFocusRef.current = null;
    focusField(field);
  }, [focusTick, focusField]);

  function requestFocus(field: YarnFormField) {
    pendingFocusRef.current = field;
    setFocusTick((tick) => tick + 1);
  }

  function reportErrors(next: YarnFormErrors) {
    setErrors(next);
    const first = YARN_FORM_FIELDS.find((field) => next[field] !== undefined);
    if (first !== undefined) {
      setTab(TAB_OF_FIELD[first]);
      requestFocus(first);
    }
  }

  function updateValues(patch: Partial<YarnFormValues>) {
    setValues((current) => applyChange(current, patch));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const checked = validateCreate(values);
    if (!checked.ok) {
      reportErrors(checked.errors);
      return;
    }

    setErrors({});
    setPending(true);
    const result = await createYarn(checked.payload);
    setPending(false);
    if (!result.ok) {
      if (result.field === "colorCode") {
        reportErrors({ colorCode: result.message });
      } else {
        setFormError(result.message);
      }
      return;
    }
    onSaved(result.data);
    onClose();
  }

  const identity = (
    <YarnIdentityTab
      values={values}
      errors={errors}
      onChange={updateValues}
      disabled={pending}
      catalog={catalog}
      onRetryCatalog={() => {
        setCatalog({ status: "loading" });
        void getBrandTree().then(setCatalog);
      }}
      onCreateBrand={async () => ({ ok: false, message: "La creación inline estará disponible en el próximo paso." })}
      onCreateType={async () => ({ ok: false, message: "La creación inline estará disponible en el próximo paso." })}
      photo={{
        fileName,
        uploading,
        onFile: () => undefined,
        onRemove: () => undefined,
      }}
      brandRef={brandRef}
      typeRef={typeRef}
      colorNameRef={colorNameRef}
      colorCodeRef={colorCodeRef}
      colorFamilyRef={colorFamilyRef}
      imageRef={imageRef}
    />
  );
  const technical = (
    <YarnTechnicalTab
      values={values}
      errors={errors}
      onChange={updateValues}
      disabled={pending}
      lengthRef={lengthRef}
      fiberRef={fiberRef}
      needleMinRef={needleMinRef}
      needleMaxRef={needleMaxRef}
      thicknessRef={thicknessRef}
      lotRef={lotRef}
      quantityRef={quantityRef}
    />
  );
  const tabs: readonly TabItem<YarnFormTab>[] = [
    { value: "identity", label: IDENTITY_TAB_LABEL, content: identity },
    { value: "technical", label: TECHNICAL_TAB_LABEL, content: technical },
  ];

  return (
    <Dialog open onClose={onClose} title="Agregar lana" initialFocusRef={brandRef} size="lg">
      <form noValidate method="post" onSubmit={handleSubmit} className="flex flex-col gap-(--space-5)">
        {formError === null ? null : <p role="alert">{formError}</p>}
        <Tabs label="Secciones del formulario de lana" tabs={tabs} value={tab} onValueChange={setTab} />
        <div className="flex justify-end gap-(--space-3)">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={pending} disabled={pending || uploading || catalogPending > 0}>Guardar</Button>
        </div>
      </form>
    </Dialog>
  );
}
