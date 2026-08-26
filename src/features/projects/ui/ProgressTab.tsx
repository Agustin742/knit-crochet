"use client";

import { type FormEvent, useEffect, useState } from "react";

import { formatInteger } from "@/shared/lib/format";
import { Button, Field, Input, ProgressBar, Skeleton } from "@/shared/ui";

import { ActionError, TabSection } from "./DetailTabParts";
import {
  ADD_ROUND_LABEL,
  PROGRESS_BAR_LABEL,
  PROGRESS_SECTION_TITLE,
  ROUNDS_DONE_LABEL,
  SAVE_TARGET_LABEL,
  STEPS_EMPTY,
  STEPS_ERROR,
  STEPS_LOADING_MESSAGE,
  STEPS_SECTION_TITLE,
  SUBTRACT_ROUND_LABEL,
  TARGET_ROUNDS_ERROR,
  TARGET_ROUNDS_LABEL,
  NO_TARGET_HINT,
  roundsCounterLabel,
  stepLabel,
  toggleStep,
} from "./project-detail";
import {
  addProjectRounds,
  getPattern,
  setProjectSteps,
  updateProjectTargetRounds,
} from "./projects-client";
import type { PatternStep, SerializedProject } from "./types";

export interface ProgressTabProps {
  project: SerializedProject;
  /**
   * Los tres endpoints de este tab responden **el proyecto entero ya
   * recalculado**, así que el cajón se actualiza con lo que devolvió el
   * servidor. El porcentaje **no se recalcula en el navegador**: hay una sola
   * fuente del cálculo y vive en el backend; duplicar la fórmula acá es cómo se
   * desincronizan las dos mitades.
   */
  onProjectChange: (project: SerializedProject) => void;
}

/** Qué acción está en vuelo. Uno solo: mientras una viaja, las demás se apagan. */
type PendingAction = "rounds" | "target" | "steps" | null;

/** Los pasos del patrón, que viven en otra tabla y por eso tienen su propio viaje. */
type StepsState =
  | { status: "absent" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; steps: PatternStep[] };

/** Lo último que llegó, con la clave del patrón que lo trajo. */
type LoadedSteps = { key: string; steps: PatternStep[] | null };

/**
 * En qué punto está la checklist. **Se DERIVA de comparar lo pedido con lo que
 * llegó**, igual que el cajón y la lista, en vez de encenderse a mano dentro del
 * efecto: apagar un booleano de carga es algo de lo que hay que acordarse en
 * cada camino, y cambiar de proyecto dejaría en pantalla los pasos del anterior
 * haciéndose pasar por los nuevos.
 */
function stepsStateOf(
  patternId: string | null,
  loaded: LoadedSteps | null,
): StepsState {
  if (patternId === null) {
    return { status: "absent" };
  }
  if (loaded === null || loaded.key !== patternId) {
    return { status: "loading" };
  }
  return loaded.steps === null
    ? { status: "error" }
    : { status: "ready", steps: loaded.steps };
}

/**
 * Tab **Progreso** del cajón de detalle (RFC-03 §2): vueltas con más y menos,
 * meta editable, y la checklist de pasos **si el proyecto tiene patrón**.
 *
 * **Sin patrón, la checklist no se pinta — y no aparece ningún "crear
 * patrón".** La enmienda **E3(d)** es explícita: los botones cuyo destino aún no
 * existe no se pintan, y el alta de patrones es #26-28. Cuando exista, se añade
 * de forma aditiva y sin tocar nada más de este tab. (Sí: §2 de RFC-03 menciona
 * ese botón; E3(d) es posterior y manda sobre el *cuándo*.)
 *
 * **Una acción en vuelo a la vez.** No es prudencia genérica: las tres mutan el
 * mismo proyecto y las tres responden el proyecto entero, así que dos respuestas
 * cruzadas dejarían en pantalla la más lenta, o sea la más vieja. Apagar los
 * controles mientras una viaja también es lo que impide que un doble clic en
 * "sumar" mande dos vueltas cuando el usuario quiso una.
 */
export function ProgressTab({ project, onProjectChange }: ProgressTabProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [target, setTarget] = useState(() => String(project.targetRounds));
  const [targetInvalid, setTargetInvalid] = useState(false);
  const [loadedSteps, setLoadedSteps] = useState<LoadedSteps | null>(null);

  const patternId = project.patternId;
  const steps = stepsStateOf(patternId, loadedSteps);

  useEffect(() => {
    if (patternId === null) {
      return;
    }
    let cancelled = false;

    void getPattern(patternId).then((result) => {
      if (cancelled) {
        return;
      }
      setLoadedSteps({
        key: patternId,
        steps: result.ok ? result.data.instructions : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [patternId]);

  async function run(
    action: Exclude<PendingAction, null>,
    request: Promise<
      | { ok: true; data: SerializedProject }
      | { ok: false; message: string }
    >,
  ) {
    setPending(action);
    setActionError(null);
    const result = await request;
    setPending(null);
    if (result.ok) {
      onProjectChange(result.data);
    } else {
      setActionError(result.message);
    }
  }

  function changeRounds(delta: number) {
    void run("rounds", addProjectRounds(project.id, delta));
  }

  function submitTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    /* Lo mismo que acepta el backend —entero, no negativo—, comprobado antes de
       salir: un 400 de validación se leería como "algo salió mal" cuando lo que
       pasa es que la meta se cuenta en vueltas enteras. */
    const trimmed = target.trim();
    if (!/^\d+$/.test(trimmed)) {
      setTargetInvalid(true);
      return;
    }
    setTargetInvalid(false);
    void run("target", updateProjectTargetRounds(project.id, Number(trimmed)));
  }

  function toggle(index: number) {
    void run(
      "steps",
      setProjectSteps(project.id, toggleStep(project.completedSteps, index)),
    );
  }

  const busy = pending !== null;

  return (
    <div className="flex flex-col gap-(--space-6)">
      {/* El porcentaje es lo PRIMARIO del tab y se ve como tal: número de
          titular, y a su lado —en monoespaciada chica— la cuenta cruda que lo
          explica. Debajo, la misma barra que la tarjeta de la lista. */}
      <div className="flex flex-col gap-(--space-2)">
        <p className="m-0 flex items-baseline justify-between gap-(--space-3)">
          <span className="font-display text-4xl leading-tight text-fg">
            {`${formatInteger(project.progress)}%`}
          </span>
          {/* Sin meta NO hay fracción que mostrar (enmienda E5): la cuenta va
              sola y nombrada. La copia entera vive en `project-detail.ts`, como
              el resto del módulo. */}
          <span className="font-mono text-sm leading-base text-fg">
            {roundsCounterLabel(project.rounds, project.targetRounds)}
          </span>
        </p>
        <ProgressBar value={project.progress} label={PROGRESS_BAR_LABEL} />
      </div>

      <ActionError message={actionError} />

      <TabSection title={PROGRESS_SECTION_TITLE}>
        <div className="flex items-center gap-(--space-4)">
          <Button
            size="icon"
            aria-label={SUBTRACT_ROUND_LABEL}
            /* A cero no hay nada que restar: el backend acota en 0, así que el
               botón no haría nada visible. Apagarlo lo dice antes de pulsar. */
            disabled={busy || project.rounds === 0}
            onClick={() => {
              changeRounds(-1);
            }}
          >
            <span aria-hidden="true">−</span>
          </Button>

          {/* Región viva de grano grueso: cambia sólo al pulsar, así que
              anunciarla no molesta y es la única forma de que quien no ve la
              pantalla sepa que la vuelta se contó. */}
          <p
            aria-live="polite"
            className="m-0 min-w-(--space-12) text-center font-display text-3xl leading-tight text-fg"
          >
            <span className="sr-only">{`${ROUNDS_DONE_LABEL}: `}</span>
            {formatInteger(project.rounds)}
          </p>

          <Button
            size="icon"
            aria-label={ADD_ROUND_LABEL}
            disabled={busy}
            onClick={() => {
              changeRounds(1);
            }}
          >
            <span aria-hidden="true">+</span>
          </Button>
        </div>

        {/* La meta vive DENTRO del bloque de vueltas: es la otra mitad de la
            misma cuenta —lo tejido contra lo que falta—, y sacarla a un bloque
            suelto la dejaba flotando entre dos secciones sin decir de qué habla. */}
        <form onSubmit={submitTarget} className="flex flex-col gap-(--space-3)">
          <Field
            label={TARGET_ROUNDS_LABEL}
            error={targetInvalid ? TARGET_ROUNDS_ERROR : undefined}
            hint={project.targetRounds === 0 ? NO_TARGET_HINT : undefined}
          >
            <Input
              value={target}
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => {
                setTarget(event.target.value);
              }}
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            className="self-start"
            loading={pending === "target"}
            disabled={busy}
          >
            {SAVE_TARGET_LABEL}
          </Button>
        </form>
      </TabSection>

      {steps.status === "absent" ? null : (
        <TabSection title={STEPS_SECTION_TITLE}>
          {steps.status === "loading" ? (
            <StepsSkeleton />
          ) : steps.status === "error" ? (
            <p className="m-0 font-body text-base leading-base text-fg">
              {STEPS_ERROR}
            </p>
          ) : steps.steps.length === 0 ? (
            <p className="m-0 font-body text-base leading-base text-fg">
              {STEPS_EMPTY}
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-(--space-2) p-0">
              {steps.steps.map((step, index) => (
                <li key={`${String(index)}-${step.key}`}>
                  <label className="flex cursor-pointer items-start gap-(--space-3) font-body text-base leading-base text-fg">
                    <input
                      type="checkbox"
                      className={STEP_CHECKBOX_CLASSES}
                      checked={project.completedSteps.includes(index)}
                      disabled={busy}
                      onChange={() => {
                        toggle(index);
                      }}
                    />
                    {stepLabel(step, index)}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </TabSection>
      )}
    </div>
  );
}

/**
 * La casilla se dibuja con el acento del sistema (`accent-color`), no con un
 * cuadrado propio: el control nativo ya es accesible, se marca con la barra
 * espaciadora y hereda el foco del navegador. Lo que se ajusta es el tamaño
 * —para que no quede diminuto al lado de un texto de párrafo— y su alineación
 * con la primera línea del paso, que puede ocupar varias.
 */
const STEP_CHECKBOX_CLASSES = [
  "mt-(--space-1) size-(--space-5) shrink-0",
  "accent-accent cursor-pointer",
  "focus-visible:outline focus-visible:outline-(length:--border-width-heavy)",
  "focus-visible:outline-(color:--focus) focus-visible:outline-offset-(--border-width)",
].join(" ");

/**
 * Silueta de la checklist mientras viaja el patrón. Va donde van a caer los
 * pasos para que no salte el maquetado, y `Skeleton` es `aria-hidden`: quien lo
 * anuncia es el texto de al lado, una sola vez.
 */
function StepsSkeleton() {
  return (
    <div className="flex flex-col gap-(--space-2)">
      {/* Lleva nombre propio (deuda 114): en el cajón ya vive la región de carga
          del detalle, y dos regiones anónimas vuelven ambiguo el selector con el
          que se espera a que termine una carga. */}
      <p role="status" aria-label={STEPS_SECTION_TITLE} className="sr-only">
        {STEPS_LOADING_MESSAGE}
      </p>
      {[0, 1, 2].map((slot) => (
        <Skeleton key={slot} className="w-full" />
      ))}
    </div>
  );
}
