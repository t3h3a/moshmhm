import { Router, type IRouter } from "express";
import { db, ordersTable, usersTable, productsTable, transactionsTable, pointsHistoryTable, activityTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";
import { auditWalletChange } from "../lib/walletAudit";

const router: IRouter = Router();

function calculateOrderPoints(amount: number) {
  return Math.max(0, Math.floor(amount) * 10);
}

function mapOrder(o: typeof ordersTable.$inferSelect, userName?: string) {
  return {
    id: o.id,
    userId: o.userId,
    userName: userName ?? "",
    productId: o.productId,
    productName: o.productName,
    productNameAr: o.productNameAr ?? "",
    price: parseFloat(o.price),
    status: o.status,
    userInputData: o.userInputData ?? "",
    pointsEarned: o.pointsEarned,
    notes: o.notes ?? "",
    createdAt: o.createdAt.toISOString(),
  };
}

// 1. Get all orders (Admin only)
router.get("/orders/all", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select({
    order: ordersTable,
    user: usersTable,
  }).from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .orderBy(desc(ordersTable.createdAt));
  res.json(rows.map(({ order, user }: any) => mapOrder(order, user?.name)));
});

// 2. Get own orders (Logged-in users)
router.get("/orders", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.userId, user.id))
    .orderBy(desc(ordersTable.createdAt));
  res.json(orders.map((o: any) => mapOrder(o)));
});

// 3. Create a new purchase order
router.post("/orders", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const userId = user.id;

  const { productId, userInputData } = req.body;
  if (!productId) { res.status(400).json({ error: "Missing productId" }); return; }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parseInt(String(productId))));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  if (!product.isActive) { res.status(400).json({ error: "Product not available" }); return; }

  const price = parseFloat(product.price);
  const balance = parseFloat(user.walletBalance ?? "0");
  if (balance < price) { res.status(400).json({ error: "Insufficient wallet balance" }); return; }

  try {
    const result = await db.transaction(async (tx: any) => {
      // Re-fetch user with write lock inside transaction to prevent double spending
      const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).for("update");
      if (!u) throw new Error("User not found");

      const currentBalance = parseFloat(u.walletBalance ?? "0");
      if (currentBalance < price) throw new Error("Insufficient wallet balance");

      const newBalance = (currentBalance - price).toFixed(2);

      // Deduct balance
      await tx.update(usersTable).set({
        walletBalance: newBalance,
      }).where(eq(usersTable.id, userId));

      // Determine initial status and points earned
      const pointsEarned = calculateOrderPoints(price);
      const initialStatus = product.category === "subscriptions" ? "pending_review" : "pending";

      // Create order
      const [order] = await tx.insert(ordersTable).values({
        userId,
        productId: product.id,
        productName: product.name,
        productNameAr: product.nameAr,
        price: product.price,
        status: initialStatus,
        userInputData: userInputData ?? null,
        pointsEarned: pointsEarned,
      }).returning();

      // Create transaction record
      await tx.insert(transactionsTable).values({
        userId,
        amount: product.price,
        type: "debit",
        description: `شراء - ${product.nameAr}`,
      });

      // Add activity
      await tx.insert(activityTable).values({
        message: `${u.name} bought ${product.name}`,
        messageAr: `${u.name} اشترى ${product.nameAr}`,
        type: "purchase",
      });

      // Log wallet audit log
      await auditWalletChange({
        userId,
        adminId: null,
        action: "order_purchase",
        amount: product.price,
        oldBalance: currentBalance,
        newBalance: parseFloat(newBalance),
        reason: `شراء منتج: ${product.nameAr} (رقم الطلب #${order.id})`,
        req,
      });

      return { order, name: u.name };
    });

    res.status(201).json(mapOrder(result.order, result.name));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to process order" });
  }
});

// 4. View single order detail (Owner or Admin only)
router.get("/orders/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUser = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
  if (order.userId !== currentUser.id && !isAdmin) {
    res.status(403).json({ error: "Forbidden: You are not authorized to view this order" });
    return;
  }

  res.json(mapOrder(order));
});

// 5. Update order status (Admin only with once-off refund and once-off points validations)
router.patch("/orders/:id/status", requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const admin = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status, notes } = req.body;
  if (!status) { res.status(400).json({ error: "Missing status" }); return; }

  try {
    const updatedOrder = await db.transaction(async (tx: any) => {
      // Get current order status with row lock
      const [existingOrder] = await tx.select().from(ordersTable).where(eq(ordersTable.id, id)).for("update");
      if (!existingOrder) throw new Error("Order not found");

      const oldStatus = existingOrder.status;

      // Prevent redundant status transitions to avoid duplication
      if (oldStatus === status) {
        return existingOrder;
      }

      const updates: Record<string, unknown> = { status };
      if (notes !== undefined) updates.notes = notes;

      const [order] = await tx.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, order.userId)).for("update");

      if (user) {
        // If status transitioned to completed -> award points (Only once!)
        const becameCompleted = (status === "completed" || status === "executed");
        const wasCompleted = (oldStatus === "completed" || oldStatus === "executed");

        if (becameCompleted && !wasCompleted) {
          const newPoints = user.points + order.pointsEarned;
          const rank = user.role === "owner" || user.role === "admin" || user.rank === "نيقا" ? "نيقا" : calculateRank(newPoints);
          
          await tx.update(usersTable).set({
            points: newPoints,
            rank,
          }).where(eq(usersTable.id, user.id));

          if (order.pointsEarned > 0) {
            await tx.insert(pointsHistoryTable).values({
              userId: user.id,
              points: order.pointsEarned,
              reason: `نقاط شراء مكتمل - ${order.productNameAr}`,
            });
          }
        }

        // If status transitioned to rejected/refunded -> refund wallet balance (Only once!)
        const becameRefunded = (status === "rejected" || status === "refunded");
        const wasRefunded = (oldStatus === "rejected" || oldStatus === "refunded");

        if (becameRefunded && !wasRefunded) {
          const refundAmount = parseFloat(order.price);
          const oldBalance = parseFloat(user.walletBalance ?? "0");
          const newBalance = (oldBalance + refundAmount).toFixed(2);

          await tx.update(usersTable).set({
            walletBalance: newBalance,
          }).where(eq(usersTable.id, user.id));

          await tx.insert(transactionsTable).values({
            userId: user.id,
            amount: order.price,
            type: "credit",
            description: `استرداد قيمة طلب #${order.id} - ${order.productNameAr || order.productName}`,
          });

          // Log wallet refund audit log
          await auditWalletChange({
            userId: user.id,
            adminId: admin.id,
            action: "order_refund",
            amount: order.price,
            oldBalance,
            newBalance: parseFloat(newBalance),
            reason: `استرداد رصيد لطلب مرفوض/مسترد #${order.id} بواسطة الأدمن ${admin.name}`,
            req,
          });
        }
      }

      return order;
    });

    res.json(mapOrder(updatedOrder));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update order status" });
  }
});

function calculateRank(points: number): string {
  if (points >= 50000) return "Niga";
  if (points >= 30000) return "Legend";
  if (points >= 10000) return "Diamond";
  if (points >= 4000) return "Platinum";
  if (points >= 1500) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
}

export default router;
