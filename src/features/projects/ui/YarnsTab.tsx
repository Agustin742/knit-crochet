"use client";

import { useState } from "react";

import type { LinkedYarn } from "@/features/projects/types";
import type { ColorFamily } from "@/shared/config";
import { Button, Field, Input } from "@/shared/ui";

import { ActionError, TabSection } from "./DetailTabParts";
import type { YarnChoice } from "./project-filters";
import {
  ALL_YARNS_LINKED,
  EMPTY_INVENTORY,
  INVENTORY_UNAVAILABLE,
  LINK_YARNS_TITLE,
  LINKED_YARNS_TITLE,
  NO_LINKED_YARNS,
  NO_YARN_MATCHES,
  UNLINK_SHORT_LABEL,
  YARN_SEARCH_LABEL,
  linkYarnLabel,
  linkableYarns,
  linkedYarnLabel,
  moreMatchesHint,
  unlinkYarnLabel,
} from "./project-detail";
import { linkProjectYarn, unlinkProjectYarn } from "./projects-client";

/**
 * Cuántos resultados se ofrecen de una vez. El inventario de quien teje puede
 * tener decenas de lanas, y una lista de treinta botones dentro de un cajón no
 * es un selector: es un muro. Lo que sobra se cuenta y se pide afinar.
 */
export const MAX_YARN_RESULTS = 6;

export interface YarnsTabProps {
  projectId: string;
  /**
   * Las lanas ya enlazadas. **Vienen del detalle que el cajón ya pidió** —la
   * feature #17 saldó la deuda 5 y `GET /api/projects/:id` las trae aplanadas
   * con marca y tipo—, así que este tab no abre ninguna petición para leerlas.
   */
  yarns: readonly LinkedYarn[];
  /**
   * El inventario del que se puede enlazar. Llega **por prop y no por una
   * petición propia**: la lista de proyectos ya pide `GET /api/yarns` para el
   * filtro de "lana usada", y pedirlo otra vez al abrir un cajón sería la misma
   * respuesta dos veces en la misma pantalla.
   */
  inventory: readonly YarnChoice[];
  /**
   * El inventario **no se pudo traer**. Va aparte de la lista vacía a propósito:
   * son dos cosas distintas y decirle "no tenés lanas" a quien tiene cincuenta
   * es exactamente la mentira que **E2(e)** corrigió en el estado vacío de la
   * lista.
   */
  inventoryUnavailable: boolean;
  /**
   * Vuelve a pedir el detalle. Hace falta **sólo al enlazar**: el endpoint de
   * enlace responde ids pelados, y la marca y el tipo salen de un JOIN que sólo
   * hace el detalle. Desenlazar no lo necesita, porque quitar de una lista no
   * exige saber nada nuevo.
   */
  onRefreshDetail: () => Promise<void>;
  /** Quita la lana de lo que el cajón tiene en memoria (el servidor ya la quitó). */
  onUnlinked: (yarnId: string) => void;
}

/**
 * Tab **Lanas** del cajón de detalle (RFC-03 §2): las lanas enlazadas con su
 * muestra de color, y un buscador para enlazar y desenlazar.
 *
 * **Acá sí hay marca y tipo por su nombre**, y conviene tenerlo presente porque
 * en la misma pantalla convive lo contrario: el desplegable de filtros etiqueta
 * las lanas **sólo por color** (**E1(d)**) porque `GET /api/yarns` devuelve la
 * fila cruda con los UUID. El detalle del proyecto los aplana con un JOIN, así
 * que lo enlazado se lee entero y lo enlazable no. La asimetría es del contrato,
 * no de este componente.
 *
 * **Una acción a la vez**, por lo mismo que en Progreso: las dos mutan la misma
 * lista, y apagar los controles mientras una viaja es lo que impide que un doble
 * clic mande dos veces lo mismo.
 */
export function YarnsTab({
  projectId,
  yarns,
  inventory,
  inventoryUnavailable,
  onRefreshDetail,
  onUnlinked,
}: YarnsTabProps) {
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const busy = pendingId !== null;
  const matches = linkableYarns(inventory, yarns, search);
  const visible = matches.slice(0, MAX_YARN_RESULTS);
  const hidden = matches.length - visible.length;

  async function link(choice: YarnChoice) {
    setPendingId(choice.id);
    setActionError(null);
    const result = await linkProjectYarn(projectId, choice.id);
    if (result.ok) {
      /* El detalle se vuelve a pedir ANTES de soltar el control: si se soltara
         antes, habría un instante con la lana ya enlazada en el servidor y
         todavía ausente de la lista, y el buscador la volvería a ofrecer. */
      await onRefreshDetail();
      setSearch("");
    } else {
      setActionError(result.message);
    }
    setPendingId(null);
  }

  async function unlink(yarn: LinkedYarn) {
    setPendingId(yarn.id);
    setActionError(null);
    const result = await unlinkProjectYarn(projectId, yarn.id);
    setPendingId(null);
    if (result.ok) {
      onUnlinked(yarn.id);
    } else {
      setActionError(result.message);
    }
  }

  return (
    <div className="flex flex-col gap-(--space-6)">
      <ActionError message={actionError} />

      <TabSection title={LINKED_YARNS_TITLE}>
        {yarns.length === 0 ? (
          <p className="m-0 font-body text-base leading-base text-fg">
            {NO_LINKED_YARNS}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-(--space-2) p-0">
            {yarns.map((yarn) => {
              const label = linkedYarnLabel(yarn);
              return (
                <li
                  key={yarn.id}
                  className="flex items-center gap-(--space-3)"
                >
                  <YarnSwatch family={yarn.colorFamily} />
                  <span className="min-w-0 flex-1 font-body text-base leading-base text-fg">
                    {label}
                  </span>
                  <Button
                    variant="ghost"
                    aria-label={unlinkYarnLabel(label)}
                    loading={pendingId === yarn.id}
                    disabled={busy}
                    onClick={() => {
                      void unlink(yarn);
                    }}
                  >
                    {UNLINK_SHORT_LABEL}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </TabSection>

      <TabSection title={LINK_YARNS_TITLE}>
        {inventoryUnavailable ? (
          <p className="m-0 font-body text-base leading-base text-fg">
            {INVENTORY_UNAVAILABLE}
          </p>
        ) : inventory.length === 0 ? (
          <p className="m-0 font-body text-base leading-base text-fg">
            {EMPTY_INVENTORY}
          </p>
        ) : (
          <>
            <Field label={YARN_SEARCH_LABEL}>
              <Input
                type="search"
                value={search}
                autoComplete="off"
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
            </Field>

            {matches.length === 0 ? (
              <p className="m-0 font-body text-base leading-base text-fg">
                {search.trim() === "" ? ALL_YARNS_LINKED : NO_YARN_MATCHES}
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-(--space-2) p-0">
                {visible.map((choice) => (
                  <li key={choice.id}>
                    {/* La fila ENTERA es el botón: el objetivo táctil es la
                        línea completa y no un control chico al final, que es lo
                        que se falla con el pulgar. */}
                    <Button
                      variant="secondary"
                      className="w-full justify-start"
                      aria-label={linkYarnLabel(choice.label)}
                      loading={pendingId === choice.id}
                      disabled={busy}
                      onClick={() => {
                        void link(choice);
                      }}
                    >
                      <YarnSwatch family={choice.colorFamily} />
                      <span>{choice.label}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {hidden > 0 ? (
              <p className="m-0 font-mono text-sm leading-base text-fg">
                {moreMatchesHint(hidden)}
              </p>
            ) : null}
          </>
        )}
      </TabSection>
    </div>
  );
}

/**
 * La muestra de color de la lana (RFC-03 §2).
 *
 * Es **decorativa**: el nombre del color viaja en el texto de al lado, así que
 * anunciarla repetiría lo que ya se dice — y un color no es información que un
 * lector de pantalla pueda transmitir. Conserva el borde del sistema para que
 * una lana blanca o cruda siga teniendo silueta sobre la superficie clara del
 * cajón, en vez de desaparecer.
 */
function YarnSwatch({ family }: { family: ColorFamily }) {
  return (
    <span
      aria-hidden="true"
      className={`${YARN_SWATCH_CLASSES} ${yarnSwatchColor(family)}`}
    />
  );
}

const YARN_SWATCH_CLASSES =
  "inline-block size-(--space-5) shrink-0 rounded-full border-(length:--border-width) border-solid border-border";

/**
 * El color de cada familia sale de un **token**, nunca de un valor escrito acá
 * (`globals.css`, bloque "familias de color de lana"). Es un `switch` sobre la
 * unión y no un objeto indexado por dos motivos que se refuerzan: TypeScript
 * exige que estén las trece —añadir una familia sin su color no compila— y el
 * gate de clases compiladas de `/proyectos` sabe seguir lo que una función del
 * propio archivo devuelve, mientras que un acceso por índice lo dejaría sin
 * comprobar contra el CSS real.
 *
 * "Multicolor" es el único que no es un color plano: se dibuja como imagen,
 * porque una lana jaspeada no tiene UN color y elegirle uno sería inventarlo.
 */
function yarnSwatchColor(family: ColorFamily): string {
  switch (family) {
    case "red":
      return "bg-yarn-red";
    case "orange":
      return "bg-yarn-orange";
    case "yellow":
      return "bg-yarn-yellow";
    case "green":
      return "bg-yarn-green";
    case "blue":
      return "bg-yarn-blue";
    case "violet":
      return "bg-yarn-violet";
    case "pink":
      return "bg-yarn-pink";
    case "brown":
      return "bg-yarn-brown";
    case "gray":
      return "bg-yarn-gray";
    case "black":
      return "bg-yarn-black";
    case "white":
      return "bg-yarn-white";
    case "neutral":
      return "bg-yarn-neutral";
    case "multicolor":
      return "bg-(image:--yarn-multicolor)";
  }
}
