import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import {
  ListBrandsQueryParams,
  CreateBrandBody,
  GetBrandParams,
  UpdateBrandParams,
  UpdateBrandBody,
  DeleteBrandParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /brands
router.get("/brands", async (req, res): Promise<void> => {
  const parsed = ListBrandsQueryParams.safeParse(req.query);
  const category = parsed.success ? parsed.data.category : undefined;

  const brands = category
    ? await db.select().from(brandsTable).where(eq(brandsTable.category, category)).orderBy(brandsTable.name)
    : await db.select().from(brandsTable).orderBy(brandsTable.category, brandsTable.name);

  res.json(brands);
});

// POST /brands
router.post("/brands", async (req, res): Promise<void> => {
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [brand] = await db.insert(brandsTable).values(parsed.data).returning();
  res.status(201).json(brand);
});

// GET /brands/:id
router.get("/brands/:id", async (req, res): Promise<void> => {
  const params = GetBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, params.data.id));
  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json(brand);
});

// PATCH /brands/:id
router.patch("/brands/:id", async (req, res): Promise<void> => {
  const params = UpdateBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [brand] = await db
    .update(brandsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(brandsTable.id, params.data.id))
    .returning();

  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json(brand);
});

// DELETE /brands/:id
router.delete("/brands/:id", async (req, res): Promise<void> => {
  const params = DeleteBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(brandsTable)
    .where(eq(brandsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
