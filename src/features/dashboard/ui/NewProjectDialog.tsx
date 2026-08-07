"use client";

import { type FormEvent, useRef, useState } from "react";

/* Por RUTA INTERNA y no por el barrel `@/features/projects`, aunque
   `conventions.md` mande consumir otros features por su `index.ts`: ese barrel
   arrastra `./api` → el store → Drizzle, y esto es un componente de cliente, así
   que importarlo de ahí metería el ORM en el bundle del navegador. Es la misma
   excepción, y por el mismo motivo, que la nota de `progress/current.md` sobre
   no importar del barrel de `auth` en cliente. `validation.ts` sólo importa zod
   y `shared/config`, así que por esta puerta no entra nada del servidor. */
import { createProjectSchema } from "@/features/projects/validation";
import type { CraftType } from "@/shared/config";
import { Button, Dialog, Field, Input } from "@/shared/ui";

import { CRAFT_TYPE_LABELS } from "./filters";
import { createProject } from "./dashboard-client";

export const NEW_PROJECT_NAME_LABEL = "Nombre del proyecto";
export const NEW_PROJECT_SUBMIT_LABEL = "Crear proyecto";

export function newProjectDialogTitle(type: CraftType): string {
  return `Nuevo proyecto de ${CRAFT_TYPE_LABELS[type].toLowerCase()}`;
}

export interface NewProjectDialogProps {
  /** Craft ya elegido por el botón que abrió el modal. */
  type: CraftType;
  onClose: () => void;
  /** Se llama tras un alta confirmada por el servidor, para recargar. */
  onCreated: () => void;
}

/**
 * Creación rápida desde el Dashboard (RFC-02 §1 y §6). **No es el formulario de
 * proyecto**: ése es de #22, con foto, patrón, agujas y vueltas objetivo. Aquí
 * sólo se piden los dos campos que el schema exige —nombre y tipo—, y el tipo ya
 * viene decidido por el botón que abrió el modal, así que no se vuelve a
 * preguntar.
 *
 * Se monta sólo cuando hay un tipo elegido: el `Dialog` desmonta su contenido al
 * cerrarse, así que cada apertura arranca con el formulario limpio, y al
 * desmontarse devuelve el foco al botón que lo abrió.
 *
 * La validación usa el **mismo schema que el endpoint** en vez de una regla
 * paralela: así el mensaje que ve el usuario antes de enviar es exactamente el
 * que devolvería el servidor.
 */
export function NewProjectDialog({
  type,
  onClose,
  onCreated,
}: NewProjectDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = createProjectSchema.safeParse({ name, type });
    if (!parsed.success) {
      const issue = parsed.error.issues.find(
        (candidate) => candidate.path[0] === "name",
      );
      setNameError(issue?.message ?? null);
      // El mensaje de `Field` no es región viva: sin mover el foco, un lector de
      // pantalla no se entera de nada (deuda 38).
      nameRef.current?.focus();
      return;
    }

    setNameError(null);
    setPending(true);
    const result = await createProject({ name: parsed.data.name, type });

    if (!result.ok) {
      setPending(false);
      setFormError(result.message);
      return;
    }

    onCreated();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={newProjectDialogTitle(type)}
      description="Le podés poner el resto de los datos más adelante."
      initialFocusRef={nameRef}
    >
      {/* `method="post"` aunque el envío lo maneje JavaScript: un formulario sin
          método declarado se envía por GET a la URL actual y filtraría en la
          barra de direcciones lo que lleve nombre (deudas 39 y 43). */}
      <form
        noValidate
        method="post"
        onSubmit={handleSubmit}
        className="flex flex-col gap-(--space-4)"
      >
        {formError === null ? null : (
          <p
            role="alert"
            className="font-body text-sm leading-base text-danger"
          >
            {formError}
          </p>
        )}

        <Field label={NEW_PROJECT_NAME_LABEL} error={nameError ?? undefined}>
          <Input
            ref={nameRef}
            name="name"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" loading={pending}>
          {NEW_PROJECT_SUBMIT_LABEL}
        </Button>
      </form>
    </Dialog>
  );
}
