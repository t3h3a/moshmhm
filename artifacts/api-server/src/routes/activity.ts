import { Router, type IRouter } from "express";
import { db, activityTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/activity", async (_req, res): Promise<void> => {
  const items = await db.select().from(activityTable).orderBy(desc(activityTable.createdAt)).limit(50);
  res.json(items.map((a: any) => ({
    id: a.id,
    message: a.message,
    messageAr: a.messageAr,
    type: a.type,
    createdAt: a.createdAt.toISOString(),
  })));
});

export default router;
