import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationLogsTable = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull(),
  templateName: text("template_name").notNull(),
  chatId: text("chat_id").notNull(),
  recipientName: text("recipient_name"),
  caseReference: text("case_reference"),
  status: text("status").notNull().default("sent"), // sent | failed
  errorMessage: text("error_message"),
  messageId: integer("message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogsTable).omit({
  id: true,
  sentAt: true,
});
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogsTable.$inferSelect;
