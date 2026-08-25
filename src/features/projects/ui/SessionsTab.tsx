"use client";

import { useEffect, useState } from "react";

import { MILLISECONDS_PER_SECOND } from "@/shared/config";
import { formatClock, formatDateTime, formatDuration } from "@/shared/lib/format";
import { Button, ErrorState, Skeleton } from "@/shared/ui";

import { ActionError, TabSection } from "./DetailTabParts";
import {
  DETAIL_ERROR_TITLE,
  NO_SESSIONS,
  SESSION_IDLE_MESSAGE,
  SESSION_TIMER_REGION_LABEL,
  SESSIONS_HISTORY_TITLE,
  SESSIONS_LOADING_MESSAGE,
  SESSIONS_TOTAL_LABEL,
  START_SESSION_LABEL,
  STOP_SESSION_LABEL,
  UNKNOWN_SESSION_DATE,
  finishedSessions,
  runningSession,
  sessionElapsedSeconds,
  totalSessionSeconds,
} from "./project-detail";
import {
  getProjectSessions,
  startCraftSession,
  stopCraftSession,
} from "./projects-client";
import type { SerializedCraftSession } from "./types";

/**
 * Cada cuánto se redibuja el cronómetro. Un segundo: es la unidad que el
 * cronómetro muestra, así que un intervalo más corto redibujaría sin cambiar
 * nada y uno más largo dejaría saltos visibles.
 */
const TICK_MS = MILLISECONDS_PER_SECOND;

/**
 * Lo último que llegó, con la clave de la petición que lo trajo. Las sesiones
 * **sobreviven a un refresco fallido**: si parar sale bien y la recarga del
 * historial falla, lo que había sigue en pantalla en vez de desaparecer.
 */
type LoadedSessions = {
  key: string;
  sessions: SerializedCraftSession[] | null;
  error: string | null;
};

export interface SessionsTabProps {
  projectId: string;
  /**
   * El tiempo total del proyecto, **recalculado por el servidor**, que viaja en
   * la respuesta de parar. Se sube al cajón para que el tab General no se quede
   * con la cifra de antes de la sesión que se acaba de cerrar.
   */
  onTimeChange: (time: number) => void;
}

/**
 * Tab **Sesiones** del cajón de detalle (RFC-03 §2 y §5): cronómetro con
 * arrancar y parar, el tiempo corriendo a la vista y en región viva, y el
 * histórico.
 *
 * **De dónde sale "está corriendo".** No hay ninguna columna, filtro ni endpoint
 * que lo diga —por eso el quick-start de la tarjeta *sólo arranca* (**E1(e)**)—,
 * pero acá el historial del proyecto se pide entero, y **la sesión abierta es la
 * que no tiene fin**. Es un dato derivado del listado, no un estado inventado en
 * memoria: sobrevive a recargar la página, que es justo lo que la marca de la
 * tarjeta no puede prometer.
 *
 * **El intervalo, que es la pieza delicada:**
 *
 * - vive en un efecto atado al **arranque de la sesión que corre**, así que hay
 *   como mucho uno, y cambiar de sesión lo reemplaza en vez de sumar otro;
 * - se limpia al desmontar, y desmontar pasa **también** al cambiar de pestaña y
 *   al cerrar el cajón, porque el carril de pestañas monta sólo el panel elegido
 *   y el cajón cerrado no pinta nada;
 * - pulsar dos veces no puede duplicarlo: mientras la petición viaja el botón
 *   está apagado, y el arranque es idempotente en el servidor de todas formas.
 *
 * **La asimetría del backend, que es la contraria a la que uno supone:** arrancar
 * dos veces es gratis (200, reutiliza la sesión abierta), pero **parar dos veces
 * responde 409**. Por eso el botón de parar no se pinta si no hay nada
 * corriendo.
 */
export function SessionsTab({ projectId, onTimeChange }: SessionsTabProps) {
  const [loaded, setLoaded] = useState<LoadedSessions | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  /**
   * El instante contra el que se mide la sesión. **Sólo lo mueve el intervalo**,
   * nunca un render, y por eso vale como reloj: si cada render lo actualizara, el
   * tiempo saltaría al pulsar cualquier cosa.
   */
  const [now, setNow] = useState(() => Date.now());

  const requestKey = `${projectId}|${String(reloadToken)}`;

  useEffect(() => {
    let cancelled = false;

    void getProjectSessions(projectId).then((result) => {
      if (cancelled) {
        return;
      }
      setLoaded((previous) =>
        result.ok
          ? { key: requestKey, sessions: result.data, error: null }
          : {
              key: requestKey,
              sessions: previous?.sessions ?? null,
              error: result.message,
            },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, requestKey]);

  /* Estar cargando se DERIVA, y sólo cuenta la PRIMERA vez: recargar el
     historial tras arrancar o parar conserva lo que ya se veía. Si volviera a la
     silueta, el botón de parar se convertiría en el de arrancar durante ese
     parpadeo — con el cronómetro corriendo de verdad por debajo. */
  const sessions = loaded?.sessions ?? [];
  const loading = loaded === null;
  const settled = loaded?.key === requestKey;
  const loadError = settled ? loaded?.error ?? null : null;
  const running = runningSession(sessions);
  /* La dependencia del intervalo es el ARRANQUE, no el objeto: cada carga trae
     una sesión nueva desde la red, y depender del objeto reiniciaría el
     intervalo en cada recarga aunque siguiera corriendo la misma. */
  const runningStart = running?.start ?? null;

  useEffect(() => {
    if (runningStart === null) {
      return;
    }
    /* El efecto NO pone la hora al arrancar, sólo programa el tick, y eso no
       deja el reloj atrasado: mientras `now` sea anterior al sello del arranque
       —que es lo único que puede pasar tras estar un rato sin tickar— la resta
       sale negativa y se acota a cero, o sea "00:00", que es exactamente lo que
       una sesión recién arrancada tiene que mostrar. Nunca puede exagerar. */
    const ticker = setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);

    return () => {
      clearInterval(ticker);
    };
  }, [runningStart]);

  async function start() {
    setPending(true);
    setActionError(null);
    const result = await startCraftSession(projectId);
    if (result.ok) {
      /* Se vuelve a pedir la lista en vez de meter la sesión a mano: el orden y
         el "cuál está abierta" los decide el servidor, y una lista cosida a mano
         es una segunda verdad esperando a discrepar. */
      setReloadToken((token) => token + 1);
    } else {
      setActionError(result.message);
    }
    setPending(false);
  }

  async function stop() {
    setPending(true);
    setActionError(null);
    const result = await stopCraftSession(projectId);
    if (result.ok) {
      onTimeChange(result.data.time);
      setReloadToken((token) => token + 1);
    } else {
      setActionError(result.message);
    }
    setPending(false);
  }

  /* El error tapa el tab **sólo cuando no hay nada que enseñar**. Si ya había
     sesiones cargadas, lo que falló es un refresco: se cuenta al lado del
     control, sin borrar de la pantalla lo que sigue siendo cierto. */
  if (loadError !== null && loaded?.sessions === null) {
    return (
      <ErrorState
        headingLevel={3}
        title={DETAIL_ERROR_TITLE}
        description={loadError}
        onRetry={() => {
          setReloadToken((token) => token + 1);
        }}
      />
    );
  }

  const elapsed =
    runningStart === null ? 0 : sessionElapsedSeconds(runningStart, now);
  const finished = finishedSessions(sessions);

  return (
    <div className="flex flex-col gap-(--space-6)">
      {/* Lo primario del tab es el tiempo, y por eso es lo más grande de la
          pantalla: número monoespaciado de titular, con el control debajo. */}
      <div className="flex flex-col items-start gap-(--space-3)">
        <p className="m-0">
          <span
            aria-hidden="true"
            className="font-mono text-4xl leading-tight text-fg"
          >
            {formatClock(elapsed)}
          </span>
          {/* La región viva NO va segundo a segundo, y es a propósito: un aviso
              por segundo convierte un lector de pantalla en un metrónomo y tapa
              todo lo demás. El texto es de grano de minuto —cambia sesenta veces
              menos— y los segundos se quedan en lo que se ve. */}
          <span
            role="status"
            aria-label={SESSION_TIMER_REGION_LABEL}
            className="sr-only"
          >
            {runningStart === null
              ? SESSION_IDLE_MESSAGE
              : formatDuration(elapsed)}
          </span>
        </p>

        {running === null ? (
          <Button variant="primary" loading={pending} onClick={() => void start()}>
            {START_SESSION_LABEL}
          </Button>
        ) : (
          <Button variant="secondary" loading={pending} onClick={() => void stop()}>
            {STOP_SESSION_LABEL}
          </Button>
        )}
      </div>

      <ActionError message={actionError ?? loadError} />

      <TabSection title={SESSIONS_HISTORY_TITLE}>
        {loading ? (
          <SessionsSkeleton />
        ) : finished.length === 0 ? (
          <p className="m-0 font-body text-base leading-base text-fg">
            {NO_SESSIONS}
          </p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-(--space-2) p-0">
              {finished.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-baseline justify-between gap-(--space-3)"
                >
                  <span className="font-body text-base leading-base text-fg">
                    {formatDateTime(session.start) ?? UNKNOWN_SESSION_DATE}
                  </span>
                  <span className="font-mono text-sm leading-base text-fg">
                    {formatDuration(session.duration)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="m-0 flex items-baseline justify-between gap-(--space-3) border-t-(length:--border-width) border-solid border-border pt-(--space-2)">
              <span className="font-mono text-xs uppercase tracking-label text-fg">
                {SESSIONS_TOTAL_LABEL}
              </span>
              <span className="font-body text-base leading-base text-fg">
                {formatDuration(totalSessionSeconds(sessions))}
              </span>
            </p>
          </>
        )}
      </TabSection>
    </div>
  );
}

/**
 * Silueta del histórico mientras viaja la petición, donde van a caer las filas.
 * La región lleva nombre propio (deuda 114): en el cajón ya vive la de carga del
 * detalle, y dos regiones anónimas vuelven ambiguo el selector que espera a que
 * termine una carga.
 */
function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-(--space-2)">
      <p role="status" aria-label={SESSIONS_HISTORY_TITLE} className="sr-only">
        {SESSIONS_LOADING_MESSAGE}
      </p>
      {[0, 1, 2].map((slot) => (
        <Skeleton key={slot} className="w-full" />
      ))}
    </div>
  );
}
