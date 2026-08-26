"use client";

import {
  type FormEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* Por RUTA INTERNA y no por el barrel `@/features/projects`, aunque
   `conventions.md` mande consumir otros features por su `index.ts`: ese barrel
   arrastra `./api` → el store → Drizzle, y esto es un componente de cliente, así
   que importarlo de ahí metería el ORM en el bundle del navegador. Es la misma
   excepción, y por el mismo motivo, que la de `NewProjectDialog.tsx`.
   `validation.ts` sólo importa zod y `shared/config`. */
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/features/projects/validation";
import {
  ACCEPTED_IMAGE_TYPES,
  uploadImageInputSchema,
} from "@/features/uploads/validation";
import { CRAFT_TYPES, type CraftType } from "@/shared/config";
import {
  Button,
  Dialog,
  Field,
  FileInput,
  Input,
  Select,
  Skeleton,
  Textarea,
} from "@/shared/ui";

import { ActionError } from "./DetailTabParts";
import { NeedlesField } from "./NeedlesField";
import { ProjectPhoto } from "./ProjectCard";
import { TARGET_ROUNDS_ERROR } from "./project-detail";
import { CRAFT_TYPE_LABELS, CRAFT_TYPE_ORDER } from "./project-filters";
import {
  CREATE_SUBMIT_LABEL,
  EDIT_SUBMIT_LABEL,
  FORM_CANCEL_LABEL,
  FORM_FIELD_LABELS,
  NO_PATTERN_OPTION_LABEL,
  PATTERNS_EMPTY,
  PATTERNS_LOADING,
  PATTERNS_STATUS_REGION_LABEL,
  PATTERNS_UNAVAILABLE,
  PHOTO_CHOOSE_LABEL,
  PHOTO_REMOVE_LABEL,
  PHOTO_STATUS_REGION_LABEL,
  PHOTO_UPLOADING,
  type ProjectFormFields,
  createFormTitle,
  editFormTitle,
  emptyFields,
  fieldsOf,
  parseTargetRounds,
  patternOptionLabel,
  projectPatch,
} from "./project-form";
import {
  createProject,
  getPatterns,
  updateProject,
  uploadProjectImage,
} from "./projects-client";
import type { SerializedPattern, SerializedProject } from "./types";

/**
 * Qué está haciendo el modal. **El padre guarda el id, no el objeto** (mismo
 * criterio que el cajón de #21): el proyecto se resuelve contra la lista en cada
 * render, así que una recarga por debajo no deja al formulario editando una foto
 * vieja.
 */
export type ProjectFormTarget =
  | { mode: "create"; type: CraftType }
  | { mode: "edit"; project: SerializedProject };

export interface ProjectFormDialogProps {
  /** `null` = no hay nada abierto. **El hijo no tiene estado `open`.** */
  target: ProjectFormTarget | null;
  onClose: () => void;
  /** Se llama con el proyecto que devolvió el servidor tras guardar. */
  onSaved: (project: SerializedProject) => void;
}

/**
 * El modal de **crear y editar** un proyecto (RFC-03 §1 y §2, enmienda **E6**).
 *
 * **Ciclo de vida copiado del cajón de #21:** el hijo **no tiene estado `open`**
 * y devuelve `null` sin objetivo, el padre guarda **el id y no el objeto**, y el
 * estado pendiente **se deriva** en vez de guardarse como booleano.
 *
 * **El formulario se remonta con cada apertura** (la `key` de abajo). Es lo que
 * hace que abrir "editar" sobre otro proyecto arranque con SUS datos sin que
 * nadie tenga que sincronizar el estado con las props — que es el sitio donde un
 * formulario se queda con lo que el usuario escribió en el anterior.
 */
export function ProjectFormDialog({
  target,
  onClose,
  onSaved,
}: ProjectFormDialogProps) {
  if (target === null) {
    return null;
  }

  const key =
    target.mode === "create"
      ? `create|${target.type}`
      : `edit|${target.project.id}`;

  return (
    <ProjectForm key={key} target={target} onClose={onClose} onSaved={onSaved} />
  );
}

/** Lo que llegó de la biblioteca de patrones, o por qué no llegó. */
type PatternLibrary =
  | { status: "loading" }
  | { status: "ready"; patterns: SerializedPattern[] }
  | { status: "error" };

/** Los campos que pueden quedar marcados como inválidos, **en orden de pantalla**. */
const FOCUS_ORDER = [
  "name",
  "type",
  "targetRounds",
  "image",
  "needles",
  "patternId",
  "notes",
] as const;

type FormFieldName = (typeof FOCUS_ORDER)[number];

function ProjectForm({
  target,
  onClose,
  onSaved,
}: ProjectFormDialogProps & { target: ProjectFormTarget }) {
  const editing = target.mode === "edit";
  const before = editing ? fieldsOf(target.project) : emptyFields(target.type);

  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const targetRoundsRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const patternRef = useRef<HTMLSelectElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState(before.name);
  const [type, setType] = useState<CraftType>(before.type);
  /* La meta viaja como TEXTO en el estado y se convierte al enviar: un
     `<input>` devuelve cadenas, y guardar un número obligaría a decidir qué es
     el campo vacío en cada tecla en vez de una sola vez, al validar. */
  const [targetRoundsText, setTargetRoundsText] = useState(
    before.targetRounds === 0 ? "" : String(before.targetRounds),
  );
  const [needles, setNeedles] = useState<number[]>(before.needles);
  const [notes, setNotes] = useState(before.notes);
  const [image, setImage] = useState<string | null>(before.image);
  const [patternId, setPatternId] = useState<string | null>(before.patternId);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FormFieldName, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [library, setLibrary] = useState<PatternLibrary>({ status: "loading" });

  /* La biblioteca se pide UNA vez al abrir, y sólo los de biblioteca: elegir un
     patrón entra en el alcance y crear un embebido no (E6 a). */
  useEffect(() => {
    let cancelled = false;

    void getPatterns({ inLibrary: true }).then((result) => {
      if (cancelled) {
        return;
      }
      setLibrary(
        result.ok
          ? { status: "ready", patterns: result.data }
          : { status: "error" },
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * A qué campo hay que llevar el foco **cuando React termine de pintar**.
   *
   * No es una vuelta de más: el selector de archivo está **desactivado mientras
   * la foto sube**, y las actualizaciones de estado que siguen a un `await` se
   * agrupan, así que llamar a `focus()` justo después de reactivarlo apunta a un
   * elemento que en el DOM **sigue desactivado** — y un `focus()` sobre un
   * control desactivado no hace nada y no avisa. Medido: el foco se quedaba en
   * el cuerpo del documento tras un error de subida.
   *
   * **El campo pendiente vive en una referencia y lo que dispara el efecto es un
   * contador.** En estado obligaba a limpiarlo desde dentro del propio efecto, y
   * eso es un `setState` en el cuerpo de un efecto: una ronda de render
   * encadenada que la regla de React (`set-state-in-effect`) rechaza. Con la
   * referencia el efecto **consume** la petición sin volver a renderizar. El
   * contador es número y no booleano por lo mismo que los otros dos de esta
   * feature: dos peticiones seguidas al mismo campo tienen que llevar el foco
   * dos veces.
   */
  const pendingFocusRef = useRef<FormFieldName | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  function requestFocus(field: FormFieldName) {
    pendingFocusRef.current = field;
    setFocusTick((tick) => tick + 1);
  }

  const focusField = useCallback((field: FormFieldName) => {
    const refs: Record<FormFieldName, RefObject<HTMLElement | null>> = {
      name: nameRef,
      type: typeRef,
      targetRounds: targetRoundsRef,
      image: imageRef,
      needles: imageRef,
      patternId: patternRef,
      notes: notesRef,
    };
    refs[field].current?.focus();
  }, []);

  useEffect(() => {
    const field = pendingFocusRef.current;
    if (field === null) {
      return;
    }
    pendingFocusRef.current = null;
    focusField(field);
  }, [focusTick, focusField]);

  /**
   * Marca los campos inválidos y **lleva el foco al primero en orden de
   * pantalla** (deuda 38): el mensaje de `Field` no es región viva, así que sin
   * mover el foco un lector de pantalla no se entera de nada. El orden es el de
   * la pantalla y no el que devuelva zod, para que el salto no vaya hacia atrás.
   */
  function reportIssues(issues: readonly { path: PropertyKey[]; message: string }[]) {
    const next: Partial<Record<FormFieldName, string>> = {};
    for (const issue of issues) {
      const field = issue.path[0];
      if (typeof field === "string" && isFormField(field)) {
        next[field] ??= issue.message;
      }
    }
    setFieldErrors(next);

    const first = FOCUS_ORDER.find((field) => next[field] !== undefined);
    if (first !== undefined) {
      requestFocus(first);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const targetRounds = parseTargetRounds(targetRoundsText);
    if (targetRounds === null) {
      setFieldErrors({ targetRounds: TARGET_ROUNDS_ERROR });
      requestFocus("targetRounds");
      return;
    }

    const after: ProjectFormFields = {
      name: name.trim(),
      type,
      targetRounds,
      needles,
      notes,
      image,
      /* Si la biblioteca no llegó, el campo no se pintó y `patternId` se queda
         como estaba: editar un proyecto con patrón **no puede perderlo** porque
         el desplegable no se haya podido cargar. */
      patternId,
    };

    if (!editing) {
      const parsed = createProjectSchema.safeParse(after);
      if (!parsed.success) {
        reportIssues(parsed.error.issues);
        return;
      }
      setFieldErrors({});
      setPending(true);
      const result = await createProject(parsed.data);
      if (!result.ok) {
        setPending(false);
        setFormError(result.message);
        return;
      }
      onSaved(result.data);
      return;
    }

    const patch = projectPatch(before, after);
    /* Un parche vacío responde 400 ("No hay nada que actualizar."), así que
       guardar sin tocar nada se cierra sin salir a la red. */
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    const parsed = updateProjectSchema.safeParse(patch);
    if (!parsed.success) {
      reportIssues(parsed.error.issues);
      return;
    }
    setFieldErrors({});
    setPending(true);
    const result = await updateProject(target.project.id, parsed.data);
    if (!result.ok) {
      setPending(false);
      setFormError(result.message);
      return;
    }
    onSaved(result.data);
  }

  /**
   * La foto se sube **al elegirla**, no al guardar (enmienda E6 h).
   *
   * Dos motivos, los dos concretos: el endpoint falla de tres maneras que el
   * usuario tiene que ver —formato o peso (400), sesión caducada (401) y
   * proveedor caído (502)—, y descubrirlas al final tira el formulario entero;
   * y subir primero deja el envío como **una sola petición**, en vez de dos
   * encadenadas con su fallo a mitad.
   *
   * El archivo se valida antes con el **mismo esquema del endpoint**, así que lo
   * que no puede pasar no consume red: subir cuatro megas para que te digan que
   * no es un viaje regalado, y menos con datos móviles.
   */
  async function handleFile(file: File | null) {
    if (file === null) {
      return;
    }
    setFileName(file.name);

    const checked = uploadImageInputSchema.safeParse({ file });
    if (!checked.success) {
      setFieldErrors((current) => ({
        ...current,
        image: checked.error.issues[0]?.message,
      }));
      requestFocus("image");
      return;
    }

    setFieldErrors((current) => ({ ...current, image: undefined }));
    setUploading(true);
    const result = await uploadProjectImage(file);
    setUploading(false);

    if (!result.ok) {
      setFieldErrors((current) => ({ ...current, image: result.message }));
      requestFocus("image");
      return;
    }
    setImage(result.data);
  }

  const busy = pending || uploading;
  const submitLabel = editing ? EDIT_SUBMIT_LABEL : CREATE_SUBMIT_LABEL;

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? editFormTitle(target.project.name) : createFormTitle(type)}
      initialFocusRef={nameRef}
    >
      {/* `method="post"` aunque el envío lo maneje JavaScript: un formulario sin
          método declarado se envía por GET a la URL actual y filtraría en la
          barra de direcciones lo que lleve nombre (deudas 39 y 43). */}
      <form
        noValidate
        method="post"
        onSubmit={handleSubmit}
        className="flex flex-col gap-(--space-5)"
      >
        <ActionError message={formError} />

        <Field label={FORM_FIELD_LABELS.name} error={fieldErrors.name}>
          <Input
            ref={nameRef}
            name="name"
            autoComplete="off"
            value={name}
            disabled={pending}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </Field>

        <Field label={FORM_FIELD_LABELS.type} error={fieldErrors.type}>
          <Select
            ref={typeRef}
            name="type"
            value={type}
            disabled={pending}
            onChange={(event) => {
              setType(toCraftType(event.target.value, type));
            }}
          >
            {CRAFT_TYPE_ORDER.map((candidate) => (
              <option key={candidate} value={candidate}>
                {CRAFT_TYPE_LABELS[candidate]}
              </option>
            ))}
          </Select>
        </Field>

        {/* La foto: primero lo que se va a ver —el mismo marco que la tarjeta—
            y debajo el control que lo cambia. Reusar `ProjectPhoto` es lo que
            garantiza que la foto elegida se vea en el formulario **igual** que
            va a verse en la lista, en vez de dos encuadres distintos. */}
        <div className="flex flex-col gap-(--space-3)">
          <ProjectPhoto name={name} image={image} type={type} size="detail" />

          <Field label={FORM_FIELD_LABELS.image} error={fieldErrors.image}>
            <FileInput
              ref={imageRef}
              name="image"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              buttonLabel={PHOTO_CHOOSE_LABEL}
              fileName={fileName}
              disabled={busy}
              onFileChange={(file) => void handleFile(file)}
            />
          </Field>

          {/* Región viva de la subida, con nombre propio (deuda 114). Vacía se
              repliega a "sólo para lector de pantalla" en vez de reservar un
              hueco, y sin salir del árbol accesible. */}
          <p
            role="status"
            aria-label={PHOTO_STATUS_REGION_LABEL}
            className={PHOTO_STATUS_CLASSES}
          >
            {uploading ? PHOTO_UPLOADING : ""}
          </p>

          {image === null ? null : (
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              disabled={busy}
              onClick={() => {
                setImage(null);
                setFileName(null);
              }}
            >
              {PHOTO_REMOVE_LABEL}
            </Button>
          )}
        </div>

        <Field
          label={FORM_FIELD_LABELS.targetRounds}
          error={fieldErrors.targetRounds}
        >
          <Input
            ref={targetRoundsRef}
            name="targetRounds"
            inputMode="numeric"
            autoComplete="off"
            value={targetRoundsText}
            disabled={pending}
            onChange={(event) => {
              setTargetRoundsText(event.target.value);
            }}
          />
        </Field>

        <NeedlesField
          needles={needles}
          onNeedlesChange={setNeedles}
          disabled={pending}
        />

        <PatternPicker
          library={library}
          patternId={patternId}
          onPatternChange={setPatternId}
          disabled={pending}
          selectRef={patternRef}
        />

        <Field label={FORM_FIELD_LABELS.notes} error={fieldErrors.notes}>
          <Textarea
            ref={notesRef}
            name="notes"
            value={notes}
            disabled={pending}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
          />
        </Field>

        {/* La jerarquía de la pantalla: guardar es lo primario y va a la
            derecha, con el acento; salir es la alternativa y va en la piel
            secundaria. Nada más compite con ellos en peso. */}
        <div className="flex flex-wrap justify-end gap-(--space-3)">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            {FORM_CANCEL_LABEL}
          </Button>
          <Button type="submit" variant="primary" loading={pending} disabled={uploading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * El desplegable de patrones (E6 a: **sólo elegir**, crear embebido queda para
 * RFC-05).
 *
 * Los tres estados se distinguen porque **no dicen lo mismo**: mientras viaja la
 * petición hay una silueta y una región viva; una biblioteca **vacía** invita a
 * escribir el primero; y una biblioteca que **no se pudo traer** dice justo eso
 * — decirle "no tenés patrones" a quien tiene veinte es la mentira que corrigió
 * la enmienda E2(e).
 */
function PatternPicker({
  library,
  patternId,
  onPatternChange,
  disabled,
  selectRef,
}: {
  library: PatternLibrary;
  patternId: string | null;
  onPatternChange: (patternId: string | null) => void;
  disabled: boolean;
  selectRef: RefObject<HTMLSelectElement | null>;
}) {
  if (library.status === "loading") {
    return (
      <div className="flex flex-col gap-(--space-2)">
        <p
          role="status"
          aria-label={PATTERNS_STATUS_REGION_LABEL}
          className="sr-only"
        >
          {PATTERNS_LOADING}
        </p>
        <Skeleton className="w-full" />
      </div>
    );
  }

  if (library.status === "error") {
    return <p className={PATTERN_NOTE_CLASSES}>{PATTERNS_UNAVAILABLE}</p>;
  }

  if (library.patterns.length === 0) {
    return <p className={PATTERN_NOTE_CLASSES}>{PATTERNS_EMPTY}</p>;
  }

  return (
    <Field label={FORM_FIELD_LABELS.pattern}>
      <Select
        ref={selectRef}
        name="patternId"
        value={patternId ?? ""}
        disabled={disabled}
        onChange={(event) => {
          onPatternChange(event.target.value === "" ? null : event.target.value);
        }}
      >
        <option value="">{NO_PATTERN_OPTION_LABEL}</option>
        {library.patterns.map((pattern) => (
          <option key={pattern.id} value={pattern.id}>
            {patternOptionLabel(pattern)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function isFormField(value: string): value is FormFieldName {
  return (FOCUS_ORDER as readonly string[]).includes(value);
}

/** El valor de un `<select>` es una cadena; el repliegue es no cambiar nada. */
function toCraftType(value: string, fallback: CraftType): CraftType {
  return (CRAFT_TYPES as readonly string[]).includes(value)
    ? (value as CraftType)
    : fallback;
}

/**
 * Mismo tratamiento que el aviso del quick-start: **vacía se repliega a "sólo
 * para lector de pantalla"** —la variante de vacío gana en especificidad— así
 * que la región sigue montada y registrada antes de que llegue el texto, pero no
 * ocupa sitio. Y cuando hay algo que decir **se ve**, no sólo se anuncia.
 */
const PHOTO_STATUS_CLASSES = [
  "empty:sr-only m-0 self-start",
  "font-mono text-sm leading-base text-fg",
].join(" ");

const PATTERN_NOTE_CLASSES = "m-0 font-body text-base leading-base text-fg-muted";
