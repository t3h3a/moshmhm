import { Router, type IRouter } from "express";
import { db, adsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function mapAd(a: typeof adsTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    titleAr: a.titleAr ?? "",
    description: a.description ?? "",
    descriptionAr: a.descriptionAr ?? "",
    imageUrl: a.imageUrl ?? "",
    linkUrl: a.linkUrl ?? "",
    buttonText: a.buttonText ?? "",
    buttonTextAr: a.buttonTextAr ?? "",
    isActive: a.isActive,
    order: a.order,
  };
}

router.get("/ads/all", async (_req, res): Promise<void> => {
  const ads = await db.select().from(adsTable).orderBy(adsTable.order);
  res.json(ads.map(mapAd));
});

router.get("/ads", async (_req, res): Promise<void> => {
  const ads = await db.select().from(adsTable).where(eq(adsTable.isActive, true)).orderBy(adsTable.order);
  res.json(ads.map(mapAd));
});

router.post("/ads", async (req, res): Promise<void> => {
  const { title, titleAr, description, descriptionAr, imageUrl, linkUrl, buttonText, buttonTextAr, isActive, order } = req.body;
  if (!title) { res.status(400).json({ error: "Missing title" }); return; }

  const [ad] = await db.insert(adsTable).values({
    title,
    titleAr: titleAr ?? null,
    description: description ?? null,
    descriptionAr: descriptionAr ?? null,
    imageUrl: imageUrl ?? null,
    linkUrl: linkUrl ?? null,
    buttonText: buttonText ?? null,
    buttonTextAr: buttonTextAr ?? null,
    isActive: isActive ?? true,
    order: order ?? 0,
  }).returning();

  res.status(201).json(mapAd(ad));
});

router.patch("/ads/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const updates: Record<string, unknown> = {};
  const allowed = ["title", "titleAr", "description", "descriptionAr", "imageUrl", "linkUrl", "buttonText", "buttonTextAr", "isActive", "order"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [ad] = await db.update(adsTable).set(updates).where(eq(adsTable.id, id)).returning();
  if (!ad) { res.status(404).json({ error: "Ad not found" }); return; }
  res.json(mapAd(ad));
});

router.delete("/ads/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(adsTable).where(eq(adsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
