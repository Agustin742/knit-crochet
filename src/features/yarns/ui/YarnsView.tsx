"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, EmptyState, ErrorState, Skeleton } from "@/shared/ui";

import { EMPTY_TITLE, ERROR_TITLE, RETRY_LABEL } from "./yarn-copy";
import { getYarns } from "./yarns-client";
import { YarnCard } from "./YarnCard";
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
 * **`filters` nace vacío y sin control que lo cambie** (S4b lo conecta al
 * árbol marca→tipo y a la fila de swatches, design D6): existe ya para que
 * `requestKey` y la llamada a `getYarns` no tengan que reescribirse cuando
 * llegue el filtro.
 */
export function YarnsView() {
  const [filters] = useState<YarnFilters>({});
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<LoadedState | null>(null);

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

  return (
    <div className="flex flex-col gap-(--space-6) p-(--space-6)">
      <h1 className="font-display text-3xl leading-tight text-fg-inverse">
        {PAGE_TITLE}
      </h1>

      <p role="status" aria-label={LOADING_REGION_LABEL} className="sr-only">
        {loading ? LOADING_MESSAGE : ""}
      </p>

      {failed ? (
        <ErrorState title={ERROR_TITLE} onRetry={reload} retryLabel={RETRY_LABEL} />
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
              <YarnCard yarn={yarn} />
            </li>
          ))}
        </ul>
      )}
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
