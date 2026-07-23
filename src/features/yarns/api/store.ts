import { and, asc, count, desc, eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

// `project_yarns` vive en la feature projects, pero el borrado seguro de una
// lana necesita contar/borrar sus enlaces (la FK `project_yarns → yarns` es
// `no action` a propósito: exige 409 + `?force=true`, PRD §4.5). Se importa la
// tabla por su `schema.ts` directo (regla S1: nunca el barrel, arrastraría
// `./api` → ciclo); S1 restringe la capa de schema, no el store.
import { projectYarns } from "@/features/projects/schema";
import { DuplicateColorCodeError } from "@/features/yarns/api/errors";
import { brands, yarns, yarnTypes } from "@/features/yarns/schema";
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
import { db } from "@/shared/db";

/**
 * Único punto de acceso a las tablas de lanas y sus catálogos. Los servicios
 * dependen de esta interfaz (no de Drizzle) para poder testearse con un doble
 * en memoria. Toda operación scopeada recibe el `userId` de la sesión y lo
 * aplica en el WHERE: nunca se consulta un recurso sin scoping.
 */
export type YarnStore = {
  // Marcas.
  listBrands(userId: string): Promise<BrandRecord[]>;
  findBrand(userId: string, brandId: string): Promise<BrandRecord | undefined>;
  createBrand(input: NewBrandRecord): Promise<BrandRecord>;

  // Tipos (jerárquicos bajo una marca).
  listYarnTypes(userId: string, brandId: string): Promise<YarnTypeRecord[]>;
  /** El tipo existe, pertenece a `brandId` y la marca es del usuario. */
  findYarnType(
    userId: string,
    brandId: string,
    typeId: string,
  ): Promise<YarnTypeRecord | undefined>;
  createYarnType(input: NewYarnTypeRecord): Promise<YarnTypeRecord>;

  // Borrado bloqueante de catálogos: se cuentan los hijos ANTES de borrar
  // porque las FKs son `no action` (si se borrara con hijos, Postgres daría
  // 500). No hay cascada ni `?force`: 409 y el usuario vacía primero.
  /** Nº de tipos colgados de la marca (`yarn_types.brandId`). */
  countBrandTypes(brandId: string): Promise<number>;
  /** Nº de lanas del usuario con esa marca (`yarns.brandId`). */
  countBrandYarns(userId: string, brandId: string): Promise<number>;
  removeBrand(userId: string, brandId: string): Promise<boolean>;
  /** Nº de lanas del usuario con ese tipo (`yarns.typeId`). */
  countTypeYarns(userId: string, typeId: string): Promise<number>;
  removeYarnType(brandId: string, typeId: string): Promise<boolean>;

  // Lanas.
  listYarns(userId: string, filters: YarnFilters): Promise<YarnRecord[]>;
  findYarn(userId: string, id: string): Promise<YarnRecord | undefined>;
  /** Traduce la violación de `(brandId, colorCode)` a `DuplicateColorCodeError`. */
  createYarn(input: NewYarnRecord): Promise<YarnRecord>;
  updateYarn(
    userId: string,
    id: string,
    patch: YarnPatch,
  ): Promise<YarnRecord | undefined>;
  removeYarn(userId: string, id: string): Promise<boolean>;

  // Borrado seguro: enlaces N:N de una lana (viven en `project_yarns`).
  countProjectReferences(yarnId: string): Promise<number>;
  removeProjectReferences(yarnId: string): Promise<void>;
};

/** Código SQLSTATE de Postgres para violación de unicidad. */
const UNIQUE_VIOLATION = "23505";
const COLOR_CODE_CONSTRAINT = "yarns_brand_color_code_unique";

/** Profundidad máxima de la cadena `.cause` que se inspecciona (evita ciclos). */
const MAX_CAUSE_DEPTH = 5;

/** ¿Este nivel del error (sin mirar `.cause`) es la violación buscada? */
function matchesDuplicateColorCode(error: object): boolean {
  const candidate = error as {
    code?: string;
    constraint?: string;
    message?: string;
  };
  if (candidate.code === UNIQUE_VIOLATION) {
    return true;
  }
  if (candidate.constraint === COLOR_CODE_CONSTRAINT) {
    return true;
  }
  return (
    typeof candidate.message === "string" &&
    candidate.message.includes(COLOR_CODE_CONSTRAINT)
  );
}

/**
 * Reconoce la violación del índice `(brandId, colorCode)` sin acoplarse al
 * driver. El driver real (`drizzle-orm/neon-http`) envuelve el error de
 * Postgres en un `DrizzleQueryError` cuyos `.code`/`.constraint` son
 * `undefined`; el `NeonDbError` con `code: "23505"` viaja en `.cause`. Por eso
 * se recorre la cadena de `.cause` (con guarda de profundidad) además del nivel
 * superior, manteniendo también el match plano que entregan otros entornos.
 */
function isDuplicateColorCode(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof current !== "object" || current === null) {
      return false;
    }
    if (matchesDuplicateColorCode(current)) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export function createYarnStore(database: NeonHttpDatabase = db): YarnStore {
  return {
    async listBrands(userId) {
      return database
        .select()
        .from(brands)
        .where(eq(brands.userId, userId))
        .orderBy(asc(brands.name));
    },

    async findBrand(userId, brandId) {
      const rows = await database
        .select()
        .from(brands)
        .where(and(eq(brands.userId, userId), eq(brands.id, brandId)))
        .limit(1);
      return rows[0];
    },

    async createBrand(input) {
      const rows = await database.insert(brands).values(input).returning();
      const created = rows[0];
      if (!created) {
        throw new Error("No se pudo crear la marca.");
      }
      return created;
    },

    // `yarn_types` no tiene `userId`: el scoping se garantiza uniéndolo a `brands`.
    async listYarnTypes(userId, brandId) {
      return database
        .select({
          id: yarnTypes.id,
          brandId: yarnTypes.brandId,
          name: yarnTypes.name,
        })
        .from(yarnTypes)
        .innerJoin(brands, eq(yarnTypes.brandId, brands.id))
        .where(and(eq(brands.userId, userId), eq(yarnTypes.brandId, brandId)))
        .orderBy(asc(yarnTypes.name));
    },

    async findYarnType(userId, brandId, typeId) {
      const rows = await database
        .select({
          id: yarnTypes.id,
          brandId: yarnTypes.brandId,
          name: yarnTypes.name,
        })
        .from(yarnTypes)
        .innerJoin(brands, eq(yarnTypes.brandId, brands.id))
        .where(
          and(
            eq(brands.userId, userId),
            eq(yarnTypes.brandId, brandId),
            eq(yarnTypes.id, typeId),
          ),
        )
        .limit(1);
      return rows[0];
    },

    async createYarnType(input) {
      const rows = await database.insert(yarnTypes).values(input).returning();
      const created = rows[0];
      if (!created) {
        throw new Error("No se pudo crear el tipo de lana.");
      }
      return created;
    },

    async countBrandTypes(brandId) {
      const rows = await database
        .select({ total: count() })
        .from(yarnTypes)
        .where(eq(yarnTypes.brandId, brandId));
      return Number(rows[0]?.total ?? 0);
    },

    async countBrandYarns(userId, brandId) {
      const rows = await database
        .select({ total: count() })
        .from(yarns)
        .where(and(eq(yarns.userId, userId), eq(yarns.brandId, brandId)));
      return Number(rows[0]?.total ?? 0);
    },

    async removeBrand(userId, brandId) {
      const rows = await database
        .delete(brands)
        .where(and(eq(brands.userId, userId), eq(brands.id, brandId)))
        .returning({ id: brands.id });
      return rows.length > 0;
    },

    async countTypeYarns(userId, typeId) {
      const rows = await database
        .select({ total: count() })
        .from(yarns)
        .where(and(eq(yarns.userId, userId), eq(yarns.typeId, typeId)));
      return Number(rows[0]?.total ?? 0);
    },

    async removeYarnType(brandId, typeId) {
      const rows = await database
        .delete(yarnTypes)
        .where(and(eq(yarnTypes.brandId, brandId), eq(yarnTypes.id, typeId)))
        .returning({ id: yarnTypes.id });
      return rows.length > 0;
    },

    async listYarns(userId, filters) {
      const conditions = [eq(yarns.userId, userId)];
      if (filters.brandId !== undefined) {
        conditions.push(eq(yarns.brandId, filters.brandId));
      }
      if (filters.typeId !== undefined) {
        conditions.push(eq(yarns.typeId, filters.typeId));
      }
      if (filters.colorFamily !== undefined) {
        conditions.push(eq(yarns.colorFamily, filters.colorFamily));
      }
      return database
        .select()
        .from(yarns)
        .where(and(...conditions))
        .orderBy(desc(yarns.createdAt));
    },

    async findYarn(userId, id) {
      const rows = await database
        .select()
        .from(yarns)
        .where(and(eq(yarns.userId, userId), eq(yarns.id, id)))
        .limit(1);
      return rows[0];
    },

    async createYarn(input) {
      let rows;
      try {
        rows = await database.insert(yarns).values(input).returning();
      } catch (error) {
        if (isDuplicateColorCode(error)) {
          throw new DuplicateColorCodeError();
        }
        throw error;
      }
      const created = rows[0];
      if (!created) {
        throw new Error("No se pudo crear la lana.");
      }
      return created;
    },

    async updateYarn(userId, id, patch) {
      let rows;
      try {
        rows = await database
          .update(yarns)
          .set(patch)
          .where(and(eq(yarns.userId, userId), eq(yarns.id, id)))
          .returning();
      } catch (error) {
        if (isDuplicateColorCode(error)) {
          throw new DuplicateColorCodeError();
        }
        throw error;
      }
      return rows[0];
    },

    async removeYarn(userId, id) {
      const rows = await database
        .delete(yarns)
        .where(and(eq(yarns.userId, userId), eq(yarns.id, id)))
        .returning({ id: yarns.id });
      return rows.length > 0;
    },

    async countProjectReferences(yarnId) {
      const rows = await database
        .select({ total: count() })
        .from(projectYarns)
        .where(eq(projectYarns.yarnId, yarnId));
      return Number(rows[0]?.total ?? 0);
    },

    async removeProjectReferences(yarnId) {
      await database.delete(projectYarns).where(eq(projectYarns.yarnId, yarnId));
    },
  };
}
