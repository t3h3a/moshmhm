import { Router, type IRouter } from "express";
import { db, usersTable, depositsTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, requireOwner, type AuthenticatedRequest } from "../middlewares/auth";
import { auditWalletChange } from "../lib/walletAudit";
import { verifyAuthToken } from "../lib/authTokens";

export function parseUserId(req: any): number {
  const authHeader = req.headers.authorization;
  if (!authHeader) return 0;
  const token = authHeader.replace("Bearer ", "");
  return verifyAuthToken(token);
}


const router: IRouter = Router();

// 1. Get current wallet balance
router.get("/wallet", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  res.json({ balance: parseFloat(user.walletBalance ?? "0"), userId: user.id });
});

// 2. Get user's own deposits
router.get("/wallet/deposits", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const deposits = await db.select().from(depositsTable)
    .where(eq(depositsTable.userId, user.id))
    .orderBy(desc(depositsTable.createdAt));

  res.json(deposits.map((d: any) => ({
    ...d,
    amount: parseFloat(d.amount),
    userName: "",
    notes: d.notes ?? "",
    receiptUrl: d.receiptUrl ?? "",
    createdAt: d.createdAt.toISOString(),
  })));
});

// 3. Create a deposit request (restricted to logged-in user for themselves only)
router.post("/wallet/deposits", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const { amount, method, notes, receiptUrl } = req.body;
  if (!amount || !method) { res.status(400).json({ error: "Missing required fields" }); return; }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 1) {
    res.status(400).json({ error: "Minimum deposit amount is 1 JOD" });
    return;
  }

  const [deposit] = await db.insert(depositsTable).values({
    userId: user.id, // Forced to authenticated user ID
    amount: numericAmount.toFixed(2),
    method,
    notes: notes ?? null,
    receiptUrl: receiptUrl ?? null,
    status: "pending",
  }).returning();

  res.status(201).json({
    ...deposit,
    amount: parseFloat(deposit.amount),
    userName: "",
    notes: deposit.notes ?? "",
    receiptUrl: deposit.receiptUrl ?? "",
    createdAt: deposit.createdAt.toISOString(),
  });
});

// 4. Get transactions
router.get("/wallet/transactions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const txs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, user.id))
    .orderBy(desc(transactionsTable.createdAt));

  res.json(txs.map((t: any) => ({
    ...t,
    amount: parseFloat(t.amount),
    createdAt: t.createdAt.toISOString(),
  })));
});

// 5. Get all deposits (Admin only)
router.get("/wallet/deposits/all", requireAdmin, async (_req, res): Promise<void> => {
  const deposits = await db.select({
    deposit: depositsTable,
    user: usersTable,
  }).from(depositsTable)
    .leftJoin(usersTable, eq(depositsTable.userId, usersTable.id))
    .orderBy(desc(depositsTable.createdAt));

  res.json(deposits.map(({ deposit, user }: any) => ({
    ...deposit,
    amount: parseFloat(deposit.amount),
    userName: user?.name ?? "",
    notes: deposit.notes ?? "",
    receiptUrl: deposit.receiptUrl ?? "",
    createdAt: deposit.createdAt.toISOString(),
  })));
});

// 6. Approve deposit (Admin/Owner only with strict locks and audit logs)
router.post("/wallet/deposits/:id/approve", requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const admin = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  try {
    const result = await db.transaction(async (tx: any) => {
      // Fetch deposit with write lock to prevent race conditions
      const [deposit] = await tx.select().from(depositsTable).where(eq(depositsTable.id, id)).for("update");
      if (!deposit) {
        return { status: 404, error: "Deposit not found" };
      }

      const isAlreadyProcessed = deposit.status !== "pending";
      if (isAlreadyProcessed) {
        if (deposit.status === "approved") {
          return { status: 400, error: "Deposit is already approved" };
        }
        // If rejected, only owner can re-process
        if (admin.role !== "owner") {
          return { status: 403, error: "Deposit is already processed. Only the owner can re-approve it." };
        }
      }

      // Update deposit status to approved
      await tx.update(depositsTable).set({ status: "approved" }).where(eq(depositsTable.id, id));

      // Credit user wallet
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, deposit.userId)).for("update");
      if (!user) {
        return { status: 404, error: "User not found for this deposit" };
      }

      const oldBalance = parseFloat(user.walletBalance ?? "0");
      const newBalance = (oldBalance + parseFloat(deposit.amount)).toFixed(2);
      await tx.update(usersTable).set({ walletBalance: newBalance }).where(eq(usersTable.id, deposit.userId));

      // Create transaction
      await tx.insert(transactionsTable).values({
        userId: deposit.userId,
        amount: deposit.amount,
        type: "credit",
        description: `شحن محفظة - ${deposit.method} (تأكيد الأدمن)`,
      });

      // Log wallet audit details
      const action = isAlreadyProcessed ? "owner_reprocess_approve" : "deposit_approve";
      await auditWalletChange({
        userId: deposit.userId,
        adminId: admin.id,
        action,
        amount: deposit.amount,
        oldBalance,
        newBalance,
        reason: `تأكيد طلب شحن رصيد إيداع #${deposit.id} عبر ${deposit.method}`,
        req,
      });

      return { status: 200, depositId: deposit.id };
    });

    if (result.error) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    const [updated] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
    res.json({
      ...updated,
      amount: parseFloat(updated!.amount),
      userName: "",
      notes: updated!.notes ?? "",
      receiptUrl: updated!.receiptUrl ?? "",
      createdAt: updated!.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to approve deposit" });
  }
});

// 7. Reject deposit (Admin/Owner only with strict logs)
router.post("/wallet/deposits/:id/reject", requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const admin = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  try {
    const result = await db.transaction(async (tx: any) => {
      const [deposit] = await tx.select().from(depositsTable).where(eq(depositsTable.id, id)).for("update");
      if (!deposit) {
        return { status: 404, error: "Deposit not found" };
      }

      const isAlreadyProcessed = deposit.status !== "pending";
      if (isAlreadyProcessed) {
        if (deposit.status === "rejected") {
          return { status: 400, error: "Deposit is already rejected" };
        }
        // If approved, only owner can re-process (which will deduct the credited amount)
        if (admin.role !== "owner") {
          return { status: 403, error: "Deposit is already approved. Only the owner can reject and reverse it." };
        }
      }

      // Update deposit status to rejected
      await tx.update(depositsTable).set({ status: "rejected" }).where(eq(depositsTable.id, id));

      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, deposit.userId)).for("update");
      if (!user) {
        return { status: 404, error: "User not found" };
      }

      const oldBalance = parseFloat(user.walletBalance ?? "0");
      let newBalance = oldBalance;

      // If it was previously approved, we must reverse and deduct the amount!
      if (deposit.status === "approved") {
        newBalance = Math.max(0, oldBalance - parseFloat(deposit.amount));
        await tx.update(usersTable).set({ walletBalance: newBalance.toFixed(2) }).where(eq(usersTable.id, deposit.userId));

        // Create transaction to show deduction/reversal
        await tx.insert(transactionsTable).values({
          userId: deposit.userId,
          amount: deposit.amount,
          type: "debit",
          description: `عكس شحن محفظة - إلغاء إيداع #${deposit.id} (تعديل المالك)`,
        });
      }

      // Log wallet audit details
      const action = isAlreadyProcessed ? "owner_reprocess_reject" : "deposit_reject";
      await auditWalletChange({
        userId: deposit.userId,
        adminId: admin.id,
        action,
        amount: deposit.amount,
        oldBalance,
        newBalance,
        reason: isAlreadyProcessed 
          ? `عكس وتعديل المالك لطلب إيداع #${deposit.id} من مقبول إلى مرفوض` 
          : `رفض طلب شحن رصيد إيداع #${deposit.id}`,
        req,
      });

      return { status: 200 };
    });

    if (result.error) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    const [updated] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
    res.json({
      ...updated,
      amount: parseFloat(updated!.amount),
      userName: "",
      notes: updated!.notes ?? "",
      receiptUrl: updated!.receiptUrl ?? "",
      createdAt: updated!.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reject deposit" });
  }
});

export default router;
