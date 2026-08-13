import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandsTable = pgTable("brands", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("crypto"), // crypto | banking_uk | banking_us | banking_aus | institution
  theme: text("theme").notNull().default("light"), // light | dark
  primaryColor: text("primary_color").notNull(),
  headerBg: text("header_bg"),
  cardBg: text("card_bg").notNull(),
  bodyBg: text("body_bg").notNull(),
  textColor: text("text_color").notNull(),
  accentBg: text("accent_bg"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBrandSchema = createInsertSchema(brandsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brandsTable.$inferSelect;
