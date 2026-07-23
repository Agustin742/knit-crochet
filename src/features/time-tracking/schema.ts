import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
// Regla S1 (architecture.md §"Capa de schema"): solo `schema.ts`, nunca el barrel.
import { users } from "@/features/auth/schema";
import { projects } from "@/features/projects/schema";

export const craftSessions = pgTable("craft_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  start: timestamp("start").notNull().defaultNow(),
  end: timestamp("end"),
  duration: integer("duration").notNull().default(0),
});
