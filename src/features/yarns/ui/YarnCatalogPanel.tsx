"use client";

import { type FormEvent, type RefObject, useEffect, useRef, useState } from "react";

import {
  Button,
  ConfirmDialog,
  Dialog,
  Disclosure,
  Field,
  Input,
  Skeleton,
} from "@/shared/ui";

import {
  type BrandTreeEntry,
  type BrandTreeState,
  createBrand,
  createYarnType,
  deleteBrand,
  deleteYarnType,
  getBrandTree,
} from "./brands-client";
import {
  CATALOG_ADD_TYPE_TRIGGER_LABEL,
  CATALOG_BLOCKED_BRAND_TITLE,
  CATALOG_BLOCKED_TYPE_TITLE,
  CATALOG_BRAND_NAME_LABEL,
  CATALOG_CREATE_BRAND_LABEL,
  CATALOG_CREATE_BRAND_TITLE,
  CATALOG_CREATE_TYPE_LABEL,
  CATALOG_EMPTY_MESSAGE,
  CATALOG_LIST_SUMMARY_LABEL,
  CATALOG_LOAD_ERROR,
  CATALOG_NEW_BRAND_TRIGGER_LABEL,
  CATALOG_NOTICE_DISMISS_LABEL,
  CATALOG_SECTION_LABEL,
  CATALOG_TYPES_EMPTY_MESSAGE,
  CATALOG_TYPE_NAME_LABEL,
  RETRY_LABEL,
  brandBlockedBody,
  catalogCreateTypeModalTitle,
  catalogDeleteConfirmTitle,
  catalogDeleteLabel,
  typeBlockedBody,
} from "./yarn-copy";

const CATALOG_SECTION_TITLE_ID = "yarn-catalog-title";

export interface YarnCatalogPanelProps {
  /**
   * Se llama **una sola vez** después de un `201`/`204` de alta o borrado
   * (design D5): nunca tras un fallo, nunca tras un intento — es la señal
   * que le dice al árbol marca→tipo de `YarnFilterPanel` que vuelva a
   * pedirse. Un borrado avisa además QUÉ se borró (`removed`), porque
   * `YarnsView` lo necesita para soltar un filtro que apuntaba a ese id
   * (design D5, `handleCatalogChange`); un alta nunca manda `removed`.
   */
  onCatalogChange?: (removed?: { brandId?: string; typeId?: string }) => void;
}

/** Lo que espera confirmación de `ConfirmDialog` antes de pedir el borrado. */
type DeleteTarget =
  | { kind: "brand"; brand: BrandTreeEntry["brand"] }
  | { kind: "type"; brandId: string; type: BrandTreeEntry["types"][number] };

/** El aviso de una sola acción tras un `409` (design D4): construido sobre
 *  `Dialog` directo, nunca `ConfirmDialog` — no hay nada que confirmar. */
type CatalogNotice =
  | { target: "brand"; types: number; yarns: number }
  | { target: "type"; yarns: number };

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

  /* Borrar (design D4, backlog 24 S2b). `confirmTarget` es lo que
     `ConfirmDialog` pregunta ANTES del pedido; `notice` es el aviso de una
     sola acción que reemplaza esa confirmación tras un 409 — nunca los dos
     a la vez, así que un solo `Dialog` de cada tipo alcanza. */
  const [confirmTarget, setConfirmTarget] = useState<DeleteTarget | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<CatalogNotice | null>(null);
  /* Guarda contra una respuesta que llega DESPUÉS de que el objetivo cambió
     (cancelar o abrir otra confirmación): se compara contra el valor vivo,
     nunca contra uno capturado en un cierre viejo. Sólo protege lo que toca
     el diálogo que el usuario tiene delante (`confirmTarget`, `deletePending`,
     `deleteError`, `notice`) — un `204` tardío igual borra la fila y avisa,
     porque el servidor ya lo hizo y la UI no puede desmentirlo (ver
     `handleConfirmDelete` abajo). El mismo patrón guarda los modales de alta
     de tipo (`typeModalRequestTokenRef`) y de marca
     (`brandModalRequestTokenRef`). */
  const deleteRequestTokenRef = useRef(0);
  /* Mismo patrón que `deleteRequestTokenRef`, aplicado al modal de alta de
     tipo: se bumpea al abrir o cerrar, así que una respuesta tardía sólo
     cierra el modal si todavía apunta a la marca para la que se pidió. El
     tipo creado y el aviso a `onCatalogChange` pasan siempre — el servidor
     ya lo comprometió — sólo el cierre del modal queda condicionado. */
  const typeModalRequestTokenRef = useRef(0);
  /* Mismo patrón, aplicado al modal de alta de marca: si el usuario lo
     descartó y lo reabrió mientras la petición seguía en vuelo, la respuesta
     tardía no debe cerrar el modal nuevo ni llevarse lo que ya tipeó. */
  const brandModalRequestTokenRef = useRef(0);

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

  function removeBrand(brandId: string) {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            entries: current.entries.filter((entry) => entry.brand.id !== brandId),
          }
        : current,
    );
    if (state.status !== "ready") {
      setRetryToken((token) => token + 1);
    }
  }

  function removeType(brandId: string, typeId: string) {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            entries: current.entries.map((entry) =>
              entry.brand.id === brandId
                ? { ...entry, types: entry.types.filter((type) => type.id !== typeId) }
                : entry,
            ),
          }
        : current,
    );
    if (state.status !== "ready") {
      setRetryToken((token) => token + 1);
    }
  }

  function openBrandDeleteConfirm(brand: BrandTreeEntry["brand"]) {
    deleteRequestTokenRef.current += 1;
    setDeletePending(false);
    setDeleteError(null);
    setConfirmTarget({ kind: "brand", brand });
  }

  function openTypeDeleteConfirm(
    brandId: string,
    type: BrandTreeEntry["types"][number],
  ) {
    deleteRequestTokenRef.current += 1;
    setDeletePending(false);
    setDeleteError(null);
    setConfirmTarget({ kind: "type", brandId, type });
  }

  function cancelDelete() {
    deleteRequestTokenRef.current += 1;
    setConfirmTarget(null);
    setDeletePending(false);
    setDeleteError(null);
  }

  /**
   * Confirmado, pide el borrado de verdad. El `token` capturado ANTES del
   * `await` es la guarda (ver el comentario de `deleteRequestTokenRef`
   * arriba): si `confirmTarget` cambió mientras la petición seguía en
   * vuelo —se canceló, o se abrió otra confirmación—, la respuesta que
   * llega tarde ya no tiene diálogo al que aplicarse.
   *
   * Eso SÓLO vale para lo que toca el diálogo. Un `204` tardío significa que
   * el servidor ya borró el registro, con o sin diálogo mirándolo: por eso
   * `removeBrand`/`removeType` y el aviso a `onCatalogChange` corren SIEMPRE
   * que `result.ok`, sin condicionarlos al token — mentirle a la lista sería
   * peor que un diálogo que ya no está. Un `blocked` (409) o un `error`
   * tardío, en cambio, no cambian nada: ni la lista tiene qué actualizar ni
   * hay diálogo al que avisarle, así que esas dos ramas quedan enteras
   * detrás de la guarda del token.
   */
  async function handleConfirmDelete() {
    if (confirmTarget === null) {
      return;
    }
    const target = confirmTarget;
    const token = deleteRequestTokenRef.current;
    setDeletePending(true);
    setDeleteError(null);

    /* Dos ramas enteras, no una sola con un ternario por llamada: los dos
       resultados discriminados (`DeleteBrandResult`/`DeleteTypeResult`) NO
       comparten forma en el caso `blocked` (dos contadores vs. uno solo), así
       que unificar la rama le mentiría al tipo — `result.types` dejaría de
       existir en la mitad de los casos. */
    if (target.kind === "brand") {
      const result = await deleteBrand(target.brand.id);

      if (result.ok) {
        removeBrand(target.brand.id);
        onCatalogChange?.({ brandId: target.brand.id });
      }

      if (deleteRequestTokenRef.current !== token) {
        return;
      }
      setDeletePending(false);

      if (result.ok) {
        setConfirmTarget(null);
        return;
      }
      if (result.kind === "blocked") {
        setConfirmTarget(null);
        setNotice({ target: "brand", types: result.types, yarns: result.yarns });
        return;
      }
      setDeleteError(result.message);
      return;
    }

    const result = await deleteYarnType(target.brandId, target.type.id);

    if (result.ok) {
      removeType(target.brandId, target.type.id);
      onCatalogChange?.({ typeId: target.type.id });
    }

    if (deleteRequestTokenRef.current !== token) {
      return;
    }
    setDeletePending(false);

    if (result.ok) {
      setConfirmTarget(null);
      return;
    }
    if (result.kind === "blocked") {
      setConfirmTarget(null);
      setNotice({ target: "type", yarns: result.yarns });
      return;
    }
    setDeleteError(result.message);
  }

  /* Mismo criterio que `openBrandDeleteConfirm`/`cancelDelete`: bumpear el
     token en cada apertura y cierre invalida cualquier respuesta de alta de
     tipo que siga en vuelo para un objetivo que ya no es el vigente. */
  function openTypeModal(brandId: string) {
    typeModalRequestTokenRef.current += 1;
    setTypeModalBrandId(brandId);
  }

  function closeTypeModal() {
    typeModalRequestTokenRef.current += 1;
    setTypeModalBrandId(null);
  }

  function openBrandModal() {
    brandModalRequestTokenRef.current += 1;
    setBrandModalOpen(true);
  }

  function closeBrandModal() {
    brandModalRequestTokenRef.current += 1;
    setBrandModalOpen(false);
  }

  /* Se guarda el ID de la marca y no la marca entera (mismo criterio que
     `ProjectFormDialog`, #21): así el modal siempre lee la versión más
     reciente de esa marca en `state` en vez de arrastrar un objeto viejo. */
  const typeModalEntry =
    state.status === "ready"
      ? (state.entries.find((entry) => entry.brand.id === typeModalBrandId) ?? null)
      : null;
  /* Capturado en ESTE render, junto con `typeModalEntry`: mientras el modal
     siga abierto para la misma marca no cambia (sólo lo bumpean
     `openTypeModal`/`closeTypeModal`), así que sirve para comparar contra el
     valor vivo del ref cuando la respuesta de alta llegue. */
  const typeModalToken = typeModalRequestTokenRef.current;
  const brandModalToken = brandModalRequestTokenRef.current;

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
        <Button variant="secondary" onClick={openBrandModal}>
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
                onAddType={() => openTypeModal(entry.brand.id)}
                onDeleteBrand={() => openBrandDeleteConfirm(entry.brand)}
                onDeleteType={(type) => openTypeDeleteConfirm(entry.brand.id, type)}
              />
            ))
          )}
        </div>
      </Disclosure>

      <Dialog
        open={brandModalOpen}
        onClose={closeBrandModal}
        title={CATALOG_CREATE_BRAND_TITLE}
        initialFocusRef={brandNameRef}
      >
        <BrandCreateForm
          nameRef={brandNameRef}
          onCreated={(brand) => {
            /* Igual que el alta de tipo: la marca ya existe en el servidor,
               así que se agrega y se avisa siempre; sólo el cierre queda
               condicionado a que el modal siga siendo el mismo. */
            appendBrand({ brand, types: [] });
            onCatalogChange?.();
            if (brandModalRequestTokenRef.current === brandModalToken) {
              closeBrandModal();
            }
          }}
        />
      </Dialog>

      <Dialog
        open={typeModalEntry !== null}
        onClose={closeTypeModal}
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
              /* El tipo ya existe en el servidor: se agrega y se avisa
                 siempre. Cerrar el modal es lo único condicionado — si el
                 usuario lo descartó y abrió el de otra marca mientras esta
                 petición seguía en vuelo, cerrar ahora se llevaría por
                 delante el modal de esa otra marca (DEBT4). */
              appendType(typeModalEntry.brand.id, type);
              onCatalogChange?.();
              if (typeModalRequestTokenRef.current === typeModalToken) {
                closeTypeModal();
              }
            }}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={
          confirmTarget === null
            ? ""
            : catalogDeleteConfirmTitle(
                confirmTarget.kind === "brand"
                  ? confirmTarget.brand.name
                  : confirmTarget.type.name,
              )
        }
        loading={deletePending}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={cancelDelete}
      >
        {deleteError === null ? null : (
          <p role="alert" className="font-body text-sm leading-base text-danger">
            {deleteError}
          </p>
        )}
      </ConfirmDialog>

      <Dialog
        open={notice !== null}
        onClose={() => setNotice(null)}
        title={
          notice === null
            ? ""
            : notice.target === "brand"
              ? CATALOG_BLOCKED_BRAND_TITLE
              : CATALOG_BLOCKED_TYPE_TITLE
        }
        closeLabel={CATALOG_NOTICE_DISMISS_LABEL}
      >
        {notice === null ? null : (
          <p className="font-body text-sm leading-base text-fg">
            {notice.target === "brand"
              ? brandBlockedBody(notice.types, notice.yarns)
              : typeBlockedBody(notice.yarns)}
          </p>
        )}
      </Dialog>
    </section>
  );
}

function BrandPanel({
  entry,
  onAddType,
  onDeleteBrand,
  onDeleteType,
}: {
  entry: BrandTreeEntry;
  onAddType: () => void;
  onDeleteBrand: () => void;
  onDeleteType: (type: BrandTreeEntry["types"][number]) => void;
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
              <li
                key={type.id}
                className="flex items-center justify-between gap-(--space-2)"
              >
                <span className="font-body text-sm leading-base text-fg">
                  {type.name}
                </span>
                <Button
                  variant="danger"
                  size="icon"
                  aria-label={catalogDeleteLabel(type.name)}
                  onClick={() => onDeleteType(type)}
                >
                  <span aria-hidden="true">✕</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-(--space-2)">
          <Button variant="secondary" onClick={onAddType}>
            {CATALOG_ADD_TYPE_TRIGGER_LABEL}
          </Button>
          <Button
            variant="danger"
            size="icon"
            aria-label={catalogDeleteLabel(entry.brand.name)}
            onClick={onDeleteBrand}
          >
            <span aria-hidden="true">✕</span>
          </Button>
        </div>
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
