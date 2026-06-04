import { Router, type IRouter } from "express";
import { db, accountListingsTable, usersTable, gamesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { parseUserId } from "./wallet";

const router: IRouter = Router();

function hasContactLeak(value: unknown) {
  const text = String(value ?? "");
  return /(?:whatsapp|واتساب|telegram|تيليجرام|insta|instagram|wa\.me|t\.me|@|https?:\/\/|www\.|\+?\d[\d\s().-]{7,}\d)/i.test(text);
}

function parseImageList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  const text = String(value).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
  }
  if (text.startsWith("data:image/")) return [text];
  return text.split(/\n|\|\|\|/).map((item) => item.trim()).filter(Boolean);
}

function isImageData(value: unknown) {
  return parseImageList(value).every((text) => {
    if (text.startsWith("data:")) return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(text) && text.length <= 14_000_000;
    return /^\/|^https?:\/\//i.test(text);
  });
}

function mapListing(l: typeof accountListingsTable.$inferSelect, user?: typeof usersTable.$inferSelect | null, game?: typeof gamesTable.$inferSelect | null) {
  return {
    id: l.id,
    userId: l.userId,
    sellerName: user?.name ?? "",
    sellerVerified: user?.isVerified ?? false,
    gameId: l.gameId,
    gameName: game?.name ?? "",
    gameNameAr: game?.nameAr ?? "",
    title: l.title,
    description: l.description ?? "",
    price: parseFloat(l.price),
    rank: l.rank ?? "",
    level: l.level ?? 0,
    region: l.region ?? "",
    imageUrls: l.imageUrls ?? "",
    status: l.status,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/marketplace/my", async (req, res): Promise<void> => {
  const userId = parseUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db.select({
    listing: accountListingsTable,
    user: usersTable,
    game: gamesTable,
  }).from(accountListingsTable)
    .leftJoin(usersTable, eq(accountListingsTable.userId, usersTable.id))
    .leftJoin(gamesTable, eq(accountListingsTable.gameId, gamesTable.id))
    .where(eq(accountListingsTable.userId, userId));

  res.json(rows.map(({ listing, user, game }: any) => mapListing(listing, user, game)));
});

router.get("/marketplace/all", async (_req, res): Promise<void> => {
  const rows = await db.select({
    listing: accountListingsTable,
    user: usersTable,
    game: gamesTable,
  }).from(accountListingsTable)
    .leftJoin(usersTable, eq(accountListingsTable.userId, usersTable.id))
    .leftJoin(gamesTable, eq(accountListingsTable.gameId, gamesTable.id));

  res.json(rows.map(({ listing, user, game }: any) => mapListing(listing, user, game)));
});

router.get("/marketplace", async (req, res): Promise<void> => {
  const { gameId } = req.query;
  let conditions: any[] = [eq(accountListingsTable.status, "approved")];
  if (gameId) conditions.push(eq(accountListingsTable.gameId, parseInt(String(gameId))));

  const rows = await db.select({
    listing: accountListingsTable,
    user: usersTable,
    game: gamesTable,
  }).from(accountListingsTable)
    .leftJoin(usersTable, eq(accountListingsTable.userId, usersTable.id))
    .leftJoin(gamesTable, eq(accountListingsTable.gameId, gamesTable.id))
    .where(and(...conditions));

  res.json(rows.map(({ listing, user, game }: any) => mapListing(listing, user, game)));
});

router.post("/marketplace", async (req, res): Promise<void> => {
  const userId = parseUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { gameId, title, price, description, rank, level, region, imageUrls } = req.body;
  if (!title || !price) { res.status(400).json({ error: "Missing required fields" }); return; }
  if (Number(price) <= 0) { res.status(400).json({ error: "Price must be positive" }); return; }
  if (hasContactLeak(`${title}\n${description ?? ""}\n${req.body?.sellerNotes ?? ""}`)) { res.status(400).json({ error: "External contact details are not allowed in listings." }); return; }
  if (!isImageData(imageUrls)) { res.status(400).json({ error: "Only images up to 10MB are allowed." }); return; }
  const parsedGameId = parseInt(String(gameId || 1), 10);
  const safeGameId = Number.isFinite(parsedGameId) && parsedGameId > 0 ? parsedGameId : 1;

  const [listing] = await db.insert(accountListingsTable).values({
    userId,
    gameId: safeGameId,
    title,
    price: String(price),
    description: description ?? null,
    rank: rank ?? null,
    level: level ? parseInt(String(level)) : null,
    region: region ?? null,
    imageUrls: imageUrls ?? null,
    status: "pending_review",
  }).returning();

  res.status(201).json(mapListing(listing));
});

router.get("/marketplace/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const rows = await db.select({
    listing: accountListingsTable,
    user: usersTable,
    game: gamesTable,
  }).from(accountListingsTable)
    .leftJoin(usersTable, eq(accountListingsTable.userId, usersTable.id))
    .leftJoin(gamesTable, eq(accountListingsTable.gameId, gamesTable.id))
    .where(eq(accountListingsTable.id, id));

  if (!rows[0]) { res.status(404).json({ error: "Listing not found" }); return; }
  res.json(mapListing(rows[0].listing, rows[0].user, rows[0].game));
});

router.post("/marketplace/:id/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.update(accountListingsTable).set({ status: "approved" }).where(eq(accountListingsTable.id, id));
  const rows = await db.select({ listing: accountListingsTable, user: usersTable, game: gamesTable })
    .from(accountListingsTable)
    .leftJoin(usersTable, eq(accountListingsTable.userId, usersTable.id))
    .leftJoin(gamesTable, eq(accountListingsTable.gameId, gamesTable.id))
    .where(eq(accountListingsTable.id, id));
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapListing(rows[0].listing, rows[0].user, rows[0].game));
});

router.post("/marketplace/:id/reject", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.update(accountListingsTable).set({ status: "rejected" }).where(eq(accountListingsTable.id, id));
  const rows = await db.select({ listing: accountListingsTable, user: usersTable, game: gamesTable })
    .from(accountListingsTable)
    .leftJoin(usersTable, eq(accountListingsTable.userId, usersTable.id))
    .leftJoin(gamesTable, eq(accountListingsTable.gameId, gamesTable.id))
    .where(eq(accountListingsTable.id, id));
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapListing(rows[0].listing, rows[0].user, rows[0].game));
});

export default router;
