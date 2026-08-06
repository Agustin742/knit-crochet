import { z } from "zod";

import { CRAFT_TYPES, PROJECT_STATUSES } from "@/shared/config";

const nonNegativeInt = z.number().int().min(0);

const needlesSchema = z
  .array(z.number().positive("Las agujas se miden en mm (> 0)."))
  .max(20);

const stepsSchema = z.array(nonNegativeInt).max(1000);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
  type: z.enum(CRAFT_TYPES, "El tipo debe ser knitting o crochet."),
  image: z.url("La imagen debe ser una URL válida.").nullable().optional(),
  status: z.enum(PROJECT_STATUSES, "El estado no es válido.").optional(),
  rounds: nonNegativeInt.optional(),
  targetRounds: nonNegativeInt.optional(),
  needles: needlesSchema.optional(),
  startDate: z.coerce.date("La fecha de inicio no es válida.").optional(),
  endDate: z.coerce.date("La fecha de fin no es válida.").nullable().optional(),
  patternId: z.uuid("El patrón no es válido.").nullable().optional(),
  completedSteps: stepsSchema.optional(),
  notes: z.string().max(5000).optional(),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "No hay nada que actualizar.",
  );

const booleanFlag = z
  .enum(["true", "false"], "El filtro activo debe ser true o false.")
  .transform((value) => value === "true");

export const projectFiltersSchema = z.object({
  active: booleanFlag.optional(),
  type: z.enum(CRAFT_TYPES, "El tipo debe ser knitting o crochet.").optional(),
  needle: z.coerce
    .number("La aguja debe ser un número en mm.")
    .positive("La aguja debe ser un número en mm.")
    .optional(),
  yarnId: z.uuid("La lana no es válida.").optional(),
  patternId: z.uuid("El patrón no es válido.").optional(),
  from: z.coerce.date("La fecha 'from' no es válida.").optional(),
  to: z.coerce.date("La fecha 'to' no es válida.").optional(),
});

/** `delta` puede ser negativo; el servicio impide que `rounds` baje de 0. */
export const roundsDeltaSchema = z.object({
  delta: z
    .number("El delta debe ser un número entero.")
    .int("El delta debe ser un número entero."),
});

export const completedStepsSchema = z.object({
  completedSteps: stepsSchema,
});

export const linkYarnSchema = z.object({
  yarnId: z.uuid("La lana no es válida."),
});

export const projectIdSchema = z.uuid();
export const yarnIdSchema = z.uuid();

export type CreateProjectPayload = z.infer<typeof createProjectSchema>;
export type UpdateProjectPayload = z.infer<typeof updateProjectSchema>;
export type ProjectFiltersQuery = z.infer<typeof projectFiltersSchema>;
export type RoundsDeltaPayload = z.infer<typeof roundsDeltaSchema>;
export type CompletedStepsPayload = z.infer<typeof completedStepsSchema>;
export type LinkYarnPayload = z.infer<typeof linkYarnSchema>;
