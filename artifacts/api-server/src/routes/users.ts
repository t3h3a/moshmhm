import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, userToResponse } from "./auth";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";
import { auditWalletChange } from "../lib/walletAudit";

const router: IRouter = Router();

// 1. Get all users (Admin only)
router.get("/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(userToResponse));
});

// 2. Get single user profile (Admin or the user themselves)
router.get("/users/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUser = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
  if (currentUser.id !== id && !isAdmin) {
    res.status(403).json({ message: "لا تملك صلاحية عرض ملف هذا المستخدم" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(userToResponse(user));
});

// 3. Update user profile (Admin or the user themselves with strict field filters)
router.patch("/users/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUser = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!targetUser) { res.status(404).json({ error: "User not found" }); return; }

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
  const isOwner = currentUser.role === "owner";
  const isEditingSelf = currentUser.id === id;

  if (!isEditingSelf && !isAdmin) {
    res.status(403).json({ message: "لا تملك صلاحية تعديل هذا المستخدم" });
    return;
  }

  const { 
    name, username, email, phone, avatar, 
    role, walletBalance, points, rank, isVerified, isBanned, 
    password, gender 
  } = req.body;

  // Protected admin emails (only owner may modify other than self)
  const PROTECTED_EMAILS = ["tthhaaeeeerr@gmail.com", "qtybhrbas774@gmail.com"];
  if (PROTECTED_EMAILS.includes(targetUser.email)) {
    if (!isOwner && currentUser.id !== targetUser.id) {
      res.status(403).json({ message: "لا يمكن تعديل حساب إدارة محمي إلا من المالك" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};

  // Fields allowed for target self-edits or admins
  if (gender !== undefined) updates.gender = gender;
  if (name !== undefined) updates.name = name;
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (avatar !== undefined) updates.avatar = avatar;
  if (password) updates.passwordHash = hashPassword(String(password));

  // Administrative-only fields
  if (role !== undefined || walletBalance !== undefined || points !== undefined || rank !== undefined || isVerified !== undefined || isBanned !== undefined) {
    if (!isAdmin) {
      res.status(403).json({ message: "ممنوع: فقط الأدمن يمكنه تعديل الخصائص النظامية أو الأرصدة أو الصلاحيات" });
      return;
    }

    // Admins (non-owner) may only operate on users with role === "user"
    if (!isOwner && targetUser.role !== "user") {
      res.status(403).json({ message: "الأدمن يستطيع تعديل المستخدمين العاديين فقط" });
      return;
    }

    // Only owner may assign owner role
    if (role === "owner" && !isOwner) {
      res.status(403).json({ message: "لا يمكن تعيين مالك إلا من حساب مالك" });
      return;
    }

    // Prevent non-owners from modifying protected admin accounts
    if (!isOwner && PROTECTED_EMAILS.includes(targetUser.email)) {
      res.status(403).json({ message: "لا يمكن تعديل حساب إدارة محمي إلا من المالك" });
      return;
    }

    if (role !== undefined) updates.role = role;
    if (points !== undefined) updates.points = Number(points);
    if (rank !== undefined) updates.rank = rank;
    if (isVerified !== undefined) updates.isVerified = Boolean(isVerified);
    if (isBanned !== undefined) updates.isBanned = Boolean(isBanned);

    // Strict audit logging for manual wallet adjustments by admins
    if (walletBalance !== undefined) {
      const oldVal = parseFloat(targetUser.walletBalance ?? "0");
      const newVal = parseFloat(String(walletBalance));
      if (newVal !== oldVal) {
        updates.walletBalance = newVal.toFixed(2);
        
        // Log wallet audit
        await auditWalletChange({
          userId: targetUser.id,
          adminId: currentUser.id,
          action: "admin_adjust",
          amount: Math.abs(newVal - oldVal).toFixed(2),
          oldBalance: oldVal,
          newBalance: newVal,
          reason: `تعديل رصيد يدوي إداري بواسطة الأدمن ${currentUser.name}`,
          req,
        });
      }
    }
  }

  const [updatedUser] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json(updatedUser ? userToResponse(updatedUser) : userToResponse(targetUser));
});

// 4. Ban a user (Admin only)
router.post("/users/:id/ban", requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Owner protection
  if (user.role === "owner" || user.email === "tthhaaeeeerr@gmail.com" || user.email === "qtybhrbas774@gmail.com") {
    res.status(403).json({ message: "لا يمكن حظر المالك أو حساب إدارة محمي" });
    return;
  }

  await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, id));
  res.json({ message: "User banned" });
});

export default router;
