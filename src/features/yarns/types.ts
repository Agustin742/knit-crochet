import type {
  brands,
  RecommendedNeedle,
  yarns,
  yarnTypes,
} from "@/features/yarns/schema";
import type { ColorFamily } from "@/shared/config";

export type BrandRecord = typeof brands.$inferSelect;
export type NewBrandRecord = typeof brands.$inferInsert;
export type YarnTypeRecord = typeof yarnTypes.$inferSelect;
export type NewYarnTypeRecord = typeof yarnTypes.$inferInsert;
export type YarnRecord = typeof yarns.$inferSelect;
export type NewYarnRecord = typeof yarns.$inferInsert;

export type { RecommendedNeedle };

/** Lo único que el cliente envía para crear una marca. */
export type CreateBrandInput = { name: string };

/** Lo único que el cliente envía para crear un tipo (bajo una marca). */
export type CreateYarnTypeInput = { name: string };

/**
 * Campos que el cliente puede enviar al crear una lana. `usedQuantity`/`quantity`
 * los gestiona el usuario (enteros ≥ 0); enlazar a un proyecto NO toca stock.
 */
export type CreateYarnInput = {
  brandId: string;
  typeId: string;
  colorName: string;
  colorCode: string;
  colorFamily: ColorFamily;
  image?: string | null;
  quantity?: number;
  usedQuantity?: number;
  length: number;
  fiber: string;
  recommendedNeedle: RecommendedNeedle;
  thickness: number;
  lot: Date;
};

export type UpdateYarnInput = Partial<CreateYarnInput>;

/** Parche interno hacia la capa de datos. */
export type YarnPatch = UpdateYarnInput & { updatedAt?: Date };

export type YarnFilters = {
  brandId?: string;
  typeId?: string;
  colorFamily?: ColorFamily;
};
