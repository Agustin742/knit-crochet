import { z } from "zod";

import { COLOR_FAMILIES } from "@/shared/config";

const nonNegativeInt = z.number().int().min(0);
const nameSchema = z.string().trim().min(1, "El nombre es obligatorio.").max(200);

export const createBrandSchema = z.object({
  name: nameSchema,
});

export const createYarnTypeSchema = z.object({
  name: nameSchema,
});

const recommendedNeedleSchema = z
  .object({
    min: z.number().positive("La aguja se mide en mm (> 0)."),
    max: z.number().positive("La aguja se mide en mm (> 0)."),
  })
  .refine((value) => value.max >= value.min, "El máximo debe ser >= al mínimo.");

export const createYarnSchema = z.object({
  brandId: z.uuid("La marca no es válida."),
  typeId: z.uuid("El tipo no es válido."),
  colorName: z.string().trim().min(1, "El color es obligatorio.").max(200),
  colorCode: z
    .string()
    .trim()
    .min(1, "El código de color es obligatorio.")
    .max(100),
  colorFamily: z.enum(COLOR_FAMILIES, "La familia de color no es válida."),
  image: z.url("La imagen debe ser una URL válida.").nullable().optional(),
  quantity: nonNegativeInt.optional(),
  usedQuantity: nonNegativeInt.optional(),
  length: z.number().positive("El largo debe ser un número en metros (> 0)."),
  fiber: z.string().trim().min(1, "La fibra es obligatoria.").max(200),
  recommendedNeedle: recommendedNeedleSchema,
  thickness: z.number().positive("El grosor debe ser un número (> 0)."),
  lot: z.coerce.date("La fecha de lote no es válida."),
});

export const updateYarnSchema = createYarnSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "No hay nada que actualizar.");

export const yarnFiltersSchema = z.object({
  brandId: z.uuid("La marca no es válida.").optional(),
  typeId: z.uuid("El tipo no es válido.").optional(),
  colorFamily: z
    .enum(COLOR_FAMILIES, "La familia de color no es válida.")
    .optional(),
});

/** `?force=` opcional: solo `true` fuerza el borrado de una lana referenciada. */
export const forceFlagSchema = z.object({
  force: z
    .enum(["true", "false"], "El parámetro force debe ser true o false.")
    .transform((value) => value === "true")
    .optional(),
});

export const brandIdSchema = z.uuid();
export const yarnTypeIdSchema = z.uuid();
export const yarnIdSchema = z.uuid();

export type CreateBrandPayload = z.infer<typeof createBrandSchema>;
export type CreateYarnTypePayload = z.infer<typeof createYarnTypeSchema>;
export type CreateYarnPayload = z.infer<typeof createYarnSchema>;
export type UpdateYarnPayload = z.infer<typeof updateYarnSchema>;
export type YarnFiltersQuery = z.infer<typeof yarnFiltersSchema>;
export type ForceFlagQuery = z.infer<typeof forceFlagSchema>;
