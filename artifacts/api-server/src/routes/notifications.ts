import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, notificationLogsTable, templatesTable } from "@workspace/db";
import {
  SendNotificationBody,
  PreviewNotificationBody,
  ListNotificationLogsQueryParams,
} from "@workspace/api-zod";
import { renderTemplate, extractVariables, sendTelegramMessage } from "../lib/telegram";

const router: IRouter = Router();

// POST /notifications/send
router.post("/notifications/send", async (req, res): Promise<void> => {
  const parsed = SendNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { templateId, chatId, variables } = parsed.data;

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, templateId));

  if (!template) {
    res.status(400).json({ error: "Template not found" });
    return;
  }

  const rendered = renderTemplate(template.content, variables as Record<string, string>);
  const vars = variables as Record<string, string>;

  let messageId: number | null = null;
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  try {
    const inlineButton =
      template.buttonLabel && template.buttonUrl
        ? { label: template.buttonLabel, url: template.buttonUrl }
        : undefined;

    messageId = await sendTelegramMessage(chatId, rendered, inlineButton);
  } catch (err: unknown) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : String(err);
    req.log.error({ err, chatId, templateId }, "Failed to send Telegram message");
  }

  const [log] = await db
    .insert(notificationLogsTable)
    .values({
      templateId,
      templateName: template.name,
      chatId,
      recipientName: vars["recipient_name"] ?? null,
      caseReference: vars["case_reference"] ?? null,
      status,
      errorMessage,
      messageId,
    })
    .returning();

  if (status === "failed") {
    res.status(200).json({ success: false, logId: log.id, messageId: null, error: errorMessage });
    return;
  }

  res.json({ success: true, logId: log.id, messageId, error: null });
});

// POST /notifications/preview
router.post("/notifications/preview", async (req, res): Promise<void> => {
  const parsed = PreviewNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { templateId, variables } = parsed.data;

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, templateId));

  if (!template) {
    res.status(400).json({ error: "Template not found" });
    return;
  }

  const rendered = renderTemplate(template.content, variables as Record<string, string>);
  const vars = extractVariables(template.content);

  res.json({ rendered, variables: vars });
});

// GET /notifications/logs
router.get("/notifications/logs", async (req, res): Promise<void> => {
  const parsed = ListNotificationLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit, offset, status } = parsed.data;
  const effectiveLimit = limit ?? 50;
  const effectiveOffset = offset ?? 0;
  const effectiveStatus = status ?? "all";

  const baseQuery = db.select().from(notificationLogsTable);

  let logs;
  let totalCount;

  if (effectiveStatus !== "all") {
    logs = await baseQuery
      .where(eq(notificationLogsTable.status, effectiveStatus))
      .orderBy(desc(notificationLogsTable.sentAt))
      .limit(effectiveLimit)
      .offset(effectiveOffset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationLogsTable)
      .where(eq(notificationLogsTable.status, effectiveStatus));

    totalCount = count;
  } else {
    logs = await baseQuery
      .orderBy(desc(notificationLogsTable.sentAt))
      .limit(effectiveLimit)
      .offset(effectiveOffset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationLogsTable);

    totalCount = count;
  }

  res.json({ logs, total: totalCount });
});

export default router;
