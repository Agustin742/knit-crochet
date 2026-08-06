import { and, count, eq, inArray } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveEnvValue } from "@/__smoke__/env";
import { users } from "@/features/auth/schema";
import { createAuthUserStore } from "@/features/auth/api/store";
import { createProject } from "@/features/projects/api/create-project";
import { deleteProject } from "@/features/projects/api/delete-project";
import { linkProjectYarn } from "@/features/projects/api/project-yarns";
import { createProjectStore } from "@/features/projects/api/store";
import { projects, projectYarns } from "@/features/projects/schema";
import { createPattern } from "@/features/patterns/api/create-pattern";
import { deletePattern } from "@/features/patterns/api/delete-pattern";
import { createPatternStore } from "@/features/patterns/api/store";
import { patterns } from "@/features/patterns/schema";
import { startSession } from "@/features/time-tracking/api/start-session";
import { stopSession } from "@/features/time-tracking/api/stop-session";
import { createCraftSessionStore } from "@/features/time-tracking/api/store";
import { craftSessions } from "@/features/time-tracking/schema";
import { createBrand } from "@/features/yarns/api/create-brand";
import { createYarn } from "@/features/yarns/api/create-yarn";
import { createYarnType } from "@/features/yarns/api/create-yarn-type";
import { deleteBrand } from "@/features/yarns/api/delete-brand";
import { deleteYarn } from "@/features/yarns/api/delete-yarn";
import {
  BrandReferencedError,
  DuplicateColorCodeError,
} from "@/features/yarns/api/errors";
import { createYarnStore } from "@/features/yarns/api/store";
import { brands, yarns, yarnTypes } from "@/features/yarns/schema";
import { createDbClient } from "@/shared/db";
import type { CreateYarnInput } from "@/features/yarns/types";

/**
 * Smoke test contra la DB real de Neon (deuda técnica #6). Ejercita el CÓDIGO
 * REAL de los stores/servicios Drizzle contra Postgres, no dobles en memoria.
 *
 * Está guardado por `SMOKE_NEON`: en la corrida hermética normal (`pnpm test`)
 * queda SKIPPED y NO abre ninguna conexión (el cliente se construye perezosamente
 * dentro de `beforeAll`, nunca en el top-level del módulo).
 *
 *   SMOKE_NEON=1 pnpm vitest run src/__smoke__/neon.smoke.test.ts
 *
 * (exporta `DATABASE_URL` desde `.env` si Vitest no lo inyecta).
 */

const RUN_SMOKE = Boolean(process.env.SMOKE_NEON);
const STAMP = Date.now();
const TEST_EMAIL = `smoke+${STAMP}@knit.test`;

function yarnInput(
  brandId: string,
  typeId: string,
  overrides: Partial<CreateYarnInput> = {},
): CreateYarnInput {
  return {
    brandId,
    typeId,
    colorName: "Rojo prueba",
    colorCode: "SMOKE-001",
    colorFamily: "red",
    length: 100,
    fiber: "acrílico",
    recommendedNeedle: { min: 3, max: 4 },
    thickness: 4,
    lot: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe.skipIf(!RUN_SMOKE)("smoke: stores Drizzle contra Neon real", () => {
  let database: NeonHttpDatabase;
  let userId: string;

  // Stores reales (código de producción), inyectando el cliente Neon real.
  let projectStore: ReturnType<typeof createProjectStore>;
  let craftStore: ReturnType<typeof createCraftSessionStore>;
  let patternStore: ReturnType<typeof createPatternStore>;
  let yarnStore: ReturnType<typeof createYarnStore>;

  beforeAll(async () => {
    database = createDbClient(resolveEnvValue("DATABASE_URL"));
    projectStore = createProjectStore(database);
    craftStore = createCraftSessionStore(database);
    patternStore = createPatternStore(database);
    yarnStore = createYarnStore(database);

    const authStore = createAuthUserStore(database);
    const user = await authStore.create({
      email: TEST_EMAIL,
      passwordHash: "smoke-hash",
      name: "Smoke User",
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (!database || !userId) {
      return;
    }
    // Teardown ORDENADO y explícito (no hay transacción multi-statement en
    // neon-http). Ojo a las FKs `no action`:
    //  1. projects → cascada borra project_yarns y craft_sessions.
    //  2. yarns (ya sin enlaces en project_yarns tras (1)).
    //  3. yarn_types (por brandId de las marcas del usuario).
    //  4. brands.
    //  5. patterns.
    //  6. users.
    await database.delete(projects).where(eq(projects.userId, userId));
    await database.delete(yarns).where(eq(yarns.userId, userId));
    const userBrands = await database
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.userId, userId));
    const brandIds = userBrands.map((b) => b.id);
    if (brandIds.length > 0) {
      await database
        .delete(yarnTypes)
        .where(inArray(yarnTypes.brandId, brandIds));
    }
    await database.delete(brands).where(eq(brands.userId, userId));
    await database.delete(patterns).where(eq(patterns.userId, userId));
    await database.delete(users).where(eq(users.id, userId));

    // La DB queda limpia de datos de prueba: 0 filas del usuario en cada tabla.
    const [uCount] = await database
      .select({ n: count() })
      .from(users)
      .where(eq(users.id, userId));
    expect(uCount?.n).toBe(0);
  });

  it("1. stop → sumDuration devuelve number (numeric→number, deuda #6)", async () => {
    const project = await createProject(
      userId,
      { name: "P1 tiempo", type: "knitting" },
      projectStore,
    );

    const base = new Date("2026-02-01T10:00:00.000Z");
    await startSession(userId, project.id, craftStore, base);
    const stop = await stopSession(
      userId,
      project.id,
      craftStore,
      new Date(base.getTime() + 5_000),
    );

    // El punto exacto de la deuda: coalesce(sum) vuelve numeric (string por el
    // driver) y sumDuration hace Number(...). Debe ser number entero, no string.
    expect(typeof stop.time).toBe("number");
    expect(stop.time).toBe(5);

    const summed = await craftStore.sumDuration(userId, project.id);
    expect(typeof summed).toBe("number");
    expect(summed).toBe(5);

    // Y el cache Project.time quedó persistido como number.
    const ref = await craftStore.findProject(userId, project.id);
    expect(ref).toBeDefined();
    expect(typeof ref!.time).toBe("number");
    expect(ref!.time).toBe(5);

    await deleteProject(userId, project.id, projectStore);
  });

  it("2. deleteProject → cascada borra project_yarns y craft_sessions (sin huérfanos)", async () => {
    const brand = await createBrand(userId, { name: "Marca casc" }, yarnStore);
    const type = await createYarnType(
      userId,
      brand.id,
      { name: "Tipo casc" },
      yarnStore,
    );
    const yarn = await createYarn(
      userId,
      yarnInput(brand.id, type.id, { colorCode: "CASC-1" }),
      yarnStore,
    );
    const project = await createProject(
      userId,
      { name: "P2 cascada", type: "crochet" },
      projectStore,
    );
    await linkProjectYarn(userId, project.id, yarn.id, projectStore);
    await startSession(userId, project.id, craftStore, new Date());

    // #17: el JOIN real (project_yarns → yarns → brands/yarn_types) devuelve
    // exactamente las cinco claves del contrato, y todas como string (no hay
    // agregado numeric que llegue como texto del driver, deuda 7).
    const linked = await projectStore.listLinkedYarns(userId, project.id);
    expect(linked).toEqual([
      {
        id: yarn.id,
        colorName: yarn.colorName,
        colorFamily: yarn.colorFamily,
        brandName: brand.name,
        typeName: type.name,
      },
    ]);
    for (const value of Object.values(linked[0] ?? {})) {
      expect(typeof value).toBe("string");
    }

    await deleteProject(userId, project.id, projectStore);
    expect(await projectStore.listLinkedYarns(userId, project.id)).toEqual([]);

    const [pyCount] = await database
      .select({ n: count() })
      .from(projectYarns)
      .where(eq(projectYarns.projectId, project.id));
    const [csCount] = await database
      .select({ n: count() })
      .from(craftSessions)
      .where(eq(craftSessions.projectId, project.id));
    expect(pyCount?.n).toBe(0);
    expect(csCount?.n).toBe(0);

    // La lana NO se toca (project_yarns → yarns es referencia).
    const stillYarn = await yarnStore.findYarn(userId, yarn.id);
    expect(stillYarn).toBeDefined();

    await deleteYarn(userId, yarn.id, false, yarnStore);
    await yarnStore.removeYarnType(brand.id, type.id);
    await deleteBrand(userId, brand.id, yarnStore);
  });

  it("3. deletePattern → projects.patternId = null (set null), el proyecto sobrevive", async () => {
    const pattern = await createPattern(
      userId,
      { name: "Patrón sn", type: "knitting" },
      patternStore,
    );
    const project = await createProject(
      userId,
      { name: "P3 patrón", type: "knitting", patternId: pattern.id },
      projectStore,
    );
    expect(project.patternId).toBe(pattern.id);

    await deletePattern(userId, pattern.id, patternStore);

    const rows = await database
      .select({ id: projects.id, patternId: projects.patternId })
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.id, project.id)))
      .limit(1);
    expect(rows[0]).toBeDefined();
    expect(rows[0]?.patternId).toBeNull();

    await deleteProject(userId, project.id, projectStore);
  });

  it("4. UNIQUE (brandId, colorCode) → DuplicateColorCodeError desde el driver real", async () => {
    const brand = await createBrand(userId, { name: "Marca uniq" }, yarnStore);
    const type = await createYarnType(
      userId,
      brand.id,
      { name: "Tipo uniq" },
      yarnStore,
    );
    const first = await createYarn(
      userId,
      yarnInput(brand.id, type.id, { colorCode: "DUP-1" }),
      yarnStore,
    );

    // Comportamiento correcto esperado (PRD §4.5, review #8): el store debe
    // traducir la violación 23505 a DuplicateColorCodeError (→ 409).
    //
    // HALLAZGO (discrepancia doble-vs-Postgres): contra Neon real esto FALLA.
    // El driver lanza un `DrizzleQueryError` cuyo `.code`/`.constraint` son
    // undefined y cuyo `.message` es "Failed query: ..." (sin el nombre de la
    // constraint). El error Postgres real (`NeonDbError` con `code: "23505"` y
    // `constraint: "yarns_brand_color_code_unique"`) viaja en `error.cause`.
    // `isDuplicateColorCode` (store.ts) solo inspecciona el error de nivel
    // superior y NO desenvuelve `.cause`, así que devuelve `false` y el
    // `DrizzleQueryError` crudo se propaga → el BFF respondería 500, no 409.
    // El doble en memoria imitaba la forma plana del error, por eso los tests
    // unitarios pasaban. Este assert queda como guardia viva de la regresión.
    await expect(
      createYarn(
        userId,
        yarnInput(brand.id, type.id, { colorCode: "DUP-1" }),
        yarnStore,
      ),
    ).rejects.toBeInstanceOf(DuplicateColorCodeError);

    await deleteYarn(userId, first.id, false, yarnStore);
    await yarnStore.removeYarnType(brand.id, type.id);
    await deleteBrand(userId, brand.id, yarnStore);
  });

  it("5. deleteYarn(force) → borra enlace project_yarns y luego la lana", async () => {
    const brand = await createBrand(userId, { name: "Marca force" }, yarnStore);
    const type = await createYarnType(
      userId,
      brand.id,
      { name: "Tipo force" },
      yarnStore,
    );
    const yarn = await createYarn(
      userId,
      yarnInput(brand.id, type.id, { colorCode: "FORCE-1" }),
      yarnStore,
    );
    const project = await createProject(
      userId,
      { name: "P5 force", type: "knitting" },
      projectStore,
    );
    await linkProjectYarn(userId, project.id, yarn.id, projectStore);

    await deleteYarn(userId, yarn.id, true, yarnStore);

    const [pyCount] = await database
      .select({ n: count() })
      .from(projectYarns)
      .where(eq(projectYarns.yarnId, yarn.id));
    expect(pyCount?.n).toBe(0);
    const gone = await yarnStore.findYarn(userId, yarn.id);
    expect(gone).toBeUndefined();

    await deleteProject(userId, project.id, projectStore);
    await yarnStore.removeYarnType(brand.id, type.id);
    await deleteBrand(userId, brand.id, yarnStore);
  });

  it("6. deleteBrand con hijos → BrandReferencedError (409), NO un 500 de FK", async () => {
    const brand = await createBrand(userId, { name: "Marca bloq" }, yarnStore);
    const type = await createYarnType(
      userId,
      brand.id,
      { name: "Tipo bloq" },
      yarnStore,
    );
    const yarn = await createYarn(
      userId,
      yarnInput(brand.id, type.id, { colorCode: "BLOQ-1" }),
      yarnStore,
    );

    await expect(deleteBrand(userId, brand.id, yarnStore)).rejects.toBeInstanceOf(
      BrandReferencedError,
    );

    // La marca sigue existiendo: el bloqueo ocurrió ANTES del delete.
    const stillBrand = await yarnStore.findBrand(userId, brand.id);
    expect(stillBrand).toBeDefined();

    // Limpieza en orden (hijos primero: FKs `no action`).
    await deleteYarn(userId, yarn.id, false, yarnStore);
    await yarnStore.removeYarnType(brand.id, type.id);
    await deleteBrand(userId, brand.id, yarnStore);
  });
});
