import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/features/auth";
import { projects } from "@/features/projects";

export const craftSessions = pgTable("craft_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  start: timestamp("start").notNull().defaultNow(),
  end: timestamp("end"),
  duration: integer("duration").notNull().default(0),
});
