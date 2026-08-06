import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { describe, expect, it } from "vitest";

import { createProjectStore } from "@/features/projects/api/store";
import type { ProjectFilters } from "@/features/projects/types";
import { createDbClient } from "@/shared/db";

/**
 * El doble en memoria dice qué *devuelve* el store; este archivo dice qué
 * *consulta* el store real, que es donde vive el scoping y el orden. Se
 * construye un Drizzle de verdad (el driver neon-http es perezoso: sin
 * `await` no abre conexión) y se intercepta el `then` del query builder para
 * quedarse con su `toSQL()` y resolver con cero filas. Así se puede asertar
 * sobre el SQL emitido sin base de datos.
 */
type RecordedQuery = { sql: string; params: unknown[] };

function createRecordingDatabase(): {
  database: NeonHttpDatabase;
  queries: RecordedQuery[];
} {
  const real = createDbClient("postgresql://user:pass@localhost/neondb");
  const queries: RecordedQuery[] = [];

  const wrap = (builder: object): object =>
    new Proxy(builder, {
      get(target, property) {
        if (property === "then") {
          return (resolve: (rows: unknown[]) => unknown) => {
            queries.push((target as { toSQL(): RecordedQuery }).toSQL());
            return Promise.resolve(resolve([]));
          };
        }
        const value = Reflect.get(target, property, target);
        if (typeof value !== "function") {
          return value;
        }
        return (...args: unknown[]) => {
          const result = (value as (...a: unknown[]) => unknown).apply(
            target,
            args,
          );
          return typeof result === "object" && result !== null
            ? wrap(result)
            : result;
        };
      },
    });

  const database = {
    select: (projection?: unknown) =>
      wrap((real.select as (p?: unknown) => object)(projection)),
  } as unknown as NeonHttpDatabase;

  return { database, queries };
}

const USER_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const PATTERN_ID = "66666666-6666-4666-8666-666666666666";

/** El SQL sin comillas de identificador: se lee y se compara mucho mejor. */
function naked(query: RecordedQuery): string {
  return query.sql.replace(/"/g, "");
}

function section(query: RecordedQuery, from: string, to?: string): string {
  const text = naked(query);
  const start = text.indexOf(from) + from.length;
  const end = to === undefined ? text.length : text.indexOf(to);
  return text.slice(start, end);
}

async function recordLinkedYarnsQuery(): Promise<RecordedQuery> {
  const { database, queries } = createRecordingDatabase();
  const store = createProjectStore(database);

  await store.listLinkedYarns(USER_ID, PROJECT_ID);

  // Una sola consulta: las lanas y sus catálogos salen del mismo JOIN, no de
  // una consulta por lana enlazada (N+1).
  expect(queries).toHaveLength(1);
  const query = queries[0];
  if (!query) {
    throw new Error("No se registró ninguna consulta.");
  }
  return query;
}

async function recordListQuery(
  filters: ProjectFilters,
): Promise<RecordedQuery> {
  const { database, queries } = createRecordingDatabase();
  const store = createProjectStore(database);

  await store.list(USER_ID, filters);

  expect(queries).toHaveLength(1);
  const query = queries[0];
  if (!query) {
    throw new Error("No se registró ninguna consulta.");
  }
  return query;
}

/**
 * El doble en memoria dice qué *devuelve* `list`; esto dice qué *consulta*.
 * El filtro `?patternId=` (PRD §9.2) es el que fija que el scoping por
 * `userId` viaja en el MISMO `WHERE`, sobre producción y no sobre la réplica.
 */
describe("createProjectStore list SQL (filtro patternId, PRD §9.2)", () => {
  it("adds the pattern condition next to the user scoping in the same WHERE", async () => {
    const query = await recordListQuery({ patternId: PATTERN_ID });

    expect(section(query, " where ", " order by ")).toBe(
      "(projects.user_id = $1 and projects.pattern_id = $2)",
    );
    expect(query.params).toEqual([USER_ID, PATTERN_ID]);
  });

  it("does not touch the query when there is no patternId filter", async () => {
    const query = await recordListQuery({});

    expect(section(query, " where ", " order by ")).toBe(
      "projects.user_id = $1",
    );
    expect(naked(query)).not.toContain("pattern_id =");
    expect(query.params).toEqual([USER_ID]);
  });

  // `patternId` es una FK 1→N (columna de `projects`), no un enlace N:N: la
  // consulta compara la columna, no monta el subquery que usa `yarnId`.
  it("compares the column instead of an EXISTS over the link table", async () => {
    const query = await recordListQuery({ patternId: PATTERN_ID });

    expect(naked(query)).not.toContain("exists");
    expect(naked(query)).not.toContain("project_yarns");
  });

  it("composes with the other filters and keeps the existing order", async () => {
    const query = await recordListQuery({
      patternId: PATTERN_ID,
      type: "crochet",
    });

    expect(section(query, " where ", " order by ")).toBe(
      "(projects.user_id = $1 and projects.type = $2 and projects.pattern_id = $3)",
    );
    expect(query.params).toEqual([USER_ID, "crochet", PATTERN_ID]);
    expect(section(query, " order by ")).toBe("projects.start_date desc");
  });
});

describe("createProjectStore listLinkedYarns SQL", () => {
  // ANCLA (regla 2a) al nivel del SQL: las columnas que se proyectan son
  // exactamente las cinco del contrato del PRD §9.1, ni una más ni una menos.
  // La otra mitad del ancla (las cinco CLAVES del JSON) vive en
  // `src/app/api/projects/projects-routes.test.ts`.
  it("selects exactly the five contract columns", async () => {
    const query = await recordLinkedYarnsQuery();

    expect(section(query, "select ", " from ").split(", ")).toEqual([
      "yarns.id",
      "yarns.color_name",
      "yarns.color_family",
      "brands.name",
      "yarn_types.name",
    ]);
  });

  it("scopes the join by yarns.user_id, not only by the project id", async () => {
    const query = await recordLinkedYarnsQuery();

    expect(section(query, " where ", " order by ")).toBe(
      "(project_yarns.project_id = $1 and yarns.user_id = $2)",
    );
    expect(query.params).toEqual([PROJECT_ID, USER_ID]);
  });

  it("orders deterministically by brand, type, color name and id", async () => {
    const query = await recordLinkedYarnsQuery();

    expect(section(query, " order by ")).toBe(
      "brands.name asc, yarn_types.name asc, yarns.color_name asc, yarns.id asc",
    );
  });

  it("joins the catalogs with inner joins (the FKs are NOT NULL)", async () => {
    const query = await recordLinkedYarnsQuery();
    const text = naked(query);

    expect(text).toContain(
      "from project_yarns inner join yarns on yarns.id = project_yarns.yarn_id",
    );
    expect(text).toContain("inner join brands on brands.id = yarns.brand_id");
    expect(text).toContain(
      "inner join yarn_types on yarn_types.id = yarns.type_id",
    );
    expect(text).not.toContain("left join");
  });
});
