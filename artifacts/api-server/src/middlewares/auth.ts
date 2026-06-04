import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyAuthToken } from "../lib/authTokens";

export interface AuthenticatedRequest extends Request {
  user?: typeof usersTable.$inferSelect;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: "غير مصرح: لا يوجد ترويسة Authorization" });
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  const userId = verifyAuthToken(token);
  if (!userId) {
    res.status(401).json({ message: "غير مصرح: التوكن مفقود أو منتهي" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ message: "غير مصرح: المستخدم غير موجود" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ message: "ممنوع: الحساب محظور" });
    return;
  }

  req.user = user;
  next();
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    const user = req.user;
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      res.status(403).json({ message: "ممنوع: الوصول مطلوب بصلاحية أدمن" });
      return;
    }
    next();
  });
}

export async function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    const user = req.user;
    if (!user || user.role !== "owner") {
      res.status(403).json({ message: "ممنوع: الوصول مطلوب بصلاحية المالك" });
      return;
    }
    next();
  });
}
