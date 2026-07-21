import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/features/auth";
import { craftTypeEnum } from "@/shared/db/enums";

export type KeyValue = { key: string; value: string };

export const patterns = pgTable("patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  image: text("image"),
  type: craftTypeEnum("type").notNull(),
  instructions: jsonb("instructions").$type<KeyValue[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<KeyValue[]>().notNull().default([]),
  inLibrary: boolean("in_library").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
