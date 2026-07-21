import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/features/auth";
import { patterns } from "@/features/patterns";
import { yarns } from "@/features/yarns";
import { craftTypeEnum, projectStatusEnum } from "@/shared/db/enums";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
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
  patternId: uuid("pattern_id").references(() => patterns.id),
  completedSteps: jsonb("completed_steps").$type<number[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relación N:N Project—Yarn: solo referencia, PK compuesta, sin cantidad (PRD §4.6).
export const projectYarns = pgTable(
  "project_yarns",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    yarnId: uuid("yarn_id")
      .notNull()
      .references(() => yarns.id),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.yarnId] })],
);
