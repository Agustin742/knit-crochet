"use client";

import { type FormEvent, type RefObject, useEffect, useRef, useState } from "react";

import { Button, Dialog, Disclosure, Field, Input, Skeleton } from "@/shared/ui";

import {
  type BrandTreeEntry,
  type BrandTreeState,
  createBrand,
  createYarnType,
  getBrandTree,
} from "./brands-client";
import {
  CATALOG_ADD_TYPE_TRIGGER_LABEL,
  CATALOG_BRAND_NAME_LABEL,
  CATALOG_CREATE_BRAND_LABEL,
  CATALOG_CREATE_BRAND_TITLE,
  CATALOG_CREATE_TYPE_LABEL,
  CATALOG_EMPTY_MESSAGE,
  CATALOG_LIST_SUMMARY_LABEL,
  CATALOG_LOAD_ERROR,
  CATALOG_NEW_BRAND_TRIGGER_LABEL,
  CATALOG_SECTION_LABEL,
  CATALOG_TYPES_EMPTY_MESSAGE,
  CATALOG_TYPE_NAME_LABEL,
  RETRY_LABEL,
  catalogCreateTypeModalTitle,
} from "./yarn-copy";

const CATALOG_SECTION_TITLE_ID = "yarn-catalog-title";

export interface YarnCatalogPanelProps {
  /**
   * Se llama **una sola vez** después de un `201` de creación (design D5):
   * nunca tras un fallo, nunca tras un intento — es la señal que le dice al
   * árbol marca→tipo de `YarnFilterPanel` que vuelva a pedirse.
   */
  onCatalogChange?: () => void;
}

/**
 * Sección de catálogo dentro del `Card` de `YarnFilterPanel` (RFC-04 §7-ter
 * E2(d), design D4): sólo lectura y creación en este slice — borrar y su
 * bloqueo 409 son la rebanada siguiente (S2b).
 *
 * **Pide su propio árbol**, independiente del de `YarnBrandTree` (SDD-01 §9):
 * por eso tiene sus cuatro estados propios (`loading`/`failed`/vacío/listo) en
 * vez de recibir los datos por props. Con el árbol `ready`, un alta exitosa se
 * agrega EN MEMORIA a la lista ya cargada — no dispara un refetch propio —
 * porque ya tiene el objeto que el servidor devolvió. Si todavía NO está
 * `ready` (`loading` o `failed`, R3-001), agregar una sola entrada a mano
 * sería mentir: no hay lista real que completar, así que dispara un refetch
 * (`retryToken`) en su lugar — el POST ya se comprometió en el servidor, así
 * que el GET fresco ya trae la marca nueva.
 *
 * **El alta vive en modales, no dentro del `Disclosure` (enmienda E2(d)):** la
 * primera versión (S2a) colgaba los dos formularios de alta adentro del
 * acordeón «Catálogos», y crear una marca exigía desplegarlo para llegar al
 * campo — el usuario lo vio en pantalla y lo rechazó. Ahora «Catálogos»
 * encabeza su propia sección (`<h2>`), con el botón de alta de marca en la
 * misma fila, siempre visible — nunca colgado del `Disclosure`, ni antes ni
 * después de este cambio. Cada marca listada ofrece además su propio control
 * para abrir el modal de alta de TIPO de esa marca (un modal por marca, no un
 * formulario inline repetido). El `Disclosure`, con su propio resumen
 * («Marcas y tipos»), se queda sólo con listas — es lo único que tiene
 * sentido seguir plegando. Medido en navegador (2026-09-20, corrección de la
 * primera versión de esta nota, que afirmaba lo mismo sin haberlo mirado):
 * sacar los dos formularios a modales acorta la columna izquierda, pero sólo
 * en parte — con el acordeón desplegado, la columna TODAVÍA scrollea.
 */
export function YarnCatalogPanel({ onCatalogChange }: YarnCatalogPanelProps) {
  const [state, setState] = useState<BrandTreeState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [typeModalBrandId, setTypeModalBrandId] = useState<string | null>(null);
  const brandNameRef = useRef<HTMLInputElement>(null);
  const typeNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void getBrandTree().then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  function appendBrand(entry: BrandTreeEntry) {
    setState((current) =>
      current.status === "ready"
        ? { status: "ready", entries: [...current.entries, entry] }
        : current,
    );
    if (state.status !== "ready") {
      setRetryToken((token) => token + 1);
    }
  }

  function appendType(brandId: string, type: BrandTreeEntry["types"][number]) {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            entries: current.entries.map((entry) =>
              entry.brand.id === brandId
                ? { ...entry, types: [...entry.types, type] }
                : entry,
            ),
          }
        : current,
    );
    if (state.status !== "ready") {
      setRetryToken((token) => token + 1);
    }
  }

  /* Se guarda el ID de la marca y no la marca entera (mismo criterio que
     `ProjectFormDialog`, #21): así el modal siempre lee la versión más
     reciente de esa marca en `state` en vez de arrastrar un objeto viejo. */
  const typeModalEntry =
    state.status === "ready"
      ? (state.entries.find((entry) => entry.brand.id === typeModalBrandId) ?? null)
      : null;

  return (
    <section
      aria-labelledby={CATALOG_SECTION_TITLE_ID}
      className="flex flex-col gap-(--space-4)"
    >
      <div className="flex flex-col items-start gap-(--space-2)">
        <h2
          id={CATALOG_SECTION_TITLE_ID}
          className="font-body text-sm font-semibold text-fg"
        >
          {CATALOG_SECTION_LABEL}
        </h2>
        <Button variant="secondary" onClick={() => setBrandModalOpen(true)}>
          {CATALOG_NEW_BRAND_TRIGGER_LABEL}
        </Button>
      </div>

      <Disclosure summary={CATALOG_LIST_SUMMARY_LABEL}>
        <div
          role="group"
          aria-label={CATALOG_LIST_SUMMARY_LABEL}
          aria-busy={state.status === "loading"}
          className="flex flex-col gap-(--space-4) pl-(--space-4)"
        >
          {state.status === "loading" ? (
            <div className="flex flex-col gap-(--space-2)">
              <Skeleton className="w-full" />
              <Skeleton className="w-full" />
            </div>
          ) : state.status === "failed" ? (
            <div role="alert" className="flex flex-col gap-(--space-2)">
              <p className="font-body text-sm leading-base text-fg">
                {CATALOG_LOAD_ERROR}
              </p>
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => setRetryToken((token) => token + 1)}
              >
                {RETRY_LABEL}
              </Button>
            </div>
          ) : state.entries.length === 0 ? (
            <p className="font-body text-sm leading-base text-fg-muted">
              {CATALOG_EMPTY_MESSAGE}
            </p>
          ) : (
            state.entries.map((entry) => (
              <BrandPanel
                key={entry.brand.id}
                entry={entry}
                onAddType={() => setTypeModalBrandId(entry.brand.id)}
              />
            ))
          )}
        </div>
      </Disclosure>

      <Dialog
        open={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        title={CATALOG_CREATE_BRAND_TITLE}
        initialFocusRef={brandNameRef}
      >
        <BrandCreateForm
          nameRef={brandNameRef}
          onCreated={(brand) => {
            appendBrand({ brand, types: [] });
            setBrandModalOpen(false);
            onCatalogChange?.();
          }}
        />
      </Dialog>

      <Dialog
        open={typeModalEntry !== null}
        onClose={() => setTypeModalBrandId(null)}
        title={
          typeModalEntry === null ? "" : catalogCreateTypeModalTitle(typeModalEntry.brand.name)
        }
        initialFocusRef={typeNameRef}
      >
        {typeModalEntry === null ? null : (
          <TypeCreateForm
            brandId={typeModalEntry.brand.id}
            nameRef={typeNameRef}
            onCreated={(type) => {
              appendType(typeModalEntry.brand.id, type);
              setTypeModalBrandId(null);
              onCatalogChange?.();
            }}
          />
        )}
      </Dialog>
    </section>
  );
}

function BrandPanel({
  entry,
  onAddType,
}: {
  entry: BrandTreeEntry;
  onAddType: () => void;
}) {
  return (
    <Disclosure summary={entry.brand.name}>
      <div
        role="group"
        aria-label={entry.brand.name}
        className="flex flex-col gap-(--space-3) pl-(--space-4)"
      >
        {entry.types.length === 0 ? (
          <p className="font-body text-sm leading-base text-fg-muted">
            {CATALOG_TYPES_EMPTY_MESSAGE}
          </p>
        ) : (
          <ul className="flex flex-col gap-(--space-1)">
            {entry.types.map((type) => (
              <li key={type.id} className="font-body text-sm leading-base text-fg">
                {type.name}
              </li>
            ))}
          </ul>
        )}
        <Button variant="secondary" className="self-start" onClick={onAddType}>
          {CATALOG_ADD_TYPE_TRIGGER_LABEL}
        </Button>
      </div>
    </Disclosure>
  );
}

function BrandCreateForm({
  nameRef,
  onCreated,
}: {
  nameRef: RefObject<HTMLInputElement | null>;
  onCreated: (brand: BrandTreeEntry["brand"]) => void;
}) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }
    setPending(true);
    setError(null);
    const result = await createBrand(trimmed);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onCreated(result.data);
  }

  return (
    <form
      noValidate
      method="post"
      onSubmit={handleSubmit}
      className="flex flex-col gap-(--space-3)"
    >
      {error === null ? null : (
        <p role="alert" className="font-body text-sm leading-base text-danger">
          {error}
        </p>
      )}
      <Field label={CATALOG_BRAND_NAME_LABEL}>
        <Input
          ref={nameRef}
          autoComplete="off"
          value={name}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Button
        type="submit"
        variant="primary"
        loading={pending}
        className="self-start"
      >
        {CATALOG_CREATE_BRAND_LABEL}
      </Button>
    </form>
  );
}

function TypeCreateForm({
  brandId,
  nameRef,
  onCreated,
}: {
  brandId: string;
  nameRef: RefObject<HTMLInputElement | null>;
  onCreated: (type: BrandTreeEntry["types"][number]) => void;
}) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }
    setPending(true);
    setError(null);
    const result = await createYarnType(brandId, trimmed);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onCreated(result.data);
  }

  return (
    <form
      noValidate
      method="post"
      onSubmit={handleSubmit}
      className="flex flex-col gap-(--space-3)"
    >
      {error === null ? null : (
        <p role="alert" className="font-body text-sm leading-base text-danger">
          {error}
        </p>
      )}
      <Field label={CATALOG_TYPE_NAME_LABEL}>
        <Input
          ref={nameRef}
          autoComplete="off"
          value={name}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Button
        type="submit"
        variant="primary"
        loading={pending}
        className="self-start"
      >
        {CATALOG_CREATE_TYPE_LABEL}
      </Button>
    </form>
  );
}
