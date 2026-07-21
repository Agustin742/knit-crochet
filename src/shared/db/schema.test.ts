import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { users } from "@/features/auth/schema";
import {
  projects,
  projectYarns,
} from "@/features/projects/schema";
import { patterns } from "@/features/patterns/schema";
import { craftSessions } from "@/features/time-tracking/schema";
import { brands, yarns, yarnTypes } from "@/features/yarns/schema";
import {
  colorFamilyEnum,
  craftTypeEnum,
  projectStatusEnum,
} from "@/shared/db/enums";
import * as schema from "@/shared/db/schema";

type AnyTable = Parameters<typeof getTableConfig>[0];

function columnNames(table: AnyTable): string[] {
  return getTableConfig(table).columns.map((c) => c.name);
}

function column(table: AnyTable, name: string) {
  const col = getTableConfig(table).columns.find((c) => c.name === name);
  if (!col) throw new Error(`missing column ${name}`);
  return col;
}

// Devuelve la tabla destino de la FK cuya columna local es `localColumn`.
function foreignKeyTarget(table: AnyTable, localColumn: string): string {
  const fk = getTableConfig(table).foreignKeys.find((f) =>
    f.reference().columns.some((c) => c.name === localColumn),
  );
  if (!fk) throw new Error(`missing FK on column ${localColumn}`);
  return getTableConfig(fk.reference().foreignTable).name;
}

describe("db schema barrel", () => {
  it("re-exports the 8 entities as tables", () => {
    for (const name of [
      "users",
      "projects",
      "projectYarns",
      "patterns",
      "brands",
      "yarnTypes",
      "yarns",
      "craftSessions",
    ]) {
      expect(schema).toHaveProperty(name);
    }
  });

  it("re-exports the shared pgEnums", () => {
    expect(schema).toHaveProperty("craftTypeEnum");
    expect(schema).toHaveProperty("projectStatusEnum");
    expect(schema).toHaveProperty("colorFamilyEnum");
  });
});

describe("pgEnums mirror the config values", () => {
  it("craft_type", () => {
    expect(craftTypeEnum.enumValues).toEqual(["knitting", "crochet"]);
  });
  it("project_status", () => {
    expect(projectStatusEnum.enumValues).toEqual([
      "in_progress",
      "paused",
      "finished",
      "abandoned",
    ]);
  });
  it("color_family", () => {
    expect(colorFamilyEnum.enumValues).toHaveLength(13);
    expect(colorFamilyEnum.enumValues).toContain("multicolor");
  });
});

describe("User (PRD §4.1)", () => {
  it("has a unique email and password hash", () => {
    const email = column(users, "email");
    expect(email.isUnique).toBe(true);
    expect(email.notNull).toBe(true);
    expect(columnNames(users)).toContain("password_hash");
  });
});

describe("Project (PRD §4.2)", () => {
  it("scopes by userId via FK to users", () => {
    expect(foreignKeyTarget(projects, "user_id")).toBe("users");
  });

  it("has patternId as a nullable FK to patterns", () => {
    expect(column(projects, "pattern_id").notNull).toBe(false);
    expect(foreignKeyTarget(projects, "pattern_id")).toBe("patterns");
  });

  it("uses craft_type / project_status enums and array columns", () => {
    const cols = columnNames(projects);
    expect(cols).toEqual(
      expect.arrayContaining([
        "type",
        "status",
        "rounds",
        "target_rounds",
        "progress",
        "needles",
        "completed_steps",
      ]),
    );
    expect(column(projects, "end_date").notNull).toBe(false);
    expect(column(projects, "image").notNull).toBe(false);
  });
});

describe("ProjectYarn (PRD §4.6)", () => {
  it("has a composite primary key (project_id, yarn_id) and no extra columns", () => {
    const { primaryKeys, columns } = getTableConfig(projectYarns);
    expect(primaryKeys).toHaveLength(1);
    const pkCols = primaryKeys[0]!.columns.map((c) => c.name).sort();
    expect(pkCols).toEqual(["project_id", "yarn_id"]);
    expect(columns.map((c) => c.name).sort()).toEqual([
      "project_id",
      "yarn_id",
    ]);
  });

  it("references both Project and Yarn", () => {
    expect(foreignKeyTarget(projectYarns, "project_id")).toBe("projects");
    expect(foreignKeyTarget(projectYarns, "yarn_id")).toBe("yarns");
  });
});

describe("Yarn + catalogs (PRD §4.4/§4.5)", () => {
  it("has a unique constraint on (brand_id, color_code)", () => {
    const { uniqueConstraints } = getTableConfig(yarns);
    const combos = uniqueConstraints.map((u) =>
      u.columns.map((c) => c.name).sort(),
    );
    expect(combos).toContainEqual(["brand_id", "color_code"]);
  });

  it("scopes by userId and references brand and type", () => {
    expect(foreignKeyTarget(yarns, "user_id")).toBe("users");
    expect(foreignKeyTarget(yarns, "brand_id")).toBe("brands");
    expect(foreignKeyTarget(yarns, "type_id")).toBe("yarn_types");
  });

  it("Brand scopes by userId; YarnType belongs to a Brand", () => {
    expect(foreignKeyTarget(brands, "user_id")).toBe("users");
    expect(foreignKeyTarget(yarnTypes, "brand_id")).toBe("brands");
  });
});

describe("Pattern (PRD §4.3)", () => {
  it("scopes by userId and has instructions/metadata/inLibrary", () => {
    expect(foreignKeyTarget(patterns, "user_id")).toBe("users");
    expect(columnNames(patterns)).toEqual(
      expect.arrayContaining(["instructions", "metadata", "in_library"]),
    );
  });
});

describe("CraftSession (PRD §4.7)", () => {
  it("scopes by userId, references Project, and end is nullable", () => {
    expect(foreignKeyTarget(craftSessions, "user_id")).toBe("users");
    expect(foreignKeyTarget(craftSessions, "project_id")).toBe("projects");
    expect(column(craftSessions, "end").notNull).toBe(false);
    expect(column(craftSessions, "duration").notNull).toBe(true);
  });
});
