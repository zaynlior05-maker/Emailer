import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailDispatchesTable = pgTable("email_dispatches", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id"),
  templateId: integer("template_id").notNull(),
  templateName: text("template_name").notNull(),
  brandKey: text("brand_key").notNull(),
  brandName: text("brand_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  emailSubject: text("email_subject").notNull(),
  status: text("status").notNull().default("sent"), // sent | failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmailDispatchSchema = createInsertSchema(emailDispatchesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailDispatch = z.infer<typeof insertEmailDispatchSchema>;
export type EmailDispatch = typeof emailDispatchesTable.$inferSelect;
