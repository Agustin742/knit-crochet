import { z } from "zod";

import { CRAFT_TYPES } from "@/shared/config";

/** Un par clave-valor de `instructions`/`metadata`. La clave no puede ir vacía. */
const keyValueSchema = z.object({
  key: z.string().trim().min(1, "La clave es obligatoria.").max(200),
  value: z.string().max(5000),
});

const instructionsSchema = z.array(keyValueSchema).max(1000);
const metadataSchema = z.array(keyValueSchema).max(200);

export const createPatternSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  type: z.enum(CRAFT_TYPES, "El tipo debe ser knitting o crochet."),
  image: z.url("La imagen debe ser una URL válida.").nullable().optional(),
  instructions: instructionsSchema.optional(),
  metadata: metadataSchema.optional(),
  inLibrary: z.boolean("inLibrary debe ser un booleano.").optional(),
});

export const updatePatternSchema = createPatternSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No hay nada que actualizar.");

/** Un parámetro de query vacío (`?inLibrary=`) es "sin filtro", no un valor inválido. */
const booleanFlag = z
  .enum(["true", "false"], "El filtro debe ser true o false.")
  .transform((value) => value === "true");

export const patternFiltersSchema = z.object({
  type: z.enum(CRAFT_TYPES, "El tipo debe ser knitting o crochet.").optional(),
  inLibrary: booleanFlag.optional(),
});

export const patternIdSchema = z.uuid();

export type CreatePatternPayload = z.infer<typeof createPatternSchema>;
export type UpdatePatternPayload = z.infer<typeof updatePatternSchema>;
export type PatternFiltersQuery = z.infer<typeof patternFiltersSchema>;
