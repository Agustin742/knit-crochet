"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, EmptyState, ErrorState, Skeleton } from "@/shared/ui";

import { EMPTY_TITLE, ERROR_TITLE, RETRY_LABEL } from "./yarn-copy";
import { mergeYarnPatch } from "./merge-yarn";
import { getYarns, patchYarnUsedQuantity } from "./yarns-client";
import { YarnCard } from "./YarnCard";
import { YarnDetailDrawer } from "./YarnDetailDrawer";
import { YarnFilterPanel } from "./YarnFilterPanel";
import type { SerializedYarnListItem, YarnFilters } from "./types";

export const PAGE_TITLE = "Lanas";
export const LOADING_REGION_LABEL = "Estado de la lista de lanas";
export const LOADING_MESSAGE = "Cargando tus lanas.";

/**
 * Lo último que llegó, con la clave de la petición que lo trajo. Mismo
 * patrón que `ProjectsView` (`LoadedState`): estar cargando se DERIVA de
 * comparar esta clave con la pedida, en vez de un booleano aparte.
 */
type LoadedState = {
  key: string;
  yarns: SerializedYarnListItem[] | null;
  failed: boolean;
};

function requestKeyOf(filters: YarnFilters, reloadToken: number): string {
  return `${filters.brandId ?? ""}|${filters.typeId ?? ""}|${filters.colorFamily ?? ""}|${reloadToken}`;
}

/**
 * La lista de lanas entera (RFC-04 §2/§4).
 *
 * **El error de pantalla es SIEMPRE el mismo mensaje fijo** (RFC-04 §4: "Se
 * enredó la madeja"), a diferencia de `ProjectsView`, que muestra el texto
 * que manda el servidor: el spec de esta feature no pide reproducir el
 * detalle del fallo, y `getYarns` ya lo tipa por si una vista futura lo
 * necesita.
 *
 * **`filters` es `useState`, nunca la URL** (design D6): `YarnFilterPanel`
 * traduce el árbol marca→tipo y la fila de swatches a este único objeto, que
 * sube por `setFilters` y de ahí a `requestKey` y a `getYarns` sin que
 * ninguno de los dos necesite saber cómo se construyó.
 */
export function YarnsView() {
  const [filters, setFilters] = useState<YarnFilters>({});
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  /* El cajón se resuelve por `id` contra la lista viva, no por una copia:
     así el resultado del `PATCH` entra al cajón abierto por el mismo camino
     que a la tarjeta, y una lana que desaparece de la lista cierra el cajón
     sola (`find` devuelve `undefined`). Por eso `detailId` NO se limpia: un
     id viejo es inerte, porque toda lectura pasa por `find`. */
  const [detailId, setDetailId] = useState<string | null>(null);
  const [usedQuantityPending, setUsedQuantityPending] = useState(false);
  const [usedQuantityError, setUsedQuantityError] = useState<string | null>(null);
  /* Sube en cada alta/borrado exitoso del catálogo (design D5): es la única
     dependencia nueva del efecto de `YarnBrandTree`, así que un create en el
     panel se ve reflejado en el árbol sin recargar la página. El branch de
     filtro colgante (borrar la marca/tipo activo) es la rebanada S2b. */
  const [catalogToken, setCatalogToken] = useState(0);

  const handleCatalogChange = useCallback(() => {
    setCatalogToken((token) => token + 1);
  }, []);

  const requestKey = requestKeyOf(filters, reloadToken);
  const loading = loaded?.key !== requestKey;
  const yarns = loaded?.yarns ?? null;
  const failed = loaded?.key === requestKey && loaded.failed;

  useEffect(() => {
    let cancelled = false;

    void getYarns(filters).then((result) => {
      if (cancelled) {
        return;
      }
      setLoaded(
        result.ok
          ? { key: requestKey, yarns: result.data, failed: false }
          : { key: requestKey, yarns: null, failed: true },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [filters, requestKey]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  /* El `PATCH` devuelve la fila CRUDA, sin `brandName` ni `typeName` (esos dos
     los agregó #23 sólo a la lista). Por eso la respuesta entra por
     `mergeYarnPatch`, cuyo tipo de retorno impide devolver la cruda: sin él,
     tocar el stepper blanquearía «marca · tipo» en la tarjeta. */
  const changeUsedQuantity = useCallback(
    async (id: string, next: number) => {
      setUsedQuantityPending(true);
      setUsedQuantityError(null);
      const result = await patchYarnUsedQuantity(id, next);
      setUsedQuantityPending(false);
      if (!result.ok) {
        setUsedQuantityError(result.message);
        return;
      }
      setLoaded((current) =>
        /* `yarns` es `null` cuando la carga falló: ahí no hay nada que
           fusionar, y el cajón tampoco está abierto. */
        current === null || current.yarns === null
          ? current
          : {
              ...current,
              yarns: current.yarns.map((yarn) =>
                yarn.id === id ? mergeYarnPatch(yarn, result.data) : yarn,
              ),
            },
      );
    },
    [],
  );

  return (
    /* El `h1` encabeza la PÁGINA y queda fuera de las dos columnas: dentro de
       la del filtro empujaba sólo a ese lado, y la rejilla de tarjetas
       arrancaba más arriba por exactamente el alto del título. */
    <div className="flex flex-col gap-(--space-6) p-(--space-6)">
      <h1 className="font-display text-3xl leading-tight text-fg-inverse">
        {PAGE_TITLE}
      </h1>

      <div className="flex flex-col gap-(--space-6) tablet:flex-row">
      <div className="flex flex-col gap-(--space-4) tablet:w-64 tablet:shrink-0">
        <YarnFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          catalogToken={catalogToken}
          onCatalogChange={handleCatalogChange}
        />
      </div>

      <div className="flex flex-1 flex-col gap-(--space-4)">
        <p role="status" aria-label={LOADING_REGION_LABEL} className="sr-only">
          {loading ? LOADING_MESSAGE : ""}
        </p>

        {failed ? (
          <ErrorState
            title={ERROR_TITLE}
            onRetry={reload}
            retryLabel={RETRY_LABEL}
          />
        ) : yarns === null ? (
          <YarnGridSkeleton />
        ) : yarns.length === 0 ? (
          <EmptyState title={EMPTY_TITLE} />
        ) : (
          <ul
            aria-busy={loading}
            className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3"
          >
            {yarns.map((yarn) => (
              <li key={yarn.id}>
                <YarnCard
                  yarn={yarn}
                  onOpen={() => {
                    setUsedQuantityError(null);
                    setDetailId(yarn.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      <YarnDetailDrawer
        yarn={yarns?.find((yarn) => yarn.id === detailId) ?? null}
        onClose={() => setDetailId(null)}
        onUsedQuantityChange={(next) => {
          if (detailId !== null) {
            void changeUsedQuantity(detailId, next);
          }
        }}
        usedQuantityPending={usedQuantityPending}
        usedQuantityError={usedQuantityError}
      />
    </div>
  );
}

/** Seis bloques de carga con la silueta de una tarjeta, misma rejilla que la real. */
function YarnGridSkeleton() {
  return (
    <ul
      aria-busy="true"
      className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3"
    >
      {[0, 1, 2, 3, 4, 5].map((slot) => (
        <li key={slot}>
          <Card className="flex items-center gap-(--space-3)">
            <Skeleton shape="block" className="size-(--space-8) rounded-full" />
            <Skeleton className="w-full" />
          </Card>
        </li>
      ))}
    </ul>
  );
}
