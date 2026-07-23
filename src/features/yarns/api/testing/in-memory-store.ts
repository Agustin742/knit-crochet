import {
  createInMemoryProjectStore,
  type InMemoryProjectStore,
} from "@/features/projects/api/testing/in-memory-store";
import type { ProjectYarnRecord } from "@/features/projects/types";
import { DuplicateColorCodeError } from "@/features/yarns/api/errors";
import type { YarnStore } from "@/features/yarns/api/store";
import type {
  BrandRecord,
  NewBrandRecord,
  NewYarnRecord,
  NewYarnTypeRecord,
  YarnFilters,
  YarnPatch,
  YarnRecord,
  YarnTypeRecord,
} from "@/features/yarns/types";

export type InMemoryYarnStore = YarnStore & {
  /** Doble de projects compartido: `projectYarns` es literalmente su `links`. */
  projects: InMemoryProjectStore;
  brands: BrandRecord[];
  types: YarnTypeRecord[];
  yarns: YarnRecord[];
  /** Enlaces N:N; el MISMO array que `projects.links` (borrado con force honesto). */
  projectYarns: ProjectYarnRecord[];
  /** Últimos filtros recibidos por `listYarns` (para verificar el parseo del query). */
  lastFilters: YarnFilters | undefined;
  reset(): void;
};

function toYarnRecord(input: NewYarnRecord): YarnRecord {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    image: input.image ?? null,
    brandId: input.brandId,
    typeId: input.typeId,
    colorName: input.colorName,
    colorCode: input.colorCode,
    colorFamily: input.colorFamily,
    quantity: input.quantity ?? 0,
    usedQuantity: input.usedQuantity ?? 0,
    length: input.length,
    fiber: input.fiber,
    recommendedNeedle: input.recommendedNeedle,
    thickness: input.thickness,
    lot: input.lot,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Borra in place las filas que cumplen el predicado (muta el array original en
 * vez de reemplazarlo) porque `projectYarns` es la misma referencia que
 * `projects.links`: reasignarla desincronizaría los dos dobles.
 */
function spliceMatching<T>(items: T[], matches: (item: T) => boolean): void {
  const remaining = items.filter((item) => !matches(item));
  items.splice(0, items.length, ...remaining);
}

/**
 * Doble en memoria de `YarnStore`. Comparte estado con el doble de projects
 * (los enlaces `project_yarns`) para que el borrado seguro con `?force=true` se
 * verifique de punta a punta sin DB real. Simula el índice único
 * `(brandId, colorCode)` para no depender de Postgres.
 */
export function createInMemoryYarnStore(
  projects: InMemoryProjectStore = createInMemoryProjectStore(),
): InMemoryYarnStore {
  const brands: BrandRecord[] = [];
  const types: YarnTypeRecord[] = [];
  const yarns: YarnRecord[] = [];
  const projectYarns = projects.links;

  const store: InMemoryYarnStore = {
    projects,
    brands,
    types,
    yarns,
    projectYarns,
    lastFilters: undefined,
    reset() {
      projects.reset();
      brands.length = 0;
      types.length = 0;
      yarns.length = 0;
      store.lastFilters = undefined;
    },

    async listBrands(userId) {
      return brands
        .filter((brand) => brand.userId === userId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async findBrand(userId, brandId) {
      return brands.find(
        (brand) => brand.userId === userId && brand.id === brandId,
      );
    },

    async createBrand(input: NewBrandRecord) {
      const created: BrandRecord = {
        id: crypto.randomUUID(),
        userId: input.userId,
        name: input.name,
      };
      brands.push(created);
      return created;
    },

    async listYarnTypes(userId, brandId) {
      const brand = brands.find(
        (row) => row.userId === userId && row.id === brandId,
      );
      if (!brand) {
        return [];
      }
      return types
        .filter((type) => type.brandId === brandId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async findYarnType(userId, brandId, typeId) {
      const brand = brands.find(
        (row) => row.userId === userId && row.id === brandId,
      );
      if (!brand) {
        return undefined;
      }
      return types.find(
        (type) => type.id === typeId && type.brandId === brandId,
      );
    },

    async createYarnType(input: NewYarnTypeRecord) {
      const created: YarnTypeRecord = {
        id: crypto.randomUUID(),
        brandId: input.brandId,
        name: input.name,
      };
      types.push(created);
      return created;
    },

    async countBrandTypes(brandId) {
      return types.filter((type) => type.brandId === brandId).length;
    },

    async countBrandYarns(userId, brandId) {
      return yarns.filter(
        (yarn) => yarn.userId === userId && yarn.brandId === brandId,
      ).length;
    },

    async removeBrand(userId, brandId) {
      const index = brands.findIndex(
        (brand) => brand.userId === userId && brand.id === brandId,
      );
      if (index === -1) {
        return false;
      }
      brands.splice(index, 1);
      return true;
    },

    async countTypeYarns(userId, typeId) {
      return yarns.filter(
        (yarn) => yarn.userId === userId && yarn.typeId === typeId,
      ).length;
    },

    async removeYarnType(brandId, typeId) {
      const index = types.findIndex(
        (type) => type.brandId === brandId && type.id === typeId,
      );
      if (index === -1) {
        return false;
      }
      types.splice(index, 1);
      return true;
    },

    async listYarns(userId, filters) {
      store.lastFilters = filters;
      return yarns
        .filter((yarn) => yarn.userId === userId)
        .filter((yarn) => {
          if (filters.brandId !== undefined && yarn.brandId !== filters.brandId) {
            return false;
          }
          if (filters.typeId !== undefined && yarn.typeId !== filters.typeId) {
            return false;
          }
          if (
            filters.colorFamily !== undefined &&
            yarn.colorFamily !== filters.colorFamily
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async findYarn(userId, id) {
      return yarns.find((yarn) => yarn.userId === userId && yarn.id === id);
    },

    async createYarn(input) {
      if (
        yarns.some(
          (yarn) =>
            yarn.brandId === input.brandId && yarn.colorCode === input.colorCode,
        )
      ) {
        throw new DuplicateColorCodeError();
      }
      const created = toYarnRecord(input);
      yarns.push(created);
      return created;
    },

    async updateYarn(userId, id, patch: YarnPatch) {
      const index = yarns.findIndex(
        (yarn) => yarn.userId === userId && yarn.id === id,
      );
      const existing = yarns[index];
      if (!existing) {
        return undefined;
      }
      const defined = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      );
      const merged = { ...existing, ...defined } as YarnRecord;
      if (
        yarns.some(
          (yarn) =>
            yarn.id !== id &&
            yarn.brandId === merged.brandId &&
            yarn.colorCode === merged.colorCode,
        )
      ) {
        throw new DuplicateColorCodeError();
      }
      yarns[index] = merged;
      return merged;
    },

    async removeYarn(userId, id) {
      const index = yarns.findIndex(
        (yarn) => yarn.userId === userId && yarn.id === id,
      );
      if (index === -1) {
        return false;
      }
      yarns.splice(index, 1);
      return true;
    },

    async countProjectReferences(yarnId) {
      return projectYarns.filter((link) => link.yarnId === yarnId).length;
    },

    async removeProjectReferences(yarnId) {
      spliceMatching(projectYarns, (link) => link.yarnId === yarnId);
    },
  };

  return store;
}
