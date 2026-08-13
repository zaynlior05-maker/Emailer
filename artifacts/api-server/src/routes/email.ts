import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, brandsTable, templatesTable, emailDispatchesTable } from "@workspace/db";
import {
  SendEmailBody,
  PreviewEmailBody,
  ListEmailDispatchesQueryParams,
} from "@workspace/api-zod";
import { renderTemplate, flattenBrandContext, extractVariables } from "../lib/telegram";
import { sendEmail } from "../lib/email";

const router: IRouter = Router();

// POST /email/send
router.post("/email/send", async (req, res): Promise<void> => {
  const parsed = SendEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { templateId, brandKey, recipientEmail, emailSubject, variables } = parsed.data;

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, templateId));
  if (!template) {
    res.status(400).json({ error: "Template not found" });
    return;
  }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.key, brandKey));
  if (!brand) {
    res.status(400).json({ error: "Brand not found" });
    return;
  }

  const emailContent = template.emailContent ?? template.content;
  const brandContext = flattenBrandContext(brand as unknown as Record<string, unknown>);
  const allVars = { ...brandContext, ...(variables as Record<string, string>) };
  const html = renderTemplate(emailContent, allVars);
  const subject = renderTemplate(emailSubject, allVars);

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    senderName: `${brand.name} Support`,
  });

  const [dispatch] = await db
    .insert(emailDispatchesTable)
    .values({
      templateId,
      templateName: template.name,
      brandKey,
      brandName: brand.name,
      recipientEmail,
      emailSubject: subject,
      status: result.success ? "sent" : "failed",
      errorMessage: result.error ?? null,
    })
    .returning();

  if (!result.success) {
    res.json({ success: false, dispatchId: dispatch.id, error: result.error });
    return;
  }

  res.json({ success: true, dispatchId: dispatch.id, error: null });
});

// POST /email/preview
router.post("/email/preview", async (req, res): Promise<void> => {
  const parsed = PreviewEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { templateId, brandKey, variables } = parsed.data;

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, templateId));
  if (!template) {
    res.status(400).json({ error: "Template not found" });
    return;
  }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.key, brandKey));
  if (!brand) {
    res.status(400).json({ error: "Brand not found" });
    return;
  }

  const emailContent = template.emailContent ?? template.content;
  const brandContext = flattenBrandContext(brand as unknown as Record<string, unknown>);
  const allVars = { ...brandContext, ...(variables as Record<string, string>) };
  const html = renderTemplate(emailContent, allVars);
  const vars = extractVariables(emailContent);

  res.json({ html, variables: vars });
});

// GET /email/dispatches
router.get("/email/dispatches", async (req, res): Promise<void> => {
  const parsed = ListEmailDispatchesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit, offset, status } = parsed.data;
  const effectiveLimit = limit ?? 50;
  const effectiveOffset = offset ?? 0;
  const effectiveStatus = status ?? "all";

  let dispatches;
  let totalCount: number;

  if (effectiveStatus !== "all") {
    dispatches = await db
      .select()
      .from(emailDispatchesTable)
      .where(eq(emailDispatchesTable.status, effectiveStatus))
      .orderBy(desc(emailDispatchesTable.createdAt))
      .limit(effectiveLimit)
      .offset(effectiveOffset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailDispatchesTable)
      .where(eq(emailDispatchesTable.status, effectiveStatus));
    totalCount = count;
  } else {
    dispatches = await db
      .select()
      .from(emailDispatchesTable)
      .orderBy(desc(emailDispatchesTable.createdAt))
      .limit(effectiveLimit)
      .offset(effectiveOffset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailDispatchesTable);
    totalCount = count;
  }

  res.json({ dispatches, total: totalCount });
});

export default router;
