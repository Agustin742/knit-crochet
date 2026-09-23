"use client";

import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button, Field, Input, Select, Skeleton } from "@/shared/ui";

export type InlineCreateOutcome = { ok: true } | { ok: false; message: string };

export interface ChooseOrCreateFieldProps {
  label: string;
  placeholder: string;
  options: readonly { id: string; name: string }[];
  value: string;
  onValueChange: (id: string) => void;
  status: "loading" | "failed" | "ready";
  onRetry: () => void;
  createTriggerLabel: string;
  createFieldLabel: string;
  onCreate: (name: string) => Promise<InlineCreateOutcome>;
  error?: string;
  disabled?: boolean;
  selectRef: RefObject<HTMLSelectElement | null>;
}

export function ChooseOrCreateField({
  label,
  placeholder,
  options,
  value,
  onValueChange,
  status,
  onRetry,
  createTriggerLabel,
  createFieldLabel,
  onCreate,
  error,
  disabled = false,
  selectRef,
}: ChooseOrCreateFieldProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [createError, setCreateError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  function closeInline() {
    requestSeq.current += 1;
    setOpen(false);
    setName("");
    setCreateError(undefined);
    setPending(false);
  }

  async function submitInline() {
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }

    const token = requestSeq.current + 1;
    requestSeq.current = token;
    setPending(true);
    setCreateError(undefined);

    const result = await onCreate(trimmed);
    if (requestSeq.current !== token) {
      return;
    }

    setPending(false);
    if (result.ok) {
      setOpen(false);
      setName("");
      return;
    }
    setCreateError(result.message);
  }

  function handleInlineKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void submitInline();
      return;
    }

    if (event.key === "Escape") {
      event.stopPropagation();
      closeInline();
    }
  }

  return (
    <div className="flex flex-col gap-(--space-3)">
      <div className="flex flex-col gap-(--space-3) sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          {status === "loading" ? (
            <div
              role="status"
              aria-label={label}
              className="flex flex-col gap-(--space-2)"
            >
              <span className="font-mono text-xs uppercase tracking-label text-fg">
                {label}
              </span>
              <Skeleton shape="block" className="h-(--touch-target) w-full" />
              <span className="sr-only">Cargando opciones de {label}</span>
            </div>
          ) : null}

          {status === "failed" ? (
            <div className="flex flex-col gap-(--space-2)">
              <span className="font-mono text-xs uppercase tracking-label text-fg">
                {label}
              </span>
              <p className="font-body text-sm leading-base text-danger">
                No se pudo cargar {label}.
              </p>
              <Button variant="secondary" onClick={onRetry} disabled={disabled}>
                Reintentar
              </Button>
            </div>
          ) : null}

          {status === "ready" ? (
            <Field label={label} error={error} className="min-w-0">
              <Select
                ref={selectRef}
                value={value}
                disabled={disabled}
                onChange={(event) => {
                  onValueChange(event.target.value);
                }}
              >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true);
            setCreateError(undefined);
          }}
          disabled={disabled}
        >
          {createTriggerLabel}
        </Button>
      </div>

      {open ? (
        <div className="rounded-md border-(length:--border-width) border-solid border-border bg-surface-sunken p-(--space-3)">
          <div className="flex flex-col gap-(--space-3) sm:flex-row sm:items-end">
            <Field
              label={createFieldLabel}
              error={createError}
              className="min-w-0 flex-1"
            >
              <Input
                ref={inputRef}
                value={name}
                disabled={pending || disabled}
                onChange={(event) => {
                  setName(event.target.value);
                }}
                onKeyDown={handleInlineKeyDown}
              />
            </Field>
            <div className="flex gap-(--space-2)">
              <Button
                variant="primary"
                type="button"
                loading={pending}
                disabled={disabled || pending || name.trim() === ""}
                onClick={() => {
                  void submitInline();
                }}
              >
                Crear
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={pending && !disabled}
                onClick={closeInline}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
