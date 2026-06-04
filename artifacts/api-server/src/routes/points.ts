import { Router, type IRouter } from "express";
import { db, usersTable, pointsHistoryTable, rewardsTable, ranksTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { parseUserId } from "./wallet";

const router: IRouter = Router();

const RANK_THRESHOLDS = [
  { name: "Bronze", nameAr: "برونزي", min: 0 },
  { name: "Silver", nameAr: "فضي", min: 500 },
  { name: "Gold", nameAr: "ذهبي", min: 1500 },
  { name: "Platinum", nameAr: "بلاتيني", min: 4000 },
  { name: "Diamond", nameAr: "دايموند", min: 10000 },
  { name: "Legend", nameAr: "أسطوري", min: 30000 },
  { name: "Niga", nameAr: "نيقا", min: 50000 },
];

function getCurrentRankInfo(points: number) {
  let current = RANK_THRESHOLDS[0];
  let next = RANK_THRESHOLDS[1];
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (points >= RANK_THRESHOLDS[i]!.min) {
      current = RANK_THRESHOLDS[i]!;
      next = RANK_THRESHOLDS[i + 1] ?? null as any;
    }
  }
  const progress = next
    ? Math.round(((points - current.min) / (next.min - current.min)) * 100)
    : 100;
  const pointsToNext = next ? next.min - points : 0;
  return { current, next, progress, pointsToNext };
}

router.get("/points", async (req, res): Promise<void> => {
  const userId = parseUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { current, next, progress, pointsToNext } = getCurrentRankInfo(user.points);

  res.json({
    points: user.points,
    rank: current.name,
    rankAr: current.nameAr,
    nextRank: next?.name ?? null,
    nextRankAr: next?.nameAr ?? null,
    progressPercent: progress,
    pointsToNext,
  });
});

router.get("/points/history", async (req, res): Promise<void> => {
  const userId = parseUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const history = await db.select().from(pointsHistoryTable)
    .where(eq(pointsHistoryTable.userId, userId))
    .orderBy(desc(pointsHistoryTable.createdAt));

  res.json(history.map((h: any) => ({
    ...h,
    createdAt: h.createdAt.toISOString(),
  })));
});

router.get("/rewards", async (_req, res): Promise<void> => {
  const rewards = await db.select().from(rewardsTable).where(eq(rewardsTable.isActive, true));
  res.json(rewards.map((r: any) => ({
    ...r,
    description: r.description ?? "",
    imageUrl: r.imageUrl ?? "",
    createdAt: undefined,
  })));
});

router.post("/rewards", async (req, res): Promise<void> => {
  const { nameAr, pointsCost, description, isActive, imageUrl } = req.body;
  if (!nameAr || !pointsCost) { res.status(400).json({ error: "Missing required fields" }); return; }

  const [reward] = await db.insert(rewardsTable).values({
    nameAr,
    pointsCost: parseInt(String(pointsCost)),
    description: description ?? null,
    isActive: isActive ?? true,
    imageUrl: imageUrl ?? null,
  }).returning();

  res.status(201).json({ ...reward, description: reward.description ?? "", imageUrl: reward.imageUrl ?? "", createdAt: undefined });
});

router.post("/rewards/:id/redeem", async (req, res): Promise<void> => {
  const userId = parseUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [reward] = await db.select().from(rewardsTable).where(eq(rewardsTable.id, id));
  if (!reward) { res.status(404).json({ error: "Reward not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.points < reward.pointsCost) {
    res.status(400).json({ error: "Insufficient points" });
    return;
  }

  const newPoints = user.points - reward.pointsCost;
  const { current } = getCurrentRankInfo(newPoints);
  await db.update(usersTable).set({ points: newPoints, rank: current.name }).where(eq(usersTable.id, userId));

  await db.insert(pointsHistoryTable).values({
    userId,
    points: -reward.pointsCost,
    reason: `استبدال مكافأة - ${reward.nameAr}`,
  });

  res.json({
    success: true,
    newBalance: newPoints,
    reward: { ...reward, description: reward.description ?? "", imageUrl: reward.imageUrl ?? "" },
    message: "تم استبدال المكافأة بنجاح",
  });
});

router.get("/ranks", async (_req, res): Promise<void> => {
  const ranks = await db.select().from(ranksTable).orderBy(ranksTable.minPoints);
  if (ranks.length > 0) {
    res.json(ranks.map((r: any) => ({ ...r, benefits: r.benefits ?? "", createdAt: undefined })));
    return;
  }

  // Return default ranks if none in DB
  res.json(RANK_THRESHOLDS.map((r, i) => ({
    id: i + 1,
    name: r.name,
    nameAr: r.nameAr,
    minPoints: r.min,
    color: ["amber", "gray", "yellow", "cyan", "blue", "emerald"][i],
    icon: ["🥉", "🥈", "🥇", "💎", "💠", "/chargre-badge.png"][i],
    benefits: "",
  })));
});

router.post("/ranks", async (req, res): Promise<void> => {
  const { name, nameAr, minPoints, color, icon, benefits } = req.body;
  if (!name || !nameAr || minPoints === undefined || !color || !icon) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [rank] = await db.insert(ranksTable).values({
    name, nameAr, minPoints: parseInt(String(minPoints)), color, icon, benefits: benefits ?? null,
  }).returning();

  res.status(201).json({ ...rank, benefits: rank.benefits ?? "", createdAt: undefined });
});

export default router;
