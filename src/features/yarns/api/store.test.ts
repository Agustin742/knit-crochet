import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { describe, expect, it } from "vitest";

import { DuplicateColorCodeError } from "@/features/yarns/api/errors";
import { createYarnStore } from "@/features/yarns/api/store";
import type { NewYarnRecord, YarnPatch } from "@/features/yarns/types";

/**
 * Doble de driver que reproduce la forma REAL del error de `drizzle-orm/neon-http`:
 * un `DrizzleQueryError` plano cuyo `.code`/`.constraint` son `undefined` y cuya
 * violación de Postgres (`code: "23505"`, `constraint`) viaja en `.cause`. El
 * doble en memoria no puede reproducir esta forma anidada; este es el caso que
 * el smoke contra Neon destapó (bug: 500 en vez de 409). Cada método de escritura
 * lanza el error suministrado en `.returning()`, imitando la cadena de Drizzle.
 */
function createThrowingDatabase(error: unknown): NeonHttpDatabase {
  const returning = () => {
    throw error;
  };
  const insert = () => ({ values: () => ({ returning }) });
  const update = () => ({ set: () => ({ where: () => ({ returning }) }) });
  // El store solo usa insert/update en las rutas bajo prueba; el resto del
  // contrato de NeonHttpDatabase no se ejercita aquí.
  return { insert, update } as unknown as NeonHttpDatabase;
}

const CONSTRAINT = "yarns_brand_color_code_unique";

const yarnInput: NewYarnRecord = {
  userId: "user-1",
  brandId: "brand-1",
  typeId: "type-1",
  colorName: "Azul Profundo",
  colorCode: "AP-01",
  colorFamily: "blue",
  length: 100,
  fiber: "merino",
  recommendedNeedle: { min: 4, max: 5 },
  thickness: 4,
  lot: new Date("2026-01-01T00:00:00Z"),
};

const patch: YarnPatch = { colorCode: "AP-01" };

describe("createYarnStore duplicate colorCode translation", () => {
  it("translates the NESTED neon-http error (info in .cause) on createYarn", async () => {
    const nested = {
      message: 'Failed query: insert into "yarns" ...',
      cause: { code: "23505", constraint: CONSTRAINT },
    };
    const store = createYarnStore(createThrowingDatabase(nested));
    await expect(store.createYarn(yarnInput)).rejects.toBeInstanceOf(
      DuplicateColorCodeError,
    );
  });

  it("translates a DEEPLY nested cause chain on createYarn", async () => {
    const deep = {
      message: "Failed query",
      cause: { message: "wrapper", cause: { code: "23505" } },
    };
    const store = createYarnStore(createThrowingDatabase(deep));
    await expect(store.createYarn(yarnInput)).rejects.toBeInstanceOf(
      DuplicateColorCodeError,
    );
  });

  it("recognizes the constraint name carried in a nested cause", async () => {
    const nested = { cause: { constraint: CONSTRAINT } };
    const store = createYarnStore(createThrowingDatabase(nested));
    await expect(store.createYarn(yarnInput)).rejects.toBeInstanceOf(
      DuplicateColorCodeError,
    );
  });

  it("still translates the FLAT error form (other environments)", async () => {
    const flat = { code: "23505", constraint: CONSTRAINT };
    const store = createYarnStore(createThrowingDatabase(flat));
    await expect(store.createYarn(yarnInput)).rejects.toBeInstanceOf(
      DuplicateColorCodeError,
    );
  });

  it("translates the NESTED neon-http error on updateYarn (same heuristic)", async () => {
    const nested = {
      message: 'Failed query: update "yarns" ...',
      cause: { code: "23505", constraint: CONSTRAINT },
    };
    const store = createYarnStore(createThrowingDatabase(nested));
    await expect(
      store.updateYarn("user-1", "yarn-1", patch),
    ).rejects.toBeInstanceOf(DuplicateColorCodeError);
  });

  it("does NOT swallow an unrelated error (propagates as-is)", async () => {
    const unrelated = new Error("connection reset");
    const store = createYarnStore(createThrowingDatabase(unrelated));
    await expect(store.createYarn(yarnInput)).rejects.toBe(unrelated);
  });

  it("does not loop forever on a self-referential cause chain", async () => {
    const cyclic: { message: string; cause?: unknown } = {
      message: "boom",
    };
    cyclic.cause = cyclic;
    const store = createYarnStore(createThrowingDatabase(cyclic));
    await expect(store.createYarn(yarnInput)).rejects.toBe(cyclic);
  });
});
