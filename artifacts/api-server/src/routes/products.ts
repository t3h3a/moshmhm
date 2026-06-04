import { Router, type IRouter } from "express";
import { db, gamesTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/games", async (_req, res): Promise<void> => {
  const games = await db.select().from(gamesTable).where(eq(gamesTable.isActive, true));
  res.json(games.map((g: any) => ({ ...g, createdAt: undefined })));
});

router.post("/games", async (req, res): Promise<void> => {
  const { name, nameAr, imageUrl, isActive } = req.body;
  if (!name || !nameAr || !imageUrl) { res.status(400).json({ error: "Missing fields" }); return; }
  const [game] = await db.insert(gamesTable).values({ name, nameAr, imageUrl, isActive: isActive ?? true }).returning();
  res.status(201).json({ ...game, createdAt: undefined });
});

router.get("/products/trending", async (_req, res): Promise<void> => {
  const products = await db.select({
    product: productsTable,
    game: gamesTable,
  }).from(productsTable)
    .leftJoin(gamesTable, eq(productsTable.gameId, gamesTable.id))
    .where(and(eq(productsTable.isActive, true), eq(productsTable.isFeatured, true)));

  const all = products.length > 0 ? products : await db.select({
    product: productsTable,
    game: gamesTable,
  }).from(productsTable)
    .leftJoin(gamesTable, eq(productsTable.gameId, gamesTable.id))
    .where(eq(productsTable.isActive, true));

  res.json(all.slice(0, 8).map(({ product, game }: any) => mapProduct(product, game)));
});

router.get("/products", async (req, res): Promise<void> => {
  const { category, gameId, featured, includeInactive } = req.query;
  let rows;
  const wantsInactive = includeInactive === "true";
  if (wantsInactive) {
    let allowed = false;
    await requireAdmin(req as any, res, () => {
      allowed = true;
    });
    if (!allowed) return;
  }

  if (category || gameId || featured) {
    const conditions = wantsInactive ? [] : [eq(productsTable.isActive, true)];
    if (category) conditions.push(eq(productsTable.category, String(category)));
    if (gameId) conditions.push(eq(productsTable.gameId!, parseInt(String(gameId))));
    if (featured === "true") conditions.push(eq(productsTable.isFeatured, true));

    const query = db.select({
      product: productsTable,
      game: gamesTable,
    }).from(productsTable)
      .leftJoin(gamesTable, eq(productsTable.gameId, gamesTable.id));
    rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
  } else {
    const query = db.select({
      product: productsTable,
      game: gamesTable,
    }).from(productsTable)
      .leftJoin(gamesTable, eq(productsTable.gameId, gamesTable.id));
    rows = wantsInactive ? await query : await query.where(eq(productsTable.isActive, true));
  }

  res.json(rows.map(({ product, game }: any) => mapProduct(product, game)));
});

router.post("/products", async (req, res): Promise<void> => {
  const { name, nameAr, price, category, description, descriptionAr, gameId, imageUrl, isActive, isFeatured, stock, pointsEarned, inputFields, serviceGroupId, amount, providerPriceUsd, region, server, deliveryType, fulfillmentType, requiredFields } = req.body;
  if (!name || !nameAr || !price || !category) { res.status(400).json({ error: "Missing required fields" }); return; }

  const [product] = await db.insert(productsTable).values({
    name, nameAr, price: String(price), category,
    description: description ?? null,
    descriptionAr: descriptionAr ?? null,
    gameId: gameId ?? null,
    imageUrl: imageUrl ?? null,
    isActive: isActive ?? true,
    isFeatured: isFeatured ?? false,
    stock: stock ?? 9999,
    pointsEarned: pointsEarned ?? 10,
    inputFields: inputFields ?? null,
    serviceGroupId: serviceGroupId ?? null,
    amount: amount ?? null,
    providerPriceUsd: providerPriceUsd ? String(providerPriceUsd) : null,
    region: region ?? null,
    server: server ?? null,
    deliveryType: deliveryType ?? null,
    fulfillmentType: fulfillmentType ?? "manual",
    requiredFields: requiredFields ?? null,
  }).returning();

  res.status(201).json(mapProduct(product, null));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const rows = await db.select({
    product: productsTable,
    game: gamesTable,
  }).from(productsTable)
    .leftJoin(gamesTable, eq(productsTable.gameId, gamesTable.id))
    .where(eq(productsTable.id, id));

  if (!rows[0]) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(mapProduct(rows[0].product, rows[0].game));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const updates: Record<string, unknown> = {};
  const allowed = ["name", "nameAr", "description", "descriptionAr", "price", "category", "gameId", "imageUrl", "isActive", "isFeatured", "stock", "pointsEarned", "inputFields", "serviceGroupId", "amount", "providerPriceUsd", "region", "server", "deliveryType", "fulfillmentType", "requiredFields"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.price) updates.price = String(updates.price);
  if (updates.providerPriceUsd) updates.providerPriceUsd = String(updates.providerPriceUsd);

  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(mapProduct(product, null));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ message: "Deleted" });
});

function mapProduct(p: typeof productsTable.$inferSelect, g: typeof gamesTable.$inferSelect | null) {
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    description: p.description ?? "",
    descriptionAr: p.descriptionAr ?? "",
    price: parseFloat(p.price),
    category: p.category,
    gameId: p.gameId ?? 0,
    gameName: g?.name ?? "",
    imageUrl: p.imageUrl ?? "",
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    stock: p.stock,
    pointsEarned: p.pointsEarned,
    inputFields: p.inputFields ?? "",
    
    // Item4Gamer integration properties
    serviceGroupId: p.serviceGroupId ?? null,
    amount: p.amount ?? null,
    providerPriceUsd: p.providerPriceUsd ? parseFloat(p.providerPriceUsd) : null,
    region: p.region ?? null,
    server: p.server ?? null,
    deliveryType: p.deliveryType ?? null,
    fulfillmentType: p.fulfillmentType ?? "manual",
    requiredFields: p.requiredFields ?? null,
  };
}

export default router;
