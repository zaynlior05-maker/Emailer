import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  theme: text("theme").notNull().default("minimalist"), // minimalist | high-priority | custom
  category: text("category").notNull().default("support"), // banking | crypto | ecommerce | support | custom
  content: text("content").notNull(),
  emailSubject: text("email_subject"),
  emailContent: text("email_content"),
  brandKey: text("brand_key"),
  buttonLabel: text("button_label"),
  buttonUrl: text("button_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
