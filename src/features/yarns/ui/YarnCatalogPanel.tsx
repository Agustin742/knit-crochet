"use client";

import { type FormEvent, useEffect, useState } from "react";

import { Button, Disclosure, Field, Input, Skeleton } from "@/shared/ui";

import {
  type BrandTreeEntry,
  type BrandTreeState,
  createBrand,
  createYarnType,
  getBrandTree,
} from "./brands-client";
import {
  CATALOG_BRAND_NAME_LABEL,
  CATALOG_CREATE_BRAND_LABEL,
  CATALOG_CREATE_TYPE_LABEL,
  CATALOG_EMPTY_MESSAGE,
  CATALOG_LOAD_ERROR,
  CATALOG_SECTION_LABEL,
  CATALOG_TYPES_EMPTY_MESSAGE,
  CATALOG_TYPE_NAME_LABEL,
  RETRY_LABEL,
} from "./yarn-copy";

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
 * E2(c), design D4): sólo lectura y creación en este slice — borrar y su
 * bloqueo 409 son la rebanada siguiente (S2b).
 *
 * **Pide su propio árbol**, independiente del de `YarnBrandTree` (SDD-01 §9):
 * por eso tiene sus cuatro estados propios (`loading`/`failed`/vacío/listo) en
 * vez de recibir los datos por props. Un alta exitosa se agrega EN MEMORIA a
 * la lista ya cargada — no dispara un refetch propio — porque ya tiene el
 * objeto que el servidor devolvió.
 */
export function YarnCatalogPanel({ onCatalogChange }: YarnCatalogPanelProps) {
  const [state, setState] = useState<BrandTreeState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);

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
        : { status: "ready", entries: [entry] },
    );
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
  }

  return (
    <Disclosure summary={CATALOG_SECTION_LABEL}>
      <div
        role="group"
        aria-label={CATALOG_SECTION_LABEL}
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
        ) : (
          <>
            {state.entries.length === 0 ? (
              <p className="font-body text-sm leading-base text-fg-muted">
                {CATALOG_EMPTY_MESSAGE}
              </p>
            ) : (
              state.entries.map((entry) => (
                <BrandPanel
                  key={entry.brand.id}
                  entry={entry}
                  onTypeCreated={(type) => {
                    appendType(entry.brand.id, type);
                    onCatalogChange?.();
                  }}
                />
              ))
            )}
            <BrandCreateForm
              onCreated={(brand) => {
                appendBrand({ brand, types: [] });
                onCatalogChange?.();
              }}
            />
          </>
        )}
      </div>
    </Disclosure>
  );
}

function BrandCreateForm({
  onCreated,
}: {
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
    setName("");
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

function BrandPanel({
  entry,
  onTypeCreated,
}: {
  entry: BrandTreeEntry;
  onTypeCreated: (type: BrandTreeEntry["types"][number]) => void;
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
        <TypeCreateForm brandId={entry.brand.id} onCreated={onTypeCreated} />
      </div>
    </Disclosure>
  );
}

function TypeCreateForm({
  brandId,
  onCreated,
}: {
  brandId: string;
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
    setName("");
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
