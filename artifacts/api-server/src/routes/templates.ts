import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import {
  CreateTemplateBody,
  GetTemplateParams,
  UpdateTemplateParams,
  UpdateTemplateBody,
  DeleteTemplateParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /templates
router.get("/templates", async (req, res): Promise<void> => {
  const templates = await db
    .select()
    .from(templatesTable)
    .orderBy(templatesTable.createdAt);
  res.json(templates);
});

// POST /templates
router.post("/templates", async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [template] = await db
    .insert(templatesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(template);
});

// GET /templates/:id
router.get("/templates/:id", async (req, res): Promise<void> => {
  const params = GetTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, params.data.id));

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(template);
});

// PATCH /templates/:id
router.patch("/templates/:id", async (req, res): Promise<void> => {
  const params = UpdateTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [template] = await db
    .update(templatesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(templatesTable.id, params.data.id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(template);
});

// DELETE /templates/:id
router.delete("/templates/:id", async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(templatesTable)
    .where(eq(templatesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
