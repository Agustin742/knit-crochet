import {
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/features/auth";
import { colorFamilyEnum } from "@/shared/db/enums";

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
});

export const yarnTypes = pgTable("yarn_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  name: text("name").notNull(),
});

export type RecommendedNeedle = { min: number; max: number };

export const yarns = pgTable(
  "yarns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    image: text("image"),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),
    typeId: uuid("type_id")
      .notNull()
      .references(() => yarnTypes.id),
    colorName: text("color_name").notNull(),
    colorCode: text("color_code").notNull(),
    colorFamily: colorFamilyEnum("color_family").notNull(),
    quantity: integer("quantity").notNull().default(0),
    usedQuantity: integer("used_quantity").notNull().default(0),
    length: real("length").notNull(),
    fiber: text("fiber").notNull(),
    recommendedNeedle: jsonb("recommended_needle")
      .$type<RecommendedNeedle>()
      .notNull(),
    thickness: real("thickness").notNull(),
    lot: timestamp("lot").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("yarns_brand_color_code_unique").on(table.brandId, table.colorCode),
  ],
);
