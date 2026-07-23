import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
// Regla S1 (architecture.md §"Capa de schema"): la capa de schema importa solo
// `schema.ts`, nunca el `index.ts` de otro feature (arrastra `./api` → ciclo).
import { users } from "@/features/auth/schema";
import { patterns } from "@/features/patterns/schema";
import { yarns } from "@/features/yarns/schema";
import { craftTypeEnum, projectStatusEnum } from "@/shared/db/enums";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  image: text("image"),
  type: craftTypeEnum("type").notNull(),
  status: projectStatusEnum("status").notNull().default("in_progress"),
  rounds: integer("rounds").notNull().default(0),
  targetRounds: integer("target_rounds").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  needles: jsonb("needles").$type<number[]>().notNull().default([]),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  time: integer("time").notNull().default(0),
  patternId: uuid("pattern_id").references(() => patterns.id, {
    onDelete: "set null",
  }),
  completedSteps: jsonb("completed_steps").$type<number[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relación N:N Project—Yarn: solo referencia, PK compuesta, sin cantidad (PRD §4.6).
// El enlace pertenece al proyecto (cascade) pero solo referencia a la lana
// (`no action`: borrarla exige 409 + `?force=true`, PRD §4.5).
export const projectYarns = pgTable(
  "project_yarns",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    yarnId: uuid("yarn_id")
      .notNull()
      .references(() => yarns.id),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.yarnId] })],
);
